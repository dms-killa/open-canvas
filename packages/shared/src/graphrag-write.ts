import { randomUUID } from "crypto";
import { runQuery, getGraphDBConfig, getGraphRAGMode } from "./graphdb.js";
import type {
  ExtractionResult,
  ExtractedStyleRule,
  ContradictionStrategy,
} from "./graphrag-types.js";

export interface WriteToGraphParams {
  userId: string;
  sessionId: string;
  artifactId?: string;
  messages: Array<{ role: string; content: string }>;
  artifactContent?: string;
}

/**
 * Extract entities, relations, and style rules from conversation context
 * and write them to Neo4j with full provenance via Extraction nodes.
 *
 * This is a rule-based extraction. For LLM-based extraction, callers
 * can produce an ExtractionResult externally and pass it to writeExtractionToGraph().
 */
export async function extractAndWriteToGraph(
  params: WriteToGraphParams
): Promise<void> {
  const mode = getGraphRAGMode();
  if (mode === "OFF") return;

  try {
    // Ensure structural nodes exist
    await ensureSessionArtifactNodes(params);

    // Rule-based extraction from recent messages
    const extraction = extractFromMessages(params);
    if (
      extraction.entities.length === 0 &&
      extraction.styleRules.length === 0
    ) {
      return; // Nothing to write
    }

    await writeExtractionToGraph(params, extraction);
  } catch (err) {
    if (mode === "REQUIRED") throw err;
    console.warn("GraphRAG write failed in OPTIONAL mode:", err);
  }
}

/**
 * Rule-based extraction of entities and style rules from messages.
 * Identifies concepts (nouns/proper nouns in user messages) and
 * style preferences ("I prefer", "use", "don't use", "always", "never").
 */
function extractFromMessages(params: WriteToGraphParams): ExtractionResult {
  const entities: ExtractionResult["entities"] = [];
  const relations: ExtractionResult["relations"] = [];
  const styleRules: ExtractedStyleRule[] = [];
  const snippets: string[] = [];

  for (const msg of params.messages) {
    if (msg.role !== "human" && msg.role !== "user") continue;

    const content = msg.content;
    snippets.push(content.slice(0, 200));

    // Extract style preferences via pattern matching
    const preferencePatterns = [
      /(?:I\s+(?:prefer|like|want|need)\s+)(.+?)(?:\.|$)/gi,
      /(?:(?:always|never)\s+)(.+?)(?:\.|$)/gi,
      /(?:(?:use|avoid|don't use|do not use)\s+)(.+?)(?:\.|$)/gi,
      /(?:(?:make it|keep it|write in)\s+)(.+?)(?:\.|$)/gi,
    ];

    for (const pattern of preferencePatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const ruleText = match[0].trim();
        if (ruleText.length > 10 && ruleText.length < 200) {
          // Detect temporal marker
          let temporalMarker: ExtractedStyleRule["temporalMarker"] = "current";
          if (
            /\b(don't|never|avoid|stop|no longer|not anymore)\b/i.test(
              ruleText
            )
          ) {
            temporalMarker = "negated";
          } else if (/\b(used to|previously|before)\b/i.test(ruleText)) {
            temporalMarker = "past";
          }

          styleRules.push({
            rule: ruleText,
            scope: "global",
            temporalMarker,
            confidence: 0.7, // Rule-based extraction has moderate confidence
          });
        }
      }
    }

    // Extract concept-like entities (capitalized words, quoted terms)
    const conceptPatterns = [
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g, // Proper nouns
      /"([^"]+)"/g, // Quoted terms
      /`([^`]+)`/g, // Backtick terms (code/technical)
    ];

    for (const pattern of conceptPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1].trim();
        // Filter out common non-entity words
        if (
          name.length > 2 &&
          name.length < 100 &&
          !COMMON_WORDS.has(name.toLowerCase())
        ) {
          entities.push({ name: name.toLowerCase(), type: "Concept" });
        }
      }
    }
  }

  // Deduplicate entities by name
  const uniqueEntities = new Map<string, (typeof entities)[0]>();
  for (const e of entities) {
    uniqueEntities.set(e.name, e);
  }

  return {
    entities: Array.from(uniqueEntities.values()),
    relations,
    styleRules,
    rawSnippet: snippets.join(" | ").slice(0, 500),
  };
}

const COMMON_WORDS = new Set([
  "the",
  "this",
  "that",
  "with",
  "from",
  "have",
  "been",
  "will",
  "would",
  "could",
  "should",
  "about",
  "what",
  "when",
  "where",
  "which",
  "there",
  "their",
  "here",
  "just",
  "also",
  "then",
  "than",
  "more",
  "some",
  "other",
  "into",
  "only",
  "very",
  "well",
  "much",
  "each",
  "every",
  "both",
  "after",
  "before",
  "between",
  "through",
  "during",
  "without",
  "within",
  "along",
  "among",
  "however",
  "although",
  "because",
  "since",
  "while",
  "please",
  "thanks",
  "thank",
  "hello",
  "sure",
  "okay",
  "yes",
  "not",
]);

/**
 * Write an extraction result to Neo4j with full provenance.
 */
export async function writeExtractionToGraph(
  params: WriteToGraphParams,
  extraction: ExtractionResult
): Promise<void> {
  const extractionId = randomUUID();

  // 1. Create Extraction node
  await runQuery(
    `MERGE (e:Extraction {extractionId: $extractionId})
     SET e.createdAt = datetime(),
         e.method = $method,
         e.rawSnippet = $rawSnippet`,
    {
      extractionId,
      method: "rule",
      rawSnippet: extraction.rawSnippet.slice(0, 500),
    }
  );

  // Link extraction to session
  await runQuery(
    `MATCH (e:Extraction {extractionId: $extractionId})
     MATCH (s:Session {sessionId: $sessionId})
     MERGE (e)-[:EXTRACTED_FROM]->(s)`,
    { extractionId, sessionId: params.sessionId }
  );

  // Link to artifact if present
  if (params.artifactId) {
    await runQuery(
      `MATCH (e:Extraction {extractionId: $extractionId})
       MERGE (a:Artifact {artifactId: $artifactId})
       MERGE (e)-[:EXTRACTED_FROM_ARTIFACT]->(a)`,
      { extractionId, artifactId: params.artifactId }
    );
  }

  // 2. Upsert Concepts with provenance
  for (const entity of extraction.entities) {
    await runQuery(
      `MERGE (c:Concept {name: $name})
       SET c.updatedAt = datetime()
       WITH c
       MATCH (e:Extraction {extractionId: $extractionId})
       MERGE (e)-[:CREATED]->(c)`,
      { name: entity.name, extractionId }
    );

    // Link concept to session artifact if available
    if (params.artifactId) {
      await runQuery(
        `MATCH (a:Artifact {artifactId: $artifactId})
         MATCH (c:Concept {name: $name})
         MERGE (a)-[:MENTIONS]->(c)`,
        { artifactId: params.artifactId, name: entity.name }
      );
    }
  }

  // 3. Create relations
  for (const rel of extraction.relations) {
    await runQuery(
      `MERGE (s:Concept {name: $source})
       MERGE (t:Concept {name: $target})
       MERGE (s)-[r:RELATED_TO]->(t)
       SET r.type = $type, r.extractionId = $extractionId`,
      {
        source: rel.source,
        target: rel.target,
        type: rel.type,
        extractionId,
      }
    );
  }

  // 4. Upsert StyleRules with temporal props + contradiction detection
  const config = getGraphDBConfig();
  for (const rule of extraction.styleRules) {
    const ruleId = randomUUID();

    // Check for contradictions before inserting
    await detectAndRecordContradictions(
      params.userId,
      ruleId,
      rule,
      extractionId,
      config.contradictionStrategy
    );

    // Insert the new rule
    await runQuery(
      `MERGE (sr:StyleRule {ruleId: $ruleId})
       SET sr.rule = $rule,
           sr.scope = $scope,
           sr.temporalMarker = $temporalMarker,
           sr.since = datetime(),
           sr.active = true,
           sr.confidence = $confidence,
           sr.strict = $strict
       WITH sr
       MATCH (u:User {userId: $userId})
       MERGE (u)-[:PREFERS {since: datetime(), scope: $scope, temporalMarker: $temporalMarker}]->(sr)
       WITH sr
       MATCH (e:Extraction {extractionId: $extractionId})
       MERGE (e)-[:CREATED]->(sr)`,
      {
        ruleId,
        rule: rule.rule,
        scope: rule.scope,
        temporalMarker: rule.temporalMarker,
        confidence: rule.confidence ?? 0.5,
        strict: rule.strict ?? false,
        userId: params.userId,
        extractionId,
      }
    );
  }
}

/**
 * Detect contradictions between a new style rule and existing active rules
 * in the same scope. Records CONTRADICTS relationships and applies the
 * configured resolution strategy.
 */
async function detectAndRecordContradictions(
  userId: string,
  newRuleId: string,
  newRule: ExtractedStyleRule,
  extractionId: string,
  strategy: ContradictionStrategy
): Promise<void> {
  // Find existing active rules in the same scope for this user
  const result = await runQuery(
    `MATCH (u:User {userId: $userId})-[:PREFERS]->(sr:StyleRule {scope: $scope, active: true})
     RETURN sr.ruleId as ruleId, sr.rule as rule, sr.strict as strict, sr.temporalMarker as temporalMarker`,
    { userId, scope: newRule.scope }
  );

  if (!result || !result.records) return;

  for (const record of result.records) {
    const existingRule = record.get("rule") as string;
    const existingRuleId = record.get("ruleId") as string;
    const existingStrict = record.get("strict") as boolean;

    // Simple heuristic contradiction detection:
    // - negated vs current on similar topics
    // - opposing keywords (formal/casual, verbose/concise, etc.)
    const isContradiction = detectSimpleContradiction(
      newRule.rule,
      existingRule,
      newRule.temporalMarker
    );

    if (isContradiction) {
      // Record the contradiction
      await runQuery(
        `MATCH (new:StyleRule {ruleId: $newRuleId})
         MATCH (old:StyleRule {ruleId: $oldRuleId})
         MERGE (new)-[:CONTRADICTS {
           reason: $reason,
           createdAt: datetime(),
           extractionId: $extractionId,
           strategy: $strategy
         }]->(old)`,
        {
          newRuleId,
          oldRuleId: existingRuleId,
          reason: `New rule "${newRule.rule}" contradicts existing "${existingRule}"`,
          extractionId,
          strategy,
        }
      );

      // Apply resolution strategy
      if (existingStrict && strategy !== "user-confirmation") {
        // Strict rules require explicit confirmation to override
        // Mark new rule as pending
        await runQuery(
          `MATCH (sr:StyleRule {ruleId: $newRuleId})
           SET sr.active = false, sr.pendingConfirmation = true`,
          { newRuleId }
        );
      } else if (strategy === "most-recent-wins") {
        // Deactivate the old rule
        await runQuery(
          `MATCH (sr:StyleRule {ruleId: $oldRuleId})
           SET sr.active = false, sr.temporalMarker = 'past'`,
          { oldRuleId: existingRuleId }
        );
      }
      // For "user-confirmation" strategy, both remain active until user decides
    }
  }
}

/**
 * Simple heuristic to detect if two rules contradict each other.
 * Checks for opposing keyword pairs and negation patterns.
 */
function detectSimpleContradiction(
  newRule: string,
  existingRule: string,
  newTemporalMarker: string
): boolean {
  const lower1 = newRule.toLowerCase();
  const lower2 = existingRule.toLowerCase();

  // If the new rule is negated and the existing is current on similar topic
  if (newTemporalMarker === "negated") {
    // Check if they share significant words (beyond common ones)
    const words1 = new Set(
      lower1.split(/\s+/).filter((w) => w.length > 3 && !COMMON_WORDS.has(w))
    );
    const words2 = new Set(
      lower2.split(/\s+/).filter((w) => w.length > 3 && !COMMON_WORDS.has(w))
    );
    const overlap = [...words1].filter((w) => words2.has(w));
    if (overlap.length > 0) return true;
  }

  // Check opposing keyword pairs
  const opposingPairs: [string, string][] = [
    ["formal", "casual"],
    ["formal", "informal"],
    ["verbose", "concise"],
    ["detailed", "brief"],
    ["simple", "complex"],
    ["short", "long"],
    ["technical", "simple"],
    ["professional", "casual"],
    ["serious", "humorous"],
    ["passive", "active"],
  ];

  for (const [a, b] of opposingPairs) {
    if (
      (lower1.includes(a) && lower2.includes(b)) ||
      (lower1.includes(b) && lower2.includes(a))
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Ensure User, Session, and Artifact structural nodes exist.
 */
async function ensureSessionArtifactNodes(
  params: WriteToGraphParams
): Promise<void> {
  // Create/merge User node
  await runQuery(`MERGE (u:User {userId: $userId})`, {
    userId: params.userId,
  });

  // Create/merge Session and link to User
  await runQuery(
    `MERGE (s:Session {sessionId: $sessionId})
     SET s.updatedAt = datetime()
     WITH s
     MATCH (u:User {userId: $userId})
     MERGE (u)-[:STARTED]->(s)`,
    { sessionId: params.sessionId, userId: params.userId }
  );

  // Create/merge Artifact if present
  if (params.artifactId) {
    await runQuery(
      `MERGE (a:Artifact {artifactId: $artifactId})
       SET a.updatedAt = datetime()
       WITH a
       MATCH (s:Session {sessionId: $sessionId})
       MERGE (s)-[:CONTAINS]->(a)
       WITH a
       MATCH (u:User {userId: $userId})
       MERGE (u)-[:CREATED]->(a)`,
      {
        artifactId: params.artifactId,
        sessionId: params.sessionId,
        userId: params.userId,
      }
    );
  }
}

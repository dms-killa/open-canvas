import { runQuery, getGraphDBConfig, getGraphRAGMode } from "./graphdb.js";
import type {
  GraphContext,
  GraphEntity,
  GraphRelation,
  GraphStyleRule,
  GraphCitation,
} from "./graphrag-types.js";

export interface BuildGraphContextParams {
  userId: string;
  sessionId: string;
  promptText: string;
  artifactContent?: string;
  maxNodes?: number;
  maxEdges?: number;
}

/**
 * Build a GraphContext by querying Neo4j for entities, relations,
 * style rules, and citations relevant to the current prompt and artifact.
 *
 * Returns null if GraphRAG is OFF or Neo4j is unavailable in OPTIONAL mode.
 */
export async function buildGraphContext(
  params: BuildGraphContextParams
): Promise<GraphContext | null> {
  const mode = getGraphRAGMode();
  if (mode === "OFF") return null;

  try {
    const config = getGraphDBConfig();
    const maxNodes = params.maxNodes ?? config.maxNodes;
    const maxEdges = params.maxEdges ?? config.maxEdges;

    // 1. Extract entity names from prompt text
    const entityNames = extractEntityNamesFromText(
      params.promptText,
      params.artifactContent
    );

    if (entityNames.length === 0) {
      // Still fetch style rules even without entity matches
      const styleRules = await retrieveActiveStyleRules(params.userId);
      if (styleRules.length === 0) return null;
      return { entities: [], relations: [], styleRules, citations: [] };
    }

    // 2. Resolve concept nodes
    const entities = await resolveConceptNodes(entityNames, maxNodes);

    // 3. Traverse neighborhood from matched concepts
    const { neighborEntities, relations } = await traverseNeighborhood(
      entityNames,
      maxEdges
    );

    // 4. Retrieve active style rules for this user
    const styleRules = await retrieveActiveStyleRules(params.userId);

    // 5. Gather citations (provenance) for returned entities and rules
    const allEntityIds = [
      ...entities.map((e) => e.id),
      ...neighborEntities.map((e) => e.id),
    ];
    const allRuleIds = styleRules.map((r) => r.id);
    const citations = await gatherCitations(allEntityIds, allRuleIds);

    // 6. Combine and deduplicate
    const allEntities = deduplicateEntities([...entities, ...neighborEntities]);

    return {
      entities: allEntities.slice(0, maxNodes),
      relations: relations.slice(0, maxEdges),
      styleRules,
      citations,
    };
  } catch (err) {
    if (mode === "REQUIRED") throw err;
    console.warn("GraphRAG read failed in OPTIONAL mode:", err);
    return null;
  }
}

/**
 * Extract potential entity names from text using simple patterns.
 * Returns lowercase normalized names for matching against Concept nodes.
 */
function extractEntityNamesFromText(
  promptText: string,
  artifactContent?: string
): string[] {
  const text = [promptText, artifactContent].filter(Boolean).join(" ");
  const names = new Set<string>();

  // Proper nouns (capitalized words)
  const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (properNouns) {
    for (const noun of properNouns) {
      if (noun.length > 2 && !SKIP_WORDS.has(noun.toLowerCase())) {
        names.add(noun.toLowerCase());
      }
    }
  }

  // Quoted terms
  const quoted = text.match(/"([^"]+)"/g);
  if (quoted) {
    for (const q of quoted) {
      const clean = q.replace(/"/g, "").trim().toLowerCase();
      if (clean.length > 2) names.add(clean);
    }
  }

  // Backtick terms
  const backtick = text.match(/`([^`]+)`/g);
  if (backtick) {
    for (const b of backtick) {
      const clean = b.replace(/`/g, "").trim().toLowerCase();
      if (clean.length > 2) names.add(clean);
    }
  }

  return Array.from(names).slice(0, 20); // Limit to avoid huge queries
}

const SKIP_WORDS = new Set([
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
  "please",
  "thanks",
  "hello",
  "sure",
]);

/**
 * Match extracted entity names to Concept nodes in Neo4j.
 */
async function resolveConceptNodes(
  entityNames: string[],
  maxNodes: number
): Promise<GraphEntity[]> {
  if (entityNames.length === 0) return [];

  const result = await runQuery(
    `MATCH (c:Concept)
     WHERE c.name IN $names
     RETURN c.name AS name, elementId(c) AS id, properties(c) AS props
     LIMIT $maxNodes`,
    { names: entityNames, maxNodes }
  );

  if (!result || !result.records) return [];

  return result.records.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (record: any) => ({
      id: record.get("id") as string,
      label: "Concept",
      properties: record.get("props") as Record<string, unknown>,
    })
  );
}

/**
 * Traverse 1-2 hops from matched concepts to find related entities.
 */
async function traverseNeighborhood(
  entityNames: string[],
  maxEdges: number
): Promise<{ neighborEntities: GraphEntity[]; relations: GraphRelation[] }> {
  if (entityNames.length === 0) return { neighborEntities: [], relations: [] };

  const result = await runQuery(
    `MATCH (c:Concept)-[r:RELATED_TO|MENTIONS]-(neighbor)
     WHERE c.name IN $names
     RETURN c.name AS sourceName, elementId(c) AS sourceId,
            type(r) AS relType, properties(r) AS relProps,
            elementId(neighbor) AS neighborId, labels(neighbor) AS neighborLabels,
            properties(neighbor) AS neighborProps
     LIMIT $maxEdges`,
    { names: entityNames, maxEdges }
  );

  if (!result || !result.records) return { neighborEntities: [], relations: [] };

  const neighborEntities: GraphEntity[] = [];
  const relations: GraphRelation[] = [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const record of result.records as any[]) {
    neighborEntities.push({
      id: record.get("neighborId"),
      label: (record.get("neighborLabels") as string[])?.[0] || "Unknown",
      properties: record.get("neighborProps") as Record<string, unknown>,
    });

    const relProps = record.get("relProps") as Record<string, unknown>;
    relations.push({
      source: record.get("sourceId"),
      target: record.get("neighborId"),
      type: record.get("relType"),
      properties: relProps,
      extractionId: (relProps?.extractionId as string) || "",
    });
  }

  return { neighborEntities, relations };
}

/**
 * Retrieve active StyleRules for a user, applying contradiction resolution.
 * Returns rules ordered by recency (most recent first).
 */
async function retrieveActiveStyleRules(
  userId: string
): Promise<GraphStyleRule[]> {
  const result = await runQuery(
    `MATCH (u:User {userId: $userId})-[p:PREFERS]->(sr:StyleRule {active: true})
     WHERE p.temporalMarker = 'current'
     OPTIONAL MATCH (sr)-[c:CONTRADICTS]->(contradicted:StyleRule)
     RETURN sr.ruleId AS id, sr.rule AS rule, sr.scope AS scope,
            sr.temporalMarker AS temporalMarker, sr.since AS since,
            sr.expiresAt AS expiresAt, sr.confidence AS confidence,
            sr.strict AS strict, sr.confirmed AS confirmed,
            collect(contradicted.ruleId) AS contradicts,
            collect(DISTINCT elementId(sr)) AS extractionIds
     ORDER BY sr.since DESC`,
    { userId }
  );

  if (!result || !result.records) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.records.map((record: any) => ({
    id: record.get("id") as string,
    rule: record.get("rule") as string,
    scope: record.get("scope") as GraphStyleRule["scope"],
    temporalMarker: record.get("temporalMarker") as GraphStyleRule["temporalMarker"],
    since: String(record.get("since") || ""),
    expiresAt: record.get("expiresAt")
      ? String(record.get("expiresAt"))
      : undefined,
    confidence: record.get("confidence") as number | undefined,
    strict: record.get("strict") as boolean | undefined,
    confirmed: record.get("confirmed") as boolean | undefined,
    extractionId: (record.get("extractionIds") as string[])?.[0] || "",
    contradicts: (record.get("contradicts") as string[]).filter(Boolean),
  }));
}

/**
 * Gather provenance citations for a set of entity and rule IDs.
 */
async function gatherCitations(
  entityIds: string[],
  ruleIds: string[]
): Promise<GraphCitation[]> {
  if (entityIds.length === 0 && ruleIds.length === 0) return [];

  const result = await runQuery(
    `MATCH (e:Extraction)-[:CREATED]->(target)
     WHERE elementId(target) IN $entityIds
        OR (target:StyleRule AND target.ruleId IN $ruleIds)
     OPTIONAL MATCH (e)-[:EXTRACTED_FROM]->(s:Session)
     OPTIONAL MATCH (e)-[:EXTRACTED_FROM_ARTIFACT]->(a:Artifact)
     RETURN e.extractionId AS extractionId,
            e.createdAt AS createdAt,
            e.method AS method,
            e.model AS model,
            e.rawSnippet AS rawSnippet,
            s.sessionId AS sessionId,
            a.artifactId AS artifactId
     LIMIT 50`,
    { entityIds, ruleIds }
  );

  if (!result || !result.records) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return result.records.map((record: any) => ({
    extractionId: record.get("extractionId") as string,
    createdAt: String(record.get("createdAt") || ""),
    method: (record.get("method") as GraphCitation["method"]) || "rule",
    model: record.get("model") as string | undefined,
    rawSnippet: record.get("rawSnippet") as string | undefined,
    sessionId: record.get("sessionId") as string | undefined,
    artifactId: record.get("artifactId") as string | undefined,
  }));
}

/**
 * Deduplicate entities by ID.
 */
function deduplicateEntities(entities: GraphEntity[]): GraphEntity[] {
  const seen = new Map<string, GraphEntity>();
  for (const e of entities) {
    if (!seen.has(e.id)) seen.set(e.id, e);
  }
  return Array.from(seen.values());
}

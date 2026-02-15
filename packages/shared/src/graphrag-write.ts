/**
 * GraphRAG Write Path
 *
 * Extracts entities, relations, and style rules from conversation context
 * and persists them to Neo4j with full provenance via Extraction nodes.
 *
 * Per spec: docs/graph/open-canvas-graphrag-spec.md
 */

import {
  getGraphRAGMode,
  runWriteQuery,
  type ExtractionRecord,
} from "./graphdb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExtractedTriple {
  subject: string;
  predicate: string;
  object: string;
  properties?: Record<string, unknown>;
}

export interface ExtractedStyleRule {
  id: string;
  category: string;
  content: string;
  scope: "global" | "project" | "session";
  temporalMarker: "current" | "past" | "future" | "negated";
}

export interface WritePathInput {
  userId: string;
  sessionId?: string;
  artifactId?: string;
  entities: string[];
  triples: ExtractedTriple[];
  styleRules: ExtractedStyleRule[];
  extraction: ExtractionRecord;
}

// ---------------------------------------------------------------------------
// Write operations
// ---------------------------------------------------------------------------

/**
 * Persist extracted graph data to Neo4j with provenance.
 * Returns true if successful, false if skipped or failed gracefully.
 */
export async function writeToGraph(input: WritePathInput): Promise<boolean> {
  const mode = getGraphRAGMode();
  if (mode === "OFF") return false;

  try {
    // 1. Create the Extraction provenance node
    await createExtractionNode(input.extraction, input.sessionId, input.artifactId);

    // 2. Upsert Concept nodes for all entities
    for (const entity of input.entities) {
      await upsertConcept(entity, input.extraction.extractionId);
    }

    // 3. Create relations between concepts
    for (const triple of input.triples) {
      await upsertRelation(triple, input.extraction.extractionId);
    }

    // 4. Upsert style rules with contradiction detection
    for (const rule of input.styleRules) {
      await upsertStyleRule(
        input.userId,
        rule,
        input.extraction.extractionId
      );
    }

    return true;
  } catch (error) {
    if (mode === "REQUIRED") {
      throw new Error(`[GraphRAG] Write path failed: ${error}`);
    }
    console.warn("[GraphRAG] Write path failed (OPTIONAL mode):", error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function createExtractionNode(
  extraction: ExtractionRecord,
  sessionId?: string,
  artifactId?: string
): Promise<void> {
  const params: Record<string, unknown> = {
    extractionId: extraction.extractionId,
    createdAt: extraction.createdAt,
    method: extraction.method,
    model: extraction.model || null,
    rawSnippet: extraction.rawSnippet || null,
  };

  let cypher = `
    MERGE (e:Extraction {extractionId: $extractionId})
    ON CREATE SET
      e.createdAt = datetime($createdAt),
      e.method = $method,
      e.model = $model,
      e.rawSnippet = $rawSnippet
  `;

  if (sessionId) {
    cypher += `
    WITH e
    MERGE (s:Session {id: $sessionId})
    MERGE (e)-[:EXTRACTED_FROM]->(s)
    `;
    params.sessionId = sessionId;
  }

  if (artifactId) {
    cypher += `
    WITH e
    MERGE (a:Artifact {id: $artifactId})
    MERGE (e)-[:EXTRACTED_FROM_ARTIFACT]->(a)
    `;
    params.artifactId = artifactId;
  }

  await runWriteQuery(cypher, params);
}

async function upsertConcept(
  name: string,
  extractionId: string
): Promise<void> {
  const cypher = `
    MERGE (c:Concept {name: $name})
    ON CREATE SET c.createdAt = datetime(), c.updatedAt = datetime()
    ON MATCH SET c.updatedAt = datetime()
    WITH c
    MATCH (e:Extraction {extractionId: $extractionId})
    MERGE (e)-[:CREATED]->(c)
  `;
  await runWriteQuery(cypher, { name: name.toLowerCase(), extractionId });
}

async function upsertRelation(
  triple: ExtractedTriple,
  extractionId: string
): Promise<void> {
  // Use RELATED_TO as the generic relationship type, with the predicate as a property
  const cypher = `
    MERGE (s:Concept {name: $subject})
    ON CREATE SET s.createdAt = datetime(), s.updatedAt = datetime()
    MERGE (o:Concept {name: $object})
    ON CREATE SET o.createdAt = datetime(), o.updatedAt = datetime()
    MERGE (s)-[r:RELATED_TO {predicate: $predicate}]->(o)
    ON CREATE SET r.createdAt = datetime()
    SET r.properties = $properties
    WITH r
    MATCH (e:Extraction {extractionId: $extractionId})
    MERGE (e)-[:ASSERTED]->(s)
  `;
  await runWriteQuery(cypher, {
    subject: triple.subject.toLowerCase(),
    predicate: triple.predicate,
    object: triple.object.toLowerCase(),
    properties: triple.properties || {},
    extractionId,
  });
}

async function upsertStyleRule(
  userId: string,
  rule: ExtractedStyleRule,
  extractionId: string
): Promise<void> {
  // Check for contradictions with existing active rules in same scope
  const contradictionCheck = `
    MATCH (u:User {id: $userId})-[p:PREFERS]->(existing:StyleRule)
    WHERE existing.category = $category
      AND existing.scope = $scope
      AND existing.temporalMarker = 'current'
      AND existing.id <> $ruleId
    RETURN existing.id AS existingId, existing.content AS existingContent
    LIMIT 5
  `;

  const existingRules = await runWriteQuery(contradictionCheck, {
    userId,
    category: rule.category,
    scope: rule.scope,
    ruleId: rule.id,
  });

  // Upsert the style rule
  const cypher = `
    MERGE (r:StyleRule {id: $ruleId})
    ON CREATE SET
      r.category = $category,
      r.content = $content,
      r.scope = $scope,
      r.temporalMarker = $temporalMarker,
      r.since = datetime(),
      r.createdAt = datetime()
    ON MATCH SET
      r.content = $content,
      r.temporalMarker = $temporalMarker,
      r.updatedAt = datetime()
    WITH r
    MATCH (u:User {id: $userId})
    MERGE (u)-[:PREFERS {since: datetime(), scope: $scope, temporalMarker: $temporalMarker}]->(r)
    WITH r
    MATCH (e:Extraction {extractionId: $extractionId})
    MERGE (e)-[:CREATED]->(r)
  `;

  await runWriteQuery(cypher, {
    ruleId: rule.id,
    category: rule.category,
    content: rule.content,
    scope: rule.scope,
    temporalMarker: rule.temporalMarker,
    userId,
    extractionId,
  });

  // Record contradictions (per spec: contradictions must be recorded, not silently overwritten)
  if (existingRules && existingRules.length > 0) {
    for (const existing of existingRules) {
      const contradictCypher = `
        MATCH (newRule:StyleRule {id: $newRuleId})
        MATCH (existingRule:StyleRule {id: $existingId})
        MERGE (newRule)-[:CONTRADICTS {
          reason: 'Same category and scope, newer rule',
          createdAt: datetime(),
          extractionId: $extractionId
        }]->(existingRule)
      `;
      await runWriteQuery(contradictCypher, {
        newRuleId: rule.id,
        existingId: (existing as any).existingId,
        extractionId,
      });
    }
  }
}

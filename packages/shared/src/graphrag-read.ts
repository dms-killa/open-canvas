/**
 * GraphRAG Read Path
 *
 * Queries the Neo4j knowledge graph for relevant context before
 * artifact generation or rewriting.
 *
 * Per spec: docs/graph/open-canvas-graphrag-spec.md
 */

import {
  getGraphRAGMode,
  runQuery,
  type GraphContext,
  type ResolvedEntity,
  type TraversedRelation,
  type ApplicableStyleRule,
  type ProvenanceCitation,
} from "./graphdb";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Maximum nodes to return from any single query */
const MAX_NODES = 50;

/** Maximum relations to traverse */
const MAX_RELATIONS = 100;

/** Query timeout in milliseconds */
const QUERY_TIMEOUT_MS = 5000;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Query relevant graph context for the given entities and user.
 * Returns null if GraphRAG is OFF or Neo4j is unavailable.
 */
export async function queryRelevantContext(
  userId: string,
  entities: string[],
  scope?: "global" | "project" | "session"
): Promise<GraphContext | null> {
  const mode = getGraphRAGMode();
  if (mode === "OFF") return null;

  try {
    const [resolvedEntities, relations, styleRules, citations] =
      await Promise.all([
        resolveEntities(entities),
        traverseRelations(entities),
        getApplicableStyleRules(userId, scope),
        getProvenanceCitations(entities),
      ]);

    // Deduplicate
    const entityMap = new Map<string, ResolvedEntity>();
    for (const e of resolvedEntities || []) {
      entityMap.set(e.name, e);
    }

    const relationSet = new Set<string>();
    const dedupedRelations: TraversedRelation[] = [];
    for (const r of relations || []) {
      const key = `${r.source}-${r.type}-${r.target}`;
      if (!relationSet.has(key)) {
        relationSet.add(key);
        dedupedRelations.push(r);
      }
    }

    return {
      entities: Array.from(entityMap.values()),
      relations: dedupedRelations,
      styleRules: styleRules || [],
      citations: citations || [],
    };
  } catch (error) {
    if (mode === "REQUIRED") {
      throw new Error(`[GraphRAG] Read path failed: ${error}`);
    }
    console.warn("[GraphRAG] Read path failed (OPTIONAL mode):", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal query functions
// ---------------------------------------------------------------------------

async function resolveEntities(
  entities: string[]
): Promise<ResolvedEntity[]> {
  if (!entities.length) return [];

  const normalizedEntities = entities.map((e) => e.toLowerCase());

  const cypher = `
    UNWIND $entities AS entityName
    MATCH (c:Concept)
    WHERE c.name = entityName
       OR c.name CONTAINS entityName
    RETURN c.name AS name, labels(c) AS labels, properties(c) AS properties
    LIMIT $maxNodes
  `;

  const results = await runQuery(cypher, {
    entities: normalizedEntities,
    maxNodes: MAX_NODES,
  }, QUERY_TIMEOUT_MS);

  if (!results) return [];

  return results.map((r: any) => ({
    name: r.name,
    labels: r.labels,
    properties: r.properties,
  }));
}

async function traverseRelations(
  entities: string[]
): Promise<TraversedRelation[]> {
  if (!entities.length) return [];

  const normalizedEntities = entities.map((e) => e.toLowerCase());

  // Bounded 1-hop neighborhood traversal
  const cypher = `
    UNWIND $entities AS entityName
    MATCH (c:Concept {name: entityName})-[r:RELATED_TO]-(other:Concept)
    RETURN c.name AS source,
           type(r) AS type,
           r.predicate AS predicate,
           other.name AS target,
           properties(r) AS properties
    LIMIT $maxRelations
  `;

  const results = await runQuery(cypher, {
    entities: normalizedEntities,
    maxRelations: MAX_RELATIONS,
  }, QUERY_TIMEOUT_MS);

  if (!results) return [];

  return results.map((r: any) => ({
    type: r.predicate || r.type,
    source: r.source,
    target: r.target,
    properties: r.properties || {},
  }));
}

async function getApplicableStyleRules(
  userId: string,
  scope?: "global" | "project" | "session"
): Promise<ApplicableStyleRule[]> {
  let scopeFilter = "";
  const params: Record<string, unknown> = { userId, maxNodes: MAX_NODES };

  if (scope) {
    scopeFilter = "AND r.scope = $scope";
    params.scope = scope;
  }

  const cypher = `
    MATCH (u:User {id: $userId})-[p:PREFERS]->(r:StyleRule)
    WHERE r.temporalMarker = 'current' ${scopeFilter}
    OPTIONAL MATCH (e:Extraction)-[:CREATED]->(r)
    RETURN r.id AS id,
           r.category AS category,
           r.content AS content,
           r.scope AS scope,
           r.temporalMarker AS temporalMarker,
           r.since AS since,
           r.confidence AS confidence,
           e.extractionId AS extractionId
    ORDER BY r.since DESC
    LIMIT $maxNodes
  `;

  const results = await runQuery(cypher, params, QUERY_TIMEOUT_MS);

  if (!results) return [];

  return results.map((r: any) => ({
    id: r.id,
    category: r.category,
    content: r.content,
    scope: r.scope || "global",
    temporalMarker: r.temporalMarker || "current",
    since: r.since?.toString() || new Date().toISOString(),
    confidence: r.confidence,
    extractionId: r.extractionId || "",
  }));
}

async function getProvenanceCitations(
  entities: string[]
): Promise<ProvenanceCitation[]> {
  if (!entities.length) return [];

  const normalizedEntities = entities.map((e) => e.toLowerCase());

  const cypher = `
    UNWIND $entities AS entityName
    MATCH (e:Extraction)-[:CREATED]->(c:Concept {name: entityName})
    RETURN DISTINCT
           e.extractionId AS extractionId,
           e.createdAt AS createdAt,
           e.method AS method,
           e.model AS model,
           e.rawSnippet AS rawSnippet
    ORDER BY e.createdAt DESC
    LIMIT $maxNodes
  `;

  const results = await runQuery(cypher, {
    entities: normalizedEntities,
    maxNodes: MAX_NODES,
  }, QUERY_TIMEOUT_MS);

  if (!results) return [];

  return results.map((r: any) => ({
    extractionId: r.extractionId,
    createdAt: r.createdAt?.toString() || new Date().toISOString(),
    method: r.method || "rule",
    model: r.model,
    rawSnippet: r.rawSnippet,
  }));
}

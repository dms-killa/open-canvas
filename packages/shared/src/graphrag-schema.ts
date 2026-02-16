import { runQuery } from "./graphdb.js";

/**
 * Create uniqueness constraints and indexes for the GraphRAG schema.
 * Called once on first Neo4j driver connection. All queries use
 * IF NOT EXISTS so they are idempotent.
 */
export async function ensureGraphSchema(): Promise<void> {
  const constraintQueries = [
    "CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.userId IS UNIQUE",
    "CREATE CONSTRAINT session_id IF NOT EXISTS FOR (s:Session) REQUIRE s.sessionId IS UNIQUE",
    "CREATE CONSTRAINT concept_name IF NOT EXISTS FOR (c:Concept) REQUIRE c.name IS UNIQUE",
    "CREATE CONSTRAINT extraction_id IF NOT EXISTS FOR (e:Extraction) REQUIRE e.extractionId IS UNIQUE",
    "CREATE CONSTRAINT stylerule_id IF NOT EXISTS FOR (sr:StyleRule) REQUIRE sr.ruleId IS UNIQUE",
  ];

  const indexQueries = [
    "CREATE INDEX concept_name_idx IF NOT EXISTS FOR (c:Concept) ON (c.name)",
    "CREATE INDEX stylerule_scope_idx IF NOT EXISTS FOR (sr:StyleRule) ON (sr.scope, sr.active)",
    "CREATE INDEX extraction_created_idx IF NOT EXISTS FOR (e:Extraction) ON (e.createdAt)",
  ];

  for (const q of [...constraintQueries, ...indexQueries]) {
    await runQuery(q);
  }
}

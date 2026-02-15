/**
 * GraphRAG schema initialization.
 * Runs the init.cypher constraints and indexes on Neo4j startup.
 */

import { getDriver, getGraphRAGMode, runWriteQuery } from "./graphdb";

const SCHEMA_STATEMENTS = [
  // Unique constraints
  `CREATE CONSTRAINT user_id_unique IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE`,
  `CREATE CONSTRAINT artifact_id_unique IF NOT EXISTS FOR (a:Artifact) REQUIRE a.id IS UNIQUE`,
  `CREATE CONSTRAINT concept_name_unique IF NOT EXISTS FOR (c:Concept) REQUIRE c.name IS UNIQUE`,
  `CREATE CONSTRAINT session_id_unique IF NOT EXISTS FOR (s:Session) REQUIRE s.id IS UNIQUE`,
  `CREATE CONSTRAINT extraction_id_unique IF NOT EXISTS FOR (e:Extraction) REQUIRE e.extractionId IS UNIQUE`,
  `CREATE CONSTRAINT style_rule_id_unique IF NOT EXISTS FOR (r:StyleRule) REQUIRE r.id IS UNIQUE`,

  // Indexes
  `CREATE INDEX artifact_type_index IF NOT EXISTS FOR (a:Artifact) ON (a.type)`,
  `CREATE INDEX style_rule_category_index IF NOT EXISTS FOR (r:StyleRule) ON (r.category)`,
  `CREATE INDEX extraction_created_at_index IF NOT EXISTS FOR (e:Extraction) ON (e.createdAt)`,
  `CREATE INDEX concept_updated_at_index IF NOT EXISTS FOR (c:Concept) ON (c.updatedAt)`,

  // Fulltext index
  `CREATE FULLTEXT INDEX concept_fulltext IF NOT EXISTS FOR (c:Concept) ON EACH [c.name, c.description]`,

  // Default local user
  `MERGE (u:User {id: "00000000-0000-0000-0000-000000000001"}) ON CREATE SET u.username = "local-user", u.createdAt = datetime()`,
];

let _initialized = false;

/**
 * Initialize the GraphRAG schema. Idempotent — safe to call multiple times.
 */
export async function initGraphRAGSchema(): Promise<boolean> {
  if (_initialized) return true;

  const mode = getGraphRAGMode();
  if (mode === "OFF") {
    _initialized = true;
    return true;
  }

  const driver = await getDriver();
  if (!driver) {
    // OPTIONAL mode, driver unavailable
    _initialized = true;
    return false;
  }

  try {
    for (const statement of SCHEMA_STATEMENTS) {
      await runWriteQuery(statement, {}, 10000);
    }
    console.log("[GraphRAG] Schema initialized successfully");
    _initialized = true;
    return true;
  } catch (error) {
    if (mode === "REQUIRED") {
      throw new Error(`[GraphRAG] Schema initialization failed: ${error}`);
    }
    console.warn(
      "[GraphRAG] Schema initialization failed (OPTIONAL mode):",
      error
    );
    _initialized = true;
    return false;
  }
}

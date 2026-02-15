// GraphRAG Schema Initialization
// Run once on Neo4j startup to create constraints, indexes, and initial schema.
// Per: docs/graph/open-canvas-graphrag-spec.md

// ============================================================
// Unique constraints
// ============================================================

CREATE CONSTRAINT user_id_unique IF NOT EXISTS
FOR (u:User) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT artifact_id_unique IF NOT EXISTS
FOR (a:Artifact) REQUIRE a.id IS UNIQUE;

CREATE CONSTRAINT concept_name_unique IF NOT EXISTS
FOR (c:Concept) REQUIRE c.name IS UNIQUE;

CREATE CONSTRAINT session_id_unique IF NOT EXISTS
FOR (s:Session) REQUIRE s.id IS UNIQUE;

CREATE CONSTRAINT extraction_id_unique IF NOT EXISTS
FOR (e:Extraction) REQUIRE e.extractionId IS UNIQUE;

CREATE CONSTRAINT style_rule_id_unique IF NOT EXISTS
FOR (r:StyleRule) REQUIRE r.id IS UNIQUE;

// ============================================================
// Indexes for common queries
// ============================================================

CREATE INDEX artifact_type_index IF NOT EXISTS
FOR (a:Artifact) ON (a.type);

CREATE INDEX style_rule_category_index IF NOT EXISTS
FOR (r:StyleRule) ON (r.category);

CREATE INDEX extraction_created_at_index IF NOT EXISTS
FOR (e:Extraction) ON (e.createdAt);

CREATE INDEX concept_updated_at_index IF NOT EXISTS
FOR (c:Concept) ON (c.updatedAt);

// ============================================================
// Fulltext index for Concept search
// ============================================================

CREATE FULLTEXT INDEX concept_fulltext IF NOT EXISTS
FOR (c:Concept) ON EACH [c.name, c.description];

// ============================================================
// Insert default local user node
// ============================================================

MERGE (u:User {id: "00000000-0000-0000-0000-000000000001"})
ON CREATE SET u.username = "local-user", u.createdAt = datetime();

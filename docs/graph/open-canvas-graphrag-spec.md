# GraphRAG Enhancement Spec (Neo4j + Provenance + Temporal Rules)

## Purpose

Add an optional Neo4j knowledge graph layer to Open Canvas to support:

- entity continuity across sessions and artifacts
- relationship traversal for context building
- temporal, scoped preference and style rule persistence
- contradiction detection with provenance

This spec does not assert implementation exists yet. It defines the contract for a future PR.

## Local-only constraints

- Neo4j runs locally (container or local install).
- No managed Neo4j service required.
- The application must function when GraphRAG is OFF.
- When GraphRAG is OPTIONAL, Neo4j failure must degrade gracefully.

## Dependency policy

GraphRAG has three modes:

- OFF (default): no Neo4j calls
- OPTIONAL: best-effort Neo4j usage; failures produce null graph context
- REQUIRED (explicit): requests fail fast if Neo4j is unavailable

Mode selection is a configuration setting.

## State contract

Add a null-safe field to agent state:

- `graphContext: GraphContext | null`

GraphContext contains:

- entities: resolved entities relevant to the request
- relations: traversed edges with provenance pointers
- styleRules: applicable rules filtered by scope and temporal marker
- citations: pointers to sessions/artifacts/extractions that justify facts

If GraphRAG is OFF or Neo4j is unavailable in OPTIONAL mode, graphContext is null.

## Services and configuration

Environment variables:

- `NEO4J_URI`
- `NEO4J_USER`
- `NEO4J_PASSWORD`

Client module (suggested location):

- `packages/shared/src/graphdb.ts`

Client requirements:

- timeouts on all queries
- structured logging
- null-safe fallbacks in OPTIONAL mode

## Graph schema (versioned)

### Node labels

- User
- Session
- Artifact
- Concept
- StyleRule
- Extraction (required)

### Core relationships

- (User)-[:STARTED]->(Session)
- (Session)-[:CONTAINS]->(Artifact)
- (User)-[:CREATED]->(Artifact)
- (Artifact)-[:MENTIONS]->(Concept)
- (Concept)-[:RELATED_TO]->(Concept)
- (User)-[:PREFERS]->(StyleRule)

### Provenance via Extraction nodes (required)

All derived facts must connect to an Extraction node:

- (Extraction)-[:EXTRACTED_FROM]->(Session)
- (Extraction)-[:EXTRACTED_FROM_ARTIFACT]->(Artifact)
- (Extraction)-[:CREATED]->(Concept|StyleRule)
- (Extraction)-[:ASSERTED]->(RelationshipInstance or a relationship surrogate)

Extraction properties:

- extractionId
- createdAt
- method: rule | llm | hybrid
- model: model identifier if method uses an LLM
- rawSnippet: short bounded snippet for debugging
- sourceSpan: optional offsets if available

No fact is allowed to exist without an Extraction pointer.

## Temporal semantics (required)

Every preference-like edge, especially PREFERS, must carry:

- since: datetime
- scope: global | project | session
- temporalMarker: current | past | future | negated

Optional but recommended:

- expiresAt: datetime | null
- confidence: 0..1

## Contradiction detection (required)

Contradictions must be recorded, not silently overwritten.

Represent contradictions via one of:

- (StyleRule)-[:CONTRADICTS {reason, createdAt, extractionId}]->(StyleRule)
- or store `contradictsRuleId` on the newer rule edge

At write time:
- new rule insertion must check for contradiction against existing active rules in the same scope.

## Contradiction resolution strategies

Possible strategies:

- most-recent-wins within same scope
- explicit user-confirmation wins
- negated overrides current unless strict
- strict rules require explicit confirmation to override

### Resolution strategy selection (required)

How strategy is selected:

- Default strategy is set in system config:
  - `graphRag.contradictionStrategy = "most-recent-wins"` (example)
- User override:
  - explicit UI confirmation sets `confirmed: true` on the relevant rule or edge
  - confirmed rules take precedence within the same scope
- Per-rule strictness:
  - rules can declare `strict: true`
  - strict rules require confirmation before any override becomes active
- Auditability:
  - the active rule selection must be explainable by:
    - strategy config
    - confirmed flags
    - temporal markers
    - scope rules

## Integration points

### Write path (reflection or post-response)

On memory update:

- extract entities, relations, rules from:
  - user message
  - assistant response
  - artifact deltas
- create an Extraction node
- upsert Concept and StyleRule nodes
- attach provenance from Extraction
- evaluate contradictions and mark active or contested

Failure behavior:

- OPTIONAL mode: log and continue without graph context
- REQUIRED mode: fail the GraphRAG write step explicitly

### Read path (pre-generation)

Before artifact generation or rewriting:

- detect entities in the prompt and artifact
- resolve to Concept nodes
- traverse bounded neighborhood
- retrieve active StyleRules filtered by scope and temporalMarker
- assemble graphContext with provenance pointers

Hard limits:

- maximum nodes and edges fetched
- query timeouts
- deduplication

## Hybrid retrieval (graph plus vector)

Default approach:

1. vector retrieval proposes candidate chunks
2. entity extraction from those chunks seeds graph traversal
3. graph traversal returns structured context and applicable rules
4. merged context includes provenance pointers

Embedding storage policy:

- embeddings stay in the existing vector store by default
- graph stores references, not duplicates, unless justified by a later PR

## Web search gating policy

Web search should be gated, not deleted.

Allowed patterns:

- local search provider (recommended)
- explicit disabled stub that routes safely and returns a deterministic result

GraphRAG can improve recall from local corpora and history, but is not a substitute for web search.

## Acceptance criteria

- OFF: behavior unchanged
- OPTIONAL: Neo4j down yields graphContext=null and no crash
- REQUIRED: Neo4j down yields explicit failure
- every stored rule and relation has Extraction provenance
- temporal markers and scope enforced for rules
- contradictions recorded and strategy selection is auditable
- topology contract (open-canvas-graph-topology.md) remains satisfied


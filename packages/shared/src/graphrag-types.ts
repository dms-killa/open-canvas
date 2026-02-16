// === GraphRAG Mode ===
export type GraphRAGMode = "OFF" | "OPTIONAL" | "REQUIRED";

// === GraphContext (added to agent state) ===
export interface GraphEntity {
  id: string;
  label: string; // "Concept" | "StyleRule" | "User" | "Session" | "Artifact"
  properties: Record<string, unknown>;
}

export interface GraphRelation {
  source: string;
  target: string;
  type: string;
  properties: Record<string, unknown>;
  extractionId: string;
}

export interface GraphStyleRule {
  id: string;
  rule: string;
  scope: "global" | "project" | "session";
  temporalMarker: "current" | "past" | "future" | "negated";
  since: string; // ISO datetime
  expiresAt?: string;
  confidence?: number;
  strict?: boolean;
  confirmed?: boolean;
  extractionId: string;
  contradicts?: string[]; // IDs of contradicted rules
}

export interface GraphCitation {
  extractionId: string;
  sessionId?: string;
  artifactId?: string;
  createdAt: string;
  method: "rule" | "llm" | "hybrid";
  model?: string;
  rawSnippet?: string;
}

export interface GraphContext {
  entities: GraphEntity[];
  relations: GraphRelation[];
  styleRules: GraphStyleRule[];
  citations: GraphCitation[];
}

// === Extraction node ===
export interface ExtractionRecord {
  extractionId: string;
  createdAt: string;
  method: "rule" | "llm" | "hybrid";
  model?: string;
  rawSnippet?: string;
  sourceSpan?: { start: number; end: number };
}

// === Contradiction ===
export interface ContradictionRecord {
  newRuleId: string;
  existingRuleId: string;
  reason: string;
  strategy: ContradictionStrategy;
  resolution: "new-wins" | "existing-wins" | "pending-confirmation";
  createdAt: string;
  extractionId: string;
}

export type ContradictionStrategy =
  | "most-recent-wins"
  | "user-confirmation"
  | "negated-overrides"
  | "strict-requires-confirmation";

// === Client config ===
export interface GraphDBConfig {
  uri: string;
  user: string;
  password: string;
  mode: GraphRAGMode;
  queryTimeoutMs: number;
  maxNodes: number;
  maxEdges: number;
  contradictionStrategy: ContradictionStrategy;
}

// === LLM extraction results (used by write path) ===
export interface ExtractedEntity {
  name: string;
  type: "Concept" | "StyleRule";
  properties?: Record<string, unknown>;
}

export interface ExtractedRelation {
  source: string;
  target: string;
  type: string;
}

export interface ExtractedStyleRule {
  rule: string;
  scope: "global" | "project" | "session";
  temporalMarker: "current" | "past" | "future" | "negated";
  confidence?: number;
  strict?: boolean;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relations: ExtractedRelation[];
  styleRules: ExtractedStyleRule[];
  rawSnippet: string;
}

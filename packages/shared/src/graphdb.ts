/**
 * Neo4j GraphRAG client module.
 *
 * Provides a null-safe, mode-aware Neo4j driver wrapper.
 * Modes (set via GRAPHRAG_MODE env var):
 *   OFF      – no Neo4j calls, all queries return null (default)
 *   OPTIONAL – best-effort; failures produce null graph context
 *   REQUIRED – fail-fast if Neo4j is unavailable
 */

export type GraphRAGMode = "OFF" | "OPTIONAL" | "REQUIRED";

export interface GraphContext {
  entities: ResolvedEntity[];
  relations: TraversedRelation[];
  styleRules: ApplicableStyleRule[];
  citations: ProvenanceCitation[];
}

export interface ResolvedEntity {
  name: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface TraversedRelation {
  type: string;
  source: string;
  target: string;
  properties: Record<string, unknown>;
  extractionId?: string;
}

export interface ApplicableStyleRule {
  id: string;
  category: string;
  content: string;
  scope: "global" | "project" | "session";
  temporalMarker: "current" | "past" | "future" | "negated";
  since: string;
  confidence?: number;
  extractionId: string;
}

export interface ProvenanceCitation {
  extractionId: string;
  createdAt: string;
  method: "rule" | "llm" | "hybrid";
  model?: string;
  rawSnippet?: string;
}

export interface ExtractionRecord {
  extractionId: string;
  createdAt: string;
  method: "rule" | "llm" | "hybrid";
  model?: string;
  rawSnippet?: string;
  sourceSpan?: { start: number; end: number };
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function getGraphRAGMode(): GraphRAGMode {
  const mode = (process.env.GRAPHRAG_MODE || "OFF").toUpperCase();
  if (mode === "OPTIONAL" || mode === "REQUIRED") return mode;
  return "OFF";
}

// ---------------------------------------------------------------------------
// Neo4j driver wrapper (lazy initialization)
// ---------------------------------------------------------------------------

let _driver: any | null = null;
let _driverInitAttempted = false;

/**
 * Get or lazily create the Neo4j driver.
 * Returns null if mode is OFF or if driver creation fails in OPTIONAL mode.
 * Throws in REQUIRED mode if connection fails.
 */
export async function getDriver(): Promise<any | null> {
  const mode = getGraphRAGMode();
  if (mode === "OFF") return null;

  if (_driverInitAttempted) return _driver;
  _driverInitAttempted = true;

  const uri = process.env.NEO4J_URI || "bolt://localhost:7687";
  const user = process.env.NEO4J_USER || "neo4j";
  const password = process.env.NEO4J_PASSWORD || "opencanvas_local";

  try {
    // Dynamic import to avoid hard dependency when mode is OFF
    const neo4j = await import("neo4j-driver");
    _driver = neo4j.default.driver(
      uri,
      neo4j.default.auth.basic(user, password)
    );

    // Verify connectivity
    await _driver.verifyConnectivity();
    console.log(`[GraphRAG] Connected to Neo4j at ${uri} (mode: ${mode})`);
    return _driver;
  } catch (error) {
    _driver = null;
    if (mode === "REQUIRED") {
      throw new Error(
        `[GraphRAG] REQUIRED mode: Neo4j connection failed at ${uri}: ${error}`
      );
    }
    console.warn(
      `[GraphRAG] OPTIONAL mode: Neo4j unavailable at ${uri}, proceeding without graph context`
    );
    return null;
  }
}

/**
 * Execute a Cypher query with timeout and null-safe fallback.
 * Returns null if driver is unavailable or query fails in OPTIONAL mode.
 */
export async function runQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
  timeoutMs: number = 5000
): Promise<T[] | null> {
  const driver = await getDriver();
  if (!driver) return null;

  const mode = getGraphRAGMode();
  const session = driver.session({ defaultAccessMode: "READ" });

  try {
    const result = await session.run(cypher, params, {
      timeout: timeoutMs,
    });
    return result.records.map((r: any) => r.toObject() as T);
  } catch (error) {
    if (mode === "REQUIRED") {
      throw new Error(`[GraphRAG] Query failed: ${error}`);
    }
    console.warn(`[GraphRAG] Query failed (OPTIONAL mode), returning null:`, error);
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Execute a write Cypher query with timeout and null-safe fallback.
 */
export async function runWriteQuery<T = Record<string, unknown>>(
  cypher: string,
  params: Record<string, unknown> = {},
  timeoutMs: number = 5000
): Promise<T[] | null> {
  const driver = await getDriver();
  if (!driver) return null;

  const mode = getGraphRAGMode();
  const session = driver.session({ defaultAccessMode: "WRITE" });

  try {
    const result = await session.run(cypher, params, {
      timeout: timeoutMs,
    });
    return result.records.map((r: any) => r.toObject() as T);
  } catch (error) {
    if (mode === "REQUIRED") {
      throw new Error(`[GraphRAG] Write query failed: ${error}`);
    }
    console.warn(
      `[GraphRAG] Write query failed (OPTIONAL mode), returning null:`,
      error
    );
    return null;
  } finally {
    await session.close();
  }
}

/**
 * Close the Neo4j driver. Call on shutdown.
 */
export async function closeDriver(): Promise<void> {
  if (_driver) {
    await _driver.close();
    _driver = null;
    _driverInitAttempted = false;
  }
}

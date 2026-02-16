import type { GraphDBConfig, GraphRAGMode } from "./graphrag-types.js";

// Neo4j driver types (optional dependency)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _driver: any = null;
let _config: GraphDBConfig | null = null;
let _schemaInitialized = false;

export function getGraphRAGMode(): GraphRAGMode {
  return (process.env.GRAPHRAG_MODE as GraphRAGMode) || "OFF";
}

export function getGraphDBConfig(): GraphDBConfig {
  return {
    uri: process.env.NEO4J_URI || "bolt://localhost:7687",
    user: process.env.NEO4J_USER || "neo4j",
    password: process.env.NEO4J_PASSWORD || "",
    mode: getGraphRAGMode(),
    queryTimeoutMs: parseInt(process.env.GRAPHRAG_TIMEOUT_MS || "5000", 10),
    maxNodes: parseInt(process.env.GRAPHRAG_MAX_NODES || "50", 10),
    maxEdges: parseInt(process.env.GRAPHRAG_MAX_EDGES || "100", 10),
    contradictionStrategy:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (process.env.GRAPHRAG_CONTRADICTION_STRATEGY as any) || "most-recent-wins",
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getDriver(): Promise<any | null> {
  const mode = getGraphRAGMode();
  if (mode === "OFF") return null;

  if (_driver) return _driver;

  try {
    // Dynamic import — neo4j-driver is an optional dependency
    const neo4j = await import("neo4j-driver");
    const config = getGraphDBConfig();
    _driver = neo4j.default.driver(
      config.uri,
      neo4j.default.auth.basic(config.user, config.password),
      { maxConnectionPoolSize: 10 }
    );
    await _driver.verifyConnectivity();
    _config = config;

    // Initialize schema on first connection
    if (!_schemaInitialized) {
      const { ensureGraphSchema } = await import("./graphrag-schema.js");
      await ensureGraphSchema();
      _schemaInitialized = true;
    }

    return _driver;
  } catch (err) {
    if (mode === "REQUIRED") {
      throw new Error(`Neo4j connection failed in REQUIRED mode: ${err}`);
    }
    console.warn(
      "Neo4j unavailable in OPTIONAL mode, degrading gracefully:",
      err
    );
    return null;
  }
}

export async function runQuery(
  cypher: string,
  params: Record<string, unknown> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | null> {
  const driver = await getDriver();
  if (!driver) return null;

  const config = _config || getGraphDBConfig();
  const session = driver.session();
  try {
    return await session.run(cypher, params, {
      timeout: config.queryTimeoutMs,
    });
  } catch (err) {
    if (config.mode === "REQUIRED") throw err;
    console.warn("Neo4j query failed in OPTIONAL mode:", err);
    return null;
  } finally {
    await session.close();
  }
}

export async function closeDriver(): Promise<void> {
  if (_driver) {
    await _driver.close();
    _driver = null;
    _config = null;
    _schemaInitialized = false;
  }
}

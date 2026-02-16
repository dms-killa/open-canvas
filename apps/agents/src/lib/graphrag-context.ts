import type { GraphContext } from "@opencanvas/shared/graphrag-types";
import { getGraphRAGMode } from "@opencanvas/shared/graphdb";
import { buildGraphContext } from "@opencanvas/shared/graphrag-read";
import { formatGraphContextForPrompt } from "@opencanvas/shared/graphrag-format";
import type { LangGraphRunnableConfig } from "@langchain/langgraph";
import type { BaseMessage } from "@langchain/core/messages";

/**
 * Get GraphRAG context for generation nodes. Returns both the raw
 * GraphContext (for state) and a formatted prompt string (for injection
 * into LLM system prompts).
 *
 * Returns null context and empty prompt when mode is OFF or Neo4j
 * is unavailable in OPTIONAL mode.
 */
export async function getGraphContextForGeneration(
  messages: BaseMessage[],
  artifactContent: string | undefined,
  config: LangGraphRunnableConfig
): Promise<{ graphContext: GraphContext | null; graphContextPrompt: string }> {
  const mode = getGraphRAGMode();
  if (mode === "OFF") {
    return { graphContext: null, graphContextPrompt: "" };
  }

  try {
    const lastMessage = messages[messages.length - 1];
    const promptText =
      typeof lastMessage?.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage?.content || "");

    const ctx = await buildGraphContext({
      userId:
        config.configurable?.open_canvas_assistant_id ||
        config.configurable?.assistant_id ||
        "default",
      sessionId: config.configurable?.thread_id || "unknown",
      promptText,
      artifactContent,
    });

    return {
      graphContext: ctx,
      graphContextPrompt: formatGraphContextForPrompt(ctx),
    };
  } catch (err) {
    if (mode === "REQUIRED") throw err;
    console.warn("GraphRAG read failed in OPTIONAL mode:", err);
    return { graphContext: null, graphContextPrompt: "" };
  }
}

import { ChatOpenAI } from "@langchain/openai";
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ArtifactMarkdownV3, ArtifactCodeV3 } from "@opencanvas/shared/types";
import { isArtifactMarkdownContent } from "@opencanvas/shared/utils/artifacts";

export function getModelFromConfig(
  config: LangGraphRunnableConfig & { temperature?: number; maxTokens?: number }
) {
  let modelName =
    config.configurable?.customModelName ||
    process.env.OLLAMA_CHAT_MODEL ||
    process.env.OLLAMA_MODEL ||
    "ollama-llama3.3";

  const isOllama = modelName.startsWith("ollama-");
  const isLiteLLM = modelName.startsWith("litellm-");

  // Strip prefix for the actual model name sent to the API
  if (isOllama) {
    modelName = modelName.replace("ollama-", "");
  } else if (isLiteLLM) {
    modelName = modelName.replace("litellm-", "");
  }

  if (isOllama) {
    const baseUrl = process.env.OLLAMA_API_URL
      ? `${process.env.OLLAMA_API_URL}/v1`
      : "http://localhost:11434/v1";

    return new ChatOpenAI({
      model: modelName,
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 2048,
      streaming: true,
      configuration: {
        baseURL: baseUrl,
        apiKey: "ollama",
      },
    });
  }

  if (isLiteLLM) {
    const baseUrl = process.env.LITELLM_BASE_URL || "http://litellm:8000/v1";

    return new ChatOpenAI({
      model: modelName,
      temperature: config?.temperature ?? 0.7,
      maxTokens: config?.maxTokens ?? 2048,
      configuration: {
        baseURL: baseUrl,
        apiKey: "litellm",
      },
    });
  }

  return new ChatOpenAI({
    model: modelName,
    temperature: config?.temperature ?? 0.7,
    maxTokens: config?.maxTokens ?? 2048,
  });
}

export function formatArtifactContent(
  content: ArtifactMarkdownV3 | ArtifactCodeV3,
  shortenContent?: boolean
): string {
  if (isArtifactMarkdownContent(content)) {
    return content.fullMarkdown;
  } else {
    return content.code;
  }
}
export function isUsingO1MiniModel(config: LangGraphRunnableConfig) {
  const modelName =
    config.configurable?.customModelName ||
    process.env.OLLAMA_CHAT_MODEL ||
    process.env.OLLAMA_MODEL ||
    "ollama-llama3.3";
  return modelName.includes("o1-mini");
}

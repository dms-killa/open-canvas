import { LangGraphRunnableConfig } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";

type LocalModelConfig =
  | {
      temperatureRange?: { current?: number };
      maxTokens?: { current?: number };
    }
  | undefined;

export const getModelConfig = (
  config: LangGraphRunnableConfig
): {
  modelName: string;
  modelProvider: string;
  modelConfig?: LocalModelConfig;
  baseUrl?: string;
} => {
  const customModelName = config.configurable?.customModelName as string;
  if (!customModelName) throw new Error("Model name is missing in config.");

  if (customModelName.startsWith("litellm-")) {
    return {
      modelName: customModelName.replace("litellm-", ""),
      modelProvider: "litellm",
      baseUrl: process.env.LITELLM_BASE_URL || "http://litellm:8000/v1",
    };
  }

  if (customModelName.startsWith("ollama-")) {
    return {
      modelName: customModelName.replace("ollama-", ""),
      modelProvider: "ollama",
      baseUrl:
        process.env.OLLAMA_API_URL
          ? `${process.env.OLLAMA_API_URL}/v1`
          : "http://localhost:11434/v1",
    };
  }

  // For cloud providers (openai, anthropic, etc.), extract provider from model name
  const provider = getProviderFromModelName(customModelName);
  const apiKey = getApiKeyForProvider(provider);
  if (!apiKey) {
    throw new Error(
      `API key required for provider: ${provider}. Set the appropriate environment variable.`
    );
  }

  return {
    modelName: customModelName,
    modelProvider: provider,
  };
};

function getProviderFromModelName(modelName: string): string {
  if (modelName.startsWith("gpt-") || modelName.startsWith("o1") || modelName.startsWith("o3") || modelName.startsWith("o4")) return "openai";
  if (modelName.startsWith("claude-")) return "anthropic";
  if (modelName.includes("fireworks/")) return "fireworks";
  if (modelName.startsWith("gemini-")) return "google-genai";
  if (modelName.startsWith("azure/")) return "azure_openai";
  if (modelName.startsWith("groq/")) return "groq";
  return "openai";
}

function getApiKeyForProvider(provider: string): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "fireworks":
      return process.env.FIREWORKS_API_KEY;
    case "google-genai":
      return process.env.GOOGLE_API_KEY;
    case "azure_openai":
      return process.env._AZURE_OPENAI_API_KEY;
    case "groq":
      return process.env.GROQ_API_KEY;
    default:
      return undefined;
  }
}

export async function getModelFromConfig(
  config: LangGraphRunnableConfig,
  extra?: {
    temperature?: number;
    maxTokens?: number;
    isToolCalling?: boolean;
  }
): Promise<ChatOpenAI> {
  const { modelName, modelProvider, baseUrl } = getModelConfig(config);
  const { temperature = 0.5, maxTokens } = {
    temperature: config.configurable?.modelConfig?.temperatureRange.current,
    maxTokens: config.configurable?.modelConfig?.maxTokens.current,
    ...extra,
  };

  if (modelProvider === "ollama") {
    return new ChatOpenAI({
      modelName,
      temperature,
      maxTokens,
      streaming: true,
      configuration: {
        baseURL: baseUrl,
        apiKey: "ollama",
      },
    });
  }

  return new ChatOpenAI({
    modelName,
    temperature,
    maxTokens,
  });
}

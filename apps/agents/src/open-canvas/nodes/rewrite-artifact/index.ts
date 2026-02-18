import { LangGraphRunnableConfig } from "@langchain/langgraph";
import {
  OpenCanvasGraphAnnotation,
  OpenCanvasGraphReturnType,
} from "../../state.js";
import {
  getArtifactContent,
  isArtifactMarkdownContent,
  isArtifactCodeContent,
} from "@opencanvas/shared/utils/artifacts";
import { ArtifactV3 } from "@opencanvas/shared/types";
import { getModelFromConfigLocal as getModelFromConfig } from "../../../lib/model-config.local";
import { getFormattedReflections } from "../../../lib/reflections";
import { getGraphContextForGeneration } from "../../../lib/graphrag-context";
import { createContextDocumentMessagesOpenAI as createContextDocumentMessages } from "../../../lib/context-docs";
import { optionallyUpdateArtifactMeta } from "./update-meta.js";
import { buildPrompt, createNewArtifactContent } from "./utils.js";
import { z } from "zod";
import { OPTIONALLY_UPDATE_ARTIFACT_META_SCHEMA } from "./schemas.js";

export const rewriteArtifact = async (
  state: typeof OpenCanvasGraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<OpenCanvasGraphReturnType> => {
  const currentArtifactContent = state.artifact
    ? getArtifactContent(state.artifact)
    : undefined;
  if (!currentArtifactContent) {
    throw new Error("No artifact found");
  }

  const recentHumanMessage = state._messages.findLast(
    (message) => message.getType() === "human"
  );
  if (!recentHumanMessage) {
    throw new Error("No recent human message found");
  }

  // Get reflections/memories
  const memoriesAsString = await getFormattedReflections(config);

  // Determine artifact type and content
  const isCode = isArtifactCodeContent(currentArtifactContent);
  const artifactContent = isCode
    ? currentArtifactContent.code
    : isArtifactMarkdownContent(currentArtifactContent)
      ? currentArtifactContent.fullMarkdown
      : "";

  // Optionally update artifact meta (type, title, language)
  const metaResponse = await optionallyUpdateArtifactMeta(state, config);
  const metaToolCall = metaResponse?.tool_calls?.[0]?.args as
    | z.infer<typeof OPTIONALLY_UPDATE_ARTIFACT_META_SCHEMA>
    | undefined;

  const artifactMetaToolCall = metaToolCall || {
    type: isCode ? "code" : "text",
    title: currentArtifactContent.title,
    language: isCode ? (currentArtifactContent as any).language : "other",
  };

  const isNewType =
    (isCode && artifactMetaToolCall.type === "text") ||
    (!isCode && artifactMetaToolCall.type === "code");

  // Build the rewrite prompt
  const formattedPrompt = buildPrompt({
    artifactContent,
    memoriesAsString,
    isNewType,
    artifactMetaToolCall,
  });

  // GraphRAG read path
  const { graphContext, graphContextPrompt } =
    await getGraphContextForGeneration(state._messages, artifactContent, config);

  const systemContent = graphContextPrompt
    ? `${formattedPrompt}\n\n${graphContextPrompt}`
    : formattedPrompt;

  const smallModel = await getModelFromConfig();
  const contextDocumentMessages = await createContextDocumentMessages(
    state._messages
  );

  const response = await smallModel.invoke([
    { role: "system", content: systemContent },
    ...contextDocumentMessages,
    recentHumanMessage,
  ]);

  const newContent = response.content as string;
  const newArtifactContent = createNewArtifactContent({
    artifactType: artifactMetaToolCall.type,
    state,
    currentArtifactContent: currentArtifactContent as any,
    artifactMetaToolCall,
    newContent,
  });

  const newArtifact: ArtifactV3 = {
    ...state.artifact,
    currentIndex: state.artifact.contents.length + 1,
    contents: [
      ...state.artifact.contents,
      {
        ...newArtifactContent,
        index: state.artifact.contents.length + 1,
      },
    ],
  };

  return {
    artifact: newArtifact,
    graphContext,
  };
};

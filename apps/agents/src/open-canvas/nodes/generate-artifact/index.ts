import { getFormattedReflections } from "../../../lib/reflections";
import { createContextDocumentMessagesOpenAI as createContextDocumentMessages } from "../../../utils/contextDocs";
import { getModelFromConfigLocal } from "../../../lib/model-config.local";
import { getGraphContextForGeneration } from "../../../lib/graphrag-context";
type ArtifactV3Local = any; // TODO: tighten later
import { LangGraphRunnableConfig } from "@langchain/langgraph";
import {
  OpenCanvasGraphAnnotation,
  OpenCanvasGraphReturnType,
} from "../../state.js";
import { ARTIFACT_TOOL_SCHEMA } from "./schemas.js";
import { createArtifactContent, formatNewArtifactPrompt } from "./utils.js";
import { z } from "zod";

/**
 * Generate a new artifact based on the user's query.
 */
export const generateArtifact = async (
  state: typeof OpenCanvasGraphAnnotation.State,
  config: LangGraphRunnableConfig
): Promise<OpenCanvasGraphReturnType> => {
  const { modelName } = getModelFromConfigLocal();
  const smallModel = await getModelFromConfigLocal();

  const modelWithArtifactTool = smallModel.bindTools(
    [
      {
        name: "generate_artifact",
        description: ARTIFACT_TOOL_SCHEMA.description,
        schema: ARTIFACT_TOOL_SCHEMA,
      },
    ],
    {
      tool_choice: "generate_artifact",
    }
  );

  const memoriesAsString = await getFormattedReflections(config);
  const formattedNewArtifactPrompt = formatNewArtifactPrompt(
    memoriesAsString,
    modelName
  );

  // GraphRAG read path: fetch graph context for generation
  const { graphContext, graphContextPrompt } =
    await getGraphContextForGeneration(state._messages, undefined, config);

  const userSystemPrompt = ""; // or some default value
  const systemParts = [formattedNewArtifactPrompt];
  if (userSystemPrompt) systemParts.unshift(userSystemPrompt);
  if (graphContextPrompt) systemParts.push(graphContextPrompt);
  const fullSystemPrompt = systemParts.join("\n\n");

  const contextDocumentMessages = await createContextDocumentMessages(
    state._messages
  );
  const response = await modelWithArtifactTool.invoke([
    { role: "system", content: fullSystemPrompt },
    ...contextDocumentMessages,
    ...state._messages,
  ]);
  const args = response.tool_calls?.[0].args as
    | z.infer<typeof ARTIFACT_TOOL_SCHEMA>
    | undefined;
  if (!args) {
    throw new Error("No args found in response");
  }

  const newArtifactContent = createArtifactContent(args);
  const newArtifact: ArtifactV3Local = {
    currentIndex: 1,
    contents: [newArtifactContent],
  };

  return {
    artifact: newArtifact,
    graphContext,
  };
};

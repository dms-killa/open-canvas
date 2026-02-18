import { StateGraph, START, END } from "@langchain/langgraph";
import { OpenCanvasGraphAnnotation } from "./state.js";
import { routeNode, cleanState, conditionallyGenerateTitle } from "./router.js";
import { routePostWebSearch } from "./web-search-bridge.js";
import { registerArtifactFlow } from "./artifact-flow.js";
import { customAction } from "./nodes/customAction.js";
import { generateArtifact } from "./nodes/generate-artifact/index.js";
import { generateFollowup } from "./nodes/generateFollowup.js";
import { generatePath } from "./nodes/generate-path/index.js";
import { reflectNode } from "./nodes/reflect.js";
import { updateArtifact } from "./nodes/updateArtifact.js";
import { replyToGeneralInput } from "./nodes/replyToGeneralInput.js";
import { generateTitleNode } from "./nodes/generateTitle.js";
import { updateHighlightedText } from "./nodes/updateHighlightedText.js";
import { summarizer } from "./nodes/summarizer.js";
import { graph as webSearchGraph } from "../web-search/index.js";
import { rewriteArtifact } from "./nodes/rewrite-artifact/index.js";
import { rewriteArtifactTheme } from "./nodes/rewriteArtifactTheme.js";
import { rewriteCodeArtifactTheme } from "./nodes/rewriteCodeArtifactTheme.js";

const builder = new StateGraph(OpenCanvasGraphAnnotation)
  .addNode("customAction", customAction)
  .addNode("generateArtifact", generateArtifact)
  .addNode("generateFollowup", generateFollowup)
  .addNode("generatePath", generatePath)
  .addNode("reflect", reflectNode)
  .addNode("updateArtifact", updateArtifact)
  .addNode("replyToGeneralInput", replyToGeneralInput)
  .addNode("cleanState", cleanState)
  .addNode("generateTitle", generateTitleNode)
  .addNode("updateHighlightedText", updateHighlightedText)
  .addNode("summarizer", summarizer)
  .addNode("webSearch", webSearchGraph)
  .addNode("rewriteArtifact", rewriteArtifact)
  .addNode("rewriteArtifactTheme", rewriteArtifactTheme)
  .addNode("rewriteCodeArtifactTheme", rewriteCodeArtifactTheme)
  .addNode("routePostWebSearch", routePostWebSearch)
  .addEdge(START, "generatePath")
  .addEdge("generatePath", "replyToGeneralInput")
  .addConditionalEdges("generatePath", routeNode, [
    "generateArtifact",
    "rewriteArtifact",
    "replyToGeneralInput",
    "updateArtifact",
    "updateHighlightedText",
    "rewriteArtifactTheme",
    "rewriteCodeArtifactTheme",
    "customAction",
    "webSearch",
  ])
  .addEdge("webSearch", "routePostWebSearch")
  .addEdge("replyToGeneralInput", "cleanState")
  .addEdge("cleanState", "updateHighlightedText")
  .addEdge("generateArtifact", "reflect")
  .addEdge("reflect", END)
  .addConditionalEdges("cleanState", conditionallyGenerateTitle, [
    END,
    "generateTitle",
    "summarizer",
  ])
  .addEdge("generateTitle", END)
  .addEdge("summarizer", END)
  .addEdge("generateFollowup", "updateArtifact")
  .addEdge("cleanState", "rewriteArtifact")
  .addEdge("cleanState", "rewriteArtifactTheme")
  .addEdge("cleanState", "rewriteCodeArtifactTheme")
  .addEdge("cleanState", "customAction")
  .addEdge("cleanState", "webSearch");
registerArtifactFlow(builder);

export const graph = builder.compile().withConfig({ runName: "open_canvas" });

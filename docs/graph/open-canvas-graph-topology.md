# Open Canvas Graph Topology Contract (Nodes + Edges)

## Purpose

This document is the topology contract for the Open Canvas LangGraph graphs in this fork.

It exists because prior local-only modifications caused orphaned nodes: nodes remained registered in code but became unreachable due to pruned routing destinations or edges. This contract prevents silent graph drift.

Baseline rule:
- Topology parity with upstream is the default.
- Local-only constraints should be enforced via gating and configuration, not by silently removing nodes or edges.

## Definitions

- Node: registered via `addNode("<name>", ...)`.
- Static edge: registered via `addEdge("<from>", "<to>")`.
- Conditional edge set: registered via `addConditionalEdges("<from>", routerFn, destinations)`.

Authoritative identifiers are the literal strings passed into `addNode` and `addEdge`.

## Contract Invariants (Must Hold)

1. No unreachable nodes
   - Every `addNode(...)` must be reachable from `START`.

2. Router destination completeness
   - Every router return string must be present in the declared `addConditionalEdges` destinations.
   - Every declared destination must match a real node name.

3. No silent pruning
   - Nodes and edges cannot be removed merely to simplify local-only operation.
   - Any pruning must satisfy Pruning Criteria and must update this document.

4. Local-only is implemented as gating, not topology deletion
   - Example: `webSearch` remains a node, but may be disabled or routed to a local provider without breaking reachability.

## Pruning Criteria (Tightened)

A node or edge may be removed only if all conditions hold:

1. Hard local-only incompatibility
   - The node fundamentally requires an external network dependency prohibited by local-only policy, and
   - there is no local substitute, and
   - stubbing would create unsafe or misleading behavior.

2. Explicit documented substitute behavior
   - The PR documents what happens instead and where it routes.

3. Topology remains valid
   - No new orphaned nodes.
   - Router return strings and destinations remain consistent.

### Maintenance burden exception (use sparingly)

Pruning may also be justified if a node requires significant ongoing maintenance burden and all conditions hold:

- Feature is non-core (not on the critical path for primary Open Canvas use).
- User impact is minimal (document rationale, even if only anecdotal).
- Removal is announced in changelog or release notes with a migration path.
- Topology remains valid (no orphans, no dangling router destinations).

If these conditions are not met, the fix is restoration, not removal.

## Gating Policy and Mechanisms (Local-only)

If a node is disallowed or unavailable under local-only, it must be gated, not silently removed.

Choose one gating mechanism per node:

- Feature flag: `config.enableWebSearch`, `config.enableExternalTools`
- Runtime capability detection: `if (provider.isAvailable())`
- Compile-time build variant: separate build target that still preserves reachability (node becomes stub or local provider)
- Stub behavior: node returns a deterministic "disabled/unavailable" result and routes back safely

Gating must not create unreachable nodes.

## Naming Hazard: "<name>Node" in error messages

Error output may transform internal identifiers. This document treats any "Node"-suffixed error label as non-authoritative until verified against literal `addNode("...")` strings.

### Current repo confirmation

From the user's `grep -r "addNode" apps/agents/src` output, there is no literal `addNode("cleanStateNode", ...)`.

Therefore:
- `cleanStateNode` is treated as an error-message artifact unless and until it appears as a literal node name in code.

## Mechanical Extraction Requirement (No Guessing)

The inventories below must be derived from code.

Grounding commands (run from repo root):

- Nodes:
  - `grep -r "addNode" apps/agents/src`
- Static edges:
  - `grep -r "addEdge" apps/agents/src`
- Conditional edges:
  - `grep -A 20 "addConditionalEdges" apps/agents/src/open-canvas/index.ts`

If helper functions build graphs in separate files (example: artifact flow), their nodes and edges must be included.

## Inventory (Grounded in Current Repo Greps)

This inventory is grounded in the grep outputs provided by the user from their current local repo.

### Graphs in scope

- Main graph: `apps/agents/src/open-canvas/index.ts`
- Artifact flow edges: `apps/agents/src/open-canvas/artifact-flow.ts`
- Web-search subgraph: `apps/agents/src/web-search/index.ts`
- Reflection subgraph: `apps/agents/src/reflection/index.ts`
- Summarizer subgraph: `apps/agents/src/summarizer/index.ts`
- Thread-title subgraph: `apps/agents/src/thread-title/index.ts`
- Smoke tests: `apps/agents/src/open-canvas/index.smoke.ts`, `graph.smoke.test.ts` (test-only)

### Node Inventory (Grounded)

#### Main graph: `apps/agents/src/open-canvas/index.ts`

Nodes present:

- `customAction`
- `generateArtifact`
- `generateFollowup`
- `generatePath`
- `reflect`
- `updateArtifact`
- `replyToGeneralInput`
- `cleanState`
- `generateTitle`
- `updateHighlightedText`
- `summarizer`
- `webSearch`
- `rewriteArtifact`
- `rewriteArtifactTheme`
- `rewriteCodeArtifactTheme`
- `routePostWebSearch`

Implementation binding notes (identity is the string on the left):

- Node `generateTitle` is bound to `generateTitleNode` in code.
- Node `reflect` is bound to `reflectNode` in code.
- Node `webSearch` is bound to `webSearchGraph` in code.

#### Web-search graph: `apps/agents/src/web-search/index.ts`

- `classifyMessage`
- `queryGenerator`
- `search`

#### Reflection graph: `apps/agents/src/reflection/index.ts`

- `reflect`

#### Summarizer graph: `apps/agents/src/summarizer/index.ts`

- `summarize`

#### Thread-title graph: `apps/agents/src/thread-title/index.ts`

- `title`

#### Smoke-only nodes (tests)

- `noop`

### Static Edge Inventory (Grounded)

This section lists edges found by `grep -r "addEdge" apps/agents/src`.

#### Main graph edges: `apps/agents/src/open-canvas/index.ts`

- `START -> generatePath`
- `generatePath -> replyToGeneralInput`
- `replyToGeneralInput -> cleanState`

- `cleanState -> updateHighlightedText`
- `cleanState -> rewriteArtifact`
- `cleanState -> rewriteArtifactTheme`
- `cleanState -> rewriteCodeArtifactTheme`
- `cleanState -> customAction`
- `cleanState -> webSearch`

- `webSearch -> routePostWebSearch`

- `generateArtifact -> reflect`
- `generateFollowup -> updateArtifact`

- `generateTitle -> END`
- `summarizer -> END`

#### Artifact flow edges: `apps/agents/src/open-canvas/artifact-flow.ts`

- `generateArtifact -> generateFollowup`
- `updateArtifact -> generateFollowup`
- `updateHighlightedText -> generateFollowup`
- `rewriteArtifact -> generateFollowup`
- `rewriteArtifactTheme -> generateFollowup`
- `rewriteCodeArtifactTheme -> generateFollowup`
- `customAction -> generateFollowup`
- `webSearch -> routePostWebSearch`

Note:
- `webSearch -> routePostWebSearch` appears in both `index.ts` and `artifact-flow.ts`.

#### Web-search subgraph edges: `apps/agents/src/web-search/index.ts`

- `START -> classifyMessage`
- `queryGenerator -> search`
- `search -> END`

#### Reflection subgraph edges: `apps/agents/src/reflection/index.ts`

- `START -> reflect`

#### Summarizer subgraph edges: `apps/agents/src/summarizer/index.ts`

- `START -> summarize`

#### Thread-title subgraph edges: `apps/agents/src/thread-title/index.ts`

- `START -> title`

### Conditional Edge Inventory (Grounded)

Grounded in:

- `grep -A 10 "addConditionalEdges" apps/agents/src/open-canvas/index.ts`

| From | Router function | Destinations | Notes |
|---|---|---|---|
| `generatePath` | `routeNode` | `"generateArtifact"`, `"webSearch"`, `"customAction"` | Only 3 entry destinations declared here. Many other nodes are reached via static edges starting from `replyToGeneralInput -> cleanState` and via artifact-flow edges. This is not automatically incorrect, but it makes correctness dependent on static reachability and on `routeNode` never returning undeclared destinations. |
| `cleanState` | `conditionallyGenerateTitle` | `END`, `"generateTitle"`, `"summarizer"` | Terminal routing after cleanup: either end, generate title, or summarize. |

Web-search conditional edges are not extracted here. Do not document web-search conditional destinations until they are extracted from `apps/agents/src/web-search/index.ts`.

## Topology Risk Audit (Grounded to current extraction)

This audit section identifies risks that follow from the grounded inventories above, and it defines verification steps. It does not claim failures without confirming code behavior.

### Risk A: Potential sink nodes in the main graph

Based on the extracted static edges and conditional edges, the following nodes have confirmed inbound edges but no outbound edges appear in the extracted edge inventory:

| Node | Confirmed incoming edge(s) | Outgoing edges found in extracted output | Likely explanation | Verification step |
|---|---|---|---|---|
| `reflect` | `generateArtifact -> reflect` | none found | `reflectNode` may invoke the reflection subgraph programmatically and then return control without a declarative edge. | Inspect the body of `reflectNode` in `apps/agents/src/open-canvas/...` and confirm it transitions to a next step (for example `cleanState`) either by returning a graph control command or by writing state that another edge consumes. |
| `routePostWebSearch` | `webSearch -> routePostWebSearch` | none found | `routePostWebSearch` may route programmatically, or edges may be defined in a file not captured by the current extraction. | Inspect the body of `routePostWebSearch` and confirm it transitions to the correct next step for each case (for example returning to artifact update or generation flow). |

If inspection confirms these nodes do not transition, that is a bug that must be fixed by adding an explicit transition mechanism (edge or programmatic routing) consistent with LangGraph semantics used in this repo.

### Risk B: Router narrowness and undeclared destinations

`generatePath` declares only three destinations. This is safe only if `routeNode` never returns any other node name.

Verification step:
- Inspect `routeNode` and enumerate all possible return values.
- If any return value is not one of:
  - `generateArtifact`, `webSearch`, `customAction`
  then either:
  - update the declared destinations to include the full return set, or
  - change `routeNode` so it never returns undeclared values.

This rule exists because returning an undeclared destination is structurally invalid.

## Parity and Drift Control

### Required upstream baseline pin

If the intent is "align with upstream", record the upstream baseline:

- Upstream repo: `langchain-ai/open-canvas`
- Baseline: commit hash or release tag: (fill in)

This prevents "parity" from being a moving target.

### PR checklist (Required)

- [ ] Node inventory regenerated from `addNode` calls.
- [ ] Static edges regenerated from `addEdge` calls.
- [ ] Conditional edges regenerated from `addConditionalEdges` calls.
- [ ] `cleanStateNode` verified as either literal node name or error artifact.
- [ ] `routeNode` return set verified to match declared destinations.
- [ ] `reflectNode` and `routePostWebSearch` verified to transition correctly (edge or programmatic routing).
- [ ] No unreachable nodes (compile-time or script validation).
- [ ] Any gating documented per node and does not create orphans.


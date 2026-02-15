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
- `webSearch -> routePostWebSearch`
- `generateArtifact -> reflect`
- `generateFollowup -> updateArtifact`
- `generateTitle -> END`
- `summarizer -> END`

**Removed edges (dead code fix):**
The following edges were orphaned due to a semicolon terminating the builder chain on line 56.
Lines 57-61 were dead code that never registered. They have been removed:

- ~~`cleanState -> updateHighlightedText`~~ (was line 47, also removed - created incorrect always-firing path)
- ~~`cleanState -> rewriteArtifact`~~ (was line 57, dead code)
- ~~`cleanState -> rewriteArtifactTheme`~~ (was line 58, dead code)
- ~~`cleanState -> rewriteCodeArtifactTheme`~~ (was line 59, dead code)
- ~~`cleanState -> customAction`~~ (was line 60, dead code)
- ~~`cleanState -> webSearch`~~ (was line 61, dead code)

These nodes are correctly reachable via `routeNode` (Send) from `generatePath`.

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
| `generatePath` | `routeNode` | `"generateArtifact"`, `"rewriteArtifact"`, `"rewriteArtifactTheme"`, `"rewriteCodeArtifactTheme"`, `"updateArtifact"`, `"updateHighlightedText"`, `"customAction"`, `"webSearch"`, `"replyToGeneralInput"` | All 9 possible destinations of `state.next` (set by `generatePath` node). `routeNode` uses `Send(state.next, ...)` to dispatch. |
| `cleanState` | `conditionallyGenerateTitle` | `END`, `"generateTitle"`, `"summarizer"` | Terminal routing after cleanup: either end, generate title, or summarize. |

Web-search conditional edges are not extracted here. Do not document web-search conditional destinations until they are extracted from `apps/agents/src/web-search/index.ts`.

## Topology Risk Audit (Resolved)

### Risk A: Potential sink nodes — RESOLVED

| Node | Status | Finding |
|---|---|---|
| `reflect` | **No bug.** | `reflectNode` (`apps/agents/src/open-canvas/nodes/reflect.ts`) is a fire-and-forget background task. It schedules a reflection run via `langGraphClient.runs.create()` with `afterSeconds: 300` and returns `{}`. The branch terminates naturally after reflect — this is correct behavior for a background task that doesn't need to route further. |
| `routePostWebSearch` | **No bug.** | `routePostWebSearch` (`apps/agents/src/open-canvas/web-search-bridge.ts`) uses `Send` or `Command` to programmatically route to either `"rewriteArtifact"` (when artifacts exist) or `"generateArtifact"` (when new). This is valid LangGraph routing via return value. |

### Risk B: Router narrowness — RESOLVED

`generatePath` previously declared only 3 destinations: `["generateArtifact", "webSearch", "customAction"]`.

**Finding:** `routeNode` uses `Send(state.next, ...)` where `state.next` is set by `generatePath` to one of 9 possible values:
1. `"updateArtifact"` — when `highlightedCode` exists
2. `"updateHighlightedText"` — when `highlightedText` exists
3. `"rewriteArtifactTheme"` — when language/length/emojis/readingLevel set
4. `"rewriteCodeArtifactTheme"` — when code modification flags set
5. `"customAction"` — when `customQuickActionId` set
6. `"webSearch"` — when `webSearchEnabled`
7. `"generateArtifact"` — from `dynamicDeterminePath` (no existing artifact)
8. `"rewriteArtifact"` — from `dynamicDeterminePath` (existing artifact)
9. `"replyToGeneralInput"` — from `dynamicDeterminePath`

**Fix applied:** Updated `addConditionalEdges` to declare all 9 destinations.

### Risk C: Dead code in builder chain — RESOLVED

**Finding:** Line 56 of `index.ts` ended with `;`, terminating the builder chain. Lines 57-61 were orphaned expressions (static edges from `cleanState` to artifact nodes) that were never registered. Additionally, line 47 (`cleanState -> updateHighlightedText`) was a static edge that would always fire, creating an unintended parallel execution path.

**Fix applied:** Removed all orphaned static edges from `cleanState`. These nodes are correctly reached via `routeNode` (Send) from `generatePath`, not from `cleanState`.

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


# Claude Code Guide for Open Canvas

This guide helps Claude understand the Open Canvas project structure and conventions, enabling more efficient and accurate assistance.

## Project Overview

**Open Canvas** is an open-source web application for collaborating with agents to write documents. It's inspired by OpenAI's Canvas but with key differences:

- **100% Open Source**: MIT licensed code from frontend to agents
- **Built-in Memory**: Reflection agent stores style rules and insights
- **Start from Existing Documents**: Users can begin with blank or pre-filled editors

## Tech Stack

### Package Manager
- **Yarn** (v4.9.2) - Monorepo workspace manager

### Architecture
This is a **monorepo** with the following structure:
```
open-canvas/
├── apps/
│   ├── agents/          # LangGraph agents (backend agents)
│   └── web/             # Next.js frontend application
├── packages/
│   ├── shared/          # Shared types and utilities (models.ts, etc)
│   └── [other packages]
└── scripts/
    └── smoke.mjs        # Smoke tests
```

### Key Technologies

**Frontend:**
- Next.js (React framework)
- TypeScript
- Tailwind CSS
- @assistant-ui/react (UI components)
- Vite for some packages

**Backend/Agents:**
- LangGraph (Agent orchestration framework)
- LangChain (LLM integrations)
- LangSmith (Observability)
- Multiple LLM providers (Anthropic, OpenAI, Fireworks, etc.)

**Infrastructure:**
- PostgreSQL + pgvector (local persistence, vector search)
- Ollama (primary LLM provider, local inference)
- Optional cloud LLM APIs (OpenAI, Anthropic, Google GenAI, Fireworks, Groq)
- FireCrawl (Web scraping, optional)
- ExaSearch (Web search, optional)

## Setup for Claude Code

### Prerequisites

1. **Install dependencies:**
   ```bash
   yarn install
   ```

2. **Environment files:** Copy `.env.example` files to `.env`:
   ```bash
   cp .env.example .env
   cp apps/web/.env.example apps/web/.env
   ```

3. **Required API Keys:** None for local usage. Ollama is the primary provider.
   - Optional: OpenAI, Anthropic, Google GenAI, Fireworks, Groq, FireCrawl, ExaSearch

4. **LangGraph Server:**
   - LangGraph CLI is installed as a workspace devDependency (`@langchain/langgraph-cli`)
   - The CLI binary is `langgraphjs`, **not** `langgraph`
   - Run server: `yarn --cwd apps/agents dev` (runs on port 54367 by default)

5. **Ollama:**
   - Install Ollama locally or run via Docker
   - Pull a model: `ollama pull llama3.3`
   - No authentication required

### Common Development Tasks

#### Starting Development Servers

**Terminal 1 - LangGraph Server (Backend Agents):**
```bash
yarn --cwd apps/agents dev
```

**Terminal 2 - Next.js Frontend:**
```bash
yarn --cwd apps/web dev
```

Frontend runs on `localhost:3000`, backend on `localhost:54367`.

#### Running Tests

```bash
# Run tests
yarn workspace @opencanvas/agents test

# Run smoke tests (requires servers running)
yarn smoke

# With OPEN_CANVAS_SMOKE environment variable (offline test)
OPEN_CANVAS_SMOKE=1 yarn workspace @opencanvas/agents test
```

#### Building the Project

```bash
# Build entire monorepo
yarn build

# Build specific workspace
yarn workspace @opencanvas/agents build
yarn workspace @opencanvas/web build
```

#### Linting & Formatting

```bash
# Check formatting
yarn format:check

# Fix formatting
yarn format

# Lint
yarn lint

# Fix lint issues
yarn lint:fix
```

## Key File Locations

### Model Configuration
- **Model list**: `packages/shared/src/models.ts`
  - Defines available LLM models and their providers

- **Model config logic**: `apps/agents/src/agent/utils.ts`
  - Function: `getModelConfig()`
  - Handles model provider initialization

### API Setup
- **Agent API**: `apps/agents/` (LangGraph)
- **Frontend API routes**: `apps/web/src/app/api/`
- **Health check endpoint**: `/api/healthz`

### Environment Variables

**Root `.env`** (LangGraph server):
- `OLLAMA_API_URL` (defaults to `http://localhost:11434`)
- `DATABASE_URL` (PostgreSQL connection string)
- Optional: LLM API keys, LangSmith credentials

**`apps/web/.env`** (Frontend):
- `LANGGRAPH_API_URL` (defaults to `http://localhost:54367`)
- `NEXT_PUBLIC_OLLAMA_ENABLED` (default: `true`)
- `OLLAMA_API_URL`
- `DATABASE_URL`
- Optional: `NEXT_PUBLIC_*_ENABLED` flags for cloud providers

## Project Conventions

### Styling
- Tailwind CSS for UI styling
- Component-based architecture

### Type Safety
- Full TypeScript throughout
- Strict type checking enabled

### AI Model Integration
When adding new models:
1. Update `packages/shared/src/models.ts` with model definition
2. Install necessary provider package in `apps/agents`
3. Add model config logic in `apps/agents/src/agent/utils.ts`
4. Test: Generate artifact → Followup message → Chat update → Quick action

### Code Organization
- Monorepo workspace dependencies: packages used by multiple apps
- Each app/package has its own `package.json` and build process
- Use `yarn workspace <name> <command>` to run commands in specific workspaces

## Yarn 4 / Docker Critical Requirements

These constraints are documented in full in `docs/deployment/open-canvas-docker-deployment.md`.

- **Corepack is mandatory:** Yarn 4 requires `corepack enable && corepack prepare yarn@4.9.2 --activate` before any `yarn` command in Docker.
- **nodeLinker: node-modules:** `.yarnrc.yml` must contain `nodeLinker: node-modules`. Default Yarn 4 uses PnP which breaks most tools.
- **Binary name:** `@langchain/langgraph-cli` installs as `langgraphjs`, **not** `langgraph`. Scripts must use `langgraphjs`.
- **Workspace integrity:** All workspace `package.json` files must be COPY'd before `yarn install` in Docker. Missing any causes silent resolution failures.
- **No global yarn:** Must use Corepack activation pattern, never `npm install -g yarn`.

## Graph Topology Contract

The topology contract is documented in `docs/graph/open-canvas-graph-topology.md`.

**Contract Invariants (Must Hold):**
1. **No unreachable nodes** - Every `addNode(...)` must be reachable from `START`.
2. **Router destination completeness** - Every router return string must match a declared destination.
3. **No silent pruning** - Nodes/edges cannot be removed to simplify local-only operation.
4. **Local-only = gating, not deletion** - Disabled features use stubs or feature flags, not topology removal.

**Before any PR that modifies the graph:**
- Regenerate node/edge inventories from `addNode`/`addEdge`/`addConditionalEdges` calls
- Verify `routeNode` return set matches declared destinations
- Verify no `UnreachableNodeError` at compile time
- Update the topology contract document with any changes

## GraphRAG Spec

The GraphRAG enhancement spec is documented in `docs/graph/open-canvas-graphrag-spec.md`.

- **Modes:** OFF (default), OPTIONAL, REQUIRED
- **State field:** `graphContext: GraphContext | null`
- **Provenance required:** All graph facts must link to an Extraction node
- **Graceful degradation:** OPTIONAL mode must never crash on Neo4j failure

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No text being generated but LangGraph server is running | Clear `oc_thread_id_v2` cookie and refresh |
| 500 network errors on client requests | Ensure LangGraph server is running on correct port (default: 54367) |
| "thread ID not found" errors | Check `LANGGRAPH_API_URL` env variable or `constants.ts` fallback |
| "Model name is missing in config" error | Ensure `customModelName` is set in config.configurable |
| Local Ollama model errors | Note: Open source LLMs may have lower instruction-following accuracy than GPT-4o/Claude |

## Source-of-Truth Documents

- **Topology Contract**: `docs/graph/open-canvas-graph-topology.md` - Node/edge inventory, no-silent-pruning rule
- **GraphRAG Spec**: `docs/graph/open-canvas-graphrag-spec.md` - Neo4j enhancement with temporal semantics
- **Deployment Guide**: `docs/deployment/open-canvas-docker-deployment.md` - Yarn 4 + Docker requirements

## Documentation & Resources

- **LangGraph Docs**: https://langchain-ai.github.io/langgraphjs/
- **LangChain Docs**: https://js.langchain.com/
- **LangSmith**: https://smith.langchain.com/
- **Next.js Docs**: https://nextjs.org/docs
- **Project Repository**: https://github.com/langchain-ai/open-canvas

## Testing Strategy

The project uses:
- **Unit tests** in agent packages
- **Smoke tests** via Playwright (@playwright/test)
- **Integration tests** for agent workflows
- Tests can run offline with `OPEN_CANVAS_SMOKE=1` flag

## Performance Considerations

- Monorepo uses Turbo for caching and efficient builds
- LangGraph studio available at https://smith.langchain.com/studio?baseUrl=http://localhost:54367
- LangSmith integration for tracing and observability
- Image rendering and markdown live preview in editor

## Notes for Claude

- This is a complex fullstack AI application - always read relevant code before making changes
- Changes often require updating both frontend (`apps/web`) and agents (`apps/agents`)
- Test thoroughly with multiple model providers when making agent changes
- Remember to build the monorepo with `yarn build` before testing locally
- Use `yarn dev` in specific app directories for development, not from root

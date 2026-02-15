# Architecture: Local-First Open Canvas

## Overview

Open Canvas uses a local-first architecture where all data stays on the user's machine. There are no cloud dependencies required for basic functionality.

```
+-----------------------------------------------------+
|  Frontend (Next.js)                                  |
|  - No Auth Flow (direct access)                      |
|  - Local storage for preferences                     |
|  - Streaming UI for Ollama                           |
+---------------------------+--------------------------+
                            |
                            v
+-----------------------------------------------------+
|  LangGraph API (Port 54367)                          |
|  - Thread management                                 |
|  - Streaming coordination                            |
|  - PostgreSQL backend for persistence                |
+---------------------------+--------------------------+
                            |
              +-------------+-------------+
              v                           v
+-------------------+           +-------------------+
| PostgreSQL        |           | Ollama            |
| + pgvector        |           | (Port 11434)      |
|                   |           |                   |
| - Users           |           | - llama3.3        |
| - Threads         |           | - big-tiger-27b   |
| - Assistants      |           | - gpt-oss-32k     |
| - Documents       |           |                   |
| - Embeddings      |           | Streaming:        |
|                   |           | - Tool calls      |
+-------------------+           | - Partial tokens  |
                                +-------------------+
```

## Components

### Frontend (`apps/web`)

- **Framework**: Next.js with React
- **Styling**: Tailwind CSS
- **State Management**: React Context (GraphContext, UserContext, ThreadProvider)
- **Streaming**: Web Workers for LangGraph streaming
- **Auth**: No authentication - local user auto-provisioned

### Backend Agents (`apps/agents`)

- **Framework**: LangGraph (Agent orchestration)
- **Model Provider**: Ollama (primary), with optional cloud providers
- **Model Config**: `apps/agents/src/model-config.ts`
- **Model Utils**: `apps/agents/src/utils/model.ts`

### Shared (`packages/shared`)

- **Models**: `packages/shared/src/models.ts` - Model definitions and configuration
- **Types**: Shared TypeScript types used across apps

### Database

- **PostgreSQL 16** with pgvector extension
- **Schema**: `migrations/001_initial_schema.sql`
- **Prisma ORM**: `prisma/schema.prisma`
- **Vector Embeddings**: 768-dimensional vectors (nomic-embed-text)

## Data Flow

### Chat Message Flow

1. User sends message in frontend
2. Frontend creates streaming request via Web Worker
3. Web Worker calls LangGraph API (`/runs/stream`)
4. LangGraph orchestrates agent nodes
5. Agent calls Ollama via OpenAI-compatible API
6. Streaming tokens sent back through LangGraph -> Web Worker -> UI

### Document Upload Flow

1. User uploads document via frontend
2. Frontend sends to `/api/documents/upload`
3. Document stored in PostgreSQL via Prisma
4. Optional: Embeddings generated via Ollama `nomic-embed-text`
5. Embeddings stored in `document_embeddings` table with pgvector

### Semantic Search Flow

1. User query sent to `/api/search/semantic`
2. Query embedding generated via Ollama
3. pgvector performs cosine similarity search
4. Relevant document chunks returned

## Key Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Infrastructure services |
| `migrations/001_initial_schema.sql` | Database schema |
| `prisma/schema.prisma` | Prisma ORM schema |
| `packages/shared/src/models.ts` | Model definitions |
| `apps/agents/src/model-config.ts` | Agent model configuration |
| `apps/agents/src/utils/model.ts` | Model instantiation |
| `apps/web/src/lib/auth/verify-user.ts` | Local auth stub |
| `apps/web/src/lib/db/prisma.ts` | Prisma client singleton |
| `apps/web/src/lib/embeddings/generate.ts` | Embedding generation |
| `apps/web/src/contexts/GraphContext.tsx` | Main chat/artifact state |
| `apps/web/src/contexts/UserContext.tsx` | Local user context |

## Environment Variables

### Required (None for basic local usage)

All environment variables have sensible defaults for local development.

### Optional

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_API_URL` | `http://localhost:11434` | Ollama server URL |
| `DATABASE_URL` | `postgresql://opencanvas:opencanvas_local@localhost:5432/opencanvas` | PostgreSQL connection |
| `LANGGRAPH_API_URL` | `http://localhost:54367` | LangGraph API URL |
| `OPENAI_API_KEY` | - | Optional: Enable OpenAI models |
| `ANTHROPIC_API_KEY` | - | Optional: Enable Anthropic models |

## Docker Deployment

For Docker-specific requirements (Corepack activation, `nodeLinker: node-modules`, `langgraphjs` binary name, workspace package.json COPY order), see `docs/deployment/open-canvas-docker-deployment.md`.

## Graph Topology

For the graph node/edge inventory and topology contract invariants, see `docs/graph/open-canvas-graph-topology.md`.

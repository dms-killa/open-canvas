# Local Setup Guide

This guide covers how to set up Open Canvas for a fully local, privacy-focused development environment.

## Prerequisites

- **Docker & Docker Compose** - For PostgreSQL and Ollama services
- **Node.js 18+** - Runtime for the application
- **Yarn** (v4.9.2) - Package manager
- **Ollama** - Local LLM inference (can run via Docker or natively)

## Step-by-Step Setup

### 1. Clone and Install

```bash
git clone https://github.com/langchain-ai/open-canvas.git
cd open-canvas
yarn install
```

### 2. Start Infrastructure

Start PostgreSQL (with pgvector) and Ollama:

```bash
docker-compose up -d postgres ollama
```

Verify services are running:

```bash
docker-compose ps
```

### 3. Pull Ollama Models

```bash
# Default model
ollama pull llama3.3

# Optional: Additional models
ollama pull big-tiger-27b-48k:latest
ollama pull gpt-oss-32k:latest

# Optional: Embedding model for semantic search
ollama pull nomic-embed-text
```

### 4. Configure Environment

```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/agents/.env.example apps/agents/.env
```

The default values are configured for local usage. No API keys are required for basic functionality.

### 5. Build the Project

```bash
yarn build
```

### 6. Start Development Servers

**Terminal 1 - LangGraph Server (Backend Agents):**

```bash
yarn --cwd apps/agents dev
```

Wait for the server to be ready:

```
Ready!
- API: http://localhost:54367
```

**Terminal 2 - Next.js Frontend:**

```bash
yarn --cwd apps/web dev
```

### 7. Open the Application

Navigate to [http://localhost:3000](http://localhost:3000). The application loads directly to the canvas interface with no authentication required.

## Docker Compose Services

| Service | Port | Description |
|---------|------|-------------|
| `postgres` | 5432 | PostgreSQL 16 with pgvector extension |
| `ollama` | 11434 | Ollama LLM inference server |
| `langgraph` | 54367 | LangGraph API server (optional, for containerized deployment) |

## Database

The PostgreSQL database is automatically initialized with the schema from `migrations/001_initial_schema.sql`. This includes:

- `users` - Local user (default: `local-user`)
- `documents` - File storage for uploaded documents
- `document_embeddings` - Vector embeddings for semantic search
- `reflections` - User style rules and memories
- `custom_quick_actions` - User-defined quick actions

### Prisma

The Prisma schema is located at `prisma/schema.prisma`. To run migrations manually:

```bash
npx prisma migrate deploy
```

To explore the database:

```bash
npx prisma studio
```

## Stopping Services

```bash
docker-compose down
```

To also remove data volumes:

```bash
docker-compose down -v
```

## Data Export

Export the PostgreSQL database:

```bash
docker-compose exec postgres pg_dump -U opencanvas opencanvas > backup.sql
```

Import from backup:

```bash
docker-compose exec -T postgres psql -U opencanvas opencanvas < backup.sql
```

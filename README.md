# Open Canvas (Local-First Edition)

![Screenshot of app](./static/screenshot.png)

Open Canvas is an open source web application for collaborating with agents to better write documents. This fork is configured for a **fully local, privacy-focused stack** using PostgreSQL + pgvector and Ollama as the primary LLM provider.

**Key differences from the upstream version:**
- All data stays local (PostgreSQL + pgvector)
- Ollama is the default LLM provider (no API keys required)
- No Supabase or cloud authentication dependencies
- Direct access to the canvas interface (no login required)

## Features

- **Memory**: Built-in reflection agent stores style rules and user insights in a shared memory store across sessions.
- **Custom quick actions**: Define your own prompts that persist across sessions, invoked with a single click.
- **Pre-built quick actions**: Common writing and coding tasks are always available.
- **Artifact versioning**: Travel back in time and see previous versions of your artifact.
- **Code, Markdown, or both**: View and edit both code and markdown artifacts.
- **Live markdown rendering & editing**: View rendered markdown while editing.
- **Local vector search**: Semantic document search powered by Ollama embeddings and pgvector.

## Quick Start

### Prerequisites

- [Docker & Docker Compose](https://docs.docker.com/get-docker/)
- [Node.js 18+](https://nodejs.org/)
- [Yarn](https://yarnpkg.com/) (v4.9.2)
- [Ollama](https://ollama.com) installed locally (or via Docker)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/langchain-ai/open-canvas.git
cd open-canvas
```

2. Start infrastructure services:
```bash
docker-compose up -d postgres ollama
```

3. Pull an Ollama model:
```bash
ollama pull llama3.3
```

4. Install dependencies:
```bash
yarn install
```

5. Copy environment files:
```bash
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/agents/.env.example apps/agents/.env
```

6. Build the monorepo:
```bash
yarn build
```

7. Start the LangGraph server (Terminal 1):
```bash
yarn --cwd apps/agents dev
```

8. Start the frontend (Terminal 2):
```bash
yarn --cwd apps/web dev
```

9. Open [http://localhost:3000](http://localhost:3000) and start using Open Canvas.

For detailed setup instructions, see [LOCAL_SETUP.md](./LOCAL_SETUP.md).

## Available Ollama Models

The following models are pre-configured:

| Model | Name | Description |
|-------|------|-------------|
| Llama 3.3 | `ollama-llama3.3` | Default model, good general purpose |
| Big Tiger 27B | `ollama-big-tiger-27b-48k:latest` | Large context window (48k tokens) |
| GPT OSS 32K | `ollama-gpt-oss-32k:latest` | OpenAI-compatible OSS model |

To add more models: `ollama pull <model-name>`

## Optional: Cloud Providers

You can optionally enable cloud LLM providers by setting the appropriate environment variables and feature flags:

- **OpenAI**: Set `OPENAI_API_KEY` and `NEXT_PUBLIC_OPENAI_ENABLED=true`
- **Anthropic**: Set `ANTHROPIC_API_KEY` and `NEXT_PUBLIC_ANTHROPIC_ENABLED=true`
- **Google GenAI**: Set `GOOGLE_API_KEY` and `NEXT_PUBLIC_GEMINI_ENABLED=true`
- **Fireworks**: Set `FIREWORKS_API_KEY` and `NEXT_PUBLIC_FIREWORKS_ENABLED=true`

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the local-first architecture documentation.

## Running Smoke Tests

```bash
yarn smoke
```

For offline testing:
```bash
OPEN_CANVAS_SMOKE=1 yarn workspace @opencanvas/agents test
```

## Troubleshooting

- **No text being generated**: Clear the `oc_thread_id_v2` cookie and refresh the page.
- **500 network errors**: Ensure the LangGraph server is running on port 54367.
- **"thread ID not found" errors**: Check the `LANGGRAPH_API_URL` env variable.
- **`Model name is missing in config.` error**: Ensure `customModelName` is set in `config.configurable`.
- **Ollama connection errors**: Ensure Ollama is running (`docker-compose up ollama` or `ollama serve`).

## Contributing

We welcome contributions! See the [GitHub issues](https://github.com/langchain-ai/open-canvas/issues) for feature requests and bug reports.

Labels: `frontend` (UI focused), `ai` (agent focused), `fullstack` (both).

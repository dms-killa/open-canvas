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
- Supabase (Authentication)
- Various LLM APIs (OpenAI, Anthropic, Google GenAI, Fireworks, Groq, etc.)
- FireCrawl (Web scraping)
- ExaSearch (Web search)

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

3. **Required API Keys:**
   - OpenAI API key
   - Anthropic API key
   - Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - Optional: Google GenAI, Fireworks, Groq, FireCrawl, ExaSearch

4. **LangGraph Server:**
   - Install LangGraph CLI: `npm install -g @langchain/langgraph-cli`
   - Run server: `yarn --cwd apps/agents dev` (runs on port 54367 by default)

5. **Supabase Authentication:**
   - Create a Supabase project
   - Enable Email authentication (with email confirmation enabled)
   - Optionally enable GitHub/Google OAuth providers

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
- LLM API keys
- LangSmith credentials
- Database connection strings

**`apps/web/.env`** (Frontend):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `LANGGRAPH_API_URL` (defaults to `http://localhost:54367`)
- `NEXT_PUBLIC_OLLAMA_ENABLED` (for local Ollama support)
- `OLLAMA_API_URL`

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

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| No text being generated but LangGraph server is running | Clear `oc_thread_id_v2` cookie and refresh |
| 500 network errors on client requests | Ensure LangGraph server is running on correct port (default: 54367) |
| "thread ID not found" errors | Check `LANGGRAPH_API_URL` env variable or `constants.ts` fallback |
| "Model name is missing in config" error | Ensure `customModelName` is set in config.configurable |
| Local Ollama model errors | Note: Open source LLMs may have lower instruction-following accuracy than GPT-4o/Claude |

## Documentation & Resources

- **LangGraph Docs**: https://langchain-ai.github.io/langgraphjs/
- **LangChain Docs**: https://js.langchain.com/
- **LangSmith**: https://smith.langchain.com/
- **Supabase Auth Docs**: https://supabase.com/docs/guides/auth
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

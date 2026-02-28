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

---

## §9 Vibe Hack Log

Experimental side-projects that live in `vibe-hacks/` alongside the main Open Canvas app.
Each "mod" is a discrete session. Logs record what was learned and what pattern was established.

### VH-001: CoC 7e — gameSystem Field + Data-Driven Tabs (Mod 1 + Mod 8)
- **Goal:** Add `gameSystem` field to the creature schema and make the tab list data-driven
- **Result:** `creature.gameSystem` field established. `visibleTabs` refactored into a
  computed property in `CharacterSheet.vue`. The tab list is now a plain array of
  `{ id, label, icon, component, show }` objects filtered at runtime.
- **Key findings:**
  - `gameSystem` must be on the creature document at subscription time for Vue reactivity
    to pick it up automatically — late-added fields on non-reactive objects need `Vue.set()`
  - Keeping the D&D default as an explicit fallback array (rather than implicit) made the
    CoC override path much cleaner to reason about
- **Pattern established:** `systemTabs[system]` lookup → filter by `show` → render.
  Adding a new system = one new key in the `systemTabs` object.

### VH-002: CoC 7e — Full UI Wire-Up (Mod 9 / this session)
- **Goal:** Make Mod 1 + Mod 8 actually change the character sheet for CoC characters
- **Result:** CoC characters now show system-appropriate tabs and suppressed D&D sections
- **Key findings:**
  - The Vue files (CharacterSheet.vue, StatsTab.vue, tab stubs) were scaffolded fresh in
    `vibe-hacks/ttrpg-sheets/src/components/` since no prior commits had landed them
  - Reactivity: the `visibleTabs` watcher handles mid-session `gameSystem` changes by
    resetting `activeTab` to the first visible tab when the previously active tab disappears
  - StatsTab suppression — **Option A chosen** (explicit `SYSTEM_ATTRIBUTE_SECTIONS` allowlist)
    over Option B (hide-if-empty). Reasoning:
      - Intent is self-documenting: the constant shows exactly which attribute types each
        system owns, making it easy to audit and extend
      - Option B alone would hide empty sections for D&D too (acceptable) but gives no
        explicit model of "CoC intentionally has no ability scores" — the allowlist makes
        that contract explicit
      - Both checks are applied (allowlist AND non-empty) for belt-and-suspenders safety
  - CoC sections shown: `healthBar`, `stat`, `skill`, `resource`, `utility`
  - CoC sections suppressed: `ability`, `hitDice`, `spellSlot`, `modifier`, `savingThrow`
- **Pattern established:** `gameSystem` field → `systemTabs` tab config lookup →
  `SYSTEM_ATTRIBUTE_SECTIONS` section suppression.
  This is now the template for all future game system UI work.

### VH-003: The Expanse RPG (AGE System) — Full Implementation
- **Date:** 2026-02-28
- **Goal:** Production-ready playtest sheet for The Expanse RPG with friend testing in mind
- **System:** Adventure Game Engine (AGE), Green Ronin Publishing
- **Result:** Complete library script, sample pre-generated character (Jadamantha Holland),
  full UI wire-up following VH-002 pattern, and a playtest guide for human use.
- **Key technical findings:**
  - `attributeType: 'stat'` handles all 9 AGE Abilities cleanly — the score IS the modifier,
    so no separate modifier formula is needed. Pattern confirmed from CoC.
  - Fortune as `healthBar` supports dual HP/resource use well: current/max tracking maps
    naturally to "absorb damage 1:1" and the max shows the computed cap.
  - `10 + (level * 2 * constitution)` Fortune formula works correctly; Level defined first
    in the library so it's in scope for the Fortune calculation.
  - Conditions via `toggle` + child `effect` nodes: Injured (−1 all) and Wounded (−2 all,
    Speed ×0.5) and Hindered (Speed ×0.5) and Restrained (Speed ×0) are fully expressible
    with the existing effect operation set (`add`, `mul`). Dying and Unconscious are
    descriptive toggles only (no automated per-round effect needed for the simple case).
  - All 9 Ability Roll actions use `3d6 + [ability]` — clean and uniform.
  - The VH-002 `SYSTEM_ATTRIBUTE_SECTIONS` allowlist for 'expanse' is identical to 'coc7e':
    `['healthBar', 'stat', 'skill', 'resource', 'utility']`. AGE and CoC both share the
    same "no D&D sections" profile. Pattern confirmed: one constant entry per system, no
    additional code required.
  - Focus automation is deferred: players add +2 manually when rolling with a relevant
    Focus. Full automation would require a per-roll ability → active-focus lookup,
    which is a VH-004 scope item.
- **Pattern confirmed:** `attributeType: 'stat'` + `healthBar` + `toggle` conditions
  fully supports a modern AGE-family system without any new property types or code changes.
  Three systems tested (D&D 5e, CoC 7e, The Expanse) — existing type set is sufficient.
- **Known limitations documented in:** `docs/expanse-playtest-guide.md`
- **Artifacts:**
  - `scripts/insert-expanse-library.js` — full ruleset library (9 abilities, derived stats,
    Fortune healthBar, Level, Income, 6 sample Focuses, 9 roll actions, 5 conditions)
  - `scripts/create-expanse-sample-character.js` — Jadamantha Holland, Belter Negotiator L1
  - `docs/expanse-playtest-guide.md` — one-page GM/player reference for playtest sessions

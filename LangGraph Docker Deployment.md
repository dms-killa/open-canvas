

```markdown
# 🛠 LangGraph Docker Deployment: Critical Requirements (Yarn 4 + Monorepo)

This document captures hard-won requirements for running LangGraph in Docker 
with Yarn 4 monorepo structure. These issues caused hours of debugging 
due to outdated AI training data and non-obvious Yarn 4 behavior changes.

## 0. The "Old Context" Problem

Most AI assistants and documentation were trained on Yarn 1/2 or npm patterns.
Yarn 4 (Berry) with Corepack changes fundamental behaviors:

- **No global yarn binary** — Corepack manages per-project Yarn versions
- **No automatic node_modules** — Must explicitly set `nodeLinker: node-modules`
- **Strict workspace resolution** — All workspace package.jsons must be present 
  before install, or binaries aren't linked
- **Binary hoisting** — CLI tools land in root `node_modules/.bin/`, not local

## 1. Corepack: The Mandatory First Step

**Problem:** Yarn 4 projects declare their Yarn version in `packageManager` field.
Docker's `node:20-alpine` image comes with Yarn 1.x or none. Without Corepack,
you get version mismatch errors that look like missing dependencies.

**Error symptom:**
```
error This project's package.json defines "packageManager": "yarn@4.9.2". 
However the current global version of Yarn is 1.22.22.
Corepack must currently be enabled by running corepack enable...
```

**The fix (must be before any yarn command):**
```dockerfile
RUN corepack enable && corepack prepare yarn@4.9.2 --activate
```

**Why this works:** Corepack is Node's built-in package manager manager. It reads
`packageManager` from package.json and installs/activates the correct Yarn 
version on-demand.

## 2. .yarnrc.yml: Required Before Install

**Problem:** Yarn 4 defaults to Plug'n'Play (PnP) which doesn't create 
node_modules. Most tools (Next.js, LangGraph, etc.) expect node_modules.

**Error symptom:** 
- Build succeeds but runtime can't find binaries
- `command not found: langgraphjs` even after successful `yarn install`

**The fix (create before COPY):**
```dockerfile
# Option A: If .yarnrc.yml exists in repo, COPY it
COPY .yarnrc.yml package.json yarn.lock ./

# Option B: If not, generate it explicitly
RUN echo "nodeLinker: node-modules" > .yarnrc.yml
COPY package.json yarn.lock ./
```

**Critical:** This file must exist **before** `yarn install` runs. Changing it
after install requires full reinstall.

## 3. Binary Name: langgraphjs ≠ langgraph

**Problem:** `@langchain/langgraph-cli` installs as `langgraphjs` in 
node_modules/.bin/, not `langgraph`. Scripts using `langgraph` fail with 
"command not found".

**Verification:**
```bash
ls -la node_modules/.bin/ | grep langgraph
# Should show: langgraphjs -> ../@langchain/langgraph-cli/dist/cli/cli.mjs
# Will NOT show: langgraph
```

**The fix in package.json:**
```json
{
  "scripts": {
    "langgraph": "langgraphjs dev --host 0.0.0.0 --port 8123 --config ../../langgraph.json"
  }
}
```

**Why this works:** Yarn's `yarn run` resolves binaries from node_modules/.bin/.
By defining a script named `langgraph` that calls `langgraphjs`, we create a
resolvable entry point that works regardless of hoisting location.

## 4. Workspace Integrity: All package.jsons Before Install

**Problem:** Yarn 4's workspace resolution is strict. If `apps/web/package.json`
isn't present when `yarn install` runs in `apps/agents`, workspace links break
and shared packages aren't built.

**Error symptom:**
- `command not found: next` (Next.js binary not linked)
- `Cannot find module '@opencanvas/shared'` (workspace package not resolved)

**The fix (layer-optimized order):**
```dockerfile
# 1. Root config (changes rarely — cached layer)
COPY .yarnrc.yml package.json yarn.lock ./

# 2. Yarn's own cache (if using zero-installs or specific cache)
COPY .yarn ./.yarn

# 3. ALL workspace manifests (changes moderately — cached layer)
COPY apps/agents/package.json ./apps/agents/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/evals/package.json ./packages/evals/

# 4. Install (expensive — cached if manifests unchanged)
RUN yarn install

# 5. Source code (changes frequently — uncached)
COPY . .
```

**Why this order matters:** Docker layer caching. Steps 1-3 create a cacheable
layer that skips `yarn install` if only source code (step 5) changes.
Reversing steps 4 and 5 causes 30-60 second reinstalls on every code change.

## 5. Verification Checklist

Before committing Dockerfile changes:

- [ ] `corepack enable` runs before first `yarn` command
- [ ] `nodeLinker: node-modules` is in `.yarnrc.yml` before `yarn install`
- [ ] `package.json` scripts use `langgraphjs`, not `langgraph`
- [ ] All workspace `package.json` files are COPY'd before `yarn install`
- [ ] `yarn install` runs before `COPY . .` (source code)
- [ ] `yarn workspace @opencanvas/shared build` runs if shared package 
      has compiled output needed by agents

## 6. Common "AI Assistant" Mistakes to Reject

When reviewing AI-generated Dockerfiles, reject these patterns:

| Mistake | Why It Fails | Correct Pattern |
|---------|-------------|---------------|
| `npm install -g yarn` | Ignores Corepack, causes version mismatch | `corepack enable && corepack prepare yarn@X.Y.Z --activate` |
| `yarn install` without `.yarnrc.yml` | Uses PnP, breaks most tools | Create/copy `.yarnrc.yml` with `nodeLinker: node-modules` first |
| `COPY . .` then `yarn install` | No layer caching, slow rebuilds | Copy manifests, install, then copy source |
| Missing workspace package.json COPYs | Broken workspace resolution, missing binaries | Copy ALL workspace manifests before install |
| Script uses `langgraph` directly | Binary not in PATH or hoisted to root | Use `yarn run langgraphjs` or script wrapper |
```

---

## Additional Findings from Search

My search confirms these are **active, current issues** in the Yarn/LangGraph ecosystem:

1. **Yarn 4 + Docker is a known pain point** — Multiple 2024 articles specifically address the `nodeLinker: node-modules` requirement and Corepack activation 

2. **Workspace `package.json` copying is standard practice** — Docker guides for monorepos explicitly warn about this 

3. **LangGraph CLI has recent workspace issues** — The `workspace:*` protocol problems in v1.1.8-1.1.9 show this is actively maintained and changing 

---

## Final Recommendation

| Action | Priority |
|--------|----------|
| Rewrite document with "Old Context Problem" framing | **Critical** — Prevents AI assistants from repeating outdated patterns |
| Add Corepack as explicit Step 1 | **Critical** — Was the actual fix for your first major blocker |
| Add layer caching explanation | **High** — Prevents 30-60 minute build time regressions |
| Add "AI Assistant Mistakes to Reject" table | **High** — Specific review checklist for future AI-generated code |
| Include verification checklist | **Medium** — Concrete pre-commit validation |

## Appendix: Failed Approaches Archive (Do Not Retry)

These commands/patterns were attempted during troubleshooting and **did not work**:

| Attempt | Why It Failed | What Actually Worked |
|---------|--------------|----------------------|
| `npm install -g yarn` in Dockerfile | Installs Yarn 1.x, conflicts with `packageManager` field | `corepack enable && corepack prepare yarn@4.9.2 --activate` |
| `yarn install` without `.yarnrc.yml` | Defaults to PnP, binaries not in `node_modules/.bin/` | `echo "nodeLinker: node-modules" &gt; .yarnrc.yml` before install |
| `CMD ["langgraph", "dev"]` directly | Binary name mismatch, `langgraph` not in PATH | `CMD ["yarn", "langgraph"]` with script using `langgraphjs` |
| `COPY apps/agents/package.json ./apps/agents/` only | Missing workspace manifests, Yarn can't resolve dependencies | Copy ALL workspace `package.json` files before install |
| `yarn run -T langgraph` | `-T` looks for script in root, not binary | Use `yarn run -B langgraph` or correct binary name `langgraphjs` |
| `touch .yarnrc.yml` with no content | Empty file doesn't set `nodeLinker` | `echo "nodeLinker: node-modules" &gt; .yarnrc.yml` |
| Adding dependencies one-by-one as errors appear | Yarn 4 strictness causes "whack-a-mole" dependency gaps | Use `nodeLinker: node-modules` + full workspace COPY to ensure all peer dependencies resolve |
| `yarn workspace @opencanvas/shared` without build | TypeScript imports fail at runtime | `RUN yarn workspace @opencanvas/shared build` before agent build |

### The "Binary Ghosting" Lesson
Even if a package is installed, Yarn 4 in a monorepo may not link the binary to the local `node_modules/.bin/`. Always use the full binary name (`langgraphjs`) or call it through a `yarn workspace` script rather than assuming `langgraph` is in the `$PATH`.

### The "Peer Dependency" Trap
In a Yarn 4 monorepo, if a UI component (like BlockNote) is missing a sub-dependency (like `framer-motion`), it won't "borrow" it from the root. You must explicitly `yarn workspace @opencanvas/web add ...` to satisfy the production build.

# 🛠 LangGraph Docker Deployment: Lessons Learned

## 1. The Binary Name Mismatch

**Problem:** The package `@langchain/langgraph-cli` (v0.6+) renames its binary from `langgraph` to `langgraphjs` in JavaScript environments to avoid confusion with the Python CLI.
**Evidence:** `ls -la /app/node_modules/.bin` showed `langgraphjs`, not `langgraph`.
**The Fix:** Always use `langgraphjs` in your `package.json` scripts.

```json
"langgraph": "langgraphjs dev --host 0.0.0.0 --port 8123 --config ../../langgraph.json"

```

## 2. Yarn 4 Monorepo Hoisting

**Problem:** In a monorepo, Yarn hoists shared packages to the root `node_modules`. Even if the folder exists, the binary symlink might not be in the local `apps/agents/node_modules/.bin` folder.
**The Fix:** 1. Ensure `.yarnrc.yml` has `nodeLinker: node-modules`.
2. Use `yarn run` to execute the script. Yarn is smart enough to find the hoisted binary in the root if the sub-workspace doesn't have it.

## 3. Docker Build Context (Workspace Integrity)

**Problem:** Running `yarn install` inside a Dockerfile requires **all** workspace `package.json` files to be present, otherwise Yarn's workspace resolution breaks and binaries are never linked.
**The Fix:** You must `COPY` every metadata file before the install step.

```dockerfile
COPY .yarnrc.yml package.json yarn.lock ./
COPY apps/agents/package.json ./apps/agents/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/
COPY packages/evals/package.json ./packages/evals/
RUN yarn install

```


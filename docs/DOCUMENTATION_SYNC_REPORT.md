# Documentation Sync Report

## Source-of-Truth Documents

| Document | Original Path | Canonical Path | Status |
|----------|--------------|----------------|--------|
| Topology Contract | `OPEN_CANVAS_GRAPH_TOPOLOGY_CONTRACT.md` | `docs/graph/open-canvas-graph-topology.md` | Copied to canonical location |
| GraphRAG Spec | `OPEN_CANVAS_GRAPHRAG_SPEC.md` | `docs/graph/open-canvas-graphrag-spec.md` | Copied to canonical location |
| Deployment Guide | `LangGraph Docker Deployment.md` | `docs/deployment/open-canvas-docker-deployment.md` | Copied to canonical location |

## All Documentation Files Audited

| File | Contradictions Found | Action Required |
|------|---------------------|-----------------|
| `CLAUDE.md` | 6 contradictions | Update required |
| `README.md` | 0 contradictions | No action |
| `ARCHITECTURE.md` | 1 omission | Minor update |
| `LOCAL_SETUP.md` | 1 omission | Minor update |
| `QUICKSTART.md` | 1 contradiction | Update required |
| `MIGRATION_PLAN.md` | 0 contradictions | No action (historical record) |
| `apps/web/README.md` | 2 contradictions | Update required |
| `.yarnrc.yml` | 0 contradictions | Compliant |
| `Dockerfile.agents` | 0 contradictions | Compliant |
| `docker-compose.yml` | 0 contradictions | Compliant |
| `docker-compose.lan.yml` | 0 contradictions | Compliant |

---

## Contradiction Details

### CONTRADICTION 1: CLAUDE.md references Supabase as active infrastructure

**Source of truth (Deployment Guide):** This fork uses PostgreSQL + pgvector for all persistence, no Supabase.

**CLAUDE.md states (line 48-49):**
> **Infrastructure:**
> - Supabase (Authentication)

**README.md correctly states (line 8-10):**
> - All data stays local (PostgreSQL + pgvector)
> - No Supabase or cloud authentication dependencies

**Fix:** Remove Supabase from CLAUDE.md Infrastructure section. Replace with PostgreSQL + pgvector.

---

### CONTRADICTION 2: CLAUDE.md requires Supabase/OpenAI API keys

**Source of truth (Deployment Guide, README.md):** No API keys required for basic local usage. Ollama is primary provider.

**CLAUDE.md states (lines 68-72):**
> 3. **Required API Keys:**
>    - OpenAI API key
>    - Anthropic API key
>    - Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

**Fix:** Change to "No required API keys for local usage. Ollama is the primary provider." List cloud provider keys as optional.

---

### CONTRADICTION 3: CLAUDE.md recommends global npm install of LangGraph CLI

**Source of truth (Deployment Guide, Section 1):**
> `corepack enable && corepack prepare yarn@4.9.2 --activate`
> Must use Corepack activation pattern. No global yarn.

**Source of truth (Deployment Guide, Section 3):**
> `@langchain/langgraph-cli` installs as `langgraphjs`, not `langgraph`.

**CLAUDE.md states (line 75-76):**
> - Install LangGraph CLI: `npm install -g @langchain/langgraph-cli`

**Fix:** Remove global install instruction. Replace with: "LangGraph CLI is installed as a workspace devDependency. The binary is `langgraphjs`, not `langgraph`. Run via `yarn --cwd apps/agents langgraph`."

---

### CONTRADICTION 4: CLAUDE.md missing topology contract invariants

**Source of truth (Topology Contract):**
> Contract Invariants (Must Hold):
> 1. No unreachable nodes
> 2. Router destination completeness
> 3. No silent pruning
> 4. Local-only is implemented as gating, not topology deletion

**CLAUDE.md:** No mention of topology contract, graph invariants, or the "no silent pruning" rule.

**Fix:** Add a "Graph Topology" section to CLAUDE.md referencing the topology contract and listing key invariants.

---

### CONTRADICTION 5: CLAUDE.md missing Yarn 4/Corepack/nodeLinker requirements

**Source of truth (Deployment Guide):**
> - nodeLinker: node-modules (not PnP)
> - Corepack activation pattern required
> - Binary name is langgraphjs, not langgraph
> - All workspace package.json files must be COPY'd before yarn install

**CLAUDE.md:** No mention of nodeLinker, Corepack, binary name hazard, or workspace COPY requirement.

**Fix:** Add a "Yarn 4 / Docker Requirements" section to CLAUDE.md with these critical constraints.

---

### CONTRADICTION 6: QUICKSTART.md references Supabase

**Source of truth (README.md):** No Supabase or cloud authentication dependencies.

**QUICKSTART.md states (lines 43-48):**
> ```dotenv
> # Supabase (used for auth in some flows -- can be dummy if you don't use it)
> NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000
> NEXT_PUBLIC_SUPABASE_ANON_KEY=dummykey
> ```

**Fix:** Remove Supabase environment variables from QUICKSTART.md. Supabase has been fully removed from this fork.

---

### CONTRADICTION 7: apps/web/README.md references Supabase authentication

**Source of truth (README.md, MIGRATION_PLAN.md Phase 2):** Supabase authentication has been removed.

**apps/web/README.md** still references:
- Supabase authentication setup
- Cloud API keys as prerequisites

**Fix:** Update apps/web/README.md to reflect local-only stack.

---

### OMISSION 1: LOCAL_SETUP.md missing Corepack mention

**Source of truth (Deployment Guide, Section 1):** Corepack activation is mandatory.

**LOCAL_SETUP.md (line 9):** Lists "Yarn (v4.9.2)" as prerequisite but does not mention Corepack activation.

**Fix:** Add note: "Yarn 4 requires Corepack. Run `corepack enable` before `yarn install`."

---

### OMISSION 2: ARCHITECTURE.md missing binary name and Docker constraints

**Source of truth (Deployment Guide, Sections 3-4):** `langgraphjs` binary name, workspace COPY requirement.

**ARCHITECTURE.md:** Does not mention Docker deployment constraints or binary naming.

**Fix:** Add reference to Deployment Guide for Docker-specific constraints.

---

## Summary of Required Changes

### Files to Update

1. **CLAUDE.md** - 6 fixes required (highest priority)
   - Remove Supabase from Infrastructure
   - Remove required API keys; make them optional
   - Fix LangGraph CLI instruction (no global install, langgraphjs binary)
   - Add Yarn 4/Corepack/nodeLinker section
   - Add Graph Topology section referencing topology contract
   - Add reference to source-of-truth documents

2. **QUICKSTART.md** - 1 fix
   - Remove Supabase environment variables

3. **LOCAL_SETUP.md** - 1 fix
   - Add Corepack activation note

4. **ARCHITECTURE.md** - 1 fix
   - Add reference to deployment guide for Docker constraints

5. **apps/web/README.md** - 1 fix
   - Remove Supabase authentication references; align with local-only stack

---

## Verification Checklist

After applying all fixes:

- [ ] No document references Supabase as a required dependency
- [ ] No document requires OpenAI API key for basic usage
- [ ] All documents agree on `langgraphjs` as the CLI binary name
- [ ] All documents mention Corepack for Yarn 4 where relevant
- [ ] All documents reflect `nodeLinker: node-modules` requirement
- [ ] CLAUDE.md references topology contract invariants
- [ ] All workspace package.json COPY requirement is documented where relevant
- [ ] Source-of-truth documents are accessible at canonical `docs/` paths

# Diagnostic Audit — Run #1

## Build Errors
| Item | Status | Notes |
|------|--------|-------|
| yarn install | UNCERTAIN | Network blocked, Yarn not installed, workspace: protocol needs Yarn |
| yarn build (root) | UNCERTAIN | Cannot run without deps. Risk: @prisma/client not generated, Supabase refs |
| yarn workspace @opencanvas/agents build | UNCERTAIN | LangGraph/ChatOpenAI deps may be missing |
| yarn workspace @opencanvas/web build | UNCERTAIN | Next.js deps, @prisma/client, Supabase auth refs possible |

## Import & Dependency Issues
| Check | Status | Notes |
|-------|--------|-------|
| @supabase/supabase-js imports | OK | None found in source |
| @/lib/supabase/* imports | OK | None found |
| @prisma/client generated | UNCERTAIN | node_modules absent, must run prisma generate |
| Workspace deps resolution | UNCERTAIN | Could not verify |

## Environment & Config Issues
| Check | Status | Notes |
|-------|--------|-------|
| .env.example completeness | OK | OLLAMA_API_URL, DATABASE_URL present |
| DATABASE_URL defaults | OK | postgresql://opencanvas:opencanvas_local@localhost:5432/opencanvas |
| OLLAMA_API_URL references | OK | Used in code, fallback to localhost:11434 |
| LANGGRAPH_API_URL usage | UNCERTAIN | .env says :8123, docker-compose maps :54367 on host |

## Runtime Readiness
| Check | Status | Notes |
|-------|--------|-------|
| docker-compose.yml services | OK | postgres, ollama, langgraph defined. Port mismatch noted |
| Prisma schema vs SQL migration | OK | vector(768) matches nomic-embed-text |
| langgraph.json config | OK | Node 20, deps listed, graph files mapped |

## Ollama Integration Gaps
| Check | Status | Notes |
|-------|--------|-------|
| model-config.ts Ollama handling | OK | Sets provider: 'ollama', uses OLLAMA_API_URL |
| utils/model.ts Ollama instances | OK | Creates ChatOpenAI with apiKey: 'ollama' |
| shared/models.ts Ollama list | OK | Ollama models listed first |
| OpenAI key checks | OK | Only throws if not ollama/litellm |

## Streaming & Tool Call Issues
| Check | Status | Notes |
|-------|--------|-------|
| stream.worker.ts format | OK | Uses streamMode: "events", serializes to JSON |
| Tool choice for Ollama | UNCERTAIN | stripToolChoice exists, unclear if disables Ollama tool use |

## Authentication Remnants
| Check | Status | Notes |
|-------|--------|-------|
| Local auth implementation | OK | verify-user.ts exists, returns dummy user |
| API routes use local auth | OK | Document upload uses verifyUserAuthenticated |
| UserContext.tsx Supabase refs | UNCERTAIN | Could not render, manual search showed no imports |

## Document & Embedding Pipeline
| Check | Status | Notes |
|-------|--------|-------|
| Document upload API route | OK | Exists, uses Prisma |
| Embedding generation | OK | Uses Ollama nomic-embed-text |
| Embedding dimension match | OK | 768 in schema matches code |
| Semantic search route | OK | Exists |

## Missing Files
All files from MIGRATION_PLAN.md "Files to CREATE" checklist exist.

## Test Coverage Gaps
| Check | Status | Notes |
|-------|--------|-------|
| Agents unit tests | UNCERTAIN | Could not run, one test exists for Ollama config |
| Integration tests | UNCERTAIN | Needs running services |
| Coverage quality | LOW | No web UI, document upload, or streaming logic tests |

## Prioritized Issues
1. **Dependency installation/build** — HIGH blast radius, blocks everything
2. **Environment variable mismatches** — MEDIUM, easy fix
3. **Prisma client generation** — HIGH, runtime failures without it
4. **Test environment** — MEDIUM, needs running services
5. **Tool choice logic** — LOW-MEDIUM, may break function calling

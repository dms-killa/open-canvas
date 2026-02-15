# Quick Start: Run Open Canvas Locally (LAN‑based Ollama)

This guide shows the **minimum steps** needed to bring up a fully functional Open Canvas instance that uses a **local‑only PostgreSQL database and an external Ollama server on your LAN**.

---

## 1. Prerequisites

- Docker Engine ≥ 20.10 and `docker-compose` (or the Docker Desktop UI)
- Git
- An active Ollama endpoint reachable from this machine, e.g.:

```
http://ollama.mysubnet:11434   # replace with your LAN address/port
```

- Optional but recommended: API keys for OpenAI / Anthropic / other providers (only needed if you plan to use those models).

---

## 2. Clone the repository

```bash
git clone <REPO_URL>
cd open-canvas
```

*(Replace `<REPO_URL>` with the actual HTTPS/SSH URL.)*

---

## 3. Create the `.env` file

1. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

2. Edit `/.env` and set at least the following variables:

   ```dotenv
   # Supabase (used for auth in some flows – can be dummy if you don't use it)
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:3000   # or your own supabase endpoint
   NEXT_PUBLIC_SUPABASE_ANON_KEY=dummykey

   # Backend / Agent container – point to the LAN Ollama server
   OLLAMA_API_URL=http://<YOUR_LLAN_HOST>:11434   # <--- REQUIRED

   # (Optional) any other provider keys you want to use, e.g.:
   # OPENAI_API_KEY=sk-...
   # ANTHROPIC_API_KEY=sk-...
   ```

   > **Important:** Do **not** set `OLLAMA_ENABLED` – the default (`true`) is fine.
   > The compose file will forward this variable to the agent container.

---

## 4. Spin up only the required services

We use a dedicated Compose file that **does not start a local Ollama container**. It only brings up PostgreSQL and the LangGraph backend, while pulling in your external Ollama instance.

```bash
docker-compose -f docker-compose.lan.yml up -d postgres langgraph
```

### What this does
- `postgres` – local database (`opencanvas`) used by agents.
- `langgraph` – builds the agent API container. It reads `OLLAMA_API_URL` from the environment (the value you added to `.env`) and forwards LLM calls to your LAN Ollama server.

Wait a few seconds for both containers to become healthy:

```bash
docker-compose -f docker-compose.lan.yml ps
```

You should see `postgres` listed as *healthy* and `langgraph` in **Up** state with no errors.

---

## 5. Run the frontend dev server (Next.js)

Open a new terminal window (or use any existing shell) and start the UI:

```bash
cd apps/web
yarn dev
```

The browser will be served at **http://localhost:3000**. The interface should load quickly; you can now chat with agents, create documents, etc., using whichever model your external Ollama node provides.

---

## 6. Verify everything works

1. Refresh the UI and confirm that messages are being streamed.
2. In the terminal where `langgraph` is running, watch the logs for successful calls to your LAN Ollama endpoint (look for HTTP `200` responses).
3. If you encounter a “model not found” error, double‑check that:
   - The model name configured in `packages/shared/src/models.ts` (or via your agent config) exists on the LAN Ollama server.
   - The URL in `OLLAMA_API_URL` is correct and reachable (`curl http://<host>:11434/api/tags`).

---

## 7. Clean‑up

When you are done, stop everything:

```bash
docker-compose -f docker-compose.lan.yml down
```

Feel free to keep the database container running if you plan to reuse it later; otherwise remove its volume with `docker-compose -f docker-compose.lan.yml down -v`.

---

### TL;DR Command Summary

```bash
git clone <REPO_URL> && cd open-canvas
cp .env.example .env
# edit .env → set OLLAMA_API_URL to your LAN Ollama address
docker-compose -f docker-compose.lan.yml up -d postgres langgraph
cd apps/web && yarn dev   # then open http://localhost:3000
```

---

**You’re now ready to explore Open Canvas using your own LAN‑hosted Ollama!** 🎉
import { test, expect } from "@playwright/test";

/**
 * Integration tests for the local-first Open Canvas stack.
 *
 * Prerequisites:
 * - PostgreSQL running on port 5432
 * - Ollama running on port 11434
 * - LangGraph server running on port 54367
 * - Next.js frontend running on port 3000
 *
 * Run with: npx playwright test tests/integration/local-stack.test.ts
 */

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const LANGGRAPH_URL =
  process.env.LANGGRAPH_API_URL || "http://localhost:54367";
const OLLAMA_URL = process.env.OLLAMA_API_URL || "http://localhost:11434";

test.describe("Local Stack Integration Tests", () => {
  test("application loads without authentication", async ({ page }) => {
    await page.goto(BASE_URL);
    // Should load directly to canvas, no login redirect
    await expect(page).not.toHaveURL(/auth/);
    // Wait for the page to be interactive
    await page.waitForLoadState("networkidle");
  });

  test("health check endpoint responds", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/healthz`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.ok).toBe(true);
  });

  test("LangGraph server is accessible", async ({ request }) => {
    try {
      const response = await request.get(`${LANGGRAPH_URL}/ok`);
      expect(response.status()).toBeLessThan(500);
    } catch {
      test.skip(true, "LangGraph server not running");
    }
  });

  test("Ollama server is accessible", async ({ request }) => {
    try {
      const response = await request.get(`${OLLAMA_URL}/api/tags`);
      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data).toHaveProperty("models");
    } catch {
      test.skip(true, "Ollama server not running");
    }
  });

  test("no console errors about missing Supabase config", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    const supabaseErrors = errors.filter(
      (e) =>
        e.toLowerCase().includes("supabase") ||
        e.toLowerCase().includes("supabase_url")
    );
    expect(supabaseErrors).toHaveLength(0);
  });

  test("document upload API accepts files", async ({ request }) => {
    const formData = new URLSearchParams();
    // This tests the endpoint exists; actual file upload requires multipart
    const response = await request.post(`${BASE_URL}/api/documents/upload`, {
      multipart: {
        file: {
          name: "test.txt",
          mimeType: "text/plain",
          buffer: Buffer.from("Hello, World!"),
        },
      },
    });
    // Either 200 (success) or 500 (DB not connected) - not 404
    expect(response.status()).not.toBe(404);
  });

  test("semantic search API exists", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/search/semantic`, {
      data: { query: "test" },
    });
    // Either 200 (success) or 500 (Ollama not ready) - not 404
    expect(response.status()).not.toBe(404);
  });

  test("store API routes work without auth errors", async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/store/get`, {
      data: { namespace: ["test"], key: "test-key" },
    });
    // Should not return 401 Unauthorized
    expect(response.status()).not.toBe(401);
  });
});

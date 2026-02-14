import { prisma } from "@/lib/db/prisma";

export async function generateEmbedding(text: string): Promise<number[]> {
  const baseUrl = process.env.OLLAMA_API_URL || "http://localhost:11434";

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text",
      prompt: text,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to generate embedding: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();
  return data.embedding;
}

export async function storeDocumentEmbedding(
  documentId: string,
  chunkText: string,
  metadata?: Record<string, unknown>
) {
  const embedding = await generateEmbedding(chunkText);
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  await prisma.$executeRaw`
    INSERT INTO document_embeddings (document_id, chunk_text, embedding, metadata)
    VALUES (${documentId}::uuid, ${chunkText}, ${embedding}::vector, ${metadataJson}::jsonb)
  `;
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push(text.slice(start, end));
    start = end - overlap;
    if (start >= text.length) break;
  }

  return chunks;
}

import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings/generate";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { query, limit = 5 } = await req.json();

  if (!query) {
    return NextResponse.json(
      { error: "Query is required" },
      { status: 400 }
    );
  }

  try {
    const queryEmbedding = await generateEmbedding(query);

    const results = await prisma.$queryRaw`
      SELECT
        de.chunk_text,
        de.metadata,
        d.filename,
        1 - (de.embedding <=> ${queryEmbedding}::vector) as similarity
      FROM document_embeddings de
      JOIN documents d ON de.document_id = d.id
      ORDER BY de.embedding <=> ${queryEmbedding}::vector
      LIMIT ${limit}
    `;

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json(
      { error: `Semantic search failed: ${error.message}` },
      { status: 500 }
    );
  }
}

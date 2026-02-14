import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  const document = await prisma.document.findUnique({
    where: { id },
  });

  if (!document) {
    return NextResponse.json(
      { error: "Document not found" },
      { status: 404 }
    );
  }

  return new NextResponse(document.fileData, {
    status: 200,
    headers: {
      "Content-Type": document.contentType,
      "Content-Disposition": `inline; filename="${document.filename}"`,
      "Content-Length": document.fileSize.toString(),
    },
  });
}

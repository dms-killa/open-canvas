import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { verifyUserAuthenticated } from "@/lib/auth/verify-user";

export async function POST(req: NextRequest) {
  const { user } = await verifyUserAuthenticated();
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const document = await prisma.document.create({
    data: {
      userId: user.id,
      filename: file.name,
      contentType: file.type,
      fileData: buffer,
      fileSize: BigInt(file.size),
    },
  });

  return NextResponse.json({
    id: document.id,
    filename: document.filename,
    url: `/api/documents/${document.id}`,
  });
}

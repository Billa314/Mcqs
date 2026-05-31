import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getDataDir, getUploadsDir } from "@/lib/db/storage";
import { isImageFile } from "@/lib/images/ocr";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const name = file.name.toLowerCase();
  const isPdf = name.endsWith(".pdf");
  const isImage = isImageFile(file.name);

  if (!isPdf && !isImage) {
    return NextResponse.json(
      { error: "Only PDF or image files (jpg, png, webp) allowed" },
      { status: 400 },
    );
  }

  const targetDir = isImage ? getDataDir() : getUploadsDir();
  await fs.mkdir(targetDir, { recursive: true });
  const safeName = file.name.replace(/[^a-zA-Z0-9._\- ()]/g, "_");
  const dest = path.join(targetDir, safeName);
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(dest, buf);

  return NextResponse.json({
    filename: safeName,
    path: dest,
    type: isImage ? "image" : "pdf",
  });
}

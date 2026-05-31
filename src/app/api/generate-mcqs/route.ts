import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { getDataDir, getUploadsDir } from "@/lib/db/storage";
import { processImagesFromDir } from "@/lib/pipeline/process-images";
import { processPdfFile } from "@/lib/pipeline/process-pdf";
import { resolveDataPdf } from "@/lib/pdf/extract";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const imagesOnly = body.imagesOnly !== false;
  const replace = body.replace === true;
  const filename = body.filename as string | undefined;
  const useData = body.useData === true;

  if (imagesOnly) {
    const dir = useData ? getDataDir() : getUploadsDir();
    const result = await processImagesFromDir(dir, { replace });
    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }
    return NextResponse.json(result);
  }

  let filePath: string;
  if (useData) {
    filePath = resolveDataPdf(filename);
  } else if (filename) {
    filePath = path.join(getUploadsDir(), filename);
  } else {
    return NextResponse.json(
      { error: "filename required for PDF mode" },
      { status: 400 },
    );
  }

  const result = await processPdfFile(filePath);
  if (!result.ok) {
    return NextResponse.json(result, { status: 422 });
  }

  return NextResponse.json(result);
}

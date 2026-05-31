import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  method: "text" | "ocr" | "mixed";
  hash: string;
}

export function hashBuffer(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

/** Extract text via pdf-parse; returns sparse text for scanned PDFs. */
export async function extractTextFromPdf(
  filePath: string,
): Promise<{ text: string; pageCount: number }> {
  const buf = await fs.readFile(filePath);
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse") as (
    data: Buffer,
  ) => Promise<{ text: string; numpages: number }>;
  const data = await pdfParse(buf);
  return { text: data.text ?? "", pageCount: data.numpages ?? 0 };
}

export async function extractPdf(
  filePath: string,
): Promise<PdfExtractionResult> {
  const buf = await fs.readFile(filePath);
  const hash = hashBuffer(buf);
  const { text, pageCount } = await extractTextFromPdf(filePath);

  const meaningful = text.replace(/\s/g, "").length;
  if (meaningful >= 200) {
    return { text, pageCount, method: "text", hash };
  }

  const { ocrPdf } = await import("./ocr");
  const ocrText = await ocrPdf(filePath);
  const combined =
    meaningful > 0 ? `${text}\n\n${ocrText}` : ocrText;

  return {
    text: combined,
    pageCount,
    method: meaningful > 0 ? "mixed" : "ocr",
    hash,
  };
}

export function resolveDataPdf(filename?: string): string {
  const dataDir = path.join(process.cwd(), "data");
  if (filename) {
    return path.join(dataDir, filename);
  }
  return path.join(dataDir, "CCE-2024 (1).pdf");
}

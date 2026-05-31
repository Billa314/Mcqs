import { promises as fs } from "fs";
import path from "path";
import { createWorker } from "tesseract.js";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

async function loadPdfJs(): Promise<PdfJsModule> {
  return import("pdfjs-dist/legacy/build/pdf.mjs");
}

async function renderPageToPng(
  pdfjs: PdfJsModule,
  filePath: string,
  pageNum: number,
): Promise<Buffer | null> {
  try {
    const { createCanvas } = await import("@napi-rs/canvas");
    const data = new Uint8Array(await fs.readFile(filePath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    return canvas.toBuffer("image/png");
  } catch {
    return null;
  }
}

async function ocrImageBuffer(buf: Buffer): Promise<string> {
  const worker = await createWorker("eng");
  try {
    const {
      data: { text },
    } = await worker.recognize(buf);
    return text;
  } finally {
    await worker.terminate();
  }
}

/** OCR all pages of a PDF (for scanned / image-based documents). */
export async function ocrPdf(filePath: string): Promise<string> {
  const pdfjs = await loadPdfJs();
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];

  for (let i = 1; i <= doc.numPages; i++) {
    const png = await renderPageToPng(pdfjs, filePath, i);
    if (png) {
      const text = await ocrImageBuffer(png);
      if (text.trim()) {
        parts.push(`--- Page ${i} ---\n${text.trim()}`);
      }
      continue;
    }

    const page = await doc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    if (pageText.trim()) parts.push(`--- Page ${i} ---\n${pageText.trim()}`);
  }

  return parts.join("\n\n");
}

export async function ocrDataFolderPdfs(): Promise<Record<string, string>> {
  const dataDir = path.join(process.cwd(), "data");
  const files = await fs.readdir(dataDir);
  const out: Record<string, string> = {};
  for (const file of files) {
    if (!file.toLowerCase().endsWith(".pdf")) continue;
    out[file] = await ocrPdf(path.join(dataDir, file));
  }
  return out;
}

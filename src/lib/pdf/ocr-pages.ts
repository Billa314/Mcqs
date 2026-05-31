import { promises as fs } from "fs";
import { createWorker, type Worker } from "tesseract.js";

import type { PDFDocumentProxy } from "pdfjs-dist";

type PdfJsModule = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
type PdfDocument = PDFDocumentProxy;

let pdfjsModule: PdfJsModule | null = null;
let ocrWorker: Worker | null = null;

export async function loadPdfDocument(filePath: string): Promise<{
  doc: PdfDocument;
  numPages: number;
}> {
  if (!pdfjsModule) {
    pdfjsModule = await import("pdfjs-dist/legacy/build/pdf.mjs");
  }
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await pdfjsModule.getDocument({ data, useSystemFonts: true }).promise;
  return { doc, numPages: doc.numPages };
}

async function getOcrWorker(): Promise<Worker> {
  if (!ocrWorker) {
    ocrWorker = await createWorker("eng", 1, { logger: () => {} });
  }
  return ocrWorker;
}

export async function terminatePdfOcr(): Promise<void> {
  if (ocrWorker) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
}

export function isPageTextMeaningful(text: string): boolean {
  const compact = text.replace(/\s/g, "");
  if (compact.length < 40) return false;
  const letters = (text.match(/[a-zA-Z]/g) ?? []).length;
  return letters >= 25;
}

/** OCR a single PDF page; returns empty string if unreadable. */
export async function ocrPdfPage(
  doc: PdfDocument,
  pageNum: number,
  scale = 1.75,
): Promise<string> {
  try {
    const { createCanvas } = await import("@napi-rs/canvas");
    const page = await doc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext("2d");
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;
    const png = canvas.toBuffer("image/png");
    const worker = await getOcrWorker();
    const {
      data: { text },
    } = await worker.recognize(png);
    return text.trim();
  } catch {
    return "";
  }
}

import { promises as fs } from "fs";
import path from "path";
import { createWorker, type Worker } from "tesseract.js";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"]);

export function isImageFile(filename: string): boolean {
  return IMAGE_EXT.has(path.extname(filename).toLowerCase());
}

export async function listImagesInDir(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  return entries
    .filter((f) => isImageFile(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => path.join(dir, f));
}

let sharedWorker: Worker | null = null;

async function getWorker(): Promise<Worker> {
  if (!sharedWorker) {
    sharedWorker = await createWorker("eng", 1, {
      logger: () => {},
    });
  }
  return sharedWorker;
}

export async function terminateOcrWorker(): Promise<void> {
  if (sharedWorker) {
    await sharedWorker.terminate();
    sharedWorker = null;
  }
}

/** OCR a single image file; returns raw text. */
export async function ocrImageFile(filePath: string): Promise<string> {
  const worker = await getWorker();
  const {
    data: { text },
  } = await worker.recognize(filePath);
  return text;
}

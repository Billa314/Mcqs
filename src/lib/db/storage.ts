import { promises as fs } from "fs";
import path from "path";
import type { Mcq, QuizSession } from "@/lib/types";
import { supabase } from "@/lib/supabase";

const ROOT = process.cwd();
const STORAGE_DIR = path.join(ROOT, "storage");
const MCQS_FILE = path.join(STORAGE_DIR, "mcqs.json");
const SESSIONS_FILE = path.join(STORAGE_DIR, "sessions.json");
const CHUNKS_DIR = path.join(STORAGE_DIR, "chunks");
const META_FILE = path.join(STORAGE_DIR, "processed-pdfs.json");
const IMAGES_META_FILE = path.join(STORAGE_DIR, "processed-images.json");
const OCR_CACHE_DIR = path.join(STORAGE_DIR, "ocr");
const EXTRACTED_DIR = path.join(STORAGE_DIR, "extracted");
const STRUCTURED_DIR = path.join(STORAGE_DIR, "structured");

export interface ProcessedImageMeta {
  filename: string;
  hash: string;
  processedAt: string;
  qaCount: number;
  mcqCount: number;
}

export interface ProcessedPdfMeta {
  filename: string;
  hash: string;
  processedAt: string;
  mcqCount: number;
  pageCount: number;
  extractionMethod: "text" | "ocr" | "mixed";
}

async function ensureStorage() {
  try {
    await fs.mkdir(STORAGE_DIR, { recursive: true });
    await fs.mkdir(CHUNKS_DIR, { recursive: true });
    await fs.mkdir(OCR_CACHE_DIR, { recursive: true });
    await fs.mkdir(EXTRACTED_DIR, { recursive: true });
    await fs.mkdir(STRUCTURED_DIR, { recursive: true });
    for (const file of [MCQS_FILE, SESSIONS_FILE, META_FILE, IMAGES_META_FILE]) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, "[]", "utf-8");
      }
    }
  } catch (error) {
    console.warn("Could not ensure storage directories (likely read-only environment like Vercel):", error);
  }
}

export async function loadMcqs(): Promise<Mcq[]> {
  const { data, error } = await supabase.from("mcqs").select("*");
  if (error) {
    console.error("Supabase loadMcqs error:", error);
    return [];
  }
  return data as Mcq[];
}

export async function saveMcqs(mcqs: Mcq[]): Promise<void> {
  // If running locally, we can still save to JSON for backup or just push to Supabase
  // For now, let's insert to Supabase. Note: this might fail on large arrays due to limits.
  const { error } = await supabase.from("mcqs").upsert(mcqs.map(m => ({
    id: m.id,
    question: m.question,
    options: m.options,
    answer: m.answer,
    explanation: m.explanation || null,
    category: m.category || null,
    chapter: m.chapter || null,
    source_pdf: m.source_pdf || null,
    source_page: m.source_page || null
  })));
  if (error) console.error("Supabase saveMcqs error:", error);
}

export async function appendMcqs(newMcqs: Mcq[]): Promise<number> {
  const { error } = await supabase.from("mcqs").insert(newMcqs.map(m => ({
    id: m.id,
    question: m.question,
    options: m.options,
    answer: m.answer,
    explanation: m.explanation || null,
    category: m.category || null,
    chapter: m.chapter || null,
    source_pdf: m.source_pdf || null,
    source_page: m.source_page || null
  })));
  if (error) {
    console.error("Supabase appendMcqs error:", error);
    return 0;
  }
  return newMcqs.length;
}

export async function getMcqsByCategory(category?: string): Promise<Mcq[]> {
  if (!category) return loadMcqs();
  const { data, error } = await supabase
    .from("mcqs")
    .select("*")
    .ilike("category", category);
  
  if (error) {
    console.error("Supabase getMcqsByCategory error:", error);
    return [];
  }
  return data as Mcq[];
}

export async function loadSessions(): Promise<QuizSession[]> {
  const { data, error } = await supabase.from("sessions").select("*");
  if (error) return [];
  return data.map(d => ({
    id: d.id,
    mcqIds: d.mcq_ids,
    createdAt: d.created_at
  }));
}

export async function saveSession(session: QuizSession): Promise<void> {
  const { error } = await supabase.from("sessions").insert([{
    id: session.id,
    mcq_ids: session.mcqIds,
    created_at: session.createdAt
  }]);
  if (error) {
    console.error("Supabase saveSession error:", error);
  }
}

export async function loadProcessedPdfs(): Promise<ProcessedPdfMeta[]> {
  await ensureStorage();
  const raw = await fs.readFile(META_FILE, "utf-8");
  return JSON.parse(raw) as ProcessedPdfMeta[];
}

export async function markPdfProcessed(meta: ProcessedPdfMeta): Promise<void> {
  const list = await loadProcessedPdfs();
  const idx = list.findIndex((p) => p.hash === meta.hash);
  if (idx >= 0) list[idx] = meta;
  else list.push(meta);
  await fs.writeFile(META_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export async function isPdfProcessed(hash: string): Promise<boolean> {
  const list = await loadProcessedPdfs();
  return list.some((p) => p.hash === hash);
}

export async function saveChunkCache(
  pdfHash: string,
  chunkIndex: number,
  content: string,
): Promise<void> {
  await fs.mkdir(path.join(CHUNKS_DIR, pdfHash), { recursive: true });
  await fs.writeFile(
    path.join(CHUNKS_DIR, pdfHash, `${chunkIndex}.txt`),
    content,
    "utf-8",
  );
}

export async function loadChunkCache(
  pdfHash: string,
  chunkIndex: number,
): Promise<string | null> {
  try {
    return await fs.readFile(
      path.join(CHUNKS_DIR, pdfHash, `${chunkIndex}.txt`),
      "utf-8",
    );
  } catch {
    return null;
  }
}

export function getUploadsDir() {
  return path.join(STORAGE_DIR, "uploads");
}

export function getDataDir() {
  return path.join(ROOT, "data");
}

export async function loadProcessedImages(): Promise<ProcessedImageMeta[]> {
  await ensureStorage();
  const raw = await fs.readFile(IMAGES_META_FILE, "utf-8");
  return JSON.parse(raw) as ProcessedImageMeta[];
}

export async function markImageProcessed(
  meta: ProcessedImageMeta,
): Promise<void> {
  const list = await loadProcessedImages();
  const idx = list.findIndex((p) => p.hash === meta.hash);
  if (idx >= 0) list[idx] = meta;
  else list.push(meta);
  await fs.writeFile(IMAGES_META_FILE, JSON.stringify(list, null, 2), "utf-8");
}

export async function isImageProcessed(hash: string): Promise<boolean> {
  const list = await loadProcessedImages();
  return list.some((p) => p.hash === hash);
}

export function getExtractedDir() {
  return EXTRACTED_DIR;
}

export function getStructuredDir() {
  return STRUCTURED_DIR;
}

/** Save parsed Q&A as a structured .txt file (QUESTION / ANSWER blocks). */
export async function saveStructuredText(
  imageFilename: string,
  content: string,
): Promise<string> {
  await ensureStorage();
  const base = path.basename(imageFilename, path.extname(imageFilename));
  const txtPath = path.join(STRUCTURED_DIR, `${base}.structured.txt`);
  await fs.writeFile(txtPath, content, "utf-8");
  return txtPath;
}

/** Combined master file of all images' structured Q&A. */
export async function saveMasterStructuredText(content: string): Promise<string> {
  await ensureStorage();
  const txtPath = path.join(STRUCTURED_DIR, "ALL-QUESTIONS.structured.txt");
  await fs.writeFile(txtPath, content, "utf-8");
  return txtPath;
}

/** Save OCR text as a readable .txt file (same base name as the image). */
export async function saveExtractedText(
  imageFilename: string,
  text: string,
): Promise<string> {
  await ensureStorage();
  const base = path.basename(imageFilename, path.extname(imageFilename));
  const txtPath = path.join(EXTRACTED_DIR, `${base}.txt`);
  await fs.writeFile(txtPath, text, "utf-8");
  return txtPath;
}

export async function loadExtractedText(
  imageFilename: string,
): Promise<string | null> {
  const base = path.basename(imageFilename, path.extname(imageFilename));
  try {
    return await fs.readFile(
      path.join(EXTRACTED_DIR, `${base}.txt`),
      "utf-8",
    );
  } catch {
    return null;
  }
}

export async function listExtractedTextFiles(): Promise<string[]> {
  await ensureStorage();
  const files = await fs.readdir(EXTRACTED_DIR);
  return files.filter((f) => f.endsWith(".txt")).map((f) => path.join(EXTRACTED_DIR, f));
}

export async function saveOcrCache(hash: string, text: string): Promise<void> {
  await fs.writeFile(path.join(OCR_CACHE_DIR, `${hash}.txt`), text, "utf-8");
}

export async function loadOcrCache(hash: string): Promise<string | null> {
  try {
    return await fs.readFile(path.join(OCR_CACHE_DIR, `${hash}.txt`), "utf-8");
  } catch {
    return null;
  }
}

export async function clearImageProcessingCache(): Promise<void> {
  await ensureStorage();
  await fs.writeFile(IMAGES_META_FILE, "[]", "utf-8");
  for (const dir of [OCR_CACHE_DIR, EXTRACTED_DIR, STRUCTURED_DIR]) {
    try {
      const files = await fs.readdir(dir);
      await Promise.all(
        files.map((f) => fs.unlink(path.join(dir, f)).catch(() => {})),
      );
    } catch {
      /* empty */
    }
  }
}

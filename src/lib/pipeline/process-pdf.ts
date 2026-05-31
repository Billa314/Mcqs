import path from "path";
import { extractPdf } from "@/lib/pdf/extract";
import { cleanExtractedText } from "@/lib/pdf/clean";
import { chunkText } from "@/lib/pdf/chunk";
import { generateMcqsFromText } from "@/lib/mcq/generate";
import {
  appendMcqs,
  isPdfProcessed,
  markPdfProcessed,
  saveChunkCache,
} from "@/lib/db/storage";

export interface ProcessResult {
  ok: boolean;
  skipped?: boolean;
  mcqCount: number;
  added: number;
  extractionMethod: string;
  message: string;
}

export async function processPdfFile(filePath: string): Promise<ProcessResult> {
  const extraction = await extractPdf(filePath);

  if (await isPdfProcessed(extraction.hash)) {
    return {
      ok: true,
      skipped: true,
      mcqCount: 0,
      added: 0,
      extractionMethod: extraction.method,
      message: `PDF already processed (${extraction.hash})`,
    };
  }

  const cleaned = cleanExtractedText(extraction.text);
  if (cleaned.length < 50) {
    return {
      ok: false,
      mcqCount: 0,
      added: 0,
      extractionMethod: extraction.method,
      message: "Insufficient text extracted from PDF",
    };
  }

  const chunks =
    cleaned.length > 1500
      ? chunkText(cleaned)
      : [
          {
            index: 0,
            text: cleaned,
            chapter: "General",
            wordCount: cleaned.split(/\s+/).length,
          },
        ];

  for (const chunk of chunks) {
    await saveChunkCache(extraction.hash, chunk.index, chunk.text);
  }

  const sourcePdf = path.basename(filePath);
  const mcqs = await generateMcqsFromText(cleaned, chunks, {
    sourcePdf,
    useOpenAI: Boolean(process.env.OPENAI_API_KEY),
    openAiKey: process.env.OPENAI_API_KEY,
  });

  const added = await appendMcqs(mcqs);
  await markPdfProcessed({
    filename: sourcePdf,
    hash: extraction.hash,
    processedAt: new Date().toISOString(),
    mcqCount: added,
    pageCount: extraction.pageCount,
    extractionMethod: extraction.method,
  });

  return {
    ok: true,
    mcqCount: mcqs.length,
    added,
    extractionMethod: extraction.method,
    message: `Generated ${mcqs.length} MCQs, stored ${added} new`,
  };
}

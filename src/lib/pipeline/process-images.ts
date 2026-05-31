import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import {
  isImageProcessed,
  markImageProcessed,
  saveMcqs,
  saveOcrCache,
  loadOcrCache,
  saveExtractedText,
  loadExtractedText,
  saveStructuredText,
  saveMasterStructuredText,
} from "@/lib/db/storage";
import { formatStructuredQaText } from "@/lib/mcq/format-structured";
import {
  listImagesInDir,
  ocrImageFile,
  terminateOcrWorker,
} from "@/lib/images/ocr";
import {
  detectCategoryFromChapter,
  detectChapterFromOcr,
  parseQaPairsFromOcr,
  qaPairsToMcqs,
} from "@/lib/mcq/parse-qa-images";
import { dedupeMcqs } from "@/lib/mcq/dedupe";
import type { Mcq } from "@/lib/types";

export interface ProcessImagesResult {
  ok: boolean;
  imageCount: number;
  qaPairsFound: number;
  mcqCount: number;
  added: number;
  message: string;
  perImage: { file: string; qaCount: number; mcqCount: number }[];
}

function hashFile(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex").slice(0, 16);
}

export async function processImagesFromDir(
  dir: string,
  options?: { replace?: boolean },
): Promise<ProcessImagesResult> {
  const images = await listImagesInDir(dir);
  if (images.length === 0) {
    return {
      ok: false,
      imageCount: 0,
      qaPairsFound: 0,
      mcqCount: 0,
      added: 0,
      message: "No images found in data folder (.jpg, .jpeg, .png, .webp)",
      perImage: [],
    };
  }

  const allMcqs: Mcq[] = [];
  const perImage: ProcessImagesResult["perImage"] = [];
  const masterStructured: string[] = [
    "################################################################################",
    "# MCQ BANK — STRUCTURED Q&A (all images)",
    `# Generated: ${new Date().toISOString()}`,
    "################################################################################",
    "",
  ];
  let qaTotal = 0;

  try {
    for (const imagePath of images) {
      const filename = path.basename(imagePath);
      const buf = await fs.readFile(imagePath);
      const fileHash = hashFile(buf);

      let ocrText = await loadExtractedText(filename);

      if (!ocrText && (await isImageProcessed(fileHash))) {
        ocrText = (await loadOcrCache(fileHash)) ?? null;
      }

      if (!ocrText) {
        console.log(`  OCR: ${filename}…`);
        ocrText = await ocrImageFile(imagePath);
        await saveOcrCache(fileHash, ocrText);
        await saveExtractedText(filename, ocrText);
      }

      const chapter = detectChapterFromOcr(ocrText);
      const category = detectCategoryFromChapter(chapter);
      const pairs = parseQaPairsFromOcr(ocrText);

      const structured = formatStructuredQaText(pairs, {
        sourceFile: filename,
        chapter,
        category,
      });
      await saveStructuredText(filename, structured);
      masterStructured.push(structured, "");

      const mcqs = qaPairsToMcqs(pairs, {
        sourceImage: filename,
        chapter,
        category,
      });

      qaTotal += pairs.length;
      allMcqs.push(...mcqs);
      perImage.push({ file: filename, qaCount: pairs.length, mcqCount: mcqs.length });

      await markImageProcessed({
        filename,
        hash: fileHash,
        processedAt: new Date().toISOString(),
        qaCount: pairs.length,
        mcqCount: mcqs.length,
      });
    }
  } finally {
    await terminateOcrWorker();
  }

  const unique = dedupeMcqs(allMcqs);

  if (masterStructured.length > 5) {
    await saveMasterStructuredText(masterStructured.join("\n"));
  }

  if (options?.replace) {
    await saveMcqs(unique);
  } else {
    const { appendMcqs } = await import("@/lib/db/storage");
    await appendMcqs(unique);
  }

  return {
    ok: unique.length > 0,
    imageCount: images.length,
    qaPairsFound: qaTotal,
    mcqCount: unique.length,
    added: unique.length,
    message: `Processed ${images.length} images → ${qaTotal} Q&A pairs → ${unique.length} MCQs`,
    perImage,
  };
}

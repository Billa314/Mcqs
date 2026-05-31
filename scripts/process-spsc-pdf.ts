/**
 * OCR SPSC PDF page-by-page, skip blank pages, save 50 MCQs per batch file,
 * merge into storage/mcqs.json, and refresh storage/super.txt
 */
import { promises as fs } from "fs";
import path from "path";
import { loadMcqs, saveMcqs } from "../src/lib/db/storage";
import {
  loadPdfDocument,
  ocrPdfPage,
  isPageTextMeaningful,
  terminatePdfOcr,
} from "../src/lib/pdf/ocr-pages";
import { parseMcqsFromPastPaperText } from "../src/lib/mcq/parse-all-sources";
import { formatStructuredMcqList } from "../src/lib/mcq/format-structured";
import { dedupeMcqs } from "../src/lib/mcq/dedupe";
import type { Mcq } from "../src/lib/types";
import { buildSuperTxt } from "../src/lib/export/super-txt";

const PDF_NAME = "pdfcoffee.com_spsc-past-solved-papers-pdf-free (1).pdf";
const MCQS_PER_FILE = 50;
const ROOT = process.cwd();
const PDF_PATH = path.join(ROOT, "data", PDF_NAME);
const PAGE_DIR = path.join(ROOT, "storage", "extracted", "spsc-pdf-pages");
const BATCH_DIR = path.join(ROOT, "storage", "pdf-batches");

async function ensureDirs() {
  await fs.mkdir(PAGE_DIR, { recursive: true });
  await fs.mkdir(BATCH_DIR, { recursive: true });
}

function pageTxtPath(n: number) {
  return path.join(PAGE_DIR, `page-${String(n).padStart(3, "0")}.txt`);
}

async function saveBatches(mcqs: Mcq[], sourceLabel: string) {
  await ensureDirs();
  const batchCount = Math.ceil(mcqs.length / MCQS_PER_FILE) || 0;
  for (let b = 0; b < batchCount; b++) {
    const slice = mcqs.slice(b * MCQS_PER_FILE, (b + 1) * MCQS_PER_FILE);
    const name = `spsc-batch-${String(b + 1).padStart(3, "0")}.txt`;
    const content = formatStructuredMcqList(slice, {
      sourceFile: sourceLabel,
      batchLabel: `${b + 1} of ${batchCount} (${slice.length} MCQs)`,
      chapter: "SPSC Past Papers",
      category: "General Knowledge",
    });
    await fs.writeFile(path.join(BATCH_DIR, name), content, "utf-8");
    console.log(`  Wrote ${name} (${slice.length} MCQs)`);
  }
}

async function main() {
  const startPage = Number(process.argv.find((a) => a.startsWith("--from="))?.split("=")[1]) || 1;
  const maxPagesArg = process.argv.find((a) => a.startsWith("--max="))?.split("=")[1];
  const skipOcr = process.argv.includes("--skip-ocr");

  console.log(`PDF: ${PDF_PATH}`);
  await ensureDirs();

  const { doc, numPages } = await loadPdfDocument(PDF_PATH);
  const maxPage = maxPagesArg ? Math.min(numPages, Number(maxPagesArg)) : numPages;
  console.log(`Pages: ${numPages} (processing ${startPage}–${maxPage})`);

  const pdfMcqs: Mcq[] = [];
  let skipped = 0;

  try {
    for (let p = startPage; p <= maxPage; p++) {
      const cachePath = pageTxtPath(p);
      let text = "";

      if (skipOcr) {
        try {
          text = await fs.readFile(cachePath, "utf-8");
        } catch {
          continue;
        }
      } else {
        try {
          text = await fs.readFile(cachePath, "utf-8");
        } catch {
          process.stdout.write(`  Page ${p}/${maxPage} OCR… `);
          text = await ocrPdfPage(doc, p);
          if (!isPageTextMeaningful(text)) {
            console.log("skipped (unreadable)");
            skipped++;
            continue;
          }
          await fs.writeFile(cachePath, text, "utf-8");
          console.log(`ok (${text.length} chars)`);
        }
      }

      if (!isPageTextMeaningful(text)) {
        skipped++;
        continue;
      }

      const found = parseMcqsFromPastPaperText(text, PDF_NAME, p);
      if (found.length) {
        pdfMcqs.push(...found);
        console.log(`  Page ${p}: +${found.length} MCQs (total ${pdfMcqs.length})`);
      }
    }
  } finally {
    await terminatePdfOcr();
  }

  const uniquePdf = dedupeMcqs(pdfMcqs);
  console.log(`\nPDF: ${uniquePdf.length} MCQs (${skipped} pages skipped)`);

  await saveBatches(uniquePdf, PDF_NAME);

  const existing = await loadMcqs();
  const imageMcqs = existing.filter(
    (m) =>
      !m.source_pdf?.toLowerCase().endsWith(".pdf") &&
      !m.source_pdf?.includes("pdfcoffee"),
  );
  const combined = dedupeMcqs([...imageMcqs, ...uniquePdf]);
  await saveMcqs(combined);

  const superPath = await buildSuperTxt(combined);
  console.log(`\nWebsite: ${combined.length} total MCQs → storage/mcqs.json`);
  console.log(`Super file: ${superPath}`);
  console.log(`Batches: storage/pdf-batches/spsc-batch-*.txt`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Build MCQs from storage/extracted/*.txt (raw OCR).
 * Also writes structured Q&A to storage/structured/*.structured.txt
 */
import { promises as fs } from "fs";
import path from "path";
import {
  saveMcqs,
  getExtractedDir,
  saveStructuredText,
  saveMasterStructuredText,
} from "../src/lib/db/storage";
import {
  detectCategoryFromChapter,
  detectChapterFromOcr,
  parseQaPairsFromOcr,
  qaPairsToMcqs,
} from "../src/lib/mcq/parse-qa-images";
import { formatStructuredQaText } from "../src/lib/mcq/format-structured";
import { dedupeMcqs } from "../src/lib/mcq/dedupe";

async function main() {
  const dir = getExtractedDir();
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".txt"));
  if (!files.length) {
    console.error("No .txt files in storage/extracted. Run: npm run process-images");
    process.exit(1);
  }

  const allMcqs = [];
  const masterParts: string[] = [
    "################################################################################",
    "# MCQ BANK — STRUCTURED Q&A (all images)",
    `# Generated: ${new Date().toISOString()}`,
    "################################################################################",
    "",
  ];

  for (const file of files.sort()) {
    const text = await fs.readFile(path.join(dir, file), "utf-8");
    const chapter = detectChapterFromOcr(text);
    const category = detectCategoryFromChapter(chapter);
    const pairs = parseQaPairsFromOcr(text);
    const sourceImage = file.replace(/\.txt$/, ".jpeg");

    const structured = formatStructuredQaText(pairs, {
      sourceFile: sourceImage,
      chapter,
      category,
    });
    await saveStructuredText(sourceImage, structured);
    masterParts.push(structured);
    masterParts.push("");

    const mcqs = qaPairsToMcqs(pairs, {
      sourceImage,
      chapter,
      category,
    });
    console.log(
      `${file}: ${pairs.length} Q&A → structured txt + ${mcqs.length} MCQs`,
    );
    allMcqs.push(...mcqs);
  }

  const masterPath = await saveMasterStructuredText(masterParts.join("\n"));
  const unique = dedupeMcqs(allMcqs);
  await saveMcqs(unique);

  const { buildSuperTxt } = await import("../src/lib/export/super-txt");
  const superPath = await buildSuperTxt(unique);

  console.log(`\nStructured files: storage/structured/*.structured.txt`);
  console.log(`Master file:      ${masterPath}`);
  console.log(`Super file:       ${superPath}`);
  console.log(`MCQs saved:       ${unique.length} → storage/mcqs.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

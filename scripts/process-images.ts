import path from "path";
import { processImagesFromDir } from "../src/lib/pipeline/process-images";
import { clearImageProcessingCache } from "../src/lib/db/storage";

async function main() {
  const force = process.argv.includes("--force");
  const dataDir = path.join(process.cwd(), "data");

  if (force) {
    console.log("Clearing image OCR cache (--force)…");
    await clearImageProcessingCache();
  }

  console.log(`Processing images only in: ${dataDir}`);
  console.log("(PDFs are skipped — use images for best results)\n");

  const result = await processImagesFromDir(dataDir, { replace: true });

  console.log(result.message);
  for (const row of result.perImage) {
    console.log(`  ${row.file}: ${row.qaCount} Q&A → ${row.mcqCount} MCQs`);
  }

  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

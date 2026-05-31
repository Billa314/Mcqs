import path from "path";
import { resolveDataPdf } from "../src/lib/pdf/extract";
import { processPdfFile } from "../src/lib/pipeline/process-pdf";

async function main() {
  const arg = process.argv[2];
  const filePath = arg
    ? path.resolve(process.cwd(), arg)
    : resolveDataPdf();

  console.log(`Processing: ${filePath}`);
  const result = await processPdfFile(filePath);
  console.log(result);
  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

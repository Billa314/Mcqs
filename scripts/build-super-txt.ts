import { loadMcqs } from "../src/lib/db/storage";
import { buildSuperTxt } from "../src/lib/export/super-txt";

async function main() {
  const mcqs = await loadMcqs();
  const path = await buildSuperTxt(mcqs);
  console.log(`Wrote ${mcqs.length} MCQs to ${path}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

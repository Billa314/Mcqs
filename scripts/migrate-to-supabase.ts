import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Loading local mcqs.json...");
  const mcqsPath = path.join(process.cwd(), "storage", "mcqs.json");
  const rawData = await fs.readFile(mcqsPath, "utf-8");
  const mcqs = JSON.parse(rawData);
  console.log(`Loaded ${mcqs.length} MCQs from local file.`);

  const batchSize = 100;
  for (let i = 0; i < mcqs.length; i += batchSize) {
    const batch = mcqs.slice(i, i + batchSize).map((m: any) => ({
      id: m.id,
      question: m.question,
      options: m.options,
      answer: m.answer,
      explanation: m.explanation || null,
      category: m.category || null,
      chapter: m.chapter || null,
      source_pdf: m.source_pdf || null,
      source_page: m.source_page || null
    }));

    const { error } = await supabase.from('mcqs').insert(batch);
    if (error) {
      // If error is duplicate key, we ignore or log.
      if (error.code !== '23505') {
        console.error(`Error inserting batch ${i}:`, error.message);
      }
    } else {
      console.log(`Inserted batch ${i} to ${i + batch.length}...`);
    }
  }

  console.log("Migration completed.");
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

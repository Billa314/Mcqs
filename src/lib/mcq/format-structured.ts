import type { Mcq } from "@/lib/types";
import type { QaPair } from "./parse-qa-images";

export interface StructuredMeta {
  sourceFile: string;
  chapter: string;
  category: string;
  extractedAt?: string;
}

/** Human-readable structured Q&A text (one block per question). */
export function formatStructuredQaText(
  pairs: QaPair[],
  meta: StructuredMeta,
): string {
  const lines: string[] = [
    "================================================================================",
    `SOURCE       : ${meta.sourceFile}`,
    `CHAPTER      : ${meta.chapter}`,
    `CATEGORY     : ${meta.category}`,
    `EXTRACTED AT : ${meta.extractedAt ?? new Date().toISOString()}`,
    `TOTAL Q&A    : ${pairs.length}`,
    "================================================================================",
    "",
  ];

  for (const p of pairs) {
    const id = String(p.number).padStart(3, "0");
    lines.push(`[Q${id}]`);
    lines.push(`QUESTION: ${p.question}`);
    lines.push(`ANSWER:   ${p.answer}`);
    lines.push("");
  }

  return lines.join("\n");
}

/** Full MCQ blocks (4 options + correct letter) for super.txt / batch files. */
export function formatStructuredMcqList(
  mcqs: Mcq[],
  meta: StructuredMeta & { batchLabel?: string },
): string {
  const lines: string[] = [
    "================================================================================",
    `SOURCE       : ${meta.sourceFile}`,
    `BATCH        : ${meta.batchLabel ?? "—"}`,
    `CHAPTER      : ${meta.chapter}`,
    `CATEGORY     : ${meta.category}`,
    `EXTRACTED AT : ${meta.extractedAt ?? new Date().toISOString()}`,
    `TOTAL MCQs   : ${mcqs.length}`,
    "================================================================================",
    "",
  ];

  mcqs.forEach((m, i) => {
    const id = String(i + 1).padStart(4, "0");
    lines.push(`[MCQ-${id}]`);
    lines.push(`QUESTION: ${m.question}`);
    lines.push(`A) ${m.options[0]}`);
    lines.push(`B) ${m.options[1]}`);
    lines.push(`C) ${m.options[2]}`);
    lines.push(`D) ${m.options[3]}`);
    lines.push(`CORRECT: ${m.answer}`);
    lines.push(`EXPLANATION: ${m.explanation}`);
    if (m.source_page) lines.push(`PAGE: ${m.source_page}`);
    lines.push("");
  });

  return lines.join("\n");
}

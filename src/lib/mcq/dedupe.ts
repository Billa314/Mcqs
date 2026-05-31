import type { Mcq } from "@/lib/types";

function normalizeQuestion(q: string): string {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function dedupeMcqs(mcqs: Mcq[]): Mcq[] {
  const seen = new Set<string>();
  const out: Mcq[] = [];
  for (const mcq of mcqs) {
    const key = normalizeQuestion(mcq.question);
    if (key.length < 15 || seen.has(key)) continue;
    seen.add(key);
    out.push(mcq);
  }
  return out;
}

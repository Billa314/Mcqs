import { v4 as uuidv4 } from "uuid";
import type { Category, Mcq } from "@/lib/types";
import { classifyText } from "./classify";

export interface QaPair {
  number: number;
  question: string;
  answer: string;
}

const SKIP_LINE =
  /^(past\s+papers|apex\s+civil|under\s+the\s+supervision|your\s+success)/i;

/** Detect subject/chapter from Apex-style headers in OCR text. */
export function detectChapterFromOcr(text: string): string {
  const header = text.slice(0, 400);
  if (/pakistan\s+affairs/i.test(header)) return "Pakistan Affairs";
  if (/past\s+papers?\s+gk|general\s+knowledge/i.test(header))
    return "General Knowledge";
  if (/everyday\s+science/i.test(header)) return "Everyday Science";
  if (/computer|it\b/i.test(header)) return "Computer Science";
  if (/english/i.test(header)) return "English";
  if (/mathematics|maths/i.test(header)) return "Mathematics";
  if (/physics/i.test(header)) return "Physics";
  if (/chemistry/i.test(header)) return "Chemistry";
  if (/biology/i.test(header)) return "Biology";
  return "Past Papers";
}

export function detectCategoryFromChapter(chapter: string): Category {
  const map: Record<string, Category> = {
    "Pakistan Affairs": "History",
    "General Knowledge": "General Knowledge",
    "Everyday Science": "Everyday Science",
    "Computer Science": "Computer Science",
    English: "English",
    Mathematics: "Mathematics",
    Physics: "Physics",
    Chemistry: "Chemistry",
    Biology: "Biology",
  };
  return map[chapter] ?? classifyText(chapter);
}

function cleanAnswer(raw: string): string {
  return raw
    .replace(/^answer[:\s]*/i, "")
    .replace(/[\[\]|]+/g, "")
    .replace(/\bhttps?:\S+/gi, "")
    .replace(/[_=]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function extractAnswerFromTail(body: string): { question: string; answer: string } | null {
  const rest = body.trim();

  const bracket = rest.match(/^(.+?)\s*[\[|]\s*([^|\]]{1,80}?)\s*[\]|]?\s*$/);
  if (bracket) {
    return {
      question: bracket[1].trim(),
      answer: cleanAnswer(bracket[2]),
    };
  }

  const afterQ = rest.match(/^(.+?\?)\s*([\s\S]+)$/);
  if (afterQ) {
    return {
      question: afterQ[1].trim(),
      answer: cleanAnswer(afterQ[2]),
    };
  }

  const typoQ = rest.match(/^(.+?)\s+7\s+(.+)$/);
  if (typoQ && typoQ[1].length > 20) {
    return {
      question: typoQ[1].trim() + "?",
      answer: cleanAnswer(typoQ[2]),
    };
  }

  const lastPipe = rest.match(/^(.{20,200}?)\s*\|\s*([^|]{2,80})\s*$/);
  if (lastPipe) {
    return {
      question: lastPipe[1].trim() + (lastPipe[1].includes("?") ? "" : "?"),
      answer: cleanAnswer(lastPipe[2]),
    };
  }

  return null;
}

/** Parse numbered Q&A from Apex past-paper image OCR (.txt). */
export function parseQaPairsFromOcr(text: string): QaPair[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const pairs: QaPair[] = [];

  let currentNum = 0;
  let buffer = "";

  const flush = () => {
    if (!currentNum || !buffer) return;
    const parsed = extractAnswerFromTail(buffer);
    if (!parsed) {
      buffer = "";
      currentNum = 0;
      return;
    }
    let { question, answer } = parsed;
    if (!question.endsWith("?") && question.length < 220) question += "?";
    answer = cleanAnswer(answer);

    if (
      question.length >= 12 &&
      answer.length >= 1 &&
      !SKIP_LINE.test(question)
    ) {
      pairs.push({ number: currentNum, question, answer });
    }
    buffer = "";
    currentNum = 0;
  };

  for (const line of lines) {
    if (SKIP_LINE.test(line)) continue;

    const start = line.match(/^(\d{1,4})\.\s*(.+)/);
    if (start) {
      flush();
      currentNum = Number(start[1]);
      buffer = start[2];
      const inline = extractAnswerFromTail(buffer);
      if (inline?.answer.length) {
        buffer = `${inline.question.replace(/\?$/, "")} ? ${inline.answer}`;
        flush();
      }
      continue;
    }

    if (currentNum && buffer) {
      buffer += ` ${line}`;
      const inline = extractAnswerFromTail(buffer);
      if (inline?.answer.length && buffer.includes("?")) {
        flush();
      }
    }
  }
  flush();

  const byNum = new Map<number, QaPair>();
  for (const p of pairs) {
    if (!byNum.has(p.number)) byNum.set(p.number, p);
  }
  return [...byNum.values()].sort((a, b) => a.number - b.number);
}

function pickDistractors(pool: string[], correct: string, count: number): string[] {
  const unique = [...new Set(pool.map((a) => a.trim()).filter(Boolean))].filter(
    (a) => a.toLowerCase() !== correct.toLowerCase() && a.length > 1,
  );
  const shuffled = [...unique].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

const LETTERS = ["A", "B", "C", "D"] as const;

export function qaPairsToMcqs(
  pairs: QaPair[],
  meta: {
    sourceImage: string;
    chapter: string;
    category: Category;
  },
): Mcq[] {
  const answerPool = pairs.map((p) => p.answer);
  const mcqs: Mcq[] = [];

  for (const pair of pairs) {
    const distractors = pickDistractors(answerPool, pair.answer, 3);
    while (distractors.length < 3) {
      distractors.push(`None of these (${distractors.length + 1})`);
    }

    const options = [pair.answer, ...distractors].sort(() => Math.random() - 0.5);
    const answerIndex = options.indexOf(pair.answer);
    if (answerIndex < 0) continue;

    mcqs.push({
      id: uuidv4(),
      question: pair.question,
      options: options as [string, string, string, string],
      answer: LETTERS[answerIndex],
      explanation: `Correct answer: ${pair.answer}`,
      category: meta.category,
      chapter: meta.chapter,
      source_pdf: meta.sourceImage,
    });
  }

  return mcqs;
}

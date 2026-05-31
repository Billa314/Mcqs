import { v4 as uuidv4 } from "uuid";
import type { Mcq } from "@/lib/types";
import { classifyText } from "./classify";

const OPTION_PATTERNS = [
  /^\(?\{?([A-Da-d])\)?\}?\s*[.):\-]\s*(.+)$/,
  /^\[([A-Da-d])\]\s*(.+)$/,
];

const QUESTION_PATTERNS = [
  /^(?:Q(?:uestion)?\s*)?(\d+)[.)]\s*(.+)$/i,
  /^\[(\d+)\s*[|\]]\s*(.+)$/,
  /^(\d+)[_|]\s*(.+)$/,
];

function tryOption(line: string): string | null {
  for (const pattern of OPTION_PATTERNS) {
    const m = line.match(pattern);
    if (m?.[2]) return m[2].trim();
  }
  return null;
}

function tryQuestion(line: string): string | null {
  for (const pattern of QUESTION_PATTERNS) {
    const m = line.match(pattern);
    if (m?.[2] && m[2].trim().length > 8) return m[2].trim();
  }
  return null;
}

function isInstructionBlock(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("omr answer") ||
    lower.includes("general instructions") ||
    lower.includes("question paper is part") ||
    lower.includes("yourexamcoach.com") && text.length < 120
  );
}

/** Parse MCQs from exam-style OCR text (numbered Q + A–D options). */
export function parseExistingMcqsFromText(
  text: string,
  sourcePdf: string,
): Mcq[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const mcqs: Mcq[] = [];
  let i = 0;

  while (i < lines.length) {
    const qText = tryQuestion(lines[i]);
    if (!qText) {
      i++;
      continue;
    }

    const questionParts = [qText];
    i++;
    const options: string[] = [];
    let sourcePage: number | undefined;

    while (i < lines.length && options.length < 4) {
      const line = lines[i];

      const pageMatch = line.match(/^---\s*Page\s+(\d+)\s*---$/i);
      if (pageMatch) {
        sourcePage = Number(pageMatch[1]);
        i++;
        continue;
      }

      if (tryQuestion(line) && options.length >= 2) break;

      const opt = tryOption(line);
      if (opt) {
        options.push(opt.slice(0, 200));
        i++;
        continue;
      }

      if (options.length === 0 && questionParts.join(" ").length < 400) {
        if (!tryOption(line) && !/^page\s*\d/i.test(line)) {
          questionParts.push(line);
        }
        i++;
        continue;
      }
      break;
    }

    const question = questionParts.join(" ").trim();
    if (
      options.length === 4 &&
      question.length >= 15 &&
      !isInstructionBlock(question)
    ) {
      const category = classifyText(question + " " + options.join(" "));
      mcqs.push({
        id: uuidv4(),
        question,
        options: options as [string, string, string, string],
        answer: "A",
        explanation:
          "Answer from source document; verify against original PDF if needed.",
        category,
        chapter: "Exam Paper",
        source_page: sourcePage,
        source_pdf: sourcePdf,
      });
    }
  }

  return mcqs;
}

/** Detect answer keys like "1. B" or "Q1: C" in text blocks. */
export function applyAnswerKey(mcqs: Mcq[], text: string): Mcq[] {
  const keyMap = new Map<number, "A" | "B" | "C" | "D">();
  const patterns = [
    /(?:^|\n)\s*(\d+)\s*[.)]\s*([A-Da-d])\b/g,
    /(?:^|\n)\s*Q\s*(\d+)\s*[:.\-]?\s*([A-Da-d])\b/gi,
  ];

  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      const num = Number(m[1]);
      const letter = m[2].toUpperCase() as "A" | "B" | "C" | "D";
      keyMap.set(num, letter);
    }
  }

  return mcqs.map((mcq, idx) => {
    const num = idx + 1;
    const ans = keyMap.get(num);
    return ans ? { ...mcq, answer: ans } : mcq;
  });
}

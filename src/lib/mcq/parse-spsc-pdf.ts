import { v4 as uuidv4 } from "uuid";
import type { Mcq } from "@/lib/types";
import { classifyText } from "./classify";

const LETTERS = ["A", "B", "C", "D"] as const;

function cleanOpt(s: string): string {
  return s
    .replace(/[*¥©®]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
}

function splitQuestionBlocks(text: string): string[] {
  const flat = text.replace(/\r\n/g, " ").replace(/\s+/g, " ");
  const indices: number[] = [];
  const re = /\b(\d{1,3})[\.\s]+(?=[^()]{5,180}\(a\))/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(flat)) !== null) {
    if (indices.length && m.index - indices[indices.length - 1] < 15) continue;
    indices.push(m.index);
  }

  const blocks: string[] = [];
  for (let i = 0; i < indices.length; i++) {
    blocks.push(flat.slice(indices[i], indices[i + 1] ?? flat.length));
  }
  return blocks;
}

function parseBlock(
  block: string,
  sourcePdf: string,
  sourcePage?: number,
): Mcq | null {
  const head = block.match(/^(\d{1,3})[\.\s]+(.+)/i);
  if (!head) return null;

  const body = head[2];
  const qEnd = body.search(/\(\s*a\s*\)/i);
  if (qEnd < 10) return null;

  const question = body.slice(0, qEnd).replace(/\s+/g, " ").trim();
  const optPart = body.slice(qEnd);

  const optRe = /\(\s*([a-d])\s*\)\s*([*¥]?)\s*([^()]+?)(?=\s*\(\s*[a-d]\s*\)|$)/gi;
  const opts: { text: string; mark: boolean }[] = [];
  let om: RegExpExecArray | null;
  while ((om = optRe.exec(optPart)) !== null) {
    opts.push({
      text: cleanOpt(om[3]),
      mark: om[2] === "*" || om[2] === "¥" || om[0].includes("*"),
    });
    if (opts.length >= 4) break;
  }

  if (opts.length < 4) return null;
  if (question.length < 10 || question.length > 400) return null;

  const options = opts
    .slice(0, 4)
    .map((o) => o.text) as [string, string, string, string];
  if (options.some((o) => o.length < 1)) return null;

  let correctIdx = opts.findIndex((o) => o.mark);
  if (correctIdx < 0) correctIdx = 0;

  const category = classifyText(question);

  return {
    id: uuidv4(),
    question: question.endsWith("?") ? question : `${question}?`,
    options,
    answer: LETTERS[correctIdx],
    explanation: `Correct: ${options[correctIdx]} (SPSC past paper, p.${sourcePage ?? "?"})`,
    category,
    chapter: "SPSC Past Papers",
    source_page: sourcePage,
    source_pdf: sourcePdf,
  };
}

/** Parse SPSC model-paper OCR (multi-column, inline (a)(b)(c)(d) options). */
export function parseSpscPdfText(
  text: string,
  sourcePdf: string,
  sourcePage?: number,
): Mcq[] {
  const blocks = splitQuestionBlocks(text);
  const mcqs: Mcq[] = [];
  for (const block of blocks) {
    const mcq = parseBlock(block, sourcePdf, sourcePage);
    if (mcq) mcqs.push(mcq);
  }
  return mcqs;
}

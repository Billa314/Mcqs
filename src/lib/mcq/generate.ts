import { v4 as uuidv4 } from "uuid";
import type { Mcq } from "@/lib/types";
import { classifyText } from "./classify";
import { dedupeMcqs } from "./dedupe";
import {
  applyAnswerKey,
  parseExistingMcqsFromText,
} from "./parse-existing";
import type { TextChunk } from "@/lib/pdf/chunk";

const LETTERS = ["A", "B", "C", "D"] as const;

function pickDistractors(
  pool: string[],
  correct: string,
  count: number,
): string[] {
  const filtered = pool.filter(
    (p) => p !== correct && p.length > 3 && p.length < 120,
  );
  const shuffled = [...new Set(filtered)].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function sentenceToQuestion(sentence: string): string | null {
  const trimmed = sentence.trim();
  if (trimmed.length < 40 || trimmed.length > 280) return null;
  if (/^(yes|no)\b/i.test(trimmed)) return null;

  const isDefinition = /\b(is|are|was|were|means|refers to|defined as)\b/i.test(
    trimmed,
  );
  const hasNumber = /\d+/.test(trimmed);

  if (!isDefinition && !hasNumber) return null;

  if (isDefinition) {
    const match = trimmed.match(
      /^(.{10,80}?)\s+(?:is|are|was|were|means|refers to|defined as)\s+(.{5,100})/i,
    );
    if (match) {
      return `According to the material, ${match[1].trim()} is best described as:`;
    }
    return `Which statement is supported by the source material regarding: "${trimmed.slice(0, 60)}..."?`;
  }

  return `Based on the content, which fact is correct?\n(Context: ${trimmed.slice(0, 100)}...)`;
}

function extractFacts(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 35 && s.length <= 300);
}

function generateFromChunk(
  chunk: TextChunk,
  sourcePdf: string,
): Mcq[] {
  const facts = extractFacts(chunk.text);
  const category = classifyText(chunk.text);
  const mcqs: Mcq[] = [];

  for (const fact of facts.slice(0, 8)) {
    const question = sentenceToQuestion(fact);
    if (!question) continue;

    const distractors = pickDistractors(facts, fact, 3);
    if (distractors.length < 3) continue;

    const options = [fact, ...distractors].sort(() => Math.random() - 0.5);
    const answerIndex = options.indexOf(fact);
    if (answerIndex < 0) continue;

    mcqs.push({
      id: uuidv4(),
      question,
      options: options as [string, string, string, string],
      answer: LETTERS[answerIndex],
      explanation: `The correct answer is derived from: "${fact.slice(0, 160)}..."`,
      category,
      chapter: chunk.chapter,
      source_page: chunk.estimatedPage,
      source_pdf: sourcePdf,
    });

    if (mcqs.length >= 5) break;
  }

  return mcqs;
}

export interface GenerateOptions {
  sourcePdf: string;
  useOpenAI?: boolean;
  openAiKey?: string;
}

export async function generateMcqsFromText(
  fullText: string,
  chunks: TextChunk[],
  options: GenerateOptions,
): Promise<Mcq[]> {
  const parsed = parseExistingMcqsFromText(fullText, options.sourcePdf);
  const withKeys = applyAnswerKey(parsed, fullText);

  const generated: Mcq[] = [];
  for (const chunk of chunks) {
    generated.push(...generateFromChunk(chunk, options.sourcePdf));
  }

  const quality = (m: Mcq) =>
    !m.question.toLowerCase().includes("general instructions") &&
    !m.question.toLowerCase().includes("omr answer") &&
    m.question.length < 500;

  let combined = dedupeMcqs(
    [...withKeys, ...generated].filter(quality),
  );

  if (options.useOpenAI && options.openAiKey && combined.length < 10) {
    const aiMcqs = await generateWithOpenAI(
      chunks[0]?.text ?? fullText.slice(0, 4000),
      options,
    );
    combined = dedupeMcqs([...combined, ...aiMcqs]);
  }

  return combined;
}

async function generateWithOpenAI(
  sampleText: string,
  options: GenerateOptions,
): Promise<Mcq[]> {
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${options.openAiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content:
              "Generate fact-based MCQs as JSON array. Each item: question, options (4 strings), answer (A-D), explanation, category, chapter. No yes/no. No duplicates.",
          },
          {
            role: "user",
            content: `Create up to 8 MCQs from:\n${sampleText.slice(0, 6000)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];
    const parsed = JSON.parse(content) as { mcqs?: Mcq[] } | Mcq[];
    const list = Array.isArray(parsed) ? parsed : parsed.mcqs ?? [];
    return list.map((m) => ({
      ...m,
      id: m.id || uuidv4(),
      source_pdf: options.sourcePdf,
    }));
  } catch {
    return [];
  }
}

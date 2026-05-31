import { NextRequest, NextResponse } from "next/server";
import { loadMcqs } from "@/lib/db/storage";
import type { QuizAnswer, QuizResult } from "@/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const sessionId = body.sessionId as string;
  const answers = (body.answers ?? []) as QuizAnswer[];

  const mcqs = await loadMcqs();
  const map = new Map(mcqs.map((m) => [m.id, m]));

  let score = 0;
  const details: QuizResult["details"] = [];

  for (const a of answers) {
    const mcq = map.get(a.mcqId);
    if (!mcq) continue;
    const correct = a.selected === mcq.answer;
    if (correct) score++;
    details.push({
      mcqId: mcq.id,
      correct,
      selected: a.selected,
      correctAnswer: mcq.answer,
      explanation: mcq.explanation,
      question: mcq.question,
      options: mcq.options,
    });
  }

  const total = details.length;
  const result: QuizResult = {
    sessionId,
    score,
    total,
    percentage: total ? Math.round((score / total) * 100) : 0,
    details,
  };

  return NextResponse.json(result);
}

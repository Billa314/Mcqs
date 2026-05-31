"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { Mcq } from "@/lib/types";

interface Props {
  sessionId: string;
  questions: Mcq[];
  instantFeedback?: boolean;
}

export function QuizRunner({
  sessionId,
  questions,
  instantFeedback = false,
}: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, "A" | "B" | "C" | "D">>(
    {},
  );
  const [submitting, setSubmitting] = useState(false);

  const current = questions[index];
  const progress = ((index + 1) / questions.length) * 100;

  const select = (letter: "A" | "B" | "C" | "D") => {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: letter }));
  };

  const submit = useCallback(async () => {
    setSubmitting(true);
    const payload = {
      sessionId,
      answers: Object.entries(answers).map(([mcqId, selected]) => ({
        mcqId,
        selected,
      })),
    };
    const res = await fetch("/api/quiz/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    sessionStorage.setItem("quizResult", JSON.stringify(data));
    router.push("/result");
  }, [answers, router, sessionId]);

  if (!current) {
    return (
      <p className="text-slate-600">No questions in this session.</p>
    );
  }

  const selected = answers[current.id];
  const showFeedback =
    instantFeedback && selected !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex justify-between text-sm text-slate-500">
          <span>
            Question {index + 1} of {questions.length}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600">
          {current.category} · {current.chapter}
        </p>
        <h2 className="mt-2 text-lg font-semibold text-slate-900">
          {current.question}
        </h2>

        <ul className="mt-6 space-y-3">
          {(["A", "B", "C", "D"] as const).map((letter, i) => {
            const isSelected = selected === letter;
            const isCorrect = showFeedback && current.answer === letter;
            const isWrong =
              showFeedback && isSelected && current.answer !== letter;
            return (
              <li key={letter}>
                <button
                  type="button"
                  onClick={() => select(letter)}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                    isCorrect
                      ? "border-green-500 bg-green-50"
                      : isWrong
                        ? "border-red-400 bg-red-50"
                        : isSelected
                          ? "border-brand-500 bg-brand-50"
                          : "border-slate-200 hover:border-brand-300"
                  }`}
                >
                  <span className="font-semibold">{letter}.</span>{" "}
                  {current.options[i]}
                </button>
              </li>
            );
          })}
        </ul>

        {showFeedback && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            {current.explanation}
          </p>
        )}
      </div>

      <div className="flex justify-between gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => i - 1)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
        >
          Previous
        </button>

        {index < questions.length - 1 ? (
          <button
            type="button"
            disabled={!selected}
            onClick={() => setIndex((i) => i + 1)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Next
          </button>
        ) : (
          <button
            type="button"
            disabled={submitting || Object.keys(answers).length < questions.length}
            onClick={submit}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            {submitting ? "Submitting…" : "Finish Quiz"}
          </button>
        )}
      </div>
    </div>
  );
}

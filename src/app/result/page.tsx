"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { QuizResult } from "@/lib/types";

export default function ResultPage() {
  const [result, setResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("quizResult");
    if (raw) setResult(JSON.parse(raw) as QuizResult);
  }, []);

  if (!result) {
    return (
      <p className="text-slate-600">
        No results yet.{" "}
        <Link href="/dashboard" className="text-brand-600 underline">
          Start a quiz
        </Link>
      </p>
    );
  }

  const wrong = result.details.filter((d) => !d.correct);

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h1 className="text-2xl font-bold">Quiz Results</h1>
        <p className="mt-4 text-5xl font-bold text-brand-700">
          {result.percentage}%
        </p>
        <p className="mt-2 text-slate-600">
          {result.score} / {result.total} correct
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white"
          >
            New Quiz
          </Link>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Review</h2>
        {result.details.map((d, i) => (
          <article
            key={d.mcqId}
            className={`rounded-xl border p-4 ${
              d.correct
                ? "border-green-200 bg-green-50/50"
                : "border-red-200 bg-red-50/50"
            }`}
          >
            <p className="text-xs text-slate-500">Question {i + 1}</p>
            <p className="mt-1 font-medium">{d.question}</p>
            <p className="mt-2 text-sm">
              Your answer: <strong>{d.selected}</strong> · Correct:{" "}
              <strong>{d.correctAnswer}</strong>
            </p>
            <p className="mt-2 text-sm text-slate-700">{d.explanation}</p>
          </article>
        ))}
      </section>

      {wrong.length > 0 && (
        <p className="text-sm text-slate-600">
          {wrong.length} incorrect — review explanations above, then retry from
          the dashboard with a smaller set focused on weak areas.
        </p>
      )}
    </div>
  );
}

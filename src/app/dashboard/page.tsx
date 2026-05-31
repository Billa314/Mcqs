"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/types";

interface Stats {
  total: number;
  byCategory: Record<string, number>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [category, setCategory] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/mcqs")
      .then((r) => r.json())
      .then((data: { mcqs: unknown[]; byCategory: Record<string, number> }) => {
        setStats({
          total: data.mcqs.length,
          byCategory: data.byCategory,
        });
      })
      .catch(() => setError("Failed to load MCQs"));
  }, []);

  const startQuiz = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: category || undefined,
          count,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start quiz");
      router.push(`/quiz/${data.sessionId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start quiz");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Quiz Dashboard</h1>
        <p className="mt-1 text-slate-600">
          Choose a category and number of questions to begin.
        </p>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(stats.byCategory).map(([cat, n]) => (
            <div
              key={cat}
              className="rounded-lg border border-slate-200 bg-white px-4 py-3"
            >
              <p className="text-sm text-slate-500">{cat}</p>
              <p className="text-xl font-semibold">{n}</p>
            </div>
          ))}
          {stats.total === 0 && (
            <p className="text-slate-600 sm:col-span-2">
              No MCQs yet. Run{" "}
              <code className="rounded bg-slate-100 px-1">npm run process-pdf</code>{" "}
              or upload a PDF.
            </p>
          )}
        </div>
      )}

      <div className="max-w-md space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <label className="block text-sm font-medium text-slate-700">
          Category (optional)
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm font-medium text-slate-700">
          Number of questions
          <select
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {[5, 10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          disabled={loading || !stats?.total}
          onClick={startQuiz}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {loading ? "Starting…" : "Start Quiz"}
        </button>
      </div>
    </div>
  );
}

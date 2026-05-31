import Link from "next/link";
import { loadMcqs } from "@/lib/db/storage";

export default async function HomePage() {
  const mcqs = await loadMcqs();
  const categories = [...new Set(mcqs.map((m) => m.category))];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-3xl font-bold text-slate-900">
          AI MCQ Quiz System
        </h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          Quizzes are built from images in <code className="rounded bg-slate-100 px-1">data/</code>.
          Raw OCR: <code className="rounded bg-slate-100 px-1">storage/extracted/</code>
          {" · "}
          Structured Q&A:{" "}
          <code className="rounded bg-slate-100 px-1">storage/structured/</code>
          . Open the dashboard to start a quiz.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            Start Quiz
          </Link>
          <Link
            href="/upload"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Upload Images
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total MCQs" value={String(mcqs.length)} />
        <StatCard label="Categories" value={String(categories.length)} />
        <StatCard
          label="Sources"
          value={String(new Set(mcqs.map((m) => m.source_pdf).filter(Boolean)).size)}
        />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

import { notFound } from "next/navigation";
import { QuizRunner } from "@/components/QuizRunner";
import { loadMcqs, loadSessions } from "@/lib/db/storage";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sessions = await loadSessions();
  const session = sessions.find((s) => s.id === id);
  if (!session) notFound();

  const allMcqs = await loadMcqs();
  const questions = session.mcqIds
    .map((mcqId) => allMcqs.find((m) => m.id === mcqId))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">Quiz Session</h1>
      <QuizRunner sessionId={id} questions={questions} />
    </div>
  );
}

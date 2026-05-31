import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getMcqsByCategory, saveSession } from "@/lib/db/storage";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const category = body.category as string | undefined;
  const count = Math.min(Math.max(Number(body.count) || 10, 1), 100);

  const pool = await getMcqsByCategory(category);
  if (pool.length === 0) {
    return NextResponse.json(
      { error: "No MCQs available. Process a PDF first." },
      { status: 404 },
    );
  }

  const selected = shuffle(pool).slice(0, Math.min(count, pool.length));
  const sessionId = uuidv4();
  await saveSession({
    id: sessionId,
    mcqIds: selected.map((m) => m.id),
    createdAt: new Date().toISOString(),
  });

  return NextResponse.json({
    sessionId,
    count: selected.length,
    mcqIds: selected.map((m) => m.id),
  });
}

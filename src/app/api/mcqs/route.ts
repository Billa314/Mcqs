import { NextRequest, NextResponse } from "next/server";
import { getMcqsByCategory, loadMcqs } from "@/lib/db/storage";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category") ?? undefined;
  const mcqs = category
    ? await getMcqsByCategory(category)
    : await loadMcqs();

  const byCategory: Record<string, number> = {};
  for (const m of mcqs) {
    byCategory[m.category] = (byCategory[m.category] ?? 0) + 1;
  }

  return NextResponse.json({ mcqs, byCategory, total: mcqs.length });
}

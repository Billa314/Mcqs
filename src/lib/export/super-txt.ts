import { promises as fs } from "fs";
import path from "path";
import type { Mcq } from "@/lib/types";
import { formatStructuredMcqList } from "@/lib/mcq/format-structured";

const SUPER_PATH = path.join(process.cwd(), "storage", "super.txt");

/** Build super.txt combining all MCQs grouped by source. */
export async function buildSuperTxt(allMcqs: Mcq[]): Promise<string> {
  const bySource = new Map<string, Mcq[]>();
  for (const m of allMcqs) {
    const key = m.source_pdf ?? "unknown";
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(m);
  }

  const parts: string[] = [
    "################################################################################",
    "# SUPER MCQ BANK — Images + PDF (structured)",
    `# Generated: ${new Date().toISOString()}`,
    `# Total MCQs: ${allMcqs.length}`,
    "################################################################################",
    "",
  ];

  const imageSources = [...bySource.keys()].filter(
    (k) => /\.(jpe?g|png|webp)/i.test(k) || k.includes("WhatsApp"),
  );
  const pdfSources = [...bySource.keys()].filter((k) => k.toLowerCase().endsWith(".pdf"));

  if (imageSources.length) {
    parts.push("=".repeat(80), "SECTION A — IMAGE PAST PAPERS", "=".repeat(80), "");
    for (const src of imageSources.sort()) {
      const list = bySource.get(src)!;
      parts.push(
        formatStructuredMcqList(list, {
          sourceFile: src,
          chapter: list[0]?.chapter ?? "Past Papers",
          category: list[0]?.category ?? "General Knowledge",
        }),
      );
    }
  }

  if (pdfSources.length) {
    parts.push("=".repeat(80), "SECTION B — PDF PAST PAPERS (SPSC)", "=".repeat(80), "");
    for (const src of pdfSources.sort()) {
      const list = bySource.get(src)!;
      parts.push(
        formatStructuredMcqList(list, {
          sourceFile: src,
          chapter: "SPSC Past Papers",
          category: list[0]?.category ?? "General Knowledge",
        }),
      );
    }
  }

  const other = [...bySource.keys()].filter(
    (k) => !imageSources.includes(k) && !pdfSources.includes(k),
  );
  for (const src of other) {
    parts.push(
      formatStructuredMcqList(bySource.get(src)!, {
        sourceFile: src,
        chapter: "Other",
        category: "General Knowledge",
      }),
    );
  }

  const content = parts.join("\n");
  await fs.mkdir(path.dirname(SUPER_PATH), { recursive: true });
  await fs.writeFile(SUPER_PATH, content, "utf-8");
  return SUPER_PATH;
}

export function getSuperTxtPath() {
  return SUPER_PATH;
}

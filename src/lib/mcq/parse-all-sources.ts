import type { Mcq } from "@/lib/types";
import { parseExistingMcqsFromText, applyAnswerKey } from "./parse-existing";
import { parseQaPairsFromOcr, qaPairsToMcqs, detectChapterFromOcr, detectCategoryFromChapter } from "./parse-qa-images";
import { parseSpscPdfText } from "./parse-spsc-pdf";
import { dedupeMcqs } from "./dedupe";

/** Parse MCQs from any past-paper text (4-option exam or Q&A image format). */
export function parseMcqsFromPastPaperText(
  text: string,
  source: string,
  sourcePage?: number,
): Mcq[] {
  const chapter = detectChapterFromOcr(text);
  const category = detectCategoryFromChapter(chapter);

  const fourOption = applyAnswerKey(
    parseExistingMcqsFromText(text, source).map((m) => ({
      ...m,
      chapter: m.chapter === "Document" ? chapter : m.chapter,
      category: m.category || category,
      source_page: sourcePage ?? m.source_page,
    })),
    text,
  );

  const qaPairs = parseQaPairsFromOcr(text);
  const fromQa = qaPairsToMcqs(qaPairs, {
    sourceImage: source,
    chapter,
    category,
  }).map((m) => ({
    ...m,
    source_page: sourcePage,
    source_pdf: source,
  }));

  const spsc = parseSpscPdfText(text, source, sourcePage);

  return dedupeMcqs([...fourOption, ...fromQa, ...spsc]);
}

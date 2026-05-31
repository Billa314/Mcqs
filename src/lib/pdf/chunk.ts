export interface TextChunk {
  index: number;
  text: string;
  chapter: string;
  wordCount: number;
  estimatedPage?: number;
}

const CHAPTER_PATTERNS = [
  /^(?:chapter|unit|module|part)\s*[\dIVXLC]+[.:)\-\s]+(.+)$/i,
  /^[\dIVXLC]+[.)]\s+([A-Z][^\n]{2,80})$/,
];

function detectChapter(line: string, current: string): string {
  const trimmed = line.trim();
  for (const pattern of CHAPTER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) return match[1].trim().slice(0, 120);
  }
  if (
    trimmed.length < 80 &&
    /^[A-Z][A-Za-z\s\-]{3,}$/.test(trimmed) &&
    !trimmed.endsWith(".")
  ) {
    return trimmed;
  }
  return current;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Split into semantic chunks (~800–1500 words), respecting chapter hints. */
export function chunkText(
  text: string,
  opts?: { minWords?: number; maxWords?: number },
): TextChunk[] {
  const minWords = opts?.minWords ?? 800;
  const maxWords = opts?.maxWords ?? 1500;

  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 20);
  const chunks: TextChunk[] = [];
  let buffer: string[] = [];
  let bufferWords = 0;
  let chapter = "General";
  let chunkIndex = 0;

  const flush = () => {
    if (!buffer.length) return;
    const body = buffer.join("\n\n").trim();
    if (countWords(body) < 40) {
      buffer = [];
      bufferWords = 0;
      return;
    }
    chunks.push({
      index: chunkIndex++,
      text: body,
      chapter,
      wordCount: countWords(body),
      estimatedPage: Math.floor(chunkIndex * 2),
    });
    buffer = [];
    bufferWords = 0;
  };

  for (const para of paragraphs) {
    const firstLine = para.split("\n")[0] ?? "";
    chapter = detectChapter(firstLine, chapter);
    const words = countWords(para);

    if (bufferWords + words > maxWords && bufferWords >= minWords) {
      flush();
    }

    buffer.push(para);
    bufferWords += words;

    if (bufferWords >= maxWords) flush();
  }

  flush();
  return chunks;
}

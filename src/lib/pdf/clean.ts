/** Remove headers, footers, page numbers, and normalize whitespace. */
export function cleanExtractedText(raw: string): string {
  const text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/Page\s+\d+\s+of\s+\d+/gi, "")
    .replace(/^\s*\d+\s*$/gm, "")
    .replace(/-{3,}/g, "\n")
    .replace(/_{3,}/g, "\n");

  const lines = text.split("\n").map((l) => l.trim());
  const filtered: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      if (filtered.length && filtered[filtered.length - 1] !== "") {
        filtered.push("");
      }
      continue;
    }
    if (/^(\d{1,3})$/.test(line) && line.length <= 3) continue;
    if (/^page\s*\d+$/i.test(line)) continue;
    filtered.push(line);
  }

  return filtered
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

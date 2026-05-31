import type { Category } from "@/lib/types";
import { CATEGORIES } from "@/lib/types";

const KEYWORDS: Record<Category, string[]> = {
  English: ["grammar", "synonym", "antonym", "sentence", "verb", "noun", "essay"],
  Mathematics: [
    "equation",
    "algebra",
    "geometry",
    "calculus",
    "percentage",
    "ratio",
    "triangle",
    "number",
  ],
  "General Knowledge": [
    "capital",
    "president",
    "country",
    "world",
    "current affairs",
    "who was",
  ],
  "Computer Science": [
    "computer",
    "software",
    "hardware",
    "programming",
    "database",
    "algorithm",
    "internet",
    "cpu",
  ],
  Biology: ["cell", "organism", "dna", "plant", "animal", "species", "biology"],
  Chemistry: ["atom", "molecule", "acid", "element", "reaction", "chemical"],
  Physics: ["force", "energy", "velocity", "newton", "motion", "light", "wave"],
  "Everyday Science": [
    "science",
    "temperature",
    "water",
    "electricity",
    "magnet",
  ],
  History: ["war", "century", "empire", "revolution", "ancient", "dynasty"],
  Geography: ["river", "mountain", "climate", "continent", "latitude"],
};

export function classifyText(text: string): Category {
  const lower = text.toLowerCase();
  let best: Category = "General Knowledge";
  let bestScore = 0;

  for (const category of CATEGORIES) {
    const score = KEYWORDS[category].reduce(
      (acc, kw) => acc + (lower.includes(kw) ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  return best;
}

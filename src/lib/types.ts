export const CATEGORIES = [
  "English",
  "Mathematics",
  "General Knowledge",
  "Computer Science",
  "Biology",
  "Chemistry",
  "Physics",
  "Everyday Science",
  "History",
  "Geography",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Mcq {
  id: string;
  question: string;
  options: [string, string, string, string];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  category: Category;
  chapter: string;
  source_page?: number;
  source_pdf?: string;
}

export interface QuizSession {
  id: string;
  mcqIds: string[];
  createdAt: string;
}

export interface QuizAnswer {
  mcqId: string;
  selected: "A" | "B" | "C" | "D";
}

export interface QuizResult {
  sessionId: string;
  score: number;
  total: number;
  percentage: number;
  details: {
    mcqId: string;
    correct: boolean;
    selected: "A" | "B" | "C" | "D";
    correctAnswer: "A" | "B" | "C" | "D";
    explanation: string;
    question: string;
    options: [string, string, string, string];
  }[];
}

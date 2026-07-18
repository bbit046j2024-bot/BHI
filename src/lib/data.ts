/**
 * lib/data.ts
 * Server-side helpers that read from data/questions.json,
 * data/papers.json, and data/explanations.json.
 * These are called only from Server Components / Route Handlers.
 */

import fs from "fs";
import path from "path";

export interface Question {
  id: string;
  subject: "economics" | "fa" | "qa";
  year: number;
  sitting: string;
  questionNumber: string;
  part: string;
  text: string;
  marks: number;
  topic: string;
  type: "theory" | "calculation" | "diagram";
  totalMarksForQuestion: number;
}

export interface Paper {
  subject: string;
  year: number;
  sitting: string;
  questionCount: number;
  topicsCovered: string[];
}

export interface ExplanationEntry {
  explanation: string;
  generatedAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data");

function safeRead<T>(file: string, fallback: T): T {
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export function getAllQuestions(): Question[] {
  return safeRead<Question[]>("questions.json", []);
}

export function getAllPapers(): Paper[] {
  return safeRead<Paper[]>("papers.json", []);
}

export function getAllExplanations(): Record<string, ExplanationEntry> {
  return safeRead<Record<string, ExplanationEntry>>("explanations.json", {});
}

export function getExplanation(questionId: string): string {
  const map = getAllExplanations();
  return map[questionId]?.explanation ?? "";
}

export function getSubjectLabel(subject: string) {
  const labels: Record<string, string> = {
    economics: "Economics",
    fa: "Financial Accounting",
    qa: "Quantitative Analysis",
  };
  return labels[subject] ?? subject;
}

export function getSubjectCode(subject: string) {
  const codes: Record<string, string> = {
    economics: "CA14",
    fa: "CA11",
    qa: "CA12",
  };
  return codes[subject] ?? subject.toUpperCase();
}

export const SUBJECT_COLORS: Record<
  string,
  { bg: string; border: string; text: string; accent: string }
> = {
  economics: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    accent: "bg-blue-600",
  },
  fa: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    accent: "bg-green-600",
  },
  qa: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    accent: "bg-purple-600",
  },
};

export const SUBJECT_ICONS: Record<string, string> = {
  economics: "📊",
  fa: "📒",
  qa: "📐",
};

// ─────────────────────────────────────────────────────────────
// Parsed Papers (AI-extracted rich format from parse-paper-ai.ts)
// ─────────────────────────────────────────────────────────────
export interface SubSubPart {
  label: string;
  text: string;
  table_markdown: string | null;
  marks: number | null;
}

export interface SubPart {
  label: string;
  text: string;
  table_markdown: string | null;
  sub_sub_parts: SubSubPart[];
  marks: number | null;
}

export interface ParsedQuestion {
  question_number: string;
  question_title: string | null;
  instructions: string | null;
  sub_parts: SubPart[];
  extraction_confidence: "high" | "medium" | "low";
  confidence_note: string | null;
}

export interface PaperMetadata {
  subject: string;
  level: string;
  sitting: string;
  total_questions_detected: number;
}

export interface ParsedPaper {
  paper_metadata: PaperMetadata;
  questions: ParsedQuestion[];
  unparsed_fragments: string[];
  parsed_at: string;
  model: string;
}

export type ParsedPapersStore = Record<string, ParsedPaper>;

/**
 * Returns the full parsed papers store keyed by "subject-Sitting Year".
 * Returns an empty object if the file doesn't exist yet.
 */
export function getAllParsedPapers(): ParsedPapersStore {
  return safeRead<ParsedPapersStore>("parsed_papers.json", {});
}

/**
 * Returns one parsed paper or null.
 * key format: "fa-April 2026"
 */
export function getParsedPaper(
  subject: string,
  sitting: string
): ParsedPaper | null {
  const store = getAllParsedPapers();
  return store[`${subject}-${sitting}`] ?? null;
}

/**
 * Returns all parsed papers for a given subject.
 */
export function getParsedPapersForSubject(subject: string): ParsedPaper[] {
  const store = getAllParsedPapers();
  return Object.entries(store)
    .filter(([key]) => key.startsWith(`${subject}-`))
    .map(([, paper]) => paper);
}

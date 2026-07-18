#!/usr/bin/env tsx
/**
 * scripts/parse-paper-ai.ts
 *
 * AI-powered KASNEB past paper parser using the xAI Grok API.
 * Reads raw TXT files in data/ (economics_raw.txt, fa_raw.txt, qa_raw.txt),
 * splits them into per-sitting blocks, and sends each block to Grok for
 * structured JSON extraction.
 *
 * Output: data/parsed_papers.json — rich hierarchical format with sub_parts,
 *   table_markdown, marks, extraction_confidence, unparsed_fragments.
 *
 * Usage:
 *   npx tsx scripts/parse-paper-ai.ts
 *   npx tsx scripts/parse-paper-ai.ts --subject fa
 *   npx tsx scripts/parse-paper-ai.ts --subject fa --sitting "April 2026"
 *   npx tsx scripts/parse-paper-ai.ts --force     # re-parse already done sittings
 *
 * Idempotent: already-parsed sittings are skipped unless --force is passed.
 * Auto-saves after every successful sitting so progress is never lost.
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

// ─────────────────────────────────────────────────────────────
// Grok client — OpenAI-compatible, just swap baseURL + key
// ─────────────────────────────────────────────────────────────
const client = new OpenAI({
  apiKey: process.env.GROK_API ?? "",
  baseURL: "https://api.x.ai/v1",
});

const MODEL = "grok-3-mini"; // fast & cost-efficient; swap to "grok-3" for max accuracy

// ─────────────────────────────────────────────────────────────
// Output schema types
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

export type ParsedPapersStore = Record<string, ParsedPaper>; // key: "fa-April 2026"

// ─────────────────────────────────────────────────────────────
// System prompt (full extraction spec)
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are an expert at parsing KASNEB CPA past examination papers into
clean, structured data. You will be given the raw extracted text of one
full past paper. Your job is to identify every question and sub-question
and output them as structured JSON, preserving tables, financial
statements, and numeric layouts exactly.

## CRITICAL RULES

1. COMPLETENESS: Extract every question in the paper, including all
   sub-parts (a, b, c ... and i, ii, iii ...). Papers typically have 5-7
   main questions, each with 2-5 sub-parts. If you count fewer than
   expected, re-scan the text before finalizing — do not silently skip a
   question because its formatting looks broken in the source text.

2. TABLES AND FINANCIAL STATEMENTS: Never collapse a table, trial
   balance, statement of financial position, cash flow statement,
   ledger account, or any columnar numeric data into prose. Reconstruct
   it as a markdown table with the original column headers (e.g. "Dr",
   "Cr", "Sh.", "Amount", "Particulars"). If a row label and its number
   got separated by a line break in the source text, rejoin them into
   the correct row. If you cannot confidently rebuild a table's
   structure, output your best-effort table AND set
   "extraction_confidence": "low" with a note — never silently flatten it.

3. QUESTION BOUNDARIES: Use the paper's own numbering (QUESTION ONE,
   QUESTION TWO) and lettering (a), (b), (i), (ii) as ground truth for
   where one question ends and the next begins. Do not merge sub-parts.

4. MARKS: Capture the marks allocated to each sub-part where shown
   (e.g. "(4 marks)").

5. REQUIRED/INSTRUCTIONS: Capture instruction lines separately (e.g.
   "Required:", "Prepare a...", "Show all workings") as their own field.

6. DO NOT SOLVE: Only extract and structure. Do not answer, summarize,
   or simplify the accounting problem itself.

7. NUMBERS: Preserve numbers exactly as written, including currency
   symbols (Sh., KSh) and thousands separators. Do not reformat or
   recalculate anything.

## OUTPUT FORMAT

Return ONLY valid JSON (no markdown fences, no preamble), matching this shape:

{
  "paper_metadata": {
    "subject": "string",
    "level": "string",
    "sitting": "string",
    "total_questions_detected": number
  },
  "questions": [
    {
      "question_number": "1",
      "question_title": "string or null",
      "instructions": "string or null",
      "sub_parts": [
        {
          "label": "(a)",
          "text": "string — narrative text only, no table data here",
          "table_markdown": "string or null — full markdown table if applicable",
          "sub_sub_parts": [
            {
              "label": "(i)",
              "text": "string",
              "table_markdown": "string or null",
              "marks": number or null
            }
          ],
          "marks": number or null
        }
      ],
      "extraction_confidence": "high",
      "confidence_note": null
    }
  ],
  "unparsed_fragments": ["any text not attributed to a question"]
}`;

// ─────────────────────────────────────────────────────────────
// Noise lines stripped before sending to API
// ─────────────────────────────────────────────────────────────
const NOISE_PATTERNS: RegExp[] = [
  /^--- PAGE \d+ ---$/i,
  /^www\.chopi\.co\.ke$/i,
  /^Chopi\.co\.ke$/i,
  /^For (Solutions|Answers).*$/i,
  /^To Get Answers.*$/i,
  /^CA\d+.*Page \d+.*$/i,
  /^\s*Out of \d+\s*$/i,
  /^CPA (FOUNDATION LEVEL|PART).*$/i,
  /^CIFA (FOUNDATION LEVEL|PART).*$/i,
  /^CERTIFIED (PUBLIC|INVESTMENT).*$/i,
  /^\.{5,}$/,
  /^Someakenya\.com.*$/i,
];

function stripNoise(text: string): string {
  return text
    .split("\n")
    .filter((line) => !NOISE_PATTERNS.some((p) => p.test(line.trim())))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n") // collapse excess blank lines
    .trim();
}

// ─────────────────────────────────────────────────────────────
// Split raw text into per-sitting blocks
// ─────────────────────────────────────────────────────────────
const SITTING_HEADER_RE =
  /(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY):\s*\d+\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;

function splitIntoSittings(
  rawText: string
): Array<{ sitting: string; year: number; text: string }> {
  const lines = rawText.split("\n");
  const markers: Array<{ sitting: string; year: number; startLine: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const m = SITTING_HEADER_RE.exec(lines[i]);
    if (m) {
      markers.push({
        sitting: `${m[1]} ${m[2]}`,
        year: parseInt(m[2], 10),
        startLine: i,
      });
    }
  }

  return markers.map((marker, s) => {
    const start = marker.startLine;
    const end = s + 1 < markers.length ? markers[s + 1].startLine : lines.length;
    return {
      sitting: marker.sitting,
      year: marker.year,
      text: lines.slice(start, end).join("\n"),
    };
  }).filter((b) => b.text.includes("QUESTION"));
}

// ─────────────────────────────────────────────────────────────
// Subject display names
// ─────────────────────────────────────────────────────────────
const SUBJECT_DISPLAY: Record<string, string> = {
  economics: "Economics",
  fa: "Financial Accounting",
  qa: "Quantitative Analysis",
};

const SUBJECT_LEVEL: Record<string, string> = {
  economics: "CPA Foundation Level",
  fa: "CPA Foundation Level",
  qa: "CPA Foundation Level",
};

// ─────────────────────────────────────────────────────────────
// Retry helper with exponential backoff
// ─────────────────────────────────────────────────────────────
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === retries) throw err;
      const wait = delayMs * attempt;
      console.warn(`    ⟳ Attempt ${attempt} failed, retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("unreachable");
}

// ─────────────────────────────────────────────────────────────
// Call Grok to parse one sitting block
// ─────────────────────────────────────────────────────────────
async function parseSittingWithGrok(
  subject: string,
  sitting: string,
  rawText: string
): Promise<ParsedPaper> {
  const cleanedText = stripNoise(rawText);
  const subjectDisplay = SUBJECT_DISPLAY[subject] ?? subject.toUpperCase();

  const userPrompt = `Subject: ${subjectDisplay}
Sitting: ${sitting}

Parse the following raw KASNEB past paper text into the required JSON structure:

${cleanedText}`;

  const response = await withRetry(() =>
    client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 8000,
    })
  );

  const raw = response.choices[0].message.content?.trim() ?? "{}";

  // Strip accidental markdown fences that some models add
  const jsonStr = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: ParsedPaper;
  try {
    parsed = JSON.parse(jsonStr) as ParsedPaper;
  } catch {
    console.error(`  ⚠  JSON parse error for ${subject} ${sitting} — storing raw output`);
    parsed = {
      paper_metadata: {
        subject: subjectDisplay,
        level: SUBJECT_LEVEL[subject] ?? "Foundation Level",
        sitting,
        total_questions_detected: 0,
      },
      questions: [],
      unparsed_fragments: [raw],
      parsed_at: new Date().toISOString(),
      model: MODEL,
    };
  }

  // Stamp metadata that the model may have omitted
  parsed.parsed_at = new Date().toISOString();
  parsed.model = MODEL;
  if (!parsed.paper_metadata) {
    parsed.paper_metadata = {
      subject: subjectDisplay,
      level: SUBJECT_LEVEL[subject] ?? "Foundation Level",
      sitting,
      total_questions_detected: parsed.questions?.length ?? 0,
    };
  }
  if (!Array.isArray(parsed.unparsed_fragments)) {
    parsed.unparsed_fragments = [];
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────
// CLI argument helpers
// ─────────────────────────────────────────────────────────────
function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const filterSubject = getArg("--subject");   // e.g. "fa"
const filterSitting = getArg("--sitting");   // e.g. "April 2026"
const forceReparse  = process.argv.includes("--force");

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.GROK_API) {
    console.error("❌  GROK_API not set in .env.local");
    process.exit(1);
  }

  const dataDir    = path.join(process.cwd(), "data");
  const outputPath = path.join(dataDir, "parsed_papers.json");

  // Load existing store (for idempotency / resumability)
  let store: ParsedPapersStore = {};
  if (fs.existsSync(outputPath)) {
    try {
      store = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    } catch {
      console.warn("⚠  parsed_papers.json is corrupt — starting fresh");
    }
  }

  const subjects = filterSubject
    ? [filterSubject]
    : (["economics", "fa", "qa"] as const);

  let totalParsed  = 0;
  let totalSkipped = 0;
  let totalErrors  = 0;

  console.log(`\n🚀 KASNEB Paper Parser  (model: ${MODEL})`);
  if (forceReparse) console.log("   ⚠  --force: re-parsing all sittings");

  for (const subject of subjects) {
    const rawPath = path.join(dataDir, `${subject}_raw.txt`);
    if (!fs.existsSync(rawPath)) {
      console.warn(`\n⚠  Missing: ${rawPath} — skipping`);
      continue;
    }

    const raw      = fs.readFileSync(rawPath, "utf-8");
    const sittings = splitIntoSittings(raw);

    console.log(`\n[${subject.toUpperCase()}] ${sittings.length} sittings found`);

    for (const block of sittings) {
      if (filterSitting && block.sitting !== filterSitting) continue;

      const key = `${subject}-${block.sitting}`;

      if (!forceReparse && store[key]) {
        const q = store[key].questions.length;
        console.log(`  ↩  ${block.sitting} — already parsed (${q} questions), skipping`);
        totalSkipped++;
        continue;
      }

      process.stdout.write(`  ⏳  ${block.sitting} ... `);

      try {
        const parsed = await parseSittingWithGrok(subject, block.sitting, block.text);
        store[key]   = parsed;
        totalParsed++;

        const qCount    = parsed.questions.length;
        const fragCount = parsed.unparsed_fragments.length;
        const lowConf   = parsed.questions.filter((q) => q.extraction_confidence === "low").length;
        const midConf   = parsed.questions.filter((q) => q.extraction_confidence === "medium").length;

        let status = `✓  ${qCount} questions`;
        if (fragCount > 0) status += `, ⚠ ${fragCount} unparsed fragment(s)`;
        if (lowConf > 0)   status += `, 🔴 ${lowConf} low-confidence`;
        if (midConf > 0)   status += `, 🟡 ${midConf} medium-confidence`;
        console.log(status);

        // Auto-save after every successful sitting
        fs.writeFileSync(outputPath, JSON.stringify(store, null, 2));

        // Rate-limit: ~1 req/sec to stay within xAI limits
        await new Promise((r) => setTimeout(r, 1200));
      } catch (err) {
        console.error(`\n  ✗ Error — ${(err as Error).message}`);
        totalErrors++;
        // Save whatever we have so far
        fs.writeFileSync(outputPath, JSON.stringify(store, null, 2));
      }
    }
  }

  // Final flush
  fs.writeFileSync(outputPath, JSON.stringify(store, null, 2));

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Done!`);
  console.log(`   Parsed:  ${totalParsed} sitting(s)`);
  console.log(`   Skipped: ${totalSkipped} sitting(s) (already parsed)`);
  if (totalErrors > 0) console.log(`   Errors:  ${totalErrors} sitting(s) — check output above`);
  console.log(`   Output:  ${outputPath}`);
  console.log(
    `\n💡 Check each entry's unparsed_fragments[] — non-empty means incomplete extraction.`
  );
  console.log(
    `   Re-run with --force to re-parse everything, or --sitting "Month YYYY" for one sitting.`
  );
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});

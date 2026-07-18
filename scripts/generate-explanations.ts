#!/usr/bin/env tsx
/**
 * scripts/generate-explanations.ts
 *
 * Reads data/questions.json, calls the xAI Grok API for each question
 * that doesn't yet have an explanation, and writes results to
 * data/explanations.json keyed by questionId.
 *
 * Idempotent/resumable: skips existing IDs so re-running only fills gaps.
 * Auto-saves every 10 completions so progress is never lost.
 *
 * Usage:
 *   npx tsx scripts/generate-explanations.ts
 *   npx tsx scripts/generate-explanations.ts --subject fa
 *   npx tsx scripts/generate-explanations.ts --limit 50   # process only N questions
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import type { Question } from "./extract-questions";

dotenv.config({ path: ".env.local" });

// ─────────────────────────────────────────────────────────────
// Grok client — OpenAI-compatible, just swap baseURL + key
// ─────────────────────────────────────────────────────────────
const client = new OpenAI({
  apiKey: process.env.GROK_API ?? "",
  baseURL: "https://api.x.ai/v1",
});

const MODEL = "grok-3-mini"; // swap to "grok-3" for higher quality answers

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface ExplanationEntry {
  explanation: string;
  generatedAt: string;
  model: string;
}

type ExplanationsMap = Record<string, ExplanationEntry>;

// ─────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are a KASNEB CPA Economics, Financial Accounting, and Quantitative Analysis tutor.

Give a concise, exam-style model answer matching the mark allocation. Use clear structure:
- For "explain FOUR X" style questions: use numbered points (1. ... 2. ...)
- For calculations: show every working step clearly with proper labels
- For definitions/descriptions: be precise and use accounting/economics terminology
- For diagrams: describe clearly what the diagram should show and label all axes/curves
- End with a clear conclusion where appropriate

Be thorough enough to earn full marks but don't pad unnecessarily.`;

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
      console.warn(`\n    ⟳ Attempt ${attempt} failed, retrying in ${wait}ms...`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw new Error("unreachable");
}

// ─────────────────────────────────────────────────────────────
// Generate one explanation
// ─────────────────────────────────────────────────────────────
async function generateExplanation(q: Question): Promise<string> {
  const subjectName =
    q.subject === "economics"
      ? "Economics"
      : q.subject === "fa"
      ? "Financial Accounting"
      : "Quantitative Analysis";

  const userPrompt = `Subject: ${subjectName}
Sitting: ${q.sitting} ${q.year}
Question ${q.questionNumber}${q.part !== "a" ? q.part : ""}  [${q.marks} marks]
Topic: ${q.topic}

${q.text}

Provide a model answer worth ${q.marks} marks.`;

  const response = await withRetry(() =>
    client.chat.completions.create({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1200,
    })
  );

  return response.choices[0].message.content?.trim() ?? "";
}

// ─────────────────────────────────────────────────────────────
// CLI argument helpers
// ─────────────────────────────────────────────────────────────
function getArg(flag: string): string | null {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

const filterSubject = getArg("--subject");
const limitArg      = getArg("--limit");
const limit         = limitArg ? parseInt(limitArg, 10) : Infinity;

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
async function main() {
  if (!process.env.GROK_API) {
    console.error("❌  GROK_API not set in .env.local");
    process.exit(1);
  }

  const dataDir          = path.join(process.cwd(), "data");
  const questionsPath    = path.join(dataDir, "questions.json");
  const explanationsPath = path.join(dataDir, "explanations.json");

  if (!fs.existsSync(questionsPath)) {
    console.error("data/questions.json not found — run scripts/extract-questions.ts first");
    process.exit(1);
  }

  let questions: Question[] = JSON.parse(fs.readFileSync(questionsPath, "utf-8"));

  // Optional subject filter
  if (filterSubject) {
    questions = questions.filter((q) => q.subject === filterSubject);
    console.log(`🔍 Filtering to subject: ${filterSubject}`);
  }

  // Load existing explanations
  let explanations: ExplanationsMap = {};
  if (fs.existsSync(explanationsPath)) {
    try {
      explanations = JSON.parse(fs.readFileSync(explanationsPath, "utf-8"));
    } catch {
      console.warn("⚠  explanations.json is corrupt — starting fresh");
    }
  }

  const pending = questions
    .filter((q) => !explanations[q.id] && q.marks > 0)
    .slice(0, limit);

  const totalQuestions = questions.length;
  console.log(`\n🚀 Explanation Generator  (model: ${MODEL})`);
  console.log(`   Total questions:    ${totalQuestions}`);
  console.log(`   Already explained:  ${Object.keys(explanations).length}`);
  console.log(`   Pending this run:   ${pending.length}`);

  if (pending.length === 0) {
    console.log("\n✅ All explanations already generated.");
    return;
  }

  console.log("\nStarting generation...\n");

  let done   = 0;
  let errors = 0;

  for (const q of pending) {
    const subjectLabel =
      q.subject === "economics" ? "EC" : q.subject === "fa" ? "FA" : "QA";
    process.stdout.write(
      `[${done + 1}/${pending.length}] ${subjectLabel} ${q.sitting} ${q.year} Q${q.questionNumber}${q.part} (${q.marks}mk) ... `
    );

    try {
      const explanation = await generateExplanation(q);

      explanations[q.id] = {
        explanation,
        generatedAt: new Date().toISOString(),
        model: MODEL,
      };

      console.log("✓");
      done++;

      // Auto-save every 10 completions
      if (done % 10 === 0) {
        fs.writeFileSync(explanationsPath, JSON.stringify(explanations, null, 2));
        console.log(`  💾 Auto-saved at ${done} explanations`);
      }

      // Rate-limit: ~1 req/sec
      await new Promise((r) => setTimeout(r, 1100));
    } catch (err) {
      console.error(`✗ — ${(err as Error).message}`);
      errors++;
      // Save progress so far
      fs.writeFileSync(explanationsPath, JSON.stringify(explanations, null, 2));
    }
  }

  // Final save
  fs.writeFileSync(explanationsPath, JSON.stringify(explanations, null, 2));

  console.log(`\n${"─".repeat(50)}`);
  console.log(`✅ Done! Generated ${done} explanation(s).`);
  if (errors > 0) console.log(`   Errors: ${errors} (check output above)`);
  console.log(`   Saved to: ${explanationsPath}`);
}

main().catch((err) => {
  console.error("\n❌ Fatal error:", err);
  process.exit(1);
});

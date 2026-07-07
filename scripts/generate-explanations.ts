#!/usr/bin/env tsx
/**
 * scripts/generate-explanations.ts
 *
 * Reads data/questions.json, calls OpenAI gpt-4o-mini for each question
 * that doesn't yet have an explanation, and writes results to
 * data/explanations.json keyed by questionId.
 *
 * Idempotent/resumable: skips existing IDs so re-running only fills gaps.
 * Logs running token-cost estimate as it goes.
 *
 * Usage:  npx tsx scripts/generate-explanations.ts
 */

import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";
import type { Question } from "./extract-questions";

dotenv.config({ path: ".env.local" });

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// gpt-4o-mini pricing (USD per 1M tokens, as of mid-2025)
const COST_PER_1M_INPUT = 0.15;
const COST_PER_1M_OUTPUT = 0.6;

interface ExplanationEntry {
  explanation: string;
  generatedAt: string;
}

type ExplanationsMap = Record<string, ExplanationEntry>;

const SYSTEM_PROMPT = `You are a KASNEB CPA Economics, Financial Accounting, and Quantitative Analysis tutor.

Give a concise, exam-style model answer matching the mark allocation. Use clear structure:
- For "explain FOUR X" style questions: use numbered points (1. ... 2. ...)
- For calculations: show every working step clearly
- For definitions/descriptions: be precise and use accounting/economics terminology
- End with a clear conclusion where appropriate

Be thorough enough to earn full marks but don't pad unnecessarily.`;

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

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 1200,
  });

  return response.choices[0].message.content?.trim() ?? "";
}

async function main() {
  const dataDir = path.join(process.cwd(), "data");
  const questionsPath = path.join(dataDir, "questions.json");
  const explanationsPath = path.join(dataDir, "explanations.json");

  if (!fs.existsSync(questionsPath)) {
    console.error(
      "data/questions.json not found — run scripts/extract-questions.ts first"
    );
    process.exit(1);
  }

  const questions: Question[] = JSON.parse(
    fs.readFileSync(questionsPath, "utf-8")
  );

  // Load existing explanations
  let explanations: ExplanationsMap = {};
  if (fs.existsSync(explanationsPath)) {
    explanations = JSON.parse(fs.readFileSync(explanationsPath, "utf-8"));
  }

  const pending = questions.filter((q) => !explanations[q.id]);
  const totalQuestions = questions.length;
  console.log(`Total questions: ${totalQuestions}`);
  console.log(`Already explained: ${totalQuestions - pending.length}`);
  console.log(`Pending: ${pending.length}`);

  if (pending.length === 0) {
    console.log("\n✅ All explanations already generated.");
    return;
  }

  // Estimate cost upfront
  const avgInputTokens = 250; // system + question prompt
  const avgOutputTokens = 400; // model answer
  const estInputCost =
    ((pending.length * avgInputTokens) / 1_000_000) * COST_PER_1M_INPUT;
  const estOutputCost =
    ((pending.length * avgOutputTokens) / 1_000_000) * COST_PER_1M_OUTPUT;
  console.log(
    `\nEstimated cost: $${(estInputCost + estOutputCost).toFixed(4)} USD (${pending.length} questions × ~${avgInputTokens + avgOutputTokens} tokens)`
  );
  console.log("\nStarting generation...\n");

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let done = 0;

  for (const q of pending) {
    try {
      const subjectLabel =
        q.subject === "economics" ? "EC" : q.subject === "fa" ? "FA" : "QA";
      process.stdout.write(
        `[${done + 1}/${pending.length}] ${subjectLabel} ${q.sitting} ${q.year} Q${q.questionNumber}${q.part} ... `
      );

      const explanation = await generateExplanation(q);

      // Rough token counts
      const inputTokens = Math.ceil(
        (SYSTEM_PROMPT.length + q.text.length) / 4
      );
      const outputTokens = Math.ceil(explanation.length / 4);
      totalInputTokens += inputTokens;
      totalOutputTokens += outputTokens;

      explanations[q.id] = {
        explanation,
        generatedAt: new Date().toISOString(),
      };

      const runningCost =
        (totalInputTokens / 1_000_000) * COST_PER_1M_INPUT +
        (totalOutputTokens / 1_000_000) * COST_PER_1M_OUTPUT;

      console.log(`✓  (running cost: $${runningCost.toFixed(4)})`);
      done++;

      // Save after every 10 completions so progress isn't lost
      if (done % 10 === 0) {
        fs.writeFileSync(
          explanationsPath,
          JSON.stringify(explanations, null, 2)
        );
        console.log(`  💾 Auto-saved at ${done} explanations`);
      }

      // Rate limit: ~60 RPM for gpt-4o-mini
      await new Promise((r) => setTimeout(r, 1100));
    } catch (err) {
      console.error(`\n  ✗ Error for ${q.id}:`, err);
      // Save progress so far before continuing
      fs.writeFileSync(
        explanationsPath,
        JSON.stringify(explanations, null, 2)
      );
    }
  }

  // Final save
  fs.writeFileSync(explanationsPath, JSON.stringify(explanations, null, 2));

  const totalCost =
    (totalInputTokens / 1_000_000) * COST_PER_1M_INPUT +
    (totalOutputTokens / 1_000_000) * COST_PER_1M_OUTPUT;

  console.log(`\n✅ Done! Generated ${done} explanations.`);
  console.log(
    `   Tokens: ${totalInputTokens.toLocaleString()} in / ${totalOutputTokens.toLocaleString()} out`
  );
  console.log(`   Actual cost: $${totalCost.toFixed(4)} USD`);
  console.log(`   Saved to: ${explanationsPath}`);
}

main().catch(console.error);

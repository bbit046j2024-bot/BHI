#!/usr/bin/env tsx
/**
 * scripts/extract-questions.ts
 *
 * Pure regex/string-based parser — NO OpenAI calls, no API cost, no rate limits.
 * Reads raw TXT files in data/ (economics_raw.txt, fa_raw.txt, qa_raw.txt)
 * extracted by scripts/pdf_to_txt.py, and parses them into structured questions.
 *
 * Usage:  npx tsx scripts/extract-questions.ts
 */

import fs from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────
// Topic taxonomies (keyword-matched, longest/most-specific match wins)
// ─────────────────────────────────────────────────────────────
const TAXONOMY: Record<string, Record<string, string[]>> = {
  economics: {
    Elasticity: ["elasticity"],
    "Demand & Supply": ["demand function", "supply function", "demand curve", "supply curve", "equilibrium price", "price ceiling", "price floor", "market equilibrium"],
    "Consumer Behaviour": ["indifference curve", "consumer equilibrium", "marginal utility", "consumer behaviour", "cardinal", "ordinal utility", "budget line"],
    "Production & Costs": ["production function", "marginal cost", "average cost", "diminishing returns", "economies of scale", "isoquant", "short run", "cost curve"],
    "Market Structures": ["monopoly", "oligopoly", "perfect competition", "monopolistic competition", "price discrimination", "cartel"],
    "National Income": ["national income", "gross domestic product", "gross national product", "gnp", "gdp", "per capita income", "value added"],
    "Money & Banking": ["credit creation", "commercial bank", "central bank", "money supply", "liquidity", "legal tender", "financial intermediar"],
    "Fiscal Policy": ["fiscal policy", "budget deficit", "government expenditure", "taxation", "fiscal multiplier"],
    "Monetary Policy": ["monetary policy", "interest rate", "quantity theory of money", "open market operations"],
    Inflation: ["inflation", "deflation", "price index", "cost-push", "demand-pull"],
    Unemployment: ["unemployment", "structural unemployment", "cyclical unemployment", "frictional"],
    "International Trade": ["international trade", "balance of payment", "exchange rate", "trade restriction", "tariff", "devaluation", "wto", "comparative advantage"],
    "Economic Development": ["economic development", "economic growth", "developing countr", "informal sector", "external debt"],
    "Macro Models (IS-LM)": ["is function", "lm function", "is-lm", "equilibrium rate of interest", "commodity market", "money market"],
    "Factor Markets": ["wage", "trade union", "labour", "rent", "mobility of factors"],
    "Economic Systems": ["economic system", "planned economy", "free market", "mixed economy"],
  },
  fa: {
    "Accounting Theory & Framework": ["conceptual framework", "accounting concept", "accounting standard", "ifrs", "ipsas"],
    "Assets & Depreciation": ["depreciation", "non-current asset", "fixed asset", "disposal of asset"],
    "Liabilities & Equity": ["share capital", "reserves", "liabilities", "equity"],
    "Suspense Accounts & Error Correction": ["suspense account", "correction of errors", "trial balance"],
    "Sole Trader Statements": ["sole trader", "sole proprietor"],
    "Partnership Accounts": ["partnership", "profit sharing ratio", "partner's capital"],
    "Company Financial Statements": ["statement of financial position", "statement of profit or loss", "published accounts"],
    "Manufacturing Accounts": ["manufacturing account", "cost of production"],
    "Non-Profit Organisations": ["non-profit", "income and expenditure account", "receipts and payments"],
    "Incomplete Records": ["incomplete records", "single entry"],
    "Cash Flow Statements": ["cash flow statement", "cash flow"],
    "Public Sector Accounting (IPSAS)": ["public sector", "government accounting", "ipsas"],
  },
  qa: {
    "Linear Programming": ["linear programming", "objective function", "feasible region"],
    "Decision Theory": ["decision tree", "decision theory", "expected monetary value", "payoff matrix"],
    "Correlation & Regression": ["correlation", "regression", "coefficient of determination"],
    "Time Series": ["time series", "moving average", "seasonal variation"],
    "Network Analysis (CPM/PERT)": ["network analysis", "critical path", "pert", "cpm"],
    "Cost-Volume-Profit": ["break-even", "break even", "cost-volume-profit", "contribution margin"],
    "Matrix Algebra": ["matrix", "matrices", "determinant", "inverse of"],
    "Calculus & Applications": ["differentiat", "integrat", "derivative", "maxima", "minima", "marginal function"],
    "Probability & Distributions": ["probability", "binomial", "poisson", "normal distribution"],
    "Index Numbers": ["index number", "laspeyres", "paasche"],
    "Financial Mathematics": ["compound interest", "simple interest", "annuity", "present value", "future value"],
  },
};

function detectTopic(subject: keyof typeof TAXONOMY, text: string): string {
  const lower = text.toLowerCase();
  const topics = TAXONOMY[subject];
  let best = { topic: Object.keys(topics)[0], matchLen: 0 };
  for (const [topic, keywords] of Object.entries(topics)) {
    for (const kw of keywords) {
      if (lower.includes(kw) && kw.length > best.matchLen) {
        best = { topic, matchLen: kw.length };
      }
    }
  }
  return best.topic;
}

function detectType(text: string): "theory" | "calculation" | "diagram" {
  const lower = text.toLowerCase();
  if (/diagram|illustrate|graph|curve|draw/.test(lower) && !/calculate|determine|compute/.test(lower)) {
    return "diagram";
  }
  if (
    /\d/.test(text) &&
    /(calculate|determine|compute|derive|find the|marginal|equilibrium (price|quantity|level)|profit|elasticity when|break-even|function is given)/.test(
      lower
    )
  ) {
    return "calculation";
  }
  return "theory";
}

// ─────────────────────────────────────────────────────────────
// Text cleanup — fix mojibake from pdf_to_txt.py, strip page noise
// ─────────────────────────────────────────────────────────────
const MOJIBAKE_MAP: Array<[RegExp, string]> = [
  [/â€™/g, "'"],
  [/â€œ/g, '"'],
  [/â€\u009d/g, '"'],
  [/â€\x9d/g, '"'],
  [/â€"/g, "-"],
  [/â€“/g, "-"],
  [/â€”/g, "-"],
  [/âˆ'/g, "-"],
  [/â€/g, '"'],
  [/Â/g, ""],
];

function cleanText(raw: string): string {
  let out = raw;
  for (const [pattern, replacement] of MOJIBAKE_MAP) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function stripNoiseLines(text: string): string {
  const noisePatterns = [
    /^--- PAGE \d+ ---$/i,
    /^www\.chopi\.co\.ke$/i,
    /^Chopi\.co\.ke$/i,
    /^For Solutions\/Answers WhatsApp.*$/i,
    /^CA\d+.*Page \d+.*$/i,
    /^\s*Out of \d+\s*$/i,
    /^CPA (FOUNDATION LEVEL|PART).*$/i,
    /^CIFA (FOUNDATION LEVEL|PART).*$/i,
    /^CERTIFIED (PUBLIC|INVESTMENT).*$/i,
    /^\.{5,}$/,
  ];
  return text
    .split("\n")
    .filter((line) => !noisePatterns.some((p) => p.test(line.trim())))
    .join("\n");
}

// ─────────────────────────────────────────────────────────────
// Sitting detection — split raw text into per-sitting blocks
// ─────────────────────────────────────────────────────────────
const SITTING_HEADER_RE =
  /(?:MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY):\s*\d+\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i;

function splitIntoSittings(
  rawText: string
): Array<{ sitting: string; year: number; text: string }> {
  const lines = rawText.split("\n");
  const sittings: Array<{ sitting: string; year: number; startLine: number }> = [];

  for (let i = 0; i < lines.length; i++) {
    const m = SITTING_HEADER_RE.exec(lines[i]);
    if (m) {
      const month = m[1];
      const year = parseInt(m[2], 10);
      sittings.push({ sitting: `${month} ${year}`, year, startLine: i });
    }
  }

  const blocks: Array<{ sitting: string; year: number; text: string }> = [];
  for (let s = 0; s < sittings.length; s++) {
    const start = sittings[s].startLine;
    const end = s + 1 < sittings.length ? sittings[s + 1].startLine : lines.length;
    const blockText = lines.slice(start, end).join("\n");
    if (blockText.includes("QUESTION")) {
      blocks.push({ sitting: sittings[s].sitting, year: sittings[s].year, text: blockText });
    }
  }
  return blocks;
}

// ─────────────────────────────────────────────────────────────
// Question-block splitting within a sitting
// ─────────────────────────────────────────────────────────────
const WORD_NUM: Record<string, string> = {
  ONE: "1",
  TWO: "2",
  THREE: "3",
  FOUR: "4",
  FIVE: "5",
  SIX: "6",
  SEVEN: "7",
  EIGHT: "8",
};

const QUESTION_HEADER_RE = /^QUESTION\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT)\s*$/im;

function splitIntoQuestionBlocks(
  sittingText: string
): Array<{ questionNumber: string; text: string }> {
  const matches = [...sittingText.matchAll(new RegExp(QUESTION_HEADER_RE, "gim"))];
  const blocks: Array<{ questionNumber: string; text: string }> = [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : sittingText.length;
    const qNum = WORD_NUM[matches[i][1].toUpperCase()] ?? "?";
    blocks.push({ questionNumber: qNum, text: sittingText.slice(start, end) });
  }
  return blocks;
}

// ─────────────────────────────────────────────────────────────
// Sub-part splitting within a question block
// ─────────────────────────────────────────────────────────────
// Matches a leading label like "(a)", "(b)", "(i)", "(ii)" at start of a line
const LABEL_RE = /^\s*\(([a-h]|i{1,3}|iv|v|vi{1,3})\)\s*/i;
const MARKS_RE = /\((\d+)\s*marks?\)/i;
const TOTAL_MARKS_RE = /\(Total:\s*(\d+)\s*marks?\)/i;

function parseQuestionParts(
  subject: keyof typeof TAXONOMY,
  sitting: string,
  year: number,
  questionNumber: string,
  blockText: string
): Question[] {
  const totalMatch = TOTAL_MARKS_RE.exec(blockText);
  const totalMarksForQuestion = totalMatch ? parseInt(totalMatch[1], 10) : 20;

  const lines = blockText.split("\n");
  const parts: Question[] = [];

  let currentLetter = "a";
  let currentRoman: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    const joined = buffer.join(" ").replace(/\s+/g, " ").trim();
    buffer = [];
    if (!joined) return;

    const marksMatch = MARKS_RE.exec(joined);
    const marks = marksMatch ? parseInt(marksMatch[1], 10) : 0;
    const textOnly = joined.replace(MARKS_RE, "").replace(TOTAL_MARKS_RE, "").trim();
    if (!textOnly) return;

    const part = currentRoman ? `${currentLetter}(${currentRoman})` : currentLetter;
    const sittingSlug = sitting.toLowerCase().replace(/\s+/g, "-");
    const id = `${subject}-${year}-${sittingSlug}-q${questionNumber}-${part.replace(/[^a-z0-9]/gi, "")}`;

    parts.push({
      id,
      subject,
      year,
      sitting,
      questionNumber,
      part,
      text: textOnly,
      marks,
      topic: detectTopic(subject, textOnly),
      type: detectType(textOnly),
      totalMarksForQuestion,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (TOTAL_MARKS_RE.test(line) && line.replace(TOTAL_MARKS_RE, "").trim() === "") {
      continue; // standalone total-marks line, skip
    }

    const labelMatch = LABEL_RE.exec(line);
    if (labelMatch) {
      const label = labelMatch[1].toLowerCase();
      const isRoman = /^(i{1,3}|iv|v|vi{1,3})$/.test(label);

      if (isRoman) {
        // new roman sub-part under current letter
        flush();
        currentRoman = label;
      } else {
        // new letter part
        flush();
        currentLetter = label;
        currentRoman = null;
      }
      buffer.push(line.slice(labelMatch[0].length));
    } else {
      buffer.push(line);
    }

    if (MARKS_RE.test(line) && !TOTAL_MARKS_RE.test(line)) {
      flush();
    }
  }
  flush(); // catch any trailing content

  return parts;
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
function main() {
  const dataDir = path.join(process.cwd(), "data");
  const questionsPath = path.join(dataDir, "questions.json");
  const papersPath = path.join(dataDir, "papers.json");

  const subjects = ["economics", "fa", "qa"] as const;
  const allQuestions: Question[] = [];
  const papers: Paper[] = [];

  for (const subject of subjects) {
    const rawPath = path.join(dataDir, `${subject}_raw.txt`);
    if (!fs.existsSync(rawPath)) {
      console.warn(`Missing: ${rawPath} — skipping`);
      continue;
    }

    let raw = fs.readFileSync(rawPath, "utf-8");
    raw = cleanText(raw);
    raw = stripNoiseLines(raw);

    const sittingBlocks = splitIntoSittings(raw);
    console.log(`\n[${subject.toUpperCase()}] Found ${sittingBlocks.length} sittings`);

    for (const block of sittingBlocks) {
      const questionBlocks = splitIntoQuestionBlocks(block.text);
      let sittingQuestionCount = 0;
      const topicsCovered = new Set<string>();

      for (const qBlock of questionBlocks) {
        const parts = parseQuestionParts(
          subject,
          block.sitting,
          block.year,
          qBlock.questionNumber,
          qBlock.text
        );
        parts.forEach((p) => topicsCovered.add(p.topic));
        allQuestions.push(...parts);
        sittingQuestionCount += parts.length;
      }

      console.log(
        `  → ${block.sitting} ${block.year}: ${questionBlocks.length} questions, ${sittingQuestionCount} parts extracted`
      );

      papers.push({
        subject,
        year: block.year,
        sitting: block.sitting,
        questionCount: sittingQuestionCount,
        topicsCovered: [...topicsCovered],
      });
    }
  }

  fs.writeFileSync(questionsPath, JSON.stringify(allQuestions, null, 2));
  fs.writeFileSync(papersPath, JSON.stringify(papers, null, 2));

  console.log(`\n✅ Done!`);
  console.log(`   Total question parts extracted: ${allQuestions.length}`);
  console.log(`   Papers indexed: ${papers.length} sittings`);
  console.log(`\n⚠️  This is regex-based extraction — spot-check data/questions.json`);
  console.log(`   for a few entries per subject before generating explanations.`);
}

main();
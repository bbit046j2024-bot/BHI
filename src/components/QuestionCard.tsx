"use client";

import { useState } from "react";

interface Props {
  questionNumber: string;
  part: string;
  text: string;
  marks: number;
  topic: string;
  type: "theory" | "calculation" | "diagram";
  totalMarksForQuestion: number;
  explanation: string;
}

const TYPE_LABELS: Record<string, string> = {
  theory: "Theory",
  calculation: "Calculation",
  diagram: "Diagram",
};
const TYPE_CLASSES: Record<string, string> = {
  theory: "type-badge-theory",
  calculation: "type-badge-calculation",
  diagram: "type-badge-diagram",
};
const TYPE_ICONS: Record<string, string> = {
  theory: "💬",
  calculation: "🔢",
  diagram: "📐",
};

export default function QuestionCard({
  questionNumber,
  part,
  text,
  marks,
  topic,
  type,
  explanation,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="question-card overflow-hidden">
      {/* Question header */}
      <div className="p-5 pb-0">
        <div className="flex items-start justify-between gap-4 mb-3">
          {/* Q label + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading font-bold text-primary-800 text-sm bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
              Q{questionNumber}{part !== "a" || part ? part : ""}
            </span>
            <span className="topic-badge">{topic}</span>
            <span className={TYPE_CLASSES[type]}>
              {TYPE_ICONS[type]} {TYPE_LABELS[type]}
            </span>
          </div>
          {/* Marks badge */}
          <span className="mark-badge shrink-0">{marks} mk{marks !== 1 ? "s" : ""}</span>
        </div>

        {/* Question text */}
        <p className="text-slate-800 text-sm leading-relaxed whitespace-pre-line">
          {text}
        </p>
      </div>

      {/* Model answer toggle */}
      <div className="px-5 py-3">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-medium text-primary-700 hover:text-primary-600 transition-colors group"
        >
          <span
            className={`w-5 h-5 rounded-full border-2 border-primary-300 flex items-center justify-center text-xs transition-transform duration-200 ${
              open ? "rotate-180 bg-primary-700 border-primary-700 text-white" : ""
            }`}
          >
            {open ? "▲" : "▼"}
          </span>
          {open ? "Hide Model Answer" : "Show Model Answer"}
        </button>

        {open && (
          <div className="mt-3 explanation-box animate-fade-in">
            {explanation ? (
              <div
                className="explanation-content text-sm text-slate-700"
                dangerouslySetInnerHTML={{
                  __html: explanation
                    .replace(/\n\n/g, "</p><p>")
                    .replace(/\n/g, "<br/>")
                    .replace(/^/, "<p>")
                    .replace(/$/, "</p>")
                    .replace(/(\d+)\.\s/g, (m) => `<strong>${m}</strong>`),
                }}
              />
            ) : (
              <p className="text-slate-500 italic text-sm">
                Model answer not yet generated. Run{" "}
                <code className="font-mono bg-white/60 px-1 rounded text-xs">
                  npx tsx scripts/generate-explanations.ts
                </code>{" "}
                to generate it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

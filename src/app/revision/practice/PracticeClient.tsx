"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import type { Question } from "@/lib/data";

interface Props {
  questions: Question[];
  explanations: Record<string, string>;
}

const SUBJECT_LABELS: Record<string, string> = {
  economics: "Economics",
  fa: "Financial Accounting",
  qa: "Quantitative Analysis",
};

export default function PracticeClient({ questions, explanations }: Props) {
  const [subject, setSubject] = useState<string>("all");
  const [topic, setTopic] = useState<string>("all");
  const [count, setCount] = useState<number>(10);
  const [quizQuestions, setQuizQuestions] = useState<Question[] | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);

  // Dynamic topic list based on selected subject
  const availableTopics = [
    ...new Set(
      questions
        .filter((q) => subject === "all" || q.subject === subject)
        .map((q) => q.topic)
    ),
  ].sort();

  const startQuiz = useCallback(() => {
    let pool = questions.filter((q) => {
      if (subject !== "all" && q.subject !== subject) return false;
      if (topic !== "all" && q.topic !== topic) return false;
      return true;
    });

    // Shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    setQuizQuestions(pool.slice(0, Math.min(count, pool.length)));
    setRevealed(new Set());
    setCurrentIndex(0);
  }, [questions, subject, topic, count]);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const resetQuiz = () => {
    setQuizQuestions(null);
    setRevealed(new Set());
    setCurrentIndex(0);
  };

  // ── Setup screen ───────────────────────────────────────────────
  if (!quizQuestions) {
    return (
      <div className="animate-fade-in max-w-lg mx-auto">
        <Link href="/revision" className="btn-ghost text-sm -ml-2 mb-6 inline-flex">
          ← Dashboard
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          <h1 className="font-heading text-2xl font-bold text-slate-900 mb-2">
            🎯 Practice Quiz
          </h1>
          <p className="text-slate-500 text-sm mb-8">
            Randomise questions from any subject and topic. Check your answer
            against the model answer instantly.
          </p>

          <div className="space-y-5">
            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Subject
              </label>
              <select
                value={subject}
                onChange={(e) => { setSubject(e.target.value); setTopic("all"); }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Subjects</option>
                {Object.entries(SUBJECT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Topic */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Topics</option>
                {availableTopics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Count */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Number of Questions:{" "}
                <span className="text-primary-600 font-bold">{count}</span>
              </label>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>5</span><span>50</span>
              </div>
            </div>

            <button onClick={startQuiz} className="btn-accent w-full text-base py-3">
              Start Quiz →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz screen ────────────────────────────────────────────────
  const q = quizQuestions[currentIndex];
  const isLast = currentIndex === quizQuestions.length - 1;
  const progress = ((currentIndex + 1) / quizQuestions.length) * 100;

  return (
    <div className="animate-fade-in max-w-2xl mx-auto space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <button onClick={resetQuiz} className="btn-ghost text-sm">
          ← New Quiz
        </button>
        <span className="text-sm text-slate-500 font-medium">
          {currentIndex + 1} / {quizQuestions.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-accent-500 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm border-l-4 border-l-primary-700 p-6 space-y-4">
        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-heading font-bold text-primary-800 text-sm bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-100">
            Q{q.questionNumber}{q.part}
          </span>
          <span className="topic-badge">{q.topic}</span>
          <span className="text-xs text-slate-400">
            {q.sitting ?? ""} {q.year ?? ""}
          </span>
          <span className="mark-badge ml-auto">{q.marks} mks</span>
        </div>

        {/* Text */}
        <p className="text-slate-800 leading-relaxed whitespace-pre-line">{q.text}</p>

        {/* Reveal toggle */}
        <button
          onClick={() => toggleReveal(q.id)}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 border-2 ${revealed.has(q.id)
            ? "bg-primary-700 text-white border-primary-700"
            : "bg-white text-primary-700 border-primary-300 hover:bg-primary-50"
            }`}
        >
          {revealed.has(q.id) ? "▲ Hide Model Answer" : "▼ Show Model Answer"}
        </button>

        {revealed.has(q.id) && (
          <div className="explanation-box animate-fade-in">
            {explanations[q.id] ? (
              <div
                className="explanation-content text-sm text-slate-700"
                dangerouslySetInnerHTML={{
                  __html: explanations[q.id]
                    .replace(/\n\n/g, "</p><p>")
                    .replace(/\n/g, "<br/>")
                    .replace(/^/, "<p>")
                    .replace(/$/, "</p>"),
                }}
              />
            ) : (
              <p className="text-slate-500 italic text-sm">
                Model answer not yet generated.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((i) => i - 1)}
          className="btn-outline flex-1 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ← Previous
        </button>
        {isLast ? (
          <button onClick={resetQuiz} className="btn-accent flex-1">
            🎉 Finish Quiz
          </button>
        ) : (
          <button
            onClick={() => setCurrentIndex((i) => i + 1)}
            className="btn-primary flex-1"
          >
            Next →
          </button>
        )}
      </div>

      {/* Quick jump dots */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {quizQuestions.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${i === currentIndex
              ? "bg-primary-700 text-white"
              : revealed.has(quizQuestions[i].id)
                ? "bg-accent-500 text-white"
                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
              }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

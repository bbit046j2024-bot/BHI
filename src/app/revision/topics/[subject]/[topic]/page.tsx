import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllQuestions,
  getAllExplanations,
  getSubjectLabel,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
} from "@/lib/data";
import QuestionCard from "@/components/QuestionCard";

interface Props {
  params: { subject: string; topic: string };
}

export async function generateMetadata({ params }: Props) {
  const topic = decodeURIComponent(params.topic);
  return {
    title: `${topic} — ${getSubjectLabel(params.subject)} | BHI`,
    description: `All ${getSubjectLabel(params.subject)} past paper questions on ${topic}.`,
  };
}

export default function TopicPage({ params }: Props) {
  const subject = params.subject as "economics" | "fa" | "qa";
  const topic = decodeURIComponent(params.topic);

  const allQuestions = getAllQuestions();
  const explanations = getAllExplanations();

  const questions = allQuestions
    .filter((q) => q.subject === subject && q.topic === topic)
    .sort((a, b) => b.year - a.year || a.sitting.localeCompare(b.sitting));

  if (questions.length === 0) notFound();

  const col = SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.economics;
  const icon = SUBJECT_ICONS[subject] ?? "📄";

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/revision/topics/${subject}`} className="btn-ghost text-sm -ml-2">
          ←
        </Link>
        <Link href="/revision" className="btn-ghost text-sm">
          Dashboard
        </Link>
      </div>

      <div className={`rounded-2xl border ${col.border} ${col.bg} p-6`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${col.text} opacity-60`}>
              {getSubjectLabel(subject)}
            </p>
            <h1 className={`font-heading text-2xl font-bold ${col.text}`}>{topic}</h1>
          </div>
        </div>
        <p className="text-slate-500 mt-2 text-sm">
          {questions.length} question parts across{" "}
          {new Set(questions.map((q) => `${q.year}-${q.sitting}`)).size} sittings
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q) => (
          <div key={q.id}>
            <p className="text-xs text-slate-400 font-medium mb-1 ml-1">
              {q.sitting} {q.year}
            </p>
            <QuestionCard
              questionNumber={q.questionNumber}
              part={q.part}
              text={q.text}
              marks={q.marks}
              topic={q.topic}
              type={q.type}
              totalMarksForQuestion={q.totalMarksForQuestion}
              explanation={explanations[q.id]?.explanation ?? ""}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

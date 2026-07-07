import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAllQuestions,
  getAllExplanations,
  getSubjectLabel,
  getSubjectCode,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
} from "@/lib/data";
import QuestionCard from "@/components/QuestionCard";

interface Props {
  params: { subject: string; year: string; sitting: string };
}

export async function generateMetadata({ params }: Props) {
  const sitting = decodeURIComponent(params.sitting);
  return {
    title: `${sitting} ${params.year} — ${getSubjectLabel(params.subject)} | BHI`,
    description: `Past paper questions for ${getSubjectLabel(params.subject)} ${sitting} ${params.year} sitting.`,
  };
}

export default function PaperPage({ params }: Props) {
  const subject = params.subject as "economics" | "fa" | "qa";
  const year = parseInt(params.year, 10);
  const sitting = decodeURIComponent(params.sitting);

  const allQuestions = getAllQuestions();
  const explanations = getAllExplanations();

  const questions = allQuestions.filter(
    (q) => q.subject === subject && q.year === year && q.sitting === sitting
  );

  if (questions.length === 0) notFound();

  const col = SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.economics;
  const icon = SUBJECT_ICONS[subject] ?? "📄";

  // Group by question number
  const grouped = questions.reduce((acc, q) => {
    if (!acc[q.questionNumber]) acc[q.questionNumber] = [];
    acc[q.questionNumber].push(q);
    return acc;
  }, {} as Record<string, typeof questions>);

  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Back */}
      <Link href="/revision" className="btn-ghost text-sm -ml-2">
        ← Back to Dashboard
      </Link>

      {/* Header */}
      <div className={`rounded-2xl border ${col.border} ${col.bg} p-6`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{icon}</span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${col.text} opacity-60`}>
              {getSubjectCode(subject)}
            </p>
            <h1 className={`font-heading text-2xl font-bold ${col.text}`}>
              {getSubjectLabel(subject)}
            </h1>
          </div>
        </div>
        <p className="text-slate-600 font-medium">
          {sitting} {year} &nbsp;·&nbsp; {questions.length} question parts &nbsp;·&nbsp;{" "}
          {totalMarks} total marks
        </p>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        {Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([qNum, parts]) => (
            <div key={qNum}>
              <h2 className="font-heading font-semibold text-slate-500 text-xs uppercase tracking-widest mb-2 ml-1">
                Question {qNum} &nbsp;({parts[0].totalMarksForQuestion} marks)
              </h2>
              <div className="space-y-3">
                {parts
                  .sort((a, b) => a.part.localeCompare(b.part))
                  .map((q) => (
                    <QuestionCard
                      key={q.id}
                      questionNumber={q.questionNumber}
                      part={q.part}
                      text={q.text}
                      marks={q.marks}
                      topic={q.topic}
                      type={q.type}
                      totalMarksForQuestion={q.totalMarksForQuestion}
                      explanation={explanations[q.id]?.explanation ?? ""}
                    />
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

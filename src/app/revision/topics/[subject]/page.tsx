import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getAllQuestions,
  getSubjectLabel,
  getSubjectCode,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
} from "@/lib/data";

interface Props {
  params: { subject: string };
}

export async function generateMetadata({ params }: Props) {
  return {
    title: `Topics — ${getSubjectLabel(params.subject)} | BHI`,
  };
}

export default function TopicListPage({ params }: Props) {
  const subject = params.subject as "economics" | "fa" | "qa";
  const allQuestions = getAllQuestions();
  const subjectQuestions = allQuestions.filter((q) => q.subject === subject);
  if (subjectQuestions.length === 0) notFound();

  const col = SUBJECT_COLORS[subject] ?? SUBJECT_COLORS.economics;
  const icon = SUBJECT_ICONS[subject] ?? "📄";

  // Count questions per topic
  const topicCounts = subjectQuestions.reduce((acc, q) => {
    acc[q.topic] = (acc[q.topic] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="animate-fade-in space-y-6">
      <Link href="/revision" className="btn-ghost text-sm -ml-2">
        ← Back to Dashboard
      </Link>

      <div className={`rounded-2xl border ${col.border} ${col.bg} p-6`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <div>
            <p className={`text-xs font-bold uppercase tracking-wider ${col.text} opacity-60`}>
              {getSubjectCode(subject)}
            </p>
            <h1 className={`font-heading text-2xl font-bold ${col.text}`}>
              {getSubjectLabel(subject)} — Topics
            </h1>
          </div>
        </div>
        <p className="text-slate-500 mt-2 text-sm">
          {topics.length} topics · {subjectQuestions.length} total questions
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {topics.map(([topic, count]) => (
          <Link
            key={topic}
            href={`/revision/topics/${subject}/${encodeURIComponent(topic)}`}
            className="bg-white rounded-xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <h2 className="font-heading font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                {topic}
              </h2>
              <span className="mark-badge">{count}</span>
            </div>
            <p className="text-slate-400 text-xs mt-1">
              {count} question part{count !== 1 ? "s" : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

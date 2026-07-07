import Link from "next/link";
import {
  getAllQuestions,
  getAllPapers,
  getSubjectLabel,
  getSubjectCode,
  SUBJECT_COLORS,
  SUBJECT_ICONS,
} from "@/lib/data";

export const metadata = {
  title: "Dashboard | BHI Revision",
  description: "Browse past papers by subject, sitting, and topic.",
};

const SUBJECTS = ["economics", "fa", "qa"] as const;

export default function RevisionDashboard() {
  const questions = getAllQuestions();
  const papers = getAllPapers();

  // Stats per subject
  const stats = SUBJECTS.map((sub) => {
    const qs = questions.filter((q) => q.subject === sub);
    const ps = papers.filter((p) => p.subject === sub);
    const topics = [...new Set(qs.map((q) => q.topic))];
    return { subject: sub, questions: qs.length, papers: ps.length, topics };
  });

  // Group papers by subject → year
  const papersBySubject = SUBJECTS.reduce((acc, sub) => {
    const ps = papers
      .filter((p) => p.subject === sub)
      .sort((a, b) => b.year - a.year || a.sitting.localeCompare(b.sitting));
    acc[sub] = ps;
    return acc;
  }, {} as Record<string, typeof papers>);

  return (
    <div className="animate-fade-in space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Revision Dashboard
          </h1>
          <p className="text-slate-500 mt-1">
            Browse past papers or jump into practice mode.
          </p>
        </div>
        <Link href="/revision/practice" className="btn-accent self-start sm:self-auto">
          🎯 Practice Quiz
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Total Questions" value={questions.length} icon="📄" />
        <StatCard label="Past Papers" value={papers.length} icon="📂" />
        <StatCard label="Subjects" value={3} icon="📚" />
        <StatCard
          label="Topics Covered"
          value={[...new Set(questions.map((q) => q.topic))].length}
          icon="🗂️"
        />
      </div>

      {/* Subject sections */}
      {SUBJECTS.map((sub) => {
        const s = stats.find((x) => x.subject === sub)!;
        const col = SUBJECT_COLORS[sub];
        const icon = SUBJECT_ICONS[sub];
        const ps = papersBySubject[sub] ?? [];

        return (
          <section key={sub} className={`rounded-2xl border ${col.border} ${col.bg} p-6`}>
            {/* Subject header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{icon}</span>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${col.text} opacity-60`}>
                    {getSubjectCode(sub)}
                  </p>
                  <h2 className={`font-heading text-xl font-bold ${col.text}`}>
                    {getSubjectLabel(sub)}
                  </h2>
                </div>
              </div>
              <div className="flex gap-3 text-sm">
                <span className={`${col.text} font-medium`}>
                  {s.questions} questions
                </span>
                <span className="text-slate-400">·</span>
                <span className={`${col.text} font-medium`}>
                  {s.papers} sittings
                </span>
              </div>
            </div>

            {/* Papers grid */}
            {ps.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">
                No papers extracted yet. Run{" "}
                <code className="font-mono bg-white/60 px-1.5 py-0.5 rounded text-xs">
                  npx tsx scripts/extract-questions.ts
                </code>{" "}
                to populate.
              </p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {ps.map((p) => (
                  <Link
                    key={`${p.subject}-${p.year}-${p.sitting}`}
                    href={`/revision/papers/${p.subject}/${p.year}/${encodeURIComponent(p.sitting)}`}
                    className="bg-white rounded-xl p-4 border border-white/80 shadow-sm hover:shadow-md transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-heading font-semibold text-slate-800 group-hover:text-primary-700 transition-colors">
                          {p.sitting}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {p.questionCount} question parts
                        </p>
                      </div>
                      <span className="text-lg">→</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-3">
                      {p.topicsCovered.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className={`text-xs px-1.5 py-0.5 rounded-full ${col.bg} ${col.text} border ${col.border}`}
                        >
                          {t}
                        </span>
                      ))}
                      {p.topicsCovered.length > 3 && (
                        <span className="text-xs text-slate-400">
                          +{p.topicsCovered.length - 3}
                        </span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Browse by topic link */}
            <div className="mt-4 flex gap-3">
              <Link
                href={`/revision/topics/${sub}`}
                className={`text-sm font-medium ${col.text} hover:underline`}
              >
                Browse by topic →
              </Link>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="font-heading text-2xl font-bold text-slate-900">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-slate-500 mt-0.5">{label}</div>
    </div>
  );
}

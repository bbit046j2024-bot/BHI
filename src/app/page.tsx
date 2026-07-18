"use client";

import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

// ── Feature cards data ──────────────────────────────────────────
const SUBJECTS = [
  {
    code: "CA14",
    name: "Economics",
    slug: "economics",
    desc: "Demand & supply, market structures, national income, monetary & fiscal policy, and international trade.",
    icon: "📊",
    color: "from-blue-500 to-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    topics: ["Demand & Supply", "Market Structures", "Fiscal Policy", "Inflation", "International Trade"],
  },
  {
    code: "CA11",
    name: "Financial Accounting",
    slug: "fa",
    desc: "Trial balances, financial statements, partnerships, company accounts, and cash flow analysis.",
    icon: "📒",
    color: "from-green-500 to-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    topics: ["Error Correction", "Company Statements", "Cash Flow", "Non-Profit Orgs", "IPSAS"],
  },
  {
    code: "CA12",
    name: "Quantitative Analysis",
    slug: "qa",
    desc: "Linear programming, decision theory, regression, time series, network analysis, and probability.",
    icon: "📐",
    color: "from-purple-500 to-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    text: "text-purple-800",
    topics: ["Linear Programming", "Regression", "Time Series", "Probability", "CPM/PERT"],
  },
];

const FEATURES = [
  {
    icon: "📄",
    title: "2015 – 2026 Past Papers",
    desc: "All sittings from April & December sessions — including the latest April 2026 papers.",
  },
  {
    icon: "💡",
    title: "AI Model Answers",
    desc: "Every question part has a pre-generated KASNEB-style model answer, available instantly.",
  },
  {
    icon: "🎯",
    title: "Practice Quiz Mode",
    desc: "Filter by subject and topic. Test yourself in randomised quiz mode to master each syllabus area.",
  },
  {
    icon: "🗂️",
    title: "Browse by Topic",
    desc: "Drill into specific topics — Elasticity, Cash Flows, Linear Programming — across all sittings.",
  },
];

// ── Page ────────────────────────────────────────────────────────
export default function HomePage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const signInRef = useRef<HTMLButtonElement>(null);

  // Auto-open sign-in modal when redirected from /revision with ?signin=1
  useEffect(() => {
    if (searchParams.get("signin") === "1" && signInRef.current) {
      setTimeout(() => signInRef.current?.click(), 300);
    }
  }, [searchParams]);

  // Redirect to dashboard if already signed in
  useEffect(() => {
    if (isSignedIn) router.replace("/revision");
  }, [isSignedIn, router]);

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-primary-800">
        {/* Decorative blobs */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-700/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative container-page text-center text-white animate-fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-sm font-medium mb-6 backdrop-blur-sm">
            <span className="w-2 h-2 bg-accent-400 rounded-full animate-pulse-slow" />
            KASNEB CPA & CIFA Foundation Level
          </div>

          {/* Heading */}
          <h1 className="font-heading font-extrabold text-5xl sm:text-6xl lg:text-7xl leading-[1.1] mb-6">
            Bishop Hannington
            <br />
            <span className="text-accent-400">Institute</span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-200 max-w-2xl mx-auto mb-4 leading-relaxed">
            Kenya&apos;s premier CPA tutoring centre. Access{" "}
            <span className="text-white font-semibold">10+ years</span> of past
            papers with instant AI-powered model answers across Economics, FA
            and QA.
          </p>

          <p className="text-sm text-blue-300 mb-10">
            2015 – April 2026 sittings &nbsp;·&nbsp; Hundreds of questions &nbsp;·&nbsp; Pre-generated model answers
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignUpButton mode="modal">
              <button className="btn-accent text-base px-8 py-4 text-lg shadow-xl shadow-accent-900/20">
                Start Revising Free →
              </button>
            </SignUpButton>
            <SignInButton mode="modal">
              <button
                ref={signInRef}
                className="btn-outline border-white/40 text-white hover:bg-white/10 hover:border-white/60 text-base px-8 py-4 text-lg"
              >
                Sign In
              </button>
            </SignInButton>
          </div>
        </div>
      </section>

      {/* ── Subjects ─────────────────────────────────────────── */}
      <section className="py-20 bg-white" id="subjects">
        <div className="container-page">
          <div className="text-center mb-14">
            <p className="text-accent-600 font-semibold text-sm uppercase tracking-widest mb-2">
              CPA Foundation Level
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
              Three Subjects. One Platform.
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Everything you need for the KASNEB CPA & CIFA Foundation Level,
              organised by subject and topic.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {SUBJECTS.map((s) => (
              <div
                key={s.slug}
                className={`relative rounded-2xl border ${s.border} ${s.bg} p-6 hover:shadow-lg transition-all duration-300 group`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl mb-4 shadow-md`}
                >
                  {s.icon}
                </div>

                {/* Code badge */}
                <span className={`text-xs font-bold uppercase tracking-wider ${s.text} opacity-70`}>
                  {s.code}
                </span>
                <h3 className="font-heading text-xl font-bold text-slate-900 mt-0.5 mb-2">
                  {s.name}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                  {s.desc}
                </p>

                {/* Topics */}
                <div className="flex flex-wrap gap-1.5">
                  {s.topics.map((t) => (
                    <span
                      key={t}
                      className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.text} border ${s.border} font-medium`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50" id="features">
        <div className="container-page">
          <div className="text-center mb-14">
            <p className="text-accent-600 font-semibold text-sm uppercase tracking-widest mb-2">
              Why BHI Revision?
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-slate-900">
              Everything You Need to Pass
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-shadow duration-200"
              >
                <div className="text-4xl mb-4">{f.icon}</div>
                <h3 className="font-heading font-semibold text-slate-900 mb-2">
                  {f.title}
                </h3>
                <p className="text-slate-500 text-sm leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-primary-800 to-primary-900">
        <div className="container-page text-center text-white">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4">
            Ready to Ace Your CPA Exams?
          </h2>
          <p className="text-blue-200 mb-8 max-w-lg mx-auto">
            Join BHI students who use our platform to study smarter, not harder.
          </p>
          <SignUpButton mode="modal">
            <button className="btn-accent text-lg px-10 py-4 shadow-xl">
              Create Free Account →
            </button>
          </SignUpButton>
        </div>
      </section>

      {/* ── Contact / Footer ─────────────────────────────────── */}
      <footer className="bg-primary-950 text-blue-200 py-12" id="contact">
        <div className="container-page">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-sm">
                  BHI
                </div>
                <span className="font-heading font-bold text-white text-lg">
                  BHI Revision
                </span>
              </div>
              <p className="text-sm leading-relaxed">
                Bishop Hannington Institute — your trusted KASNEB CPA & CIFA
                tutoring partner since 2010.
              </p>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-3">
                Contact Us
              </h4>
              <ul className="text-sm space-y-2">
                <li>📍 Mombasa, Kenya</li>
                <li>📞 +254 7250 32318</li>
                <li>✉️ info@bhi.ac.ke</li>
              </ul>
            </div>

            {/* Subjects */}
            <div>
              <h4 className="font-heading font-semibold text-white mb-3">
                Subjects Covered
              </h4>
              <ul className="text-sm space-y-1.5">
                <li>CA14 — Economics</li>
                <li>CA11 — Financial Accounting</li>
                <li>CA12 — Quantitative Analysis</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-primary-800 pt-6 text-center text-xs text-blue-400">
            © {new Date().getFullYear()} Bishop Hannington Institute. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

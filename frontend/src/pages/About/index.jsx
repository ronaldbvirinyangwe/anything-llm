import React from "react";
import { useNavigate } from "react-router-dom";

const SCHOOL_EMAIL = "support@chikoro-ai.com";

const values = [
  {
    title: "Built for Zimbabwe",
    description:
      "Chikoro AI is aligned to both the ZIMSEC and Cambridge syllabuses — O-Level, A-Level, and primary school. No watered-down global content.",
    icon: "🇿🇼",
  },
  {
    title: "Shona, Ndebele & English",
    description:
      "We are the only platform that lets students ask questions and get answers in Shona or Ndebele. Language should never be a barrier to learning.",
    icon: "🗣️",
  },
  {
    title: "Available 24/7",
    description:
      "Whether it is 11 PM before an exam or Sunday morning, Chikoro AI is always there — no appointments, no waiting, no offline hours.",
    icon: "⏰",
  },
  {
    title: "Affordable access",
    description:
      "We built Chikoro AI because quality tutoring in Zimbabwe costs too much for most families. Our $5/month plan puts a personalised tutor within reach for every student.",
    icon: "💡",
  },
];

const subjects = [
  "Mathematics", "English Language", "Combined Science", "Physics",
  "Chemistry", "Biology", "Geography", "History",
  "Accounts / Commerce", "Computer Science", "Shona", "Ndebele",
];

export default function About() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-theme-bg-primary text-theme-text-primary">
      {/* Nav */}
      <nav className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#080c10]/80 backdrop-blur-xl">
        <button
          onClick={() => navigate("/")}
          className="text-xl font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent"
        >
          Chikoro AI
        </button>
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => navigate("/about")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">About</button>
          <button onClick={() => navigate("/pricing")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Pricing</button>
          <button onClick={() => navigate("/blog")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Blog</button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-theme-text-secondary hover:text-white transition-colors hidden sm:block"
          >
            Log in
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#75D6FF] text-gray-900 hover:bg-white transition-colors"
          >
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center pt-16 pb-12 px-6">
        <div className="inline-block bg-[#75D6FF]/10 border border-[#75D6FF]/30 rounded-full px-4 py-1 text-xs text-[#75D6FF] font-semibold mb-6 tracking-wide uppercase">
          Zimbabwe&apos;s First AI Tutor
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-6 leading-tight">
          Every Zimbabwean student deserves a great tutor
        </h1>
        <p className="text-lg text-theme-text-secondary leading-relaxed max-w-2xl mx-auto">
          Chikoro AI was built in Zimbabwe, for Zimbabwe. We combine the latest AI technology with
          the ZIMSEC and Cambridge curricula so that any student — regardless of school, location, or budget —
          can get instant, personalised academic support in English, Shona, or Ndebele.
        </p>
      </div>

      {/* Why we built it */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-2xl bg-theme-bg-secondary border border-white/10 p-8 md:p-12">
          <h2 className="text-2xl font-bold text-white mb-4">Why we built Chikoro AI</h2>
          <div className="space-y-4 text-theme-text-secondary leading-relaxed">
            <p>
              Quality private tutoring in Zimbabwe can cost $10–$50 per subject per month — out of
              reach for most families. Meanwhile, generic AI tools like ChatGPT are built for a global audience. They use general examples (often Western context).
            </p>
            <p>
              We built Chikoro AI to change that. A Zimbabwean student should be able to open their
              phone at any time, ask a question in English, Shona, or Ndebele, upload a past paper, and get
              a clear, curriculum-aligned explanation — instantly.
            </p>
            <p>
              <strong className="text-white">Chikoro</strong> means &ldquo;school&rdquo; in Shona.
              That is exactly what we are — your school, always in your pocket.
            </p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-white text-center mb-10">What makes us different</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map(({ title, description, icon }) => (
            <div key={title} className="rounded-xl bg-theme-bg-secondary border border-white/10 p-6">
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-theme-text-secondary leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="max-w-4xl mx-auto px-6 pb-16 text-center">
        <h2 className="text-2xl font-bold text-white mb-4">Subjects covered</h2>
        <p className="text-theme-text-secondary mb-8 text-sm">
          Aligned to both ZIMSEC and Cambridge — from primary school through A-Level.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {subjects.map((s) => (
            <span
              key={s}
              className="px-4 py-2 rounded-full border border-[#75D6FF]/40 text-sm text-[#75D6FF] bg-[#75D6FF]/5"
            >
              {s}
            </span>
          ))}
          <span className="px-4 py-2 rounded-full border border-white/20 text-sm text-theme-text-secondary">
            + more
          </span>
        </div>
      </div>

      {/* For Schools */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-2xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-8 md:p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Are you a school or teacher?</h2>
          <p className="text-theme-text-secondary mb-6 max-w-xl mx-auto text-sm leading-relaxed">
            We offer whole-school rollout with teacher dashboards, quiz generators, lesson planners,
            and student progress tracking. Email us for a custom quote — we set up schools within 24 hours.
          </p>
          <a
            href={`mailto:${SCHOOL_EMAIL}?subject=School%20Partnership%20Enquiry%20%E2%80%94%20Chikoro%20AI`}
            className="inline-block px-8 py-3 rounded-xl border border-[#75D6FF] text-[#75D6FF] font-bold hover:bg-[#75D6FF] hover:text-gray-900 transition-colors text-sm"
          >
            Contact us at {SCHOOL_EMAIL}
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-white/10 py-16 text-center px-6">
        <h2 className="text-2xl font-bold text-white mb-3">Start learning today</h2>
        <p className="text-theme-text-secondary mb-8 text-sm">
          Join students across Zimbabwe using Chikoro AI to get better grades.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/register")}
            className="px-8 py-3 rounded-xl bg-[#75D6FF] text-gray-900 font-bold hover:bg-white transition-colors text-sm"
          >
            Create your free account
          </button>
          <button
            onClick={() => navigate("/pricing")}
            className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:border-[#75D6FF] transition-colors text-sm"
          >
            View pricing
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a0d]">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <p className="text-lg font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-2">Chikoro AI</p>
            <p className="text-xs text-white/40 leading-relaxed max-w-xs">Zimbabwe's first AI tutor — aligned to ZIMSEC & Cambridge, in English, Shona, and Ndebele.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Product</p>
            <ul className="space-y-2">
              {[{l:"Pricing",p:"/pricing"},{l:"About",p:"/about"},{l:"Blog",p:"/blog"}].map(({l,p})=>(
                <li key={l}><button onClick={()=>navigate(p)} className="text-xs text-white/40 hover:text-white transition-colors">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Account</p>
            <ul className="space-y-2">
              {[{l:"Sign up free",p:"/register"},{l:"Log in",p:"/login"}].map(({l,p})=>(
                <li key={l}><button onClick={()=>navigate(p)} className="text-xs text-white/40 hover:text-white transition-colors">{l}</button></li>
              ))}
              <li><a href={`mailto:${SCHOOL_EMAIL}`} className="text-xs text-white/40 hover:text-white transition-colors">Contact us</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} Chikoro AI &mdash; Zimbabwe&apos;s AI Tutor</p>
          <a href={`mailto:${SCHOOL_EMAIL}`} className="text-xs text-white/25 hover:text-white/50 transition-colors">{SCHOOL_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}

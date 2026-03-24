import React from "react";
import { useNavigate } from "react-router-dom";

const SCHOOL_EMAIL = "instrutech2024@gmail.com";

const CheckIcon = () => (
  <svg className="w-5 h-5 text-[#75D6FF] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const individualFeatures = [
  "AI homework help in English, Shona & Ndebele",
  "ZIMSEC & Cambridge exam preparation & past papers",
  "Instant answers 24/7 — no waiting",
  "Upload worksheets, PDFs & images",
  "Progress tracking & study reports",
  "Access on any device — phone, tablet, PC",
  "Cancel anytime",
];

const schoolFeatures = [
  "Everything in the Individual plan",
  "Bulk student licences at a custom rate",
  "Teacher dashboard & class management",
  "Student progress reports for educators",
  "Lesson planner & scheme of work tools",
  "Quiz generator for assessments",
  "Dedicated school support",
  "Invoiced billing for schools",
];

const faqs = [
  {
    q: "What currency is the $5 charged in?",
    a: "The Individual plan is USD $5 per student per month. You can pay via Ecocash or card.",
  },
  {
    q: "Can I try Chikoro AI before paying?",
    a: "Yes — you can create an account and explore the platform before subscribing.",
  },
  {
    q: "How does the school plan work?",
    a: "We offer custom pricing based on the number of students. Email us at info@chikoro-ai.com and we will set up your school within 24 hours.",
  },
  {
    q: "Does Chikoro AI cover both ZIMSEC and Cambridge?",
    a: "Yes. Chikoro AI is aligned to both the ZIMSEC and Cambridge syllabuses — from primary school through O-Level and A-Level.",
  },
  {
    q: "Which languages are supported?",
    a: "Chikoro AI supports English, Shona, and Ndebele — at no extra cost. Ask questions and get full explanations in whichever language you prefer.",
  },
];

export default function Pricing() {
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
      <div className="text-center pt-16 pb-12 px-6">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-lg text-theme-text-secondary max-w-xl mx-auto">
          One plan for students. Custom pricing for schools. No hidden fees, no surprises.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Individual */}
        <div className="relative rounded-2xl border-2 border-[#75D6FF] bg-theme-bg-secondary p-8 flex flex-col">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="bg-[#75D6FF] text-gray-900 text-xs font-bold px-4 py-1 rounded-full uppercase tracking-wide">
              Most Popular
            </span>
          </div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Individual Student</h2>
            <p className="text-theme-text-secondary text-sm">Perfect for learners who want to study smarter.</p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-extrabold text-white">$5</span>
            <span className="text-theme-text-secondary ml-2">/student/month</span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {individualFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-sm text-theme-text-secondary">{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate("/register")}
            className="w-full py-3 rounded-xl bg-[#75D6FF] text-gray-900 font-bold hover:bg-white transition-colors text-sm"
          >
            Start for free — no card needed
          </button>
          <p className="text-xs text-center text-theme-text-secondary mt-3">
            Pay via Ecocash. Cancel anytime.
          </p>
        </div>

        {/* Schools */}
        <div className="rounded-2xl border border-white/20 bg-theme-bg-secondary p-8 flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-1">Schools & Institutions</h2>
            <p className="text-theme-text-secondary text-sm">Built for teachers, admins, and whole-school rollout.</p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-extrabold text-white">Custom</span>
            <span className="text-theme-text-secondary ml-2">pricing</span>
            <p className="text-sm text-theme-text-secondary mt-2">
              Based on number of students. Email us for a quote — we respond within 24 hours.
            </p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {schoolFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-sm text-theme-text-secondary">{f}</span>
              </li>
            ))}
          </ul>
          <a
            href={`mailto:${SCHOOL_EMAIL}?subject=School%20Pricing%20Enquiry%20%E2%80%94%20Chikoro%20AI&body=Hi%20Chikoro%20AI%20team%2C%0A%0AI%20am%20interested%20in%20setting%20up%20Chikoro%20AI%20for%20our%20school.%0A%0ASchool%20name%3A%20%0ANumber%20of%20students%3A%20%0ALocation%3A%20%0A%0APlease%20send%20us%20a%20quote.%0A%0AThank%20you.`}
            className="w-full py-3 rounded-xl border border-[#75D6FF] text-[#75D6FF] font-bold hover:bg-[#75D6FF] hover:text-gray-900 transition-colors text-sm text-center"
          >
            Contact us for school pricing
          </a>
          <p className="text-xs text-center text-theme-text-secondary mt-3">
            Email us at{" "}
            <a href={`mailto:${SCHOOL_EMAIL}`} className="text-[#75D6FF] hover:underline">
              {SCHOOL_EMAIL}
            </a>
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center text-white mb-10">Frequently asked questions</h2>
        <div className="space-y-6">
          {faqs.map(({ q, a }) => (
            <div key={q} className="border-b border-white/10 pb-6">
              <h3 className="text-base font-semibold text-white mb-2">{q}</h3>
              <p className="text-sm text-theme-text-secondary leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-white/10 py-16 text-center px-6">
        <h2 className="text-2xl font-bold text-white mb-3">Ready to study smarter?</h2>
        <p className="text-theme-text-secondary mb-8">
          Join hundreds of Zimbabwean students already using Chikoro AI.
        </p>
        <button
          onClick={() => navigate("/register")}
          className="px-8 py-3 rounded-xl bg-[#75D6FF] text-gray-900 font-bold hover:bg-white transition-colors text-sm"
        >
          Create your free account
        </button>
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

import React from "react";
import { useNavigate } from "react-router-dom";
import PublicSiteShell, { SCHOOL_EMAIL } from "@/components/PublicSiteShell";

const CheckIcon = () => (
  <svg
    className="mt-0.5 h-5 w-5 flex-shrink-0 text-landing-accent"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
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
    <PublicSiteShell>
      {/* Hero */}
      <div className="text-center pt-16 pb-12 px-6">
        <h1 className="mb-4 text-4xl font-bold text-landing-text md:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto max-w-xl text-lg text-landing-text-subtle">
          One plan for students. Custom pricing for schools. No hidden fees, no
          surprises.
        </p>
      </div>

      {/* Plans */}
      <div className="max-w-5xl mx-auto px-6 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Individual */}
        <div className="relative flex flex-col rounded-2xl border-2 border-landing-accent bg-landing-surface p-8">
          <div className="absolute -top-4 left-1/2 -translate-x-1/2">
            <span className="rounded-full bg-landing-accent px-4 py-1 text-xs font-bold uppercase tracking-wide text-landing-accent-foreground">
              Most Popular
            </span>
          </div>
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-landing-text">
              Individual Student
            </h2>
            <p className="text-sm text-landing-text-subtle">
              Perfect for learners who want to study smarter.
            </p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-extrabold text-landing-text">
              $5
            </span>
            <span className="ml-2 text-landing-text-subtle">
              /student/month
            </span>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {individualFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-sm text-landing-text-subtle">{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => navigate("/register")}
            className="w-full rounded-xl bg-landing-accent py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
          >
            Start for free — no card needed
          </button>
          <p className="mt-3 text-center text-xs text-landing-text-subtle">
            Pay via Ecocash. Cancel anytime.
          </p>
        </div>

        {/* Schools */}
        <div className="flex flex-col rounded-2xl border border-landing-border-strong bg-landing-surface p-8">
          <div className="mb-6">
            <h2 className="mb-1 text-2xl font-bold text-landing-text">
              Schools & Institutions
            </h2>
            <p className="text-sm text-landing-text-subtle">
              Built for teachers, admins, and whole-school rollout.
            </p>
          </div>
          <div className="mb-8">
            <span className="text-5xl font-extrabold text-landing-text">
              Custom
            </span>
            <span className="ml-2 text-landing-text-subtle">pricing</span>
            <p className="mt-2 text-sm text-landing-text-subtle">
              Based on number of students. Email us for a quote — we respond
              within 24 hours.
            </p>
          </div>
          <ul className="space-y-3 mb-8 flex-1">
            {schoolFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-sm text-landing-text-subtle">{f}</span>
              </li>
            ))}
          </ul>
          <a
            href={`mailto:${SCHOOL_EMAIL}?subject=School%20Pricing%20Enquiry%20%E2%80%94%20Chikoro%20AI&body=Hi%20Chikoro%20AI%20team%2C%0A%0AI%20am%20interested%20in%20setting%20up%20Chikoro%20AI%20for%20our%20school.%0A%0ASchool%20name%3A%20%0ANumber%20of%20students%3A%20%0ALocation%3A%20%0A%0APlease%20send%20us%20a%20quote.%0A%0AThank%20you.`}
            className="w-full rounded-xl border border-landing-accent py-3 text-center text-sm font-bold text-landing-accent transition-colors hover:bg-landing-accent hover:text-landing-accent-foreground"
          >
            Contact us for school pricing
          </a>
          <p className="mt-3 text-center text-xs text-landing-text-subtle">
            Email us at{" "}
            <a
              href={`mailto:${SCHOOL_EMAIL}`}
              className="text-landing-accent hover:underline"
            >
              {SCHOOL_EMAIL}
            </a>
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="mb-10 text-center text-2xl font-bold text-landing-text">
          Frequently asked questions
        </h2>
        <div className="space-y-6">
          {faqs.map(({ q, a }) => (
            <div key={q} className="border-b border-landing-border pb-6">
              <h3 className="mb-2 text-base font-semibold text-landing-text">
                {q}
              </h3>
              <p className="text-sm leading-relaxed text-landing-text-subtle">
                {a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="border-t border-landing-border px-6 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold text-landing-text">
          Ready to study smarter?
        </h2>
        <p className="mb-8 text-landing-text-subtle">
          Join hundreds of Zimbabwean students already using Chikoro AI.
        </p>
        <button
          onClick={() => navigate("/register")}
          className="rounded-xl bg-landing-accent px-8 py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
        >
          Create your free account
        </button>
      </div>
    </PublicSiteShell>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import PublicSiteShell, { SCHOOL_EMAIL } from "@/components/PublicSiteShell";

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
      "Students can ask questions and get answers in Shona or Ndebele. Language should never be a barrier to learning.",
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
  "Mathematics",
  "English Language",
  "Combined Science",
  "Physics",
  "Chemistry",
  "Biology",
  "Geography",
  "History",
  "Accounts / Commerce",
  "Computer Science",
  "Shona",
  "Ndebele",
];

export default function About() {
  const navigate = useNavigate();

  return (
    <PublicSiteShell>
      {/* Hero */}
      <div className="max-w-4xl mx-auto text-center pt-16 pb-12 px-6">
        <div className="mb-6 inline-block rounded-full border border-landing-accent-border bg-landing-accent-soft px-4 py-1 text-xs font-semibold uppercase tracking-wide text-landing-accent">
          An AI tutor built for Zimbabwe
        </div>
        <h1 className="mb-6 text-4xl font-bold leading-tight text-landing-text md:text-5xl">
          Every Zimbabwean student deserves a great tutor
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-landing-text-subtle">
          Chikoro AI was built in Zimbabwe, for Zimbabwe. We combine the latest
          AI technology with the ZIMSEC and Cambridge curricula so that any
          student — regardless of school, location, or budget — can get instant,
          personalised academic support in English, Shona, or Ndebele.
        </p>
      </div>

      {/* Why we built it */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-landing-border bg-landing-surface p-8 md:p-12">
          <h2 className="mb-4 text-2xl font-bold text-landing-text">
            Why we built Chikoro AI
          </h2>
          <div className="space-y-4 leading-relaxed text-landing-text-subtle">
            <p>
              Quality private tutoring in Zimbabwe can cost $10–$50 per subject
              per month — out of reach for most families. Meanwhile, generic AI
              tools like ChatGPT are built for a global audience. They use
              general examples (often Western context).
            </p>
            <p>
              We built Chikoro AI to change that. A Zimbabwean student should be
              able to open their phone at any time, ask a question in English,
              Shona, or Ndebele, upload a past paper, and get a clear,
              curriculum-aligned explanation — instantly.
            </p>
            <p>
              <strong className="text-landing-text">Chikoro</strong> means
              &ldquo;school&rdquo; in Shona. That is exactly what we are — your
              school, always in your pocket.
            </p>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="mb-10 text-center text-2xl font-bold text-landing-text">
          What makes us different
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {values.map(({ title, description, icon }) => (
            <div
              key={title}
              className="rounded-xl border border-landing-border bg-landing-surface p-6"
            >
              <div className="text-3xl mb-3">{icon}</div>
              <h3 className="mb-2 text-base font-bold text-landing-text">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-landing-text-subtle">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Subjects */}
      <div className="max-w-4xl mx-auto px-6 pb-16 text-center">
        <h2 className="mb-4 text-2xl font-bold text-landing-text">
          Subjects covered
        </h2>
        <p className="mb-8 text-sm text-landing-text-subtle">
          Aligned to both ZIMSEC and Cambridge — from primary school through
          A-Level.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {subjects.map((s) => (
            <span
              key={s}
              className="rounded-full border border-landing-accent-border-strong bg-landing-accent-soft px-4 py-2 text-sm text-landing-accent"
            >
              {s}
            </span>
          ))}
          <span className="rounded-full border border-landing-border-strong px-4 py-2 text-sm text-landing-text-subtle">
            + more
          </span>
        </div>
      </div>

      {/* For Schools */}
      <div className="max-w-4xl mx-auto px-6 pb-16">
        <div className="rounded-2xl border border-landing-accent-border bg-landing-accent-soft p-8 text-center md:p-10">
          <h2 className="mb-3 text-2xl font-bold text-landing-text">
            Are you a school or teacher?
          </h2>
          <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-landing-text-subtle">
            We offer whole-school rollout with teacher dashboards, quiz
            generators, lesson planners, and student progress tracking. Email us
            for a custom quote — we set up schools within 24 hours.
          </p>
          <a
            href={`mailto:${SCHOOL_EMAIL}?subject=School%20Partnership%20Enquiry%20%E2%80%94%20Chikoro%20AI`}
            className="inline-block rounded-xl border border-landing-accent px-8 py-3 text-sm font-bold text-landing-accent transition-colors hover:bg-landing-accent hover:text-landing-accent-foreground"
          >
            Contact us at {SCHOOL_EMAIL}
          </a>
        </div>
      </div>

      {/* CTA */}
      <div className="border-t border-landing-border px-6 py-16 text-center">
        <h2 className="mb-3 text-2xl font-bold text-landing-text">
          Start learning today
        </h2>
        <p className="mb-8 text-sm text-landing-text-subtle">
          Join students across Zimbabwe using Chikoro AI to get better grades.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => navigate("/register")}
            className="rounded-xl bg-landing-accent px-8 py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
          >
            Create your free account
          </button>
          <button
            onClick={() => navigate("/pricing")}
            className="rounded-xl border border-landing-border-strong px-8 py-3 text-sm font-semibold text-landing-text transition-colors hover:border-landing-accent"
          >
            View pricing
          </button>
        </div>
      </div>
    </PublicSiteShell>
  );
}

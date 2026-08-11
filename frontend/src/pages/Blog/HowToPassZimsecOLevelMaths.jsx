import React from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

const sections = [
  {
    heading: "1. Know exactly what is on the syllabus",
    body: [
      "The single biggest mistake students make is studying the wrong things. ZIMSEC O-Level Maths (4004/4008) has a clearly defined syllabus — every topic that can appear in your exam is listed in it. Before you open a textbook, download the syllabus from the ZIMSEC website and tick off every topic you have covered.",
      "The main topic areas are: Number, Algebra, Geometry, Mensuration, Trigonometry, Statistics, and Probability. Each topic has subtopics — for example, Algebra includes linear equations, simultaneous equations, quadratic equations, inequalities, and functions.",
      "If you do not have the syllabus, ask your teacher or use Chikoro AI to get a breakdown of every topic by section.",
    ],
  },
  {
    heading: "2. Master the basics before moving on",
    body: [
      "Maths is a stacking subject. If your foundation is weak, every topic built on top of it will also be weak. Students who struggle with O-Level Maths almost always have gaps in the basics: fractions, percentages, directed numbers, and basic algebra.",
      "Spend at least one week doing nothing but foundation work if you are starting your revision. It feels slow — but it will save you weeks of frustration later when harder topics suddenly make sense.",
      "Use Chikoro AI to test yourself on foundation topics. Type 'Give me 10 practice questions on fractions and percentages, ZIMSEC level' and work through them until you are consistently getting full marks.",
    ],
  },
  {
    heading: "3. Learn the method, not just the answer",
    body: [
      "ZIMSEC Maths examiners award marks for method (called 'M marks') as well as for the correct answer. This means you can get 2 out of 3 marks on a question even if you make one arithmetic error — as long as your method is correct.",
      "Always show your working. Write every step clearly. If your final answer is wrong but your method is right, you will still pick up marks. Students who just write the answer and get it wrong score zero.",
      "When you are practising, do not check the answer until you have finished the full solution. Then compare your method, not just your answer, against the mark scheme.",
    ],
  },
  {
    heading: "4. Use past papers as your main revision tool",
    body: [
      "Past papers are the most valuable revision resource available. ZIMSEC has repeated certain question styles, topics, and even almost identical questions over many years. Students who work through 5 or more past papers before the exam are significantly better prepared than those who only read notes.",
      "The correct way to use a past paper: sit it under exam conditions (timed, no notes, no phone), then mark it against the mark scheme, then spend time understanding every question you got wrong before moving to the next paper.",
      "Do not do past papers as 'practice questions' while looking at your notes. That is not exam practice — that is guided learning. You need to know how you perform under real conditions.",
      "ZIMSEC past papers from 2010 onwards are available. Work backwards from the most recent.",
    ],
  },
  {
    heading: "5. Focus extra time on high-mark topics",
    body: [
      "Not all topics carry equal marks. In ZIMSEC O-Level Maths, Paper 1 (non-calculator) and Paper 2 (calculator) each carry 100 marks. Some topics reliably appear every year and carry significant marks:",
      "High-priority topics: Algebra (equations, graphs, functions), Geometry and Transformations, Mensuration (areas, volumes), Trigonometry (sine and cosine rules, bearings), Statistics (mean, median, cumulative frequency, histograms), and Probability.",
      "If you are short on time before the exam, prioritise these topics. Securing strong marks in Algebra alone can be the difference between a B and a C grade.",
    ],
  },
  {
    heading: "6. Make a realistic study timetable and stick to it",
    body: [
      "Most students write a timetable and abandon it within a week. The reason is usually that the timetable is too ambitious — 4-hour study sessions, every subject every day, no rest.",
      "A realistic Maths revision timetable for a student with 3 months before the exam: 45-minute sessions, 4–5 times per week. Each session covers one topic or one past paper section. Friday or Saturday is a full past paper day.",
      "Consistency beats intensity. A student who does 45 focused minutes every day will outperform a student who does five hours on one day and then does nothing for a week.",
    ],
  },
  {
    heading: "7. Do not skip the non-calculator paper",
    body: [
      "Many students spend most of their revision time on Paper 2 (calculator allowed) and underestimate Paper 1 (non-calculator). Paper 1 is 1 hour 30 minutes and carries 100 marks. You cannot use a calculator for any of it.",
      "For Paper 1, you need to be fast and accurate with mental arithmetic, fractions, standard form, and basic algebra. Practice these without a calculator every day. Time yourself — you need to average about 1.5 minutes per mark.",
      "Common Paper 1 traps: not simplifying fractions, making sign errors in directed numbers, and losing marks on 'show that' proof questions.",
    ],
  },
  {
    heading: "8. Ask for help early — not the night before",
    body: [
      "The worst time to discover you do not understand simultaneous equations is the week before your exam. If there is a topic you have been avoiding because it confuses you, tackle it now.",
      "Ask your teacher, a classmate who understands it, or use Chikoro AI to get a step-by-step explanation in English, Shona, or Ndebele. Tell the AI exactly what you do not understand — for example, 'I get confused when eliminating fractions in simultaneous equations' — and it will explain just that part.",
      "Being specific about your confusion gets you much faster help than saying 'I do not understand maths'.",
    ],
  },
  {
    heading: "9. Look after your brain on exam day",
    body: [
      "On the day of the exam: eat something, drink water, arrive early. This sounds obvious but students regularly underperform simply because they are hungry, rushed, or anxious about being late.",
      "In the exam: read every question fully before you start. Underline key information — especially units and what the question is actually asking for. Attempt every question — even a partial method earns marks. If you are stuck, move on and come back.",
      "Check your answers in the last 10 minutes. Look specifically for: units on measurement questions, whether your answer is reasonable (a length of -5 cm should make you look again), and arithmetic in multi-step calculations.",
    ],
  },
];

export default function HowToPassZimsecOLevelMaths() {
  return (
    <PublicSiteShell>
      <article className="max-w-3xl mx-auto px-6 pt-12 pb-20">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-xs text-landing-text-muted">
          <Link
            to="/blog"
            className="transition-colors hover:text-landing-text"
          >
            Blog
          </Link>
          <span>/</span>
          <span className="text-landing-text">
            How to Pass ZIMSEC O-Level Maths
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="rounded-full border border-landing-accent-border bg-landing-accent-soft px-3 py-1 text-xs font-semibold text-landing-accent">
            Study Tips
          </span>
          <span className="text-xs text-landing-text-muted">17 March 2026</span>
          <span className="text-xs text-landing-text-muted">
            &bull; 8 min read
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold leading-tight text-landing-text md:text-4xl">
          How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide
        </h1>

        {/* Intro */}
        <p className="mb-4 leading-relaxed text-landing-text-muted">
          ZIMSEC O-Level Mathematics is one of the most important subjects on
          your certificate — and one of the most feared. A C or better in Maths
          is required for most tertiary programmes and many jobs. Yet thousands
          of students sit the exam every year underprepared, not because they
          are not intelligent, but because they studied the wrong way.
        </p>
        <p className="mb-4 leading-relaxed text-landing-text-muted">
          This guide covers exactly what you need to do — from now until exam
          day — to pass O-Level Maths with confidence. It does not matter
          whether you are starting from scratch or polishing an already-solid
          foundation. Follow these steps and you will give yourself the best
          possible chance.
        </p>

        {/* Quick tip box */}
        <div className="mb-10 rounded-xl border border-landing-accent-border bg-landing-accent-soft p-5">
          <p className="mb-1 text-sm font-semibold text-landing-accent">
            Before you start
          </p>
          <p className="text-sm leading-relaxed text-landing-text-muted">
            Get a copy of the ZIMSEC O-Level Maths syllabus (4004/4008) and a
            pack of past papers. Everything in this guide assumes you have both.
            If you do not have them, ask your teacher or use Chikoro AI to get a
            full topic list instantly.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map(({ heading, body }) => (
            <div key={heading}>
              <h2 className="mb-4 text-xl font-bold text-landing-text">
                {heading}
              </h2>
              <div className="space-y-3">
                {body.map((para, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-landing-text-muted"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Grade breakdown box */}
        <div className="mb-10 mt-12 overflow-hidden rounded-xl border border-landing-border bg-landing-surface">
          <div className="border-b border-landing-border px-6 py-4">
            <h2 className="text-base font-bold text-landing-text">
              ZIMSEC O-Level Maths grade boundaries (approximate)
            </h2>
          </div>
          <div className="divide-y divide-landing-border">
            {[
              { grade: "A", range: "75 – 100%", label: "Distinction" },
              { grade: "B", range: "60 – 74%", label: "Merit" },
              {
                grade: "C",
                range: "50 – 59%",
                label: "Credit (pass for tertiary entry)",
              },
              { grade: "D", range: "40 – 49%", label: "Pass" },
              {
                grade: "E",
                range: "30 – 39%",
                label: "Pass (limited recognition)",
              },
              { grade: "U", range: "Below 30%", label: "Ungraded" },
            ].map(({ grade, range, label }) => (
              <div
                key={grade}
                className="flex items-center justify-between px-6 py-3"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-6 text-center text-lg font-extrabold ${grade === "A" || grade === "B" || grade === "C" ? "text-landing-accent" : "text-landing-text-faint"}`}
                  >
                    {grade}
                  </span>
                  <span className="text-sm text-landing-text-muted">
                    {label}
                  </span>
                </div>
                <span className="text-sm font-semibold text-landing-text">
                  {range}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-landing-surface-subtle px-6 py-3">
            <p className="text-xs text-landing-text-faint">
              Grade boundaries vary slightly per year. A grade C or above is the
              standard requirement for most tertiary programmes.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-landing-text">
            Summary: what to do this week
          </h2>
          <ul className="space-y-3">
            {[
              "Download the ZIMSEC O-Level Maths syllabus and list every topic",
              "Identify your three weakest topics and start there",
              "Set a 45-minute study session for every weekday",
              "Do one timed past paper section this weekend",
              "Use Chikoro AI to get instant explanations for any topic you do not understand",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-landing-text-muted"
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-landing-accent-soft text-xs font-bold text-landing-accent">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-landing-accent-border bg-landing-accent-soft p-8 text-center">
          <h2 className="mb-3 text-xl font-bold text-landing-text">
            Get instant Maths help with Chikoro AI
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-landing-text-muted">
            Ask any ZIMSEC O-Level Maths question and get a step-by-step
            explanation in English, Shona, or Ndebele. Upload a past paper or
            worksheet and get it explained instantly — 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="rounded-xl bg-landing-accent px-8 py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
            >
              Start for free — no card needed
            </Link>
            <Link
              to="/pricing"
              className="rounded-xl border border-landing-border-strong px-8 py-3 text-sm font-semibold text-landing-text transition-colors hover:border-landing-accent"
            >
              See pricing
            </Link>
          </div>
        </div>
      </article>
    </PublicSiteShell>
  );
}

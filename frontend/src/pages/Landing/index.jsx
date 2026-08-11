import React, { useState } from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "../../components/PublicSiteShell";

const SCHOOL_EMAIL = "support@chikoro-ai.com";

/* ─── tiny icons ─────────────────────────────────────────────────────────── */
const CheckIcon = () => (
  <svg
    className="w-4 h-4 text-landing-accent flex-shrink-0"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2.5}
      d="M5 13l4 4L19 7"
    />
  </svg>
);
const ArrowRight = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 5l7 7-7 7"
    />
  </svg>
);

/* ─── mascot avatar (standalone, no AuthContext) ─────────────────────────── */
const MascotAvatar = ({ size = "w-8 h-8" }) => (
  <div
    className={`${size} rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-md`}
  >
    <span className="text-base select-none">🎓</span>
  </div>
);
const UserAvatar = ({ initials = "S", size = "w-8 h-8" }) => (
  <div
    className={`${size} rounded-full bg-landing-avatar flex items-center justify-center flex-shrink-0 border border-landing-border`}
  >
    <span className="text-xs font-bold text-landing-text-muted select-none">
      {initials}
    </span>
  </div>
);

/* ─── shared input bar ───────────────────────────────────────────────────── */
const InputBar = ({ placeholder = "Ask a question…" }) => (
  <div className="px-3 pb-3 pt-2 border-t border-landing-border">
    <div className="flex items-center gap-2 bg-landing-surface-muted border border-landing-border rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2 text-landing-text-faint">
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
          />
        </svg>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
          />
        </svg>
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </div>
      <span className="text-[12px] text-landing-text-faint flex-1 font-light">
        {placeholder}
      </span>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-landing-accent-soft border border-landing-accent-border flex items-center justify-center">
          <svg
            className="w-3.5 h-3.5 text-landing-accent"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z" />
          </svg>
        </div>
        <svg
          className="w-4 h-4 text-landing-text-faint"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </div>
    </div>
  </div>
);

/* ─── STUDENT demo ───────────────────────────────────────────────────────── */
function StudentDemo() {
  return (
    <div className="flex flex-col h-full">
      {/* subject bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-landing-border flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-landing-surface-muted border border-landing-border rounded-lg px-3 py-1.5 text-xs text-landing-text-muted font-medium">
          Combined Science
          <svg
            className="w-3.5 h-3.5 text-landing-text-subtle"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
        <span className="text-[11px] text-landing-text-faint truncate">
          Current subject:{" "}
          <strong className="text-landing-text-subtle">Combined Science</strong>
        </span>

        {/* quiz notification */}
        <div className="ml-auto flex-shrink-0 flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 shadow-lg">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-[10px]">
            🎓
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-800 leading-tight">
              New Test quiz: Sentence
            </p>
            <p className="text-[10px] font-bold text-gray-800 leading-tight">
              construction
            </p>
            <p className="text-[9px] text-gray-400">3/12/2026, 5:16:35 AM</p>
          </div>
          <button className="bg-blue-500 text-gray-50 text-[10px] font-bold px-2.5 py-1.5 rounded-lg ml-1 whitespace-nowrap">
            Take Quiz
          </button>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        {/* user: hi */}
        <div className="flex items-start gap-2">
          <UserAvatar initials="S" size="w-7 h-7" />
          <div>
            <p className="text-sm text-landing-text mt-0.5">hi</p>
          </div>
        </div>

        {/* AI: Shona greeting */}
        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1">
            <p className="text-sm text-landing-text leading-relaxed">
              Mhoro! Ndingakubatsira sei nhasi? Unoda kudzidza chimwe chinhu
              muBiology, English, kana Cambridge? Ndiri pano — muShona, Ndebele,
              kana English!
            </p>
          </div>
        </div>

        {/* user: question */}
        <div className="flex items-start gap-2">
          <UserAvatar initials="S" size="w-7 h-7" />
          <div>
            <p className="text-sm text-landing-text mt-0.5">
              What is covered in this subject
            </p>
          </div>
        </div>

        {/* AI: table response */}
        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-landing-text font-semibold mb-2">
              Combined Science (ZIMSEC / Cambridge – Form 1)
            </p>
            <div className="rounded-xl overflow-hidden border border-landing-border text-[11px]">
              <div className="grid grid-cols-3 bg-landing-surface-hover px-2 py-1.5 font-semibold text-landing-text-subtle uppercase tracking-wide">
                <span>Topic</span>
                <span>What You'll Learn</span>
                <span>Zimbabwean Example</span>
              </div>
              {[
                [
                  "1. Living Things",
                  "What makes something alive",
                  "Plants in the schoolyard",
                ],
                [
                  "2. Body Parts",
                  "Main body parts & functions",
                  "How the heart pumps blood",
                ],
                [
                  "3. Food & Nutrition",
                  "Types of food, nutrients",
                  "Maize porridge, beans",
                ],
                [
                  "4. Water & Life",
                  "Why water is essential",
                  "Water in a farm pond",
                ],
              ].map(([topic, learn, example]) => (
                <div
                  key={topic}
                  className="grid grid-cols-3 px-2 py-1.5 border-t border-landing-border text-landing-text-muted hover:bg-landing-surface-subtle transition-colors"
                >
                  <span className="font-medium text-landing-text">{topic}</span>
                  <span>{learn}</span>
                  <span>{example}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <InputBar placeholder="nyora mubvunzo wako pano……" />
    </div>
  );
}

/* ─── TEACHER demo ───────────────────────────────────────────────────────── */
function TeacherDemo() {
  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-landing-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-landing-accent-soft flex items-center justify-center text-sm">
            📋
          </div>
          <div>
            <p className="text-xs font-bold text-landing-text">
              Quiz Generator
            </p>
            <p className="text-[10px] text-landing-text-subtle">
              Form 3 · Mathematics
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] text-landing-text-subtle bg-landing-surface-subtle border border-landing-border rounded-md px-2 py-1">
            Form 3A
          </div>
          <div className="text-[10px] text-landing-accent bg-landing-accent-soft border border-landing-accent-border rounded-md px-2 py-1 font-medium">
            24 students
          </div>
        </div>
      </div>

      {/* chat */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        <div className="flex items-start gap-2">
          <UserAvatar initials="T" size="w-7 h-7" />
          <p className="text-sm text-landing-text">
            Generate a 5-question quiz on quadratic equations for Form 3,
            difficulty: medium
          </p>
        </div>

        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-landing-text">
              Here's your quiz —{" "}
              <span className="text-landing-accent font-semibold">
                Quadratic Equations · Form 3
              </span>
            </p>
            <div className="space-y-2">
              {[
                { n: "Q1", q: "Solve x² − 5x + 6 = 0", marks: "2 marks" },
                {
                  n: "Q2",
                  q: "Find the roots of 2x² + 3x − 2 = 0",
                  marks: "3 marks",
                },
                {
                  n: "Q3",
                  q: "A rectangle has area 24 cm². Its length is (x+2) and width x. Find x.",
                  marks: "4 marks",
                },
              ].map(({ n, q, marks }) => (
                <div
                  key={n}
                  className="flex items-start gap-2 bg-landing-surface-subtle border border-landing-border rounded-lg px-3 py-2"
                >
                  <span className="text-[10px] font-bold text-landing-accent mt-0.5 w-5 flex-shrink-0">
                    {n}
                  </span>
                  <p className="text-[12px] text-landing-text flex-1">{q}</p>
                  <span className="text-[10px] text-landing-text-faint flex-shrink-0">
                    {marks}
                  </span>
                </div>
              ))}
              <p className="text-[11px] text-landing-text-subtle">
                + 2 more questions generated…
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-landing-accent text-landing-accent-foreground">
                Share with class
              </button>
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-landing-border-strong text-landing-text-muted">
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* student results strip */}
        <div className="bg-landing-surface-subtle border border-landing-border rounded-xl p-3">
          <p className="text-[11px] font-semibold text-landing-text-subtle uppercase tracking-wide mb-2">
            Recent quiz results · Form 3A
          </p>
          <div className="space-y-1.5">
            {[
              { name: "Tariro M.", score: 18, total: 20, pct: 90 },
              { name: "Munashe K.", score: 14, total: 20, pct: 70 },
              { name: "Chiedza N.", score: 11, total: 20, pct: 55 },
            ].map(({ name, score, total, pct }) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-[11px] text-landing-text-muted w-20 truncate">
                  {name}
                </span>
                <div className="flex-1 h-1.5 bg-landing-surface-hover rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct >= 75 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-landing-text-subtle w-12 text-right">
                  {score}/{total}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <InputBar placeholder="Ask me to generate a quiz, lesson plan, or report…" />
    </div>
  );
}

/* ─── PARENT demo ────────────────────────────────────────────────────────── */
function ParentDemo() {
  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-landing-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
            👨‍👩‍👧
          </div>
          <div>
            <p className="text-xs font-bold text-landing-text">
              Parent Dashboard
            </p>
            <p className="text-[10px] text-landing-text-subtle">
              Tracking: Tariro · Form 3
            </p>
          </div>
        </div>
        <div className="text-[10px] bg-landing-positive-soft text-landing-positive border border-landing-positive-border rounded-md px-2 py-1 font-medium">
          Active this week
        </div>
      </div>

      {/* chat */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        <div className="flex items-start gap-2">
          <UserAvatar initials="P" size="w-7 h-7" />
          <p className="text-sm text-landing-text">
            How is Tariro doing in her studies this week?
          </p>
        </div>

        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-landing-text">
              Tariro had a{" "}
              <span className="text-landing-positive font-semibold">
                great week
              </span>
              ! She asked 23 questions and completed 2 quizzes.
            </p>

            {/* subject progress */}
            <div className="bg-landing-surface-subtle border border-landing-border rounded-xl p-3 space-y-2">
              <p className="text-[11px] font-semibold text-landing-text-subtle uppercase tracking-wide">
                Subject progress this week
              </p>
              {[
                { subject: "Mathematics", pct: 82, trend: "↑" },
                { subject: "Combined Science", pct: 74, trend: "↑" },
                { subject: "English", pct: 61, trend: "→" },
                { subject: "Shona", pct: 90, trend: "↑" },
              ].map(({ subject, pct, trend }) => (
                <div key={subject} className="flex items-center gap-2">
                  <span className="text-[11px] text-landing-text-muted w-28 truncate">
                    {subject}
                  </span>
                  <div className="flex-1 h-1.5 bg-landing-surface-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-landing-accent" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-landing-text-subtle w-8 text-right">
                    {pct}%
                  </span>
                  <span
                    className={`text-[11px] ${trend === "↑" ? "text-landing-positive" : "text-landing-text-faint"}`}
                  >
                    {trend}
                  </span>
                </div>
              ))}
            </div>

            {/* recent activity */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-landing-text-subtle uppercase tracking-wide">
                Recent activity
              </p>
              {[
                {
                  icon: "📝",
                  text: "Completed quiz: Quadratic Equations",
                  score: "18/20",
                  time: "Today",
                },
                {
                  icon: "💬",
                  text: "Asked 8 questions in Combined Science",
                  score: null,
                  time: "Yesterday",
                },
                {
                  icon: "🏆",
                  text: "Streak: 7 days in a row!",
                  score: null,
                  time: "Streak",
                },
              ].map(({ icon, text, score, time }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 bg-landing-surface-subtle rounded-lg px-3 py-2"
                >
                  <span className="text-sm">{icon}</span>
                  <p className="text-[11px] text-landing-text-muted flex-1 leading-tight">
                    {text}
                  </p>
                  {score && (
                    <span className="text-[11px] font-bold text-landing-accent">
                      {score}
                    </span>
                  )}
                  <span className="text-[10px] text-landing-text-faint">
                    {time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <InputBar placeholder="Ask about Tariro's progress, quizzes, or study habits…" />
    </div>
  );
}

/* ─── tabbed demo container ──────────────────────────────────────────────── */
const TABS = [
  { key: "student", label: "Student", icon: "🎓" },
  { key: "teacher", label: "Teacher", icon: "📋" },
  { key: "parent", label: "Parent", icon: "👨‍👩‍👧" },
];

function DemoContainer() {
  const [active, setActive] = useState("student");

  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      {/* ambient glow */}
      <div className="absolute inset-0 -z-10 blur-3xl bg-landing-glow rounded-3xl scale-95 translate-y-4" />

      {/* tab switcher */}
      <div className="flex gap-1 mb-3 bg-landing-surface-subtle border border-landing-border rounded-xl p-1 w-fit mx-auto">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active === key
                ? "bg-landing-accent text-landing-accent-foreground shadow"
                : "text-landing-text-subtle hover:text-landing-text"
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* chrome window */}
      <div
        className="rounded-2xl border border-landing-border bg-landing-surface shadow-2xl overflow-hidden"
        style={{ height: 480 }}
      >
        {/* title bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-landing-border bg-landing-surface-muted">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 bg-landing-surface-subtle rounded-md px-3 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-landing-positive animate-pulse" />
              <span className="text-[10px] text-landing-text-faint font-mono">
                chikoro-ai.com
              </span>
            </div>
          </div>
        </div>

        {/* content — full height */}
        <div className="flex flex-col h-[calc(480px-40px)]">
          {active === "student" && <StudentDemo />}
          {active === "teacher" && <TeacherDemo />}
          {active === "parent" && <ParentDemo />}
        </div>
      </div>
    </div>
  );
}

/* ─── page data ──────────────────────────────────────────────────────────── */
const stats = [
  { value: "11+", label: "subjects covered" },
  { value: "3", label: "languages: Shona, Ndebele, English" },
  { value: "24/7", label: "always available" },
  { value: "$5/mo", label: "per student" },
];

const features = [
  {
    icon: "📚",
    title: "ZIMSEC & Cambridge aligned",
    desc: "Built around both the ZIMSEC and Cambridge syllabuses — O-Level, A-Level, and primary. Every answer matches what examiners expect.",
  },
  {
    icon: "🗣️",
    title: "Shona, Ndebele & English",
    desc: "Ask and receive answers in Shona, Ndebele, or English. Language should never be a barrier to understanding.",
  },
  {
    icon: "📄",
    title: "Upload past papers & worksheets",
    desc: "Photo your worksheet or upload a PDF — Chikoro AI reads and explains every question.",
  },
  {
    icon: "⏰",
    title: "Available 24/7",
    desc: "11 PM before an exam? Sunday morning? Chikoro AI is always there — no appointments needed.",
  },
  {
    icon: "📊",
    title: "Progress reports",
    desc: "Track which topics need more practice and share reports with parents or teachers.",
  },
  {
    icon: "📱",
    title: "Works on any device",
    desc: "Phone, tablet, or PC — no app download needed. Open the browser and start learning.",
  },
];

const steps = [
  {
    num: "01",
    title: "Create your free account",
    desc: "Sign up in under a minute. No card needed to get started.",
  },
  {
    num: "02",
    title: "Ask your question",
    desc: "Type in English, Shona, or Ndebele, or upload a past paper, worksheet, or image.",
  },
  {
    num: "03",
    title: "Get instant curriculum answers",
    desc: "Step-by-step explanations aligned to ZIMSEC or Cambridge — with exam tips included.",
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
  "Accounts",
  "Commerce",
  "Computer Science",
  "Shona",
];

const faqs = [
  {
    q: "How is this different from ChatGPT?",
    a: "ChatGPT gives answers. Chikoro AI builds understanding",
  },
  {
    q: "Can I try it for free?",
    a: "Yes — create an account and explore the platform before subscribing. No card required.",
  },
  {
    q: "How do I pay?",
    a: "You can pay via Ecocash or card. The individual plan is USD $5 per student per month.",
  },
  {
    q: "Which languages are supported?",
    a: "Chikoro AI supports Shona, Ndebele, and English — at no extra cost. Ask questions and receive full explanations in whichever language you prefer.",
  },
  {
    q: "Does it cover Cambridge as well as ZIMSEC?",
    a: "Yes — Chikoro AI is aligned to both the ZIMSEC and Cambridge syllabuses, from primary school through A-Level.",
  },
  {
    q: "How does the school plan work?",
    a: "We offer custom bulk pricing, teacher dashboards, quiz generators, and full student progress reporting. Email us and we set up schools within 24 hours.",
  },
];

/* ─── FAQ accordion ──────────────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-landing-border">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left gap-4 group"
      >
        <span className="text-sm font-semibold text-landing-text group-hover:text-landing-accent transition-colors">
          {q}
        </span>
        <span
          className={`text-landing-accent text-xl flex-shrink-0 transition-transform duration-200 leading-none ${open ? "rotate-45" : ""}`}
        >
          +
        </span>
      </button>
      {open && (
        <p className="text-sm text-landing-text-muted leading-relaxed pb-5">
          {a}
        </p>
      )}
    </div>
  );
}

/* ─── landing page ───────────────────────────────────────────────────────── */
export default function Landing() {
  return (
    <PublicSiteShell>
      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-landing-glow blur-[130px] pointer-events-none" />
        <div className="absolute top-10 right-0 w-[400px] h-[400px] rounded-full bg-landing-glow blur-[110px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-landing-accent-soft border border-landing-accent-border rounded-full px-4 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-landing-accent animate-pulse" />
              <span className="text-xs font-semibold text-landing-accent tracking-wide uppercase">
                Built for Zimbabwean learners
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.1] tracking-tight mb-6">
              Ace your{" "}
              <span className="text-landing-accent">ZIMSEC & Cambridge</span>{" "}
              exams with your own AI tutor
            </h1>

            <p className="text-lg text-landing-text-muted leading-relaxed mb-8 max-w-xl">
              Ask questions in English, Shona, or Ndebele, upload past papers,
              and get instant curriculum-aligned answers — available 24/7 for
              just{" "}
              <span className="text-landing-text font-semibold">$5/month</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-7">
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-landing-accent text-landing-accent-foreground font-bold text-sm hover:bg-landing-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-landing-accent-shadow"
              >
                Start for free <ArrowRight />
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl border border-landing-border-strong text-landing-text font-semibold text-sm hover:border-landing-accent-border-strong hover:bg-landing-surface-subtle transition-all"
              >
                See pricing
              </Link>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-landing-text-subtle">
              <span className="flex items-center gap-1.5">
                <CheckIcon /> No card needed
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon /> Pay via Ecocash
              </span>
              <span className="flex items-center gap-1.5">
                <CheckIcon /> Cancel anytime
              </span>
            </div>
          </div>

          {/* tabbed demo */}
          <div className="w-full">
            <DemoContainer />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <section className="border-y border-landing-border bg-landing-surface-subtle">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold text-landing-accent">
                {value}
              </p>
              <p className="text-xs text-landing-text-subtle mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-landing-accent uppercase tracking-widest mb-3">
            Simple to start
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-landing-text">
            How it works
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-landing-accent-border to-transparent" />
          {steps.map(({ num, title, desc }) => (
            <div
              key={num}
              className="flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 rounded-2xl border border-landing-accent-border bg-landing-accent-soft flex items-center justify-center mb-6 text-2xl font-extrabold text-landing-accent group-hover:border-landing-accent-border-strong group-hover:bg-landing-accent-soft-hover transition-all duration-300">
                {num}
              </div>
              <h3 className="text-base font-bold text-landing-text mb-2">
                {title}
              </h3>
              <p className="text-sm text-landing-text-muted leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="bg-landing-surface-subtle border-y border-landing-border">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-landing-accent uppercase tracking-widest mb-3">
              Everything you need
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-landing-text mb-4">
              Built for Zimbabwean students
            </h2>
            <p className="text-landing-text-muted max-w-xl mx-auto text-sm leading-relaxed">
              Generic AI tools don't know your syllabus. Chikoro AI is built
              from the ground up for Zimbabwe — aligned to both ZIMSEC and
              Cambridge, in three languages.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-landing-border bg-landing-surface p-6 hover:border-landing-accent-border transition-all duration-300 hover:shadow-lg hover:shadow-landing-accent-shadow"
              >
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-sm font-bold text-landing-text mb-2 group-hover:text-landing-accent transition-colors">
                  {title}
                </h3>
                <p className="text-xs text-landing-text-muted leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-xs font-semibold text-landing-accent uppercase tracking-widest mb-3">
          Full coverage
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold text-landing-text mb-4">
          Subjects covered
        </h2>
        <p className="text-landing-text-muted text-sm mb-10">
          Aligned to both ZIMSEC and Cambridge — from primary school through
          A-Level.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {subjects.map((s) => (
            <span
              key={s}
              className="px-4 py-2 rounded-full border border-landing-accent-border text-sm text-landing-accent bg-landing-accent-soft hover:bg-landing-accent-soft-hover hover:border-landing-accent-border-strong transition-all cursor-default"
            >
              {s}
            </span>
          ))}
          <span className="px-4 py-2 rounded-full border border-landing-border-strong text-sm text-landing-text-subtle cursor-default">
            + more
          </span>
        </div>
      </section>

      {/* ── FOR SCHOOLS ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-landing-accent-border bg-gradient-to-br from-landing-accent-soft to-landing-surface-subtle p-10 md:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-block bg-landing-accent-soft border border-landing-accent-border rounded-full px-3 py-1 text-xs text-landing-accent font-semibold mb-5 uppercase tracking-wide">
                For schools & teachers
              </div>
              <h2 className="text-3xl font-bold text-landing-text mb-4 leading-tight">
                Roll out Chikoro AI across your whole school
              </h2>
              <p className="text-landing-text-muted text-sm leading-relaxed mb-6">
                Custom bulk pricing, teacher dashboards, quiz generators, lesson
                planners, and full student progress reporting. We set up schools
                within 24 hours.
              </p>
              <a
                href={`mailto:${SCHOOL_EMAIL}?subject=School%20Partnership%20Enquiry%20%E2%80%94%20Chikoro%20AI`}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-landing-accent text-landing-accent font-bold text-sm hover:bg-landing-accent hover:text-landing-accent-foreground transition-all hover:scale-[1.02]"
              >
                Contact us for school pricing <ArrowRight />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: "🏫",
                  title: "Bulk student licences",
                  desc: "Custom rates based on school size",
                },
                {
                  icon: "📋",
                  title: "Teacher dashboard",
                  desc: "Class management & progress tracking",
                },
                {
                  icon: "🧪",
                  title: "Quiz generator",
                  desc: "Auto-generate assessments from your content",
                },
                {
                  icon: "📅",
                  title: "Lesson planner",
                  desc: "AI-powered lesson & scheme of work tools",
                },
              ].map(({ icon, title, desc }) => (
                <div
                  key={title}
                  className="rounded-xl border border-landing-border bg-landing-surface-subtle p-4"
                >
                  <div className="text-xl mb-2">{icon}</div>
                  <p className="text-sm font-semibold text-landing-text mb-1">
                    {title}
                  </p>
                  <p className="text-xs text-landing-text-muted leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-landing-accent uppercase tracking-widest mb-3">
            FAQ
          </p>
          <h2 className="text-3xl font-bold text-landing-text">
            Common questions
          </h2>
        </div>
        {faqs.map((item) => (
          <FaqItem key={item.q} {...item} />
        ))}
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-landing-border">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-landing-glow blur-[130px]" />
        </div>
        <div className="max-w-2xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-landing-accent-soft border border-landing-accent-border rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-landing-positive animate-pulse" />
            <span className="text-xs font-semibold text-landing-accent tracking-wide uppercase">
              Available right now
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
            Start learning{" "}
            <span className="text-landing-accent">smarter today</span>
          </h2>
          <p className="text-landing-text-muted text-lg mb-10 leading-relaxed">
            Join students across Zimbabwe using Chikoro AI to understand their
            subjects and pass their ZIMSEC exams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-landing-accent text-landing-accent-foreground font-bold text-sm hover:bg-landing-accent-hover transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-landing-accent-shadow"
            >
              Create your free account <ArrowRight />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-landing-border-strong text-landing-text font-semibold text-sm hover:border-landing-accent-border-strong hover:bg-landing-surface-subtle transition-all"
            >
              View pricing
            </Link>
          </div>
          <p className="text-xs text-landing-text-faint mt-6">
            No card needed · Ecocash accepted · Cancel anytime
          </p>
        </div>
      </section>
    </PublicSiteShell>
  );
}

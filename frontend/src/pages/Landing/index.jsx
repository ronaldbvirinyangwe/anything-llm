import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SCHOOL_EMAIL = "schools@chikoro-ai.com";

/* ─── tiny icons ─────────────────────────────────────────────────────────── */
const CheckIcon = () => (
  <svg className="w-4 h-4 text-[#75D6FF] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

/* ─── mascot avatar (standalone, no AuthContext) ─────────────────────────── */
const MascotAvatar = ({ size = "w-8 h-8" }) => (
  <div className={`${size} rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center flex-shrink-0 shadow-md`}>
    <span className="text-base select-none">🎓</span>
  </div>
);
const UserAvatar = ({ initials = "S", size = "w-8 h-8" }) => (
  <div className={`${size} rounded-full bg-[#2a2f38] flex items-center justify-center flex-shrink-0 border border-white/10`}>
    <span className="text-xs font-bold text-white/60 select-none">{initials}</span>
  </div>
);

/* ─── shared input bar ───────────────────────────────────────────────────── */
const InputBar = ({ placeholder = "Ask a question…" }) => (
  <div className="px-3 pb-3 pt-2 border-t border-white/8">
    <div className="flex items-center gap-2 bg-[#1a1f28] border border-white/10 rounded-xl px-3 py-2.5">
      <div className="flex items-center gap-2 text-white/30">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
      </div>
      <span className="text-[12px] text-white/20 flex-1 font-light">{placeholder}</span>
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-[#75D6FF]/15 border border-[#75D6FF]/25 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-[#75D6FF]" fill="currentColor" viewBox="0 0 24 24"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z" /></svg>
        </div>
        <svg className="w-4 h-4 text-white/25" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
      </div>
    </div>
  </div>
);

/* ─── STUDENT demo ───────────────────────────────────────────────────────── */
function StudentDemo() {
  return (
    <div className="flex flex-col h-full">
      {/* subject bar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-[#1a1f28] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/70 font-medium">
          Combined Science
          <svg className="w-3.5 h-3.5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        <span className="text-[11px] text-white/30 truncate">Current subject: <strong className="text-white/50">Combined Science</strong></span>

        {/* quiz notification */}
        <div className="ml-auto flex-shrink-0 flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 shadow-lg">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-400 to-green-500 flex items-center justify-center text-[10px]">🎓</div>
          <div>
            <p className="text-[10px] font-bold text-gray-800 leading-tight">New Test quiz: Sentence</p>
            <p className="text-[10px] font-bold text-gray-800 leading-tight">construction</p>
            <p className="text-[9px] text-gray-400">3/12/2026, 5:16:35 AM</p>
          </div>
          <button className="bg-blue-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg ml-1 whitespace-nowrap">Take Quiz</button>
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        {/* user: hi */}
        <div className="flex items-start gap-2">
          <UserAvatar initials="S" size="w-7 h-7" />
          <div>
            <p className="text-sm text-white/80 mt-0.5">hi</p>
          </div>
        </div>

        {/* AI: Shona greeting */}
        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1">
            <p className="text-sm text-white/80 leading-relaxed">
              Mhoro! Ndingakubatsira sei nhasi? Unoda kudzidza chimwe chinhu muBiology, English, kana Cambridge? Ndiri pano — muShona, Ndebele, kana English!
            </p>
          </div>
        </div>

        {/* user: question */}
        <div className="flex items-start gap-2">
          <UserAvatar initials="S" size="w-7 h-7" />
          <div>
            <p className="text-sm text-white/80 mt-0.5">What is covered in this subject</p>
          </div>
        </div>

        {/* AI: table response */}
        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white/80 font-semibold mb-2">Combined Science (ZIMSEC / Cambridge – Form 1)</p>
            <div className="rounded-xl overflow-hidden border border-white/10 text-[11px]">
              <div className="grid grid-cols-3 bg-white/8 px-2 py-1.5 font-semibold text-white/50 uppercase tracking-wide">
                <span>Topic</span>
                <span>What You'll Learn</span>
                <span>Zimbabwean Example</span>
              </div>
              {[
                ["1. Living Things", "What makes something alive", "Plants in the schoolyard"],
                ["2. Body Parts", "Main body parts & functions", "How the heart pumps blood"],
                ["3. Food & Nutrition", "Types of food, nutrients", "Maize porridge, beans"],
                ["4. Water & Life", "Why water is essential", "Water in a farm pond"],
              ].map(([topic, learn, example]) => (
                <div key={topic} className="grid grid-cols-3 px-2 py-1.5 border-t border-white/8 text-white/60 hover:bg-white/4 transition-colors">
                  <span className="font-medium text-white/80">{topic}</span>
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#75D6FF]/15 flex items-center justify-center text-sm">📋</div>
          <div>
            <p className="text-xs font-bold text-white">Quiz Generator</p>
            <p className="text-[10px] text-white/40">Form 3 · Mathematics</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="text-[10px] text-white/40 bg-white/5 border border-white/10 rounded-md px-2 py-1">Form 3A</div>
          <div className="text-[10px] text-[#75D6FF] bg-[#75D6FF]/10 border border-[#75D6FF]/25 rounded-md px-2 py-1 font-medium">24 students</div>
        </div>
      </div>

      {/* chat */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        <div className="flex items-start gap-2">
          <UserAvatar initials="T" size="w-7 h-7" />
          <p className="text-sm text-white/80">Generate a 5-question quiz on quadratic equations for Form 3, difficulty: medium</p>
        </div>

        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1 space-y-2">
            <p className="text-sm text-white/80">Here's your quiz — <span className="text-[#75D6FF] font-semibold">Quadratic Equations · Form 3</span></p>
            <div className="space-y-2">
              {[
                { n: "Q1", q: "Solve x² − 5x + 6 = 0", marks: "2 marks" },
                { n: "Q2", q: "Find the roots of 2x² + 3x − 2 = 0", marks: "3 marks" },
                { n: "Q3", q: "A rectangle has area 24 cm². Its length is (x+2) and width x. Find x.", marks: "4 marks" },
              ].map(({ n, q, marks }) => (
                <div key={n} className="flex items-start gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-2">
                  <span className="text-[10px] font-bold text-[#75D6FF] mt-0.5 w-5 flex-shrink-0">{n}</span>
                  <p className="text-[12px] text-white/75 flex-1">{q}</p>
                  <span className="text-[10px] text-white/30 flex-shrink-0">{marks}</span>
                </div>
              ))}
              <p className="text-[11px] text-white/35">+ 2 more questions generated…</p>
            </div>
            <div className="flex gap-2 mt-1">
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-[#75D6FF] text-gray-900">Share with class</button>
              <button className="text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-white/15 text-white/60">Export PDF</button>
            </div>
          </div>
        </div>

        {/* student results strip */}
        <div className="bg-white/4 border border-white/8 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide mb-2">Recent quiz results · Form 3A</p>
          <div className="space-y-1.5">
            {[
              { name: "Tariro M.", score: 18, total: 20, pct: 90 },
              { name: "Munashe K.", score: 14, total: 20, pct: 70 },
              { name: "Chiedza N.", score: 11, total: 20, pct: 55 },
            ].map(({ name, score, total, pct }) => (
              <div key={name} className="flex items-center gap-2">
                <span className="text-[11px] text-white/60 w-20 truncate">{name}</span>
                <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${pct >= 75 ? "bg-green-400" : pct >= 50 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[11px] text-white/40 w-12 text-right">{score}/{total}</span>
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
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/8 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">👨‍👩‍👧</div>
          <div>
            <p className="text-xs font-bold text-white">Parent Dashboard</p>
            <p className="text-[10px] text-white/40">Tracking: Tariro · Form 3</p>
          </div>
        </div>
        <div className="text-[10px] bg-green-500/15 text-green-400 border border-green-500/25 rounded-md px-2 py-1 font-medium">Active this week</div>
      </div>

      {/* chat */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 min-h-0">
        <div className="flex items-start gap-2">
          <UserAvatar initials="P" size="w-7 h-7" />
          <p className="text-sm text-white/80">How is Tariro doing in her studies this week?</p>
        </div>

        <div className="flex items-start gap-2">
          <MascotAvatar size="w-7 h-7" />
          <div className="flex-1 space-y-3">
            <p className="text-sm text-white/80">
              Tariro had a <span className="text-green-400 font-semibold">great week</span>! She asked 23 questions and completed 2 quizzes.
            </p>

            {/* subject progress */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-3 space-y-2">
              <p className="text-[11px] font-semibold text-white/50 uppercase tracking-wide">Subject progress this week</p>
              {[
                { subject: "Mathematics", pct: 82, trend: "↑" },
                { subject: "Combined Science", pct: 74, trend: "↑" },
                { subject: "English", pct: 61, trend: "→" },
                { subject: "Shona", pct: 90, trend: "↑" },
              ].map(({ subject, pct, trend }) => (
                <div key={subject} className="flex items-center gap-2">
                  <span className="text-[11px] text-white/60 w-28 truncate">{subject}</span>
                  <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct >= 75 ? "bg-[#75D6FF]" : pct >= 60 ? "bg-yellow-400" : "bg-red-400"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-bold text-white/50 w-8 text-right">{pct}%</span>
                  <span className={`text-[11px] ${trend === "↑" ? "text-green-400" : "text-white/30"}`}>{trend}</span>
                </div>
              ))}
            </div>

            {/* recent activity */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide">Recent activity</p>
              {[
                { icon: "📝", text: "Completed quiz: Quadratic Equations", score: "18/20", time: "Today" },
                { icon: "💬", text: "Asked 8 questions in Combined Science", score: null, time: "Yesterday" },
                { icon: "🏆", text: "Streak: 7 days in a row!", score: null, time: "Streak" },
              ].map(({ icon, text, score, time }) => (
                <div key={text} className="flex items-center gap-2 bg-white/4 rounded-lg px-3 py-2">
                  <span className="text-sm">{icon}</span>
                  <p className="text-[11px] text-white/65 flex-1 leading-tight">{text}</p>
                  {score && <span className="text-[11px] font-bold text-[#75D6FF]">{score}</span>}
                  <span className="text-[10px] text-white/25">{time}</span>
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
  { key: "parent",  label: "Parent",  icon: "👨‍👩‍👧" },
];

function DemoContainer() {
  const [active, setActive] = useState("student");

  return (
    <div className="relative w-full max-w-[560px] mx-auto">
      {/* ambient glow */}
      <div className="absolute inset-0 -z-10 blur-3xl opacity-25 bg-gradient-to-br from-[#75D6FF] via-blue-500 to-purple-600 rounded-3xl scale-95 translate-y-4" />

      {/* tab switcher */}
      <div className="flex gap-1 mb-3 bg-white/5 border border-white/10 rounded-xl p-1 w-fit mx-auto">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              active === key
                ? "bg-[#75D6FF] text-gray-900 shadow"
                : "text-white/50 hover:text-white"
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* chrome window */}
      <div className="rounded-2xl border border-white/10 bg-[#0d1117] shadow-2xl overflow-hidden" style={{ height: 480 }}>
        {/* title bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-white/8 bg-[#080c10]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-1.5 bg-white/5 rounded-md px-3 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[10px] text-white/30 font-mono">chikoro-ai.com</span>
            </div>
          </div>
        </div>

        {/* content — full height */}
        <div className="flex flex-col h-[calc(480px-40px)]">
          {active === "student" && <StudentDemo />}
          {active === "teacher" && <TeacherDemo />}
          {active === "parent"  && <ParentDemo />}
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
  { icon: "📚", title: "ZIMSEC & Cambridge aligned", desc: "Built around both the ZIMSEC and Cambridge syllabuses — O-Level, A-Level, and primary. Every answer matches what examiners expect." },
  { icon: "🗣️", title: "Shona, Ndebele & English", desc: "Ask and receive answers in Shona, Ndebele, or English. Language should never be a barrier to understanding." },
  { icon: "📄", title: "Upload past papers & worksheets", desc: "Photo your worksheet or upload a PDF — Chikoro AI reads and explains every question." },
  { icon: "⏰", title: "Available 24/7", desc: "11 PM before an exam? Sunday morning? Chikoro AI is always there — no appointments needed." },
  { icon: "📊", title: "Progress reports", desc: "Track which topics need more practice and share reports with parents or teachers." },
  { icon: "📱", title: "Works on any device", desc: "Phone, tablet, or PC — no app download needed. Open the browser and start learning." },
];

const steps = [
  { num: "01", title: "Create your free account", desc: "Sign up in under a minute. No card needed to get started." },
  { num: "02", title: "Ask your question", desc: "Type in English, Shona, or Ndebele, or upload a past paper, worksheet, or image." },
  { num: "03", title: "Get instant curriculum answers", desc: "Step-by-step explanations aligned to ZIMSEC or Cambridge — with exam tips included." },
];

const subjects = [
  "Mathematics", "English Language", "Combined Science", "Physics",
  "Chemistry", "Biology", "Geography", "History",
  "Accounts", "Commerce", "Computer Science", "Shona",
];

const faqs = [
  { q: "How is this different from ChatGPT?", a: "ChatGPT gives answers. Chikoro AI builds understanding" },
  { q: "Can I try it for free?", a: "Yes — create an account and explore the platform before subscribing. No card required." },
  { q: "How do I pay?", a: "You can pay via Ecocash or card. The individual plan is USD $5 per student per month." },
  { q: "Which languages are supported?", a: "Chikoro AI supports Shona, Ndebele, and English — at no extra cost. Ask questions and receive full explanations in whichever language you prefer." },
  { q: "Does it cover Cambridge as well as ZIMSEC?", a: "Yes — Chikoro AI is aligned to both the ZIMSEC and Cambridge syllabuses, from primary school through A-Level." },
  { q: "How does the school plan work?", a: "We offer custom bulk pricing, teacher dashboards, quiz generators, and full student progress reporting. Email us and we set up schools within 24 hours." },
];

/* ─── FAQ accordion ──────────────────────────────────────────────────────── */
function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-5 text-left gap-4 group">
        <span className="text-sm font-semibold text-white group-hover:text-[#75D6FF] transition-colors">{q}</span>
        <span className={`text-[#75D6FF] text-xl flex-shrink-0 transition-transform duration-200 leading-none ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && <p className="text-sm text-white/55 leading-relaxed pb-5">{a}</p>}
    </div>
  );
}

/* ─── landing page ───────────────────────────────────────────────────────── */
export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080c10] text-white antialiased">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080c10]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="text-xl font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent">
            Chikoro AI
          </button>
          <div className="hidden md:flex items-center gap-6">
            <button onClick={() => navigate("/about")} className="text-sm text-white/50 hover:text-white transition-colors">About</button>
            <button onClick={() => navigate("/pricing")} className="text-sm text-white/50 hover:text-white transition-colors">Pricing</button>
            <button onClick={() => navigate("/blog")} className="text-sm text-white/50 hover:text-white transition-colors">Blog</button>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/login")} className="text-sm text-white/55 hover:text-white transition-colors hidden sm:block">Log in</button>
            <button onClick={() => navigate("/register")}
              className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#75D6FF] text-gray-900 hover:bg-white transition-colors">
              Get started free
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-[#75D6FF]/7 blur-[130px] pointer-events-none" />
        <div className="absolute top-10 right-0 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-[110px] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-6 pt-16 pb-20 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* copy */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#75D6FF]/10 border border-[#75D6FF]/25 rounded-full px-4 py-1.5 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-[#75D6FF] animate-pulse" />
              <span className="text-xs font-semibold text-[#75D6FF] tracking-wide uppercase">Zimbabwe's #1 AI Tutor</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold leading-[1.1] tracking-tight mb-6">
              Ace your{" "}
              <span className="bg-gradient-to-r from-[#75D6FF] via-sky-300 to-blue-400 bg-clip-text text-transparent">
                ZIMSEC & Cambridge
              </span>{" "}
              exams with your own AI tutor
            </h1>

            <p className="text-lg text-white/50 leading-relaxed mb-8 max-w-xl">
              Ask questions in English, Shona, or Ndebele, upload past papers, and get instant
              curriculum-aligned answers — available 24/7 for just{" "}
              <span className="text-white font-semibold">$5/month</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-7">
              <button onClick={() => navigate("/register")}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[#75D6FF] text-gray-900 font-bold text-sm hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#75D6FF]/20">
                Start for free <ArrowRight />
              </button>
              <button onClick={() => navigate("/pricing")}
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl border border-white/15 text-white font-semibold text-sm hover:border-[#75D6FF]/50 hover:bg-white/5 transition-all">
                See pricing
              </button>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/35">
              <span className="flex items-center gap-1.5"><CheckIcon /> No card needed</span>
              <span className="flex items-center gap-1.5"><CheckIcon /> Pay via Ecocash</span>
              <span className="flex items-center gap-1.5"><CheckIcon /> Cancel anytime</span>
            </div>
          </div>

          {/* tabbed demo */}
          <div className="w-full">
            <DemoContainer />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ───────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06] bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-[#75D6FF] to-sky-300 bg-clip-text text-transparent">{value}</p>
              <p className="text-xs text-white/35 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <p className="text-xs font-semibold text-[#75D6FF] uppercase tracking-widest mb-3">Simple to start</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white">How it works</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-10 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px bg-gradient-to-r from-transparent via-[#75D6FF]/25 to-transparent" />
          {steps.map(({ num, title, desc }) => (
            <div key={num} className="flex flex-col items-center text-center group">
              <div className="w-16 h-16 rounded-2xl border border-[#75D6FF]/30 bg-[#75D6FF]/8 flex items-center justify-center mb-6 text-2xl font-extrabold text-[#75D6FF] group-hover:border-[#75D6FF]/60 group-hover:bg-[#75D6FF]/15 transition-all duration-300">
                {num}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="bg-white/[0.02] border-y border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-[#75D6FF] uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Built for Zimbabwean students</h2>
            <p className="text-white/45 max-w-xl mx-auto text-sm leading-relaxed">
              Generic AI tools don't know your syllabus. Chikoro AI is built from the ground up for Zimbabwe — aligned to both ZIMSEC and Cambridge, in three languages.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon, title, desc }) => (
              <div key={title}
                className="group rounded-2xl border border-white/8 bg-[#0d1117] p-6 hover:border-[#75D6FF]/30 transition-all duration-300 hover:shadow-lg hover:shadow-[#75D6FF]/5">
                <div className="text-3xl mb-4">{icon}</div>
                <h3 className="text-sm font-bold text-white mb-2 group-hover:text-[#75D6FF] transition-colors">{title}</h3>
                <p className="text-xs text-white/45 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUBJECTS ────────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <p className="text-xs font-semibold text-[#75D6FF] uppercase tracking-widest mb-3">Full coverage</p>
        <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Subjects covered</h2>
        <p className="text-white/45 text-sm mb-10">Aligned to both ZIMSEC and Cambridge — from primary school through A-Level.</p>
        <div className="flex flex-wrap justify-center gap-3">
          {subjects.map((s) => (
            <span key={s}
              className="px-4 py-2 rounded-full border border-[#75D6FF]/25 text-sm text-[#75D6FF] bg-[#75D6FF]/5 hover:bg-[#75D6FF]/10 hover:border-[#75D6FF]/50 transition-all cursor-default">
              {s}
            </span>
          ))}
          <span className="px-4 py-2 rounded-full border border-white/15 text-sm text-white/35 cursor-default">+ more</span>
        </div>
      </section>

      {/* ── FOR SCHOOLS ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-3xl border border-[#75D6FF]/20 bg-gradient-to-br from-[#75D6FF]/8 to-blue-600/5 p-10 md:p-14">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-block bg-[#75D6FF]/15 border border-[#75D6FF]/30 rounded-full px-3 py-1 text-xs text-[#75D6FF] font-semibold mb-5 uppercase tracking-wide">
                For schools & teachers
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                Roll out Chikoro AI across your whole school
              </h2>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                Custom bulk pricing, teacher dashboards, quiz generators, lesson planners,
                and full student progress reporting. We set up schools within 24 hours.
              </p>
              <a href={`mailto:${SCHOOL_EMAIL}?subject=School%20Partnership%20Enquiry%20%E2%80%94%20Chikoro%20AI`}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-[#75D6FF] text-[#75D6FF] font-bold text-sm hover:bg-[#75D6FF] hover:text-gray-900 transition-all hover:scale-[1.02]">
                Contact us for school pricing <ArrowRight />
              </a>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: "🏫", title: "Bulk student licences", desc: "Custom rates based on school size" },
                { icon: "📋", title: "Teacher dashboard", desc: "Class management & progress tracking" },
                { icon: "🧪", title: "Quiz generator", desc: "Auto-generate assessments from your content" },
                { icon: "📅", title: "Lesson planner", desc: "AI-powered lesson & scheme of work tools" },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xl mb-2">{icon}</div>
                  <p className="text-sm font-semibold text-white mb-1">{title}</p>
                  <p className="text-xs text-white/40 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-[#75D6FF] uppercase tracking-widest mb-3">FAQ</p>
          <h2 className="text-3xl font-bold text-white">Common questions</h2>
        </div>
        {faqs.map((item) => <FaqItem key={item.q} {...item} />)}
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-white/[0.06]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full bg-[#75D6FF]/7 blur-[130px]" />
        </div>
        <div className="max-w-2xl mx-auto px-6 py-28 text-center">
          <div className="inline-flex items-center gap-2 bg-[#75D6FF]/10 border border-[#75D6FF]/25 rounded-full px-4 py-1.5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs font-semibold text-[#75D6FF] tracking-wide uppercase">Available right now</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-5">
            Start learning{" "}
            <span className="bg-gradient-to-r from-[#75D6FF] to-sky-300 bg-clip-text text-transparent">smarter today</span>
          </h2>
          <p className="text-white/45 text-lg mb-10 leading-relaxed">
            Join students across Zimbabwe using Chikoro AI to understand their subjects and pass their ZIMSEC exams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => navigate("/register")}
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#75D6FF] text-gray-900 font-bold text-sm hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-[#75D6FF]/20">
              Create your free account <ArrowRight />
            </button>
            <button onClick={() => navigate("/pricing")}
              className="inline-flex items-center justify-center px-8 py-4 rounded-xl border border-white/15 text-white font-semibold text-sm hover:border-[#75D6FF]/50 hover:bg-white/5 transition-all">
              View pricing
            </button>
          </div>
          <p className="text-xs text-white/25 mt-6">No card needed · Ecocash accepted · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] bg-[#060a0d]">
        <div className="max-w-6xl mx-auto px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div className="lg:col-span-2">
            <p className="text-xl font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-3">Chikoro AI</p>
            <p className="text-sm text-white/35 leading-relaxed max-w-xs">
              Zimbabwe's first AI tutor — aligned to ZIMSEC & Cambridge, in English, Shona, and Ndebele.
            </p>
            <p className="text-xs text-white/20 mt-4"><em>Chikoro</em> means "school" in Shona.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Product</p>
            <ul className="space-y-3">
              {[{l:"Pricing",p:"/pricing"},{l:"About",p:"/about"},{l:"Blog",p:"/blog"}].map(({l,p})=>(
                <li key={l}><button onClick={()=>navigate(p)} className="text-sm text-white/35 hover:text-white transition-colors">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Account</p>
            <ul className="space-y-3">
              {[{l:"Sign up free",p:"/register"},{l:"Log in",p:"/login"},{l:"Schools & teachers",p:"/about"}].map(({l,p})=>(
                <li key={l}><button onClick={()=>navigate(p)} className="text-sm text-white/35 hover:text-white transition-colors">{l}</button></li>
              ))}
              <li><a href={`mailto:${SCHOOL_EMAIL}`} className="text-sm text-white/35 hover:text-white transition-colors">Contact us</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-6 py-6">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-white/20">&copy; {new Date().getFullYear()} Chikoro AI &mdash; Zimbabwe&apos;s AI Tutor</p>
            <a href={`mailto:${SCHOOL_EMAIL}`} className="text-xs text-white/20 hover:text-white/50 transition-colors">{SCHOOL_EMAIL}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SEO = {
  title: "How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide | Chikoro AI",
  description:
    "A practical, Zimbabwe-specific guide to passing ZIMSEC O-Level Maths (4004/4008). Covers syllabus, past papers, exam technique, timed revision, and common mistakes.",
  canonical: "https://chikoro-ai.com/blog/how-to-pass-zimsec-o-level-maths",
  publishedDate: "2026-03-17",
  keywords:
    "how to pass ZIMSEC O-Level Maths, ZIMSEC maths study guide, ZIMSEC 4004 4008, Zimbabwe O-Level maths revision, ZIMSEC past papers maths",
};

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
  const navigate = useNavigate();

  useEffect(() => {
    document.title = SEO.title;
    const setMeta = (name, content, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel);
      if (!el) { el = document.createElement("meta"); prop ? el.setAttribute("property", name) : el.setAttribute("name", name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) { el = document.createElement("link"); el.setAttribute("rel", rel); document.head.appendChild(el); }
      el.setAttribute("href", href);
    };
    setMeta("description", SEO.description);
    setMeta("keywords", SEO.keywords);
    setMeta("og:title", SEO.title, true);
    setMeta("og:description", SEO.description, true);
    setMeta("og:url", SEO.canonical, true);
    setMeta("og:type", "article", true);
    setMeta("article:published_time", SEO.publishedDate, true);
    setMeta("twitter:title", SEO.title, true);
    setMeta("twitter:description", SEO.description, true);
    setLink("canonical", SEO.canonical);

    // Article JSON-LD
    let ld = document.getElementById("ld-article");
    if (!ld) { ld = document.createElement("script"); ld.id = "ld-article"; ld.type = "application/ld+json"; document.head.appendChild(ld); }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": "How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide",
      "description": SEO.description,
      "datePublished": SEO.publishedDate,
      "dateModified": SEO.publishedDate,
      "url": SEO.canonical,
      "publisher": { "@type": "Organization", "name": "Chikoro AI", "url": "https://chikoro-ai.com" },
      "author": { "@type": "Organization", "name": "Chikoro AI" },
      "inLanguage": "en-ZW",
      "about": { "@type": "Thing", "name": "ZIMSEC O-Level Mathematics" }
    });

    return () => {
      document.title = "Chikoro AI — AI Homework Help & Tutor for Zimbabwe Students";
      document.getElementById("ld-article")?.remove();
    };
  }, []);

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
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/blog")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Blog</button>
          <button onClick={() => navigate("/pricing")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Pricing</button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#75D6FF] text-gray-900 hover:bg-white transition-colors"
          >
            Get started free
          </button>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 pt-12 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-theme-text-secondary mb-8">
          <button onClick={() => navigate("/blog")} className="hover:text-white transition-colors">Blog</button>
          <span>/</span>
          <span className="text-white">How to Pass ZIMSEC O-Level Maths</span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#75D6FF]/10 text-[#75D6FF] border border-[#75D6FF]/30">
            Study Tips
          </span>
          <span className="text-xs text-theme-text-secondary">17 March 2026</span>
          <span className="text-xs text-theme-text-secondary">&bull; 8 min read</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
          How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide
        </h1>

        {/* Intro */}
        <p className="text-theme-text-secondary leading-relaxed mb-4">
          ZIMSEC O-Level Mathematics is one of the most important subjects on your certificate — and
          one of the most feared. A C or better in Maths is required for most tertiary programmes and
          many jobs. Yet thousands of students sit the exam every year underprepared, not because
          they are not intelligent, but because they studied the wrong way.
        </p>
        <p className="text-theme-text-secondary leading-relaxed mb-4">
          This guide covers exactly what you need to do — from now until exam day — to pass O-Level
          Maths with confidence. It does not matter whether you are starting from scratch or polishing
          an already-solid foundation. Follow these steps and you will give yourself the best possible
          chance.
        </p>

        {/* Quick tip box */}
        <div className="rounded-xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-5 mb-10">
          <p className="text-sm text-[#75D6FF] font-semibold mb-1">Before you start</p>
          <p className="text-sm text-theme-text-secondary leading-relaxed">
            Get a copy of the ZIMSEC O-Level Maths syllabus (4004/4008) and a pack of past papers.
            Everything in this guide assumes you have both. If you do not have them, ask your teacher
            or use Chikoro AI to get a full topic list instantly.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map(({ heading, body }) => (
            <div key={heading}>
              <h2 className="text-xl font-bold text-white mb-4">{heading}</h2>
              <div className="space-y-3">
                {body.map((para, i) => (
                  <p key={i} className="text-theme-text-secondary leading-relaxed text-sm">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Grade breakdown box */}
        <div className="mt-12 mb-10 rounded-xl border border-white/10 bg-theme-bg-secondary overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-base font-bold text-white">ZIMSEC O-Level Maths grade boundaries (approximate)</h2>
          </div>
          <div className="divide-y divide-white/10">
            {[
              { grade: "A", range: "75 – 100%", label: "Distinction" },
              { grade: "B", range: "60 – 74%", label: "Merit" },
              { grade: "C", range: "50 – 59%", label: "Credit (pass for tertiary entry)" },
              { grade: "D", range: "40 – 49%", label: "Pass" },
              { grade: "E", range: "30 – 39%", label: "Pass (limited recognition)" },
              { grade: "U", range: "Below 30%", label: "Ungraded" },
            ].map(({ grade, range, label }) => (
              <div key={grade} className="flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-4">
                  <span className={`text-lg font-extrabold w-6 text-center ${grade === "A" || grade === "B" || grade === "C" ? "text-[#75D6FF]" : "text-white/40"}`}>
                    {grade}
                  </span>
                  <span className="text-sm text-theme-text-secondary">{label}</span>
                </div>
                <span className="text-sm font-semibold text-white">{range}</span>
              </div>
            ))}
          </div>
          <div className="px-6 py-3 bg-white/[0.02]">
            <p className="text-xs text-white/40">Grade boundaries vary slightly per year. A grade C or above is the standard requirement for most tertiary programmes.</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Summary: what to do this week</h2>
          <ul className="space-y-3">
            {[
              "Download the ZIMSEC O-Level Maths syllabus and list every topic",
              "Identify your three weakest topics and start there",
              "Set a 45-minute study session for every weekday",
              "Do one timed past paper section this weekend",
              "Use Chikoro AI to get instant explanations for any topic you do not understand",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-theme-text-secondary">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#75D6FF]/20 text-[#75D6FF] text-xs flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Get instant Maths help with Chikoro AI</h2>
          <p className="text-sm text-theme-text-secondary mb-6 max-w-md mx-auto">
            Ask any ZIMSEC O-Level Maths question and get a step-by-step explanation in English, Shona, or Ndebele.
            Upload a past paper or worksheet and get it explained instantly — 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-3 rounded-xl bg-[#75D6FF] text-gray-900 font-bold hover:bg-white transition-colors text-sm"
            >
              Start for free — no card needed
            </button>
            <button
              onClick={() => navigate("/pricing")}
              className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:border-[#75D6FF] transition-colors text-sm"
            >
              See pricing
            </button>
          </div>
        </div>
      </article>

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
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} Chikoro AI &mdash; Zimbabwe&apos;s AI Tutor</p>
        </div>
      </footer>
    </div>
  );
}

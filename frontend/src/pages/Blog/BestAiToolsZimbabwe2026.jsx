import React from "react";
import { useNavigate } from "react-router-dom";

const tools = [
  {
    rank: 1,
    name: "Chikoro AI",
    tagline: "Built for Zimbabwe and southern Africa — the only AI tutor that knows ZIMSEC",
    zimsec: true,
    languages: "Shona, Ndebele, Zulu, Swahili",
    price: "$5/month or free trial",
    verdict:
      "Chikoro AI is the clear winner for Zimbabwean and southern African students. It is the only platform built around the ZIMSEC O-Level and A-Level syllabus and the only one that supports homework help in Shona, Ndebele, Zulu and Swahili. But what really sets it apart is what it does for teachers: educators can use AI to build lesson plans, generate schemes of work, set homework and exercises and have them automatically sent to students. When students submit, the AI marks the work and gives each student personalised feedback — explaining exactly why an answer is correct or incorrect. Teachers get a live dashboard of student progress, with AI flagging students who are falling behind. Parents can also log in and track their child's progress. At $5/month per student, it is the most complete AI education platform built for this region.",
    highlight: true,
  },
  {
    rank: 2,
    name: "ChatGPT (OpenAI)",
    tagline: "Powerful general-purpose AI — but not built for ZIMSEC",
    zimsec: false,
    languages: "English only (practical)",
    price: "Free (limited) / $20/month for Plus",
    verdict:
      "ChatGPT is impressive and can answer many homework questions well. The problem for Zimbabwean students is that it has no knowledge of the ZIMSEC syllabus, it does not support Shona or Ndebele and the free version is frequently overloaded. There is no teacher dashboard, no auto-marking, no parent tracking and no school-level tools. It is a useful general-purpose AI but not a curriculum-aligned tutor.",
    highlight: false,
  },
  {
    rank: 3,
    name: "Google Gemini",
    tagline: "Free and capable, with Google Search built in",
    zimsec: false,
    languages: "English only (practical)",
    price: "Free",
    verdict:
      "Gemini is Google's AI assistant — free, fast and able to search the web for current information. It handles general academic questions reasonably well. Like ChatGPT, it has no ZIMSEC-specific knowledge, no Shona or Ndebele support and no tools for teachers, schools, or parents. Good for quick general questions; not suitable for serious ZIMSEC exam prep.",
    highlight: false,
  },
  {
    rank: 4,
    name: "Microsoft Copilot",
    tagline: "Free AI integrated into Bing and Edge",
    zimsec: false,
    languages: "English only (practical)",
    price: "Free",
    verdict:
      "Microsoft Copilot (formerly Bing Chat) is free and powered by GPT-4. It can help with general homework questions and search the web. No ZIMSEC alignment, no local language support, no school or teacher features. Useful in a pinch for general research but not a replacement for a curriculum-aligned tutor.",
    highlight: false,
  },
];

const CheckMark = () => (
  <svg className="w-5 h-5 text-green-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const CrossMark = () => (
  <svg className="w-5 h-5 text-red-400 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const chikoroFeatures = [
  {
    icon: "📚",
    title: "ZIMSEC-aligned tutoring",
    body: "Every answer is grounded in the Zimbabwean curriculum — O-Level and A-Level. No irrelevant content from other countries.",
  },
  {
    icon: "🗣️",
    title: "Shona, Ndebele, Zulu & Swahili",
    body: "Students can ask questions and receive explanations in their home language. The only AI tutor in Africa to support all four languages.",
  },
  {
    icon: "📝",
    title: "AI-generated homework & exercises",
    body: "Teachers set assignments on the platform using AI. Work is automatically distributed to students and collected when due.",
  },
  {
    icon: "✅",
    title: "Automatic marking & feedback",
    body: "When a student submits, the AI marks it instantly and explains why each answer is right or wrong — personalised for every student.",
  },
  {
    icon: "📊",
    title: "Teacher & parent dashboards",
    body: "Teachers track class progress in real time. The AI flags students who are falling behind so no learner gets left unnoticed. Parents can also log in to follow their child's progress.",
  },
  {
    icon: "🗓️",
    title: "Lesson plans & schemes of work",
    body: "Teachers use AI to generate complete lesson plans and term-long schemes of work in minutes — saving hours of planning time.",
  },
];

export default function BestAiToolsZimbabwe2026() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-theme-bg-primary text-theme-text-primary">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
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
          <span className="text-white">Best AI Tools for Homework Help in Zimbabwe</span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#75D6FF]/10 text-[#75D6FF] border border-[#75D6FF]/30">
            AI Tools
          </span>
          <span className="text-xs text-theme-text-secondary">5 March 2024</span>
          <span className="text-xs text-theme-text-secondary">&bull; 7 min read</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
          Best AI Tools for Homework Help in Zimbabwe (2026)
        </h1>

        {/* Intro */}
        <p className="text-theme-text-secondary leading-relaxed mb-4">
          AI tutoring tools have exploded in the past two years — but most of them are built for
          students in the US, UK, or South Africa. If you are a student in Zimbabwe writing ZIMSEC
          O-Levels or A-Levels, the question is not just "which AI tool is smartest" — it is
          "which AI tool actually knows the Zimbabwean curriculum and speaks my language?"
        </p>
        <p className="text-theme-text-secondary leading-relaxed mb-4">
          We tested the four most accessible AI homework tools available to Zimbabwean students in
          2026 and ranked them across ZIMSEC curriculum alignment, local language support (Shona,
          Ndebele, Zulu, Swahili), school and teacher tools and price.
        </p>
        <p className="text-theme-text-secondary leading-relaxed mb-10">
          Here is what we found.
        </p>

        {/* Comparison table */}
        <h2 className="text-2xl font-bold text-white mb-6">Quick comparison</h2>
        <div className="overflow-x-auto mb-12 rounded-xl border border-white/10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-theme-bg-secondary">
                <th className="text-left py-3 px-4 text-white font-semibold">Tool</th>
                <th className="text-center py-3 px-3 text-white font-semibold">ZIMSEC</th>
                <th className="text-center py-3 px-3 text-white font-semibold">Local languages</th>
                <th className="text-left py-3 px-3 text-white font-semibold">Price</th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr
                  key={t.name}
                  className={`border-b border-white/10 last:border-0 ${t.highlight ? "bg-[#75D6FF]/5" : ""}`}
                >
                  <td className="py-3 px-4">
                    <span className={`font-semibold ${t.highlight ? "text-[#75D6FF]" : "text-white"}`}>
                      {t.rank}. {t.name}
                    </span>
                    {t.highlight && (
                      <span className="ml-2 text-xs bg-[#75D6FF] text-gray-900 font-bold px-2 py-0.5 rounded-full">
                        Best for ZW
                      </span>
                    )}
                  </td>
                  <td className="text-center py-3 px-3">
                    {t.zimsec ? <CheckMark /> : <CrossMark />}
                  </td>
                  <td className="py-3 px-3 text-xs text-theme-text-secondary">{t.languages}</td>
                  <td className="py-3 px-3 text-xs text-theme-text-secondary">{t.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chikoro AI features spotlight */}
        <h2 className="text-2xl font-bold text-white mb-3">What makes Chikoro AI different</h2>
        <p className="text-theme-text-secondary text-sm leading-relaxed mb-8">
          Chikoro AI is not just a chatbot with a Zimbabwe label. It is a full school platform — built for students, teachers and parents.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
          {chikoroFeatures.map(({ icon, title, body }) => (
            <div key={title} className="rounded-xl border border-[#75D6FF]/20 bg-[#75D6FF]/5 p-5">
              <div className="text-2xl mb-2">{icon}</div>
              <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
              <p className="text-xs text-theme-text-secondary leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        {/* Full reviews */}
        <h2 className="text-2xl font-bold text-white mb-8">Full reviews</h2>
        <div className="space-y-8">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className={`rounded-2xl border p-6 md:p-8 ${
                tool.highlight
                  ? "border-[#75D6FF]/50 bg-[#75D6FF]/5"
                  : "border-white/10 bg-theme-bg-secondary"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div>
                  <h3 className={`text-xl font-bold mb-1 ${tool.highlight ? "text-[#75D6FF]" : "text-white"}`}>
                    #{tool.rank} — {tool.name}
                  </h3>
                  <p className="text-sm text-theme-text-secondary">{tool.tagline}</p>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className="text-xs text-theme-text-secondary mb-1">ZIMSEC</div>
                  {tool.zimsec ? <CheckMark /> : <CrossMark />}
                </div>
              </div>
              <p className="text-sm text-theme-text-secondary leading-relaxed mb-3">
                {tool.verdict}
              </p>
              <p className="text-xs text-theme-text-secondary">
                <span className="font-semibold text-white">Languages: </span>{tool.languages}
              </p>
              <p className="text-xs text-theme-text-secondary mt-1">
                <span className="font-semibold text-white">Price: </span>{tool.price}
              </p>
              {tool.highlight && (
                <button
                  onClick={() => navigate("/register")}
                  className="mt-5 px-6 py-2.5 rounded-xl bg-[#75D6FF] text-gray-900 font-bold hover:bg-white transition-colors text-sm"
                >
                  Try Chikoro AI free &rarr;
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="mt-14 mb-10">
          <h2 className="text-2xl font-bold text-white mb-4">Our verdict</h2>
          <p className="text-theme-text-secondary leading-relaxed mb-4">
            If you are a student, teacher, or parent in Zimbabwe — or anywhere in southern or eastern
            Africa — the answer is clear: <strong className="text-white">Chikoro AI</strong> is the
            only tool built for you. It knows your syllabus, it speaks your language (Shona, Ndebele,
            Zulu, or Swahili), it marks your work automatically and it gives your teacher and your
            parents visibility into your progress.
          </p>
          <p className="text-theme-text-secondary leading-relaxed mb-4">
            General tools like ChatGPT and Gemini are still useful for broad questions or essay
            brainstorming and they are free. But for serious ZIMSEC exam preparation, AI-marked
            homework and school-wide tools, Chikoro AI is in a completely different category.
          </p>
          <p className="text-theme-text-secondary leading-relaxed">
            At $5/month per student — less than the cost of a single private tutoring session — it
            is the most complete and affordable AI education platform built for this region.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Ready to study smarter?</h2>
          <p className="text-sm text-theme-text-secondary mb-6 max-w-md mx-auto">
            Create your free Chikoro AI account and get instant homework help in English, Shona, Ndebele, Zulu, or Swahili.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-3 rounded-xl bg-[#75D6FF] text-gray-900 font-bold hover:bg-white transition-colors text-sm"
            >
              Get started free
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
      <footer className="border-t border-white/10 py-8 px-6 text-center text-xs text-theme-text-secondary">
        <p>&copy; {new Date().getFullYear()} Chikoro AI &mdash; Zimbabwe&apos;s AI Tutor</p>
      </footer>
    </div>
  );
}

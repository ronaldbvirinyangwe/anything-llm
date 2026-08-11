import React from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

const tools = [
  {
    rank: 1,
    name: "Chikoro AI",
    tagline: "Built for Zimbabwe and southern Africa with ZIMSEC alignment",
    zimsec: true,
    languages: "Shona, Ndebele, Zulu, Swahili",
    price: "$5/month or free trial",
    verdict:
      "Chikoro AI is designed for Zimbabwean and southern African students, with support for the ZIMSEC O-Level and A-Level syllabus and homework help in Shona, Ndebele, Zulu and Swahili. Educators can use AI to build lesson plans, generate schemes of work, set homework and exercises, and distribute them to students. When students submit, the AI marks the work and gives personalised feedback. Teachers get a live dashboard of student progress, while parents can log in and follow their child's progress. Plans start at $5/month per student.",
    highlight: true,
  },
  {
    rank: 2,
    name: "ChatGPT (OpenAI)",
    tagline: "Powerful general-purpose AI — but not built for ZIMSEC",
    zimsec: false,
    languages: "Multilingual; not education-specific",
    price: "Free (limited) / $20/month for Plus",
    verdict:
      "ChatGPT can answer many homework questions and work across multiple languages. It is a general-purpose assistant rather than a product designed around the ZIMSEC syllabus, and it does not provide Chikoro AI's integrated teacher, parent, assignment and progress-tracking workflows.",
    highlight: false,
  },
  {
    rank: 3,
    name: "Google Gemini",
    tagline: "Free and capable, with Google Search built in",
    zimsec: false,
    languages: "Multilingual; not education-specific",
    price: "Free",
    verdict:
      "Gemini is Google's general-purpose AI assistant and can help with academic questions in multiple languages. It is not specifically designed around ZIMSEC coursework and does not provide Chikoro AI's integrated tools for teachers, schools and parents.",
    highlight: false,
  },
  {
    rank: 4,
    name: "Microsoft Copilot",
    tagline: "Free AI integrated into Bing and Edge",
    zimsec: false,
    languages: "Multilingual; not education-specific",
    price: "Free",
    verdict:
      "Microsoft Copilot can help with general homework questions and web research in multiple languages. It is a broad productivity assistant rather than a ZIMSEC-aligned learning platform, and it does not include Chikoro AI's school, teacher and parent workflows.",
    highlight: false,
  },
];

const CheckMark = () => (
  <svg
    className="w-5 h-5 text-green-400 inline"
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

const CrossMark = () => (
  <svg
    className="w-5 h-5 text-red-400 inline"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M6 18L18 6M6 6l12 12"
    />
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
    body: "Students can ask questions and receive explanations in their home language, including Shona, Ndebele, Zulu and Swahili.",
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
            Best AI Tools for Homework Help in Zimbabwe
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6">
          <span className="rounded-full border border-landing-accent-border bg-landing-accent-soft px-3 py-1 text-xs font-semibold text-landing-accent">
            AI Tools
          </span>
          <span className="text-xs text-landing-text-muted">5 March 2026</span>
          <span className="text-xs text-landing-text-muted">
            &bull; 7 min read
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold leading-tight text-landing-text md:text-4xl">
          Best AI Tools for Homework Help in Zimbabwe (2026)
        </h1>

        {/* Intro */}
        <p className="mb-4 leading-relaxed text-landing-text-muted">
          AI tutoring tools have exploded in the past two years — but most of
          them are built for students in the US, UK, or South Africa. If you are
          a student in Zimbabwe writing ZIMSEC O-Levels or A-Levels, the
          question is not just "which AI tool is smartest" — it is "which AI
          tool actually knows the Zimbabwean curriculum and speaks my language?"
        </p>
        <p className="mb-4 leading-relaxed text-landing-text-muted">
          We tested the four most accessible AI homework tools available to
          Zimbabwean students in 2026 and ranked them across ZIMSEC curriculum
          alignment, local language support (Shona, Ndebele, Zulu, Swahili),
          school and teacher tools and price.
        </p>
        <p className="mb-10 leading-relaxed text-landing-text-muted">
          Here is what we found.
        </p>

        {/* Comparison table */}
        <h2 className="mb-6 text-2xl font-bold text-landing-text">
          Quick comparison
        </h2>
        <div className="mb-12 overflow-x-auto rounded-xl border border-landing-border">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-landing-border bg-landing-surface">
                <th className="px-4 py-3 text-left font-semibold text-landing-text">
                  Tool
                </th>
                <th className="px-3 py-3 text-center font-semibold text-landing-text">
                  ZIMSEC
                </th>
                <th className="px-3 py-3 text-center font-semibold text-landing-text">
                  Local languages
                </th>
                <th className="px-3 py-3 text-left font-semibold text-landing-text">
                  Price
                </th>
              </tr>
            </thead>
            <tbody>
              {tools.map((t) => (
                <tr
                  key={t.name}
                  className={`border-b border-landing-border last:border-0 ${t.highlight ? "bg-landing-accent-soft" : ""}`}
                >
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold ${t.highlight ? "text-landing-accent" : "text-landing-text"}`}
                    >
                      {t.rank}. {t.name}
                    </span>
                    {t.highlight && (
                      <span className="ml-2 rounded-full bg-landing-accent px-2 py-0.5 text-xs font-bold text-landing-accent-foreground">
                        Best for ZW
                      </span>
                    )}
                  </td>
                  <td className="text-center py-3 px-3">
                    {t.zimsec ? <CheckMark /> : <CrossMark />}
                  </td>
                  <td className="px-3 py-3 text-xs text-landing-text-muted">
                    {t.languages}
                  </td>
                  <td className="px-3 py-3 text-xs text-landing-text-muted">
                    {t.price}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Chikoro AI features spotlight */}
        <h2 className="mb-3 text-2xl font-bold text-landing-text">
          What makes Chikoro AI different
        </h2>
        <p className="mb-8 text-sm leading-relaxed text-landing-text-muted">
          Chikoro AI is not just a chatbot with a Zimbabwe label. It is a full
          school platform — built for students, teachers and parents.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-14">
          {chikoroFeatures.map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-xl border border-landing-accent-border bg-landing-accent-soft p-5"
            >
              <div className="text-2xl mb-2">{icon}</div>
              <h3 className="mb-1 text-sm font-bold text-landing-text">
                {title}
              </h3>
              <p className="text-xs leading-relaxed text-landing-text-muted">
                {body}
              </p>
            </div>
          ))}
        </div>

        {/* Full reviews */}
        <h2 className="mb-8 text-2xl font-bold text-landing-text">
          Full reviews
        </h2>
        <div className="space-y-8">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className={`rounded-2xl border p-6 md:p-8 ${
                tool.highlight
                  ? "border-landing-accent-border-strong bg-landing-accent-soft"
                  : "border-landing-border bg-landing-surface"
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3 flex-wrap">
                <div>
                  <h3
                    className={`mb-1 text-xl font-bold ${tool.highlight ? "text-landing-accent" : "text-landing-text"}`}
                  >
                    #{tool.rank} — {tool.name}
                  </h3>
                  <p className="text-sm text-landing-text-muted">
                    {tool.tagline}
                  </p>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div className="mb-1 text-xs text-landing-text-muted">
                    ZIMSEC
                  </div>
                  {tool.zimsec ? <CheckMark /> : <CrossMark />}
                </div>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-landing-text-muted">
                {tool.verdict}
              </p>
              <p className="text-xs text-landing-text-muted">
                <span className="font-semibold text-landing-text">
                  Languages:{" "}
                </span>
                {tool.languages}
              </p>
              <p className="mt-1 text-xs text-landing-text-muted">
                <span className="font-semibold text-landing-text">Price: </span>
                {tool.price}
              </p>
              {tool.highlight && (
                <Link
                  to="/register"
                  className="mt-5 inline-block rounded-xl bg-landing-accent px-6 py-2.5 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
                >
                  Try Chikoro AI free &rarr;
                </Link>
              )}
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div className="mt-14 mb-10">
          <h2 className="mb-4 text-2xl font-bold text-landing-text">
            Our verdict
          </h2>
          <p className="mb-4 leading-relaxed text-landing-text-muted">
            If you are a student, teacher, or parent in Zimbabwe — or anywhere
            in southern or eastern Africa, consider whether a tool supports your
            curriculum and learning workflow.{" "}
            <strong className="text-landing-text">Chikoro AI</strong> combines
            ZIMSEC alignment, support for Shona, Ndebele, Zulu and Swahili,
            automatic marking, and progress visibility for teachers and parents.
          </p>
          <p className="mb-4 leading-relaxed text-landing-text-muted">
            General tools like ChatGPT and Gemini are still useful for broad
            questions or essay brainstorming and they are free. But for serious
            ZIMSEC exam preparation, AI-marked homework and school-wide tools,
            Chikoro AI is in a completely different category.
          </p>
          <p className="leading-relaxed text-landing-text-muted">
            Plans start at $5/month per student, with a free trial available for
            learners who want to evaluate the platform first.
          </p>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-landing-accent-border bg-landing-accent-soft p-8 text-center">
          <h2 className="mb-3 text-xl font-bold text-landing-text">
            Ready to study smarter?
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-landing-text-muted">
            Create your free Chikoro AI account and get instant homework help in
            English, Shona, Ndebele, Zulu, or Swahili.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="rounded-xl bg-landing-accent px-8 py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
            >
              Get started free
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

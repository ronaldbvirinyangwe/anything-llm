import React from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

const sections = [
  {
    heading: "The Hidden Cost of Learning in an Unfamiliar Language",
    body: [
      "In many countries, large numbers of students are taught in languages that are not their home languages. This creates an invisible barrier to learning. A child may appear weak in a subject when, in reality, they cannot connect the information they are being taught in another language to the information they already have.",
      "When students do not fully understand the language of instruction, their ability to engage with content is compromised. They may struggle to follow lessons, misinterpret questions, or lose confidence. Over time, this affects academic performance and overall self-esteem.",
      "Instead of building understanding, the classroom begins to feel like a place of frustration. For some learners, this can grow into discouragement and, eventually, withdrawal from school altogether.",
    ],
  },
  {
    heading: "Why Learning in a Home Language Makes a Difference",
    body: [
      "Children who begin learning in their home language often perform better because they can understand ideas clearly and engage with lessons more confidently. They are not forced to decode an unfamiliar language before they can grasp a concept.",
      "Learning in a familiar language improves comprehension, strengthens expression, supports emotional security, and helps children participate more actively in class. A child who understands what is being taught is more likely to feel capable and included.",
      "The home language becomes a bridge, not a barrier. A child who understands concepts in Shona or Ndebele can often learn to connect those ideas more easily to English over time through comparison and association.",
    ],
  },
  {
    heading: "How Chikoro AI Turns Language from an Obstacle into a Bridge",
    body: [
      "Chikoro AI supports students with homework, test preparation, and exam revision while allowing them to learn in languages they understand best. A learner can ask a question in English and receive an explanation in Shona or Ndebele.",
      "For example, a student struggling with a History concept in English can ask Chikoro AI to explain it in Shona. This does more than provide a translation; it supports deep understanding. Once the concept is grasped, the learner is in a stronger position to connect it back to the English curriculum.",
      "By making learning more understandable, Chikoro AI helps reduce the risk of dropout. When students understand their work, their confidence grows, paving the way for consistent academic progress.",
    ],
  },
];

export default function HomeLanguageLearning() {
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
          <span className="text-landing-text">Home Language Learning</span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="rounded-full border border-landing-accent-border bg-landing-accent-soft px-3 py-1 text-xs font-semibold text-landing-accent">
            Education Insights
          </span>
          <span className="text-xs text-landing-text-muted">
            By Farirai Dangwa
          </span>
          <span className="text-xs text-landing-text-muted">
            &bull; 14 April 2026
          </span>
          <span className="text-xs text-landing-text-muted">
            &bull; 6 min read
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold leading-tight text-landing-text md:text-4xl">
          The Power of Home Language Learning for Student Success
        </h1>

        {/* Intro */}
        <p className="mb-4 leading-relaxed text-landing-text-muted">
          Language is more than a means of communication. It is the foundation
          through which children begin to understand the world. It shapes how
          they think, ask questions, express ideas, and make sense of what they
          are taught.
        </p>
        <p className="mb-6 leading-relaxed text-landing-text-muted">
          When children start school and are suddenly expected to learn in a
          language they do not fully understand, the challenge is not only
          academic—it is emotional, social, and developmental. This is where the
          bridge between home and school often begins to crack.
        </p>

        {/* Quick tip box */}
        <div className="mb-10 rounded-xl border border-landing-accent-border bg-landing-accent-soft p-5">
          <p className="mb-1 text-sm font-semibold text-landing-accent">
            Key Insight
          </p>
          <p className="text-sm leading-relaxed text-landing-text-muted">
            Students who learn core concepts in their home language (like Shona
            or Ndebele) develop a stronger cognitive foundation, making it
            significantly easier to master English later.
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

        {/* Language Benefits Table */}
        <div className="mb-10 mt-12 overflow-hidden rounded-xl border border-landing-border bg-landing-surface">
          <div className="border-b border-landing-border px-6 py-4">
            <h2 className="text-base font-bold text-landing-text">
              Benefits of Multilingual Support
            </h2>
          </div>
          <div className="divide-y divide-landing-border">
            {[
              {
                area: "Comprehension",
                benefit: "Grasp complex ZIMSEC/Cambridge topics faster",
              },
              {
                area: "Confidence",
                benefit: "Less fear of making mistakes or asking questions",
              },
              {
                area: "Inclusion",
                benefit:
                  "Reduces the gap for students in rural or remote areas",
              },
              {
                area: "Retention",
                benefit: "Prevents dropout caused by language frustration",
              },
            ].map(({ area, benefit }) => (
              <div
                key={area}
                className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 gap-1"
              >
                <span className="text-sm font-semibold text-landing-accent">
                  {area}
                </span>
                <span className="text-sm text-landing-text-muted">
                  {benefit}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary List */}
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-landing-text">
            How to use Chikoro AI for Language Support
          </h2>
          <ul className="space-y-3">
            {[
              "Ask questions in Shona or Ndebele for direct answers",
              "Paste an English textbook paragraph and ask for an explanation in your home language",
              "Use the AI to translate difficult exam terms to ensure you understand the core concept",
              "Practice speaking and writing in both English and local languages to build bilingual fluency",
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

        {/* Final Thought */}
        <blockquote className="my-10 border-l-2 border-landing-accent pl-6 italic text-landing-text-muted">
          "Every child deserves the chance to understand before being judged.
          When education begins in a language a child knows and trusts, learning
          becomes more natural, more empowering, and more effective."
        </blockquote>

        {/* CTA */}
        <div className="rounded-2xl border border-landing-accent-border bg-landing-accent-soft p-8 text-center">
          <h2 className="mb-3 text-xl font-bold text-landing-text">
            Learn with clarity, confidence, and dignity
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-landing-text-muted">
            Break the language barrier today with an AI tutor built for
            Zimbabwean learners and their languages.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="rounded-xl bg-landing-accent px-8 py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
            >
              Start Learning in Shona/Ndebele
            </Link>
            <Link
              to="/about"
              className="rounded-xl border border-landing-border-strong px-8 py-3 text-sm font-semibold text-landing-text transition-colors hover:border-landing-accent"
            >
              How it works
            </Link>
          </div>
        </div>
      </article>
    </PublicSiteShell>
  );
}

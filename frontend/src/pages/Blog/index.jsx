import React from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

const posts = [
  {
    slug: "chikoro-ai-august-2026-update",
    title:
      "What Chikoro AI Can Do Now: Today, Offline Learning and Mastery Recovery",
    excerpt:
      "See how the Today dashboard, curriculum mastery, diagnostics, assignments, downloadable learning and spaced review now form one connected learning cycle.",
    date: "11 August 2026",
    readTime: "10 min read",
    tag: "Product Update",
  },
  {
    slug: "chikoro-ai-features-guide",
    title:
      "Chikoro AI Features: A Complete Guide for Zimbabwean Learners, Teachers and Families",
    excerpt:
      "A practical guide to the tutoring, assessment, planning and reporting tools currently implemented in Chikoro AI, including the limits users should understand.",
    date: "11 August 2026",
    readTime: "13 min read",
    tag: "Chikoro AI Guide",
  },
  {
    slug: "chikoro-ai-for-students-zimbabwe",
    title:
      "Chikoro AI for Students in Zimbabwe: Study, Practise and Track Your Progress",
    excerpt:
      "Learn how to use explanations, uploaded material, notes, quizzes, flashcards, answer feedback and study plans as one practical revision routine.",
    date: "11 August 2026",
    readTime: "11 min read",
    tag: "Student Guide",
  },
  {
    slug: "chikoro-ai-for-teachers-zimbabwe",
    title:
      "Chikoro AI for Teachers in Zimbabwe: Lesson Plans, Quizzes and Learner Reports",
    excerpt:
      "A clear teacher workflow for drafting plans, building and sharing assessments, extracting exam questions and reviewing learner results responsibly.",
    date: "11 August 2026",
    readTime: "12 min read",
    tag: "Teacher Guide",
  },
  {
    slug: "chikoro-ai-for-parents-zimbabwe",
    title:
      "Chikoro AI for Parents in Zimbabwe: Follow Your Child's Learning Progress",
    excerpt:
      "How parent linking, quiz reports, weak areas, low-score alerts and weekly digests work, with guidance for interpreting AI feedback carefully.",
    date: "11 August 2026",
    readTime: "9 min read",
    tag: "Parent Guide",
  },
  {
    slug: "chikoro-ai-for-schools-zimbabwe",
    title:
      "Chikoro AI for Schools in Zimbabwe: Assessment Insights and Education Dashboards",
    excerpt:
      "What the controlled-rollout school dashboards measure, how scoped access works and why the platform does not replace a school information system.",
    date: "11 August 2026",
    readTime: "11 min read",
    tag: "Schools & Leadership",
  },
  {
    slug: "the-power-of-home-language-learning",
    title:
      "The Power of Home Language Learning: Why Studying in Shona Can Boost Your Grades",
    excerpt:
      "Discover how learning in your home language, like Shona, can enhance understanding, retention, and performance in exams. We explore the benefits and share tips for leveraging this powerful approach.",
    date: "14 April 2026",
    readTime: "7 min read",
    tag: "Study Tips",
  },
  {
    slug: "how-to-pass-zimsec-o-level-maths",
    title: "How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide",
    excerpt:
      "ZIMSEC O-Level Maths is one of the most important — and most feared — subjects on your certificate. Here is exactly what to do from now until exam day to pass with confidence.",
    date: "17 March 2026",
    readTime: "8 min read",
    tag: "Study Tips",
  },
  {
    slug: "chikoro-ai-apk-available-on-apk-pure",
    title: "Chikoro AI APK Available on APK Pure",
    excerpt:
      "Excited to announce that Chikoro AI is now available on APK Pure! Download the app and experience the future of education.",
    date: "14 March 2026",
    readTime: "5 min read",
    tag: "App Updates",
  },
  {
    slug: "best-ai-tools-homework-help-zimbabwe-2026",
    title: "Best AI Tools for Homework Help in Zimbabwe (2026)",
    excerpt:
      "We tested the top AI tools available to Zimbabwean students — here is how they stack up on ZIMSEC content, Shona support, price, and reliability.",
    date: "5 March 2026",
    readTime: "6 min read",
    tag: "AI Tools",
  },
];

export default function Blog() {
  return (
    <PublicSiteShell>
      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10">
        <div className="mb-5 inline-block rounded-full border border-landing-accent-border bg-landing-accent-soft px-4 py-1 text-xs font-semibold uppercase tracking-wide text-landing-accent">
          Chikoro AI Blog
        </div>
        <h1 className="mb-3 text-4xl font-bold text-landing-text">
          Study tips, AI tools & Zimbabwe education
        </h1>
        <p className="text-landing-text-muted">
          Guides and insights for Zimbabwean students, parents, and teachers.
        </p>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-6 pb-20 space-y-6">
        {posts.map((post) => (
          <Link
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="group block w-full rounded-2xl border border-landing-border bg-landing-surface p-8 text-left transition-colors hover:border-landing-accent-border-strong"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="rounded-full border border-landing-accent-border bg-landing-accent-soft px-3 py-1 text-xs font-semibold text-landing-accent">
                {post.tag}
              </span>
              <span className="text-xs text-landing-text-muted">
                {post.date}
              </span>
              <span className="text-xs text-landing-text-muted">
                &bull; {post.readTime}
              </span>
            </div>
            <h2 className="mb-3 text-xl font-bold leading-snug text-landing-text transition-colors group-hover:text-landing-accent">
              {post.title}
            </h2>
            <p className="text-sm leading-relaxed text-landing-text-muted">
              {post.excerpt}
            </p>
            <p className="mt-4 text-sm font-semibold text-landing-accent">
              Read article &rarr;
            </p>
          </Link>
        ))}
      </div>
    </PublicSiteShell>
  );
}

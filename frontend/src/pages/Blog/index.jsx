import React from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

const posts = [
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

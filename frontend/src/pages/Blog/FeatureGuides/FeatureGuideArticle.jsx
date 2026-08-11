import React from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

function Text({ children }) {
  return (
    <p className="text-[15px] leading-7 text-landing-text-muted">{children}</p>
  );
}

function Callout({ callout }) {
  return (
    <aside
      className={`rounded-xl border p-5 ${
        callout.tone === "caution"
          ? "border-amber-500/30 bg-amber-500/10"
          : "border-landing-accent-border bg-landing-accent-soft"
      }`}
      aria-label={callout.title}
    >
      <h3 className="mb-2 text-sm font-bold text-landing-text">
        {callout.title}
      </h3>
      <p className="text-sm leading-6 text-landing-text-muted">
        {callout.body}
      </p>
    </aside>
  );
}

function List({ items, ordered = false }) {
  const Component = ordered ? "ol" : "ul";

  return (
    <Component
      className={`space-y-3 text-[15px] leading-7 text-landing-text-muted ${
        ordered ? "list-decimal" : "list-disc"
      } pl-6 marker:font-semibold marker:text-landing-accent`}
    >
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </Component>
  );
}

function ComparisonTable({ table }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-landing-border">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <caption className="sr-only">{table.caption}</caption>
        <thead className="bg-landing-surface-muted text-landing-text">
          <tr>
            {table.headers.map((header) => (
              <th key={header} scope="col" className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-landing-border">
          {table.rows.map((row) => (
            <tr key={row[0]} className="align-top">
              {row.map((cell, index) =>
                index === 0 ? (
                  <th
                    key={cell}
                    scope="row"
                    className="px-4 py-4 font-semibold text-landing-text"
                  >
                    {cell}
                  </th>
                ) : (
                  <td
                    key={`${row[0]}-${cell}`}
                    className="px-4 py-4 leading-6 text-landing-text-muted"
                  >
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ section }) {
  return (
    <section aria-labelledby={section.id} className="space-y-4">
      <h2
        id={section.id}
        className="text-2xl font-bold leading-tight text-landing-text"
      >
        {section.heading}
      </h2>
      {section.paragraphs?.map((paragraph) => (
        <Text key={paragraph}>{paragraph}</Text>
      ))}
      {section.subsections?.map((subsection) => (
        <div key={subsection.heading} className="space-y-3 pt-1">
          <h3 className="text-lg font-bold text-landing-text">
            {subsection.heading}
          </h3>
          {subsection.paragraphs?.map((paragraph) => (
            <Text key={paragraph}>{paragraph}</Text>
          ))}
          {subsection.items && <List items={subsection.items} />}
        </div>
      ))}
      {section.items && (
        <List items={section.items} ordered={section.ordered} />
      )}
      {section.callout && <Callout callout={section.callout} />}
      {section.table && <ComparisonTable table={section.table} />}
    </section>
  );
}

export default function FeatureGuideArticle({ article }) {
  return (
    <PublicSiteShell>
      <article className="mx-auto max-w-3xl px-5 pb-20 pt-10 sm:px-6 sm:pt-12">
        <nav
          aria-label="Breadcrumb"
          className="mb-8 flex items-center gap-2 text-xs text-landing-text-muted"
        >
          <Link to="/blog" className="hover:text-landing-text">
            Blog
          </Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page" className="text-landing-text">
            {article.shortTitle}
          </span>
        </nav>

        <header className="mb-12">
          <div className="mb-5 flex flex-wrap items-center gap-3 text-xs text-landing-text-muted">
            <span className="rounded-full border border-landing-accent-border bg-landing-accent-soft px-3 py-1 font-semibold text-landing-accent">
              {article.tag}
            </span>
            <time dateTime={article.dateIso}>{article.date}</time>
            <span aria-hidden="true">&bull;</span>
            <span>{article.readTime}</span>
          </div>
          <h1 className="mb-6 text-3xl font-bold leading-tight text-landing-text sm:text-4xl">
            {article.title}
          </h1>
          <p className="border-l-2 border-landing-accent pl-5 text-lg leading-8 text-landing-text-muted">
            {article.directAnswer}
          </p>
        </header>

        <div className="space-y-12">
          {article.sections.map((section) => (
            <Section key={section.id} section={section} />
          ))}

          <section
            aria-labelledby="frequently-asked-questions"
            className="space-y-6"
          >
            <h2
              id="frequently-asked-questions"
              className="text-2xl font-bold text-landing-text"
            >
              Frequently asked questions
            </h2>
            <div className="divide-y divide-landing-border rounded-xl border border-landing-border bg-landing-surface">
              {article.faqs.map((faq) => (
                <div key={faq.question} className="p-5 sm:p-6">
                  <h3 className="mb-2 text-base font-bold text-landing-text">
                    {faq.question}
                  </h3>
                  <p className="text-sm leading-6 text-landing-text-muted">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <aside
            aria-labelledby="related-guides"
            className="border-t border-landing-border pt-10"
          >
            <h2
              id="related-guides"
              className="mb-5 text-xl font-bold text-landing-text"
            >
              Related Chikoro AI guides
            </h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {article.related.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="block h-full rounded-xl border border-landing-border bg-landing-surface p-4 text-sm font-semibold leading-6 text-landing-text transition-colors hover:border-landing-accent-border-strong hover:text-landing-accent"
                  >
                    {item.label} &rarr;
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </article>
    </PublicSiteShell>
  );
}

import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

export default function NotFound() {
  return (
    <PublicSiteShell mainClassName="flex items-center">
      <section className="mx-auto w-full max-w-3xl px-6 py-20 text-center sm:py-28">
        <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-landing-accent">
          Error 404
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-landing-text sm:text-5xl">
          We couldn&apos;t find that page
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-landing-text-muted sm:text-lg">
          The link may be outdated, or the page may have moved. Try one of the
          links below to keep exploring Chikoro AI.
        </p>

        <nav
          aria-label="Helpful links"
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Link
            to="/"
            className="inline-flex min-w-40 justify-center rounded-xl bg-landing-accent px-6 py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
          >
            Return home
          </Link>
          <Link
            to="/blog"
            className="inline-flex min-w-40 justify-center rounded-xl border border-landing-border-strong bg-landing-surface px-6 py-3 text-sm font-semibold text-landing-text transition-colors hover:border-landing-accent hover:bg-landing-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
          >
            Visit the blog
          </Link>
          <Link
            to="/pricing"
            className="inline-flex min-w-40 justify-center rounded-xl border border-landing-border-strong bg-landing-surface px-6 py-3 text-sm font-semibold text-landing-text transition-colors hover:border-landing-accent hover:bg-landing-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent focus-visible:ring-offset-2 focus-visible:ring-offset-landing-bg"
          >
            View pricing
          </Link>
        </nav>
      </section>
    </PublicSiteShell>
  );
}

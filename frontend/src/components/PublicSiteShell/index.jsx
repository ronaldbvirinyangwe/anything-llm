import React, { useState } from "react";
import { List, Moon, Sun, X } from "@phosphor-icons/react";
import { Link, NavLink } from "react-router-dom";
import { useThemeContext } from "@/ThemeContext";

export const SCHOOL_EMAIL = "support@chikoro-ai.com";

const navigation = [
  { label: "About", to: "/about" },
  { label: "Pricing", to: "/pricing" },
  { label: "Blog", to: "/blog" },
];

function navLinkClass({ isActive }) {
  return `text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent focus-visible:ring-offset-2 focus-visible:ring-offset-landing-nav rounded-sm ${
    isActive
      ? "text-landing-accent"
      : "text-landing-text-subtle hover:text-landing-text"
  }`;
}

export function PublicThemeToggle() {
  const { theme, setTheme } = useThemeContext();
  const isDark = theme === "default";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "default")}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-landing-border bg-landing-surface-subtle text-landing-text-muted transition-colors hover:border-landing-border-strong hover:bg-landing-surface-hover hover:text-landing-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent"
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? (
        <Sun size={18} weight="bold" />
      ) : (
        <Moon size={18} weight="bold" />
      )}
    </button>
  );
}

export function PublicNav() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-landing-border bg-landing-nav backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-6">
        <Link
          to="/"
          className="rounded-sm text-xl font-bold text-landing-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent"
        >
          Chikoro <span className="text-landing-accent">AI</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <PublicThemeToggle />
          <Link
            to="/login"
            className="hidden rounded-sm text-sm text-landing-text-muted transition-colors hover:text-landing-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent sm:block"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-landing-accent px-4 py-2 text-sm font-semibold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent focus-visible:ring-offset-2 focus-visible:ring-offset-landing-nav"
          >
            Get started free
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-landing-text-muted hover:bg-landing-surface-hover hover:text-landing-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-landing-accent md:hidden"
            aria-expanded={menuOpen}
            aria-controls="public-mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          >
            {menuOpen ? (
              <X size={20} weight="bold" />
            ) : (
              <List size={20} weight="bold" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          id="public-mobile-navigation"
          className="border-t border-landing-border bg-landing-nav px-5 py-4 md:hidden"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={navLinkClass}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <NavLink
              to="/login"
              className={navLinkClass}
              onClick={() => setMenuOpen(false)}
            >
              Log in
            </NavLink>
          </div>
        </div>
      )}
    </nav>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-landing-border bg-landing-surface-muted">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <Link
            to="/"
            className="mb-3 inline-block text-xl font-bold text-landing-text"
          >
            Chikoro <span className="text-landing-accent">AI</span>
          </Link>
          <p className="max-w-sm text-sm leading-relaxed text-landing-text-subtle">
            Zimbabwe&apos;s AI tutor, aligned to ZIMSEC and Cambridge in
            English, Shona, and Ndebele.
          </p>
          <p className="mt-4 text-xs text-landing-text-faint">
            <em>Chikoro</em> means school in Shona.
          </p>
        </div>

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-landing-text-muted">
            Explore
          </p>
          <ul className="space-y-3">
            {navigation.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="text-sm text-landing-text-subtle transition-colors hover:text-landing-text"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-landing-text-muted">
            Support
          </p>
          <ul className="space-y-3">
            <li>
              <Link
                to="/privacy-policy"
                className="text-sm text-landing-text-subtle hover:text-landing-text"
              >
                Privacy policy
              </Link>
            </li>
            <li>
              <Link
                to="/terms-of-service"
                className="text-sm text-landing-text-subtle hover:text-landing-text"
              >
                Terms of service
              </Link>
            </li>
            <li>
              <Link
                to="/delete-account"
                className="text-sm text-landing-text-subtle hover:text-landing-text"
              >
                Delete account
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${SCHOOL_EMAIL}`}
                className="text-sm text-landing-text-subtle hover:text-landing-text"
              >
                Contact us
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-landing-border px-6 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-landing-text-faint">
            &copy; {new Date().getFullYear()} Chikoro AI. Zimbabwe&apos;s AI
            Tutor.
          </p>
          <a
            href={`mailto:${SCHOOL_EMAIL}`}
            className="text-xs text-landing-text-faint hover:text-landing-text-muted"
          >
            {SCHOOL_EMAIL}
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function PublicSiteShell({ children, mainClassName = "" }) {
  return (
    <div className="flex min-h-screen flex-col bg-landing-bg text-landing-text antialiased">
      <PublicNav />
      <main className={`flex-1 ${mainClassName}`}>{children}</main>
      <PublicFooter />
    </div>
  );
}

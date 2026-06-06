import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const CONTACT_EMAIL = "support@chikoro-ai.com";
const DELETION_REQUEST_EMAIL = "deletemyaccount@chikoro-ai.com";

const sections = [
  {
    id: "overview",
    title: "1. Overview",
    text: "You have the right to delete your Chikoro AI account and all associated personal data at any time. This page explains how to submit a deletion request, what data will be removed, what data we are required to retain, and how long the process takes.",
  },
  {
    id: "how-to-request",
    title: "2. How to Request Deletion",
    text: "You can request account and data deletion using either of the following methods:",
    content: [
      {
        heading: "Option A — Email Request",
        text: `Send an email to ${DELETION_REQUEST_EMAIL} with the subject line "Account Deletion Request". Include the full name and email address associated with your Chikoro AI account. We will verify your identity before processing the request.`,
      },
      {
        heading: "Option B — In-App Request",
        text: "If you are logged in to your Chikoro AI account, navigate to Settings → Account → Delete Account and follow the on-screen instructions. This will immediately initiate the deletion process.",
      },
    ],
  },
  {
    id: "what-is-deleted",
    title: "3. What Gets Deleted",
    bullets: [
      "Your account profile, including your name, email address, and password.",
      "All chat history and AI tutoring session records associated with your account.",
      "Quiz attempts, scores, and progress data.",
      "Any exam papers, documents, or images you have uploaded to the platform.",
      "Lesson plans or classroom content created under your account.",
      "Subscription and billing history (excluding records required for legal compliance — see Section 4).",
      "Any linked student, teacher, or parent account associations.",
    ],
  },
  {
    id: "what-is-retained",
    title: "4. What We May Retain",
    text: "In some cases, we are required by law or legitimate business necessity to retain limited data even after your account is deleted.",
    content: [
      {
        heading: "Financial Records",
        text: "Transaction records and invoices may be retained for up to 7 years in accordance with Zimbabwean financial regulations. This data is kept in a secure archive and is not used for any other purpose.",
      },
      {
        heading: "Anonymised Analytics",
        text: "Aggregated, anonymised data that cannot identify you as an individual (such as overall platform usage statistics) may be retained indefinitely to improve our service.",
      },
      {
        heading: "Legal Obligations",
        text: "If your account is subject to an active legal investigation or dispute, we may be required to preserve certain records until the matter is resolved.",
      },
      {
        heading: "School-Managed Accounts",
        text: "If your account was created and managed by a school or institution, the school administrator may need to be involved in the deletion process. Please contact your school administrator alongside submitting your request to us.",
      },
    ],
  },
  {
    id: "timeline",
    title: "5. Processing Timeline",
    content: [
      {
        heading: "Acknowledgement",
        text: "We will acknowledge your deletion request within 2 business days of receiving it and verify your identity before proceeding.",
      },
      {
        heading: "Completion",
        text: "Your account and associated data will be fully deleted within 30 days of your verified request. You will receive an email confirmation once the deletion is complete.",
      },
      {
        heading: "Backup Systems",
        text: "Deleted data may persist in encrypted backup snapshots for up to an additional 30 days before being permanently purged from all systems.",
      },
    ],
  },
  {
    id: "children",
    title: "6. Deletion for Minors",
    text: "If you are a parent or legal guardian requesting deletion on behalf of a child under the age of 18, please include proof of your relationship (such as a parent ID or school enrollment confirmation) in your email request. School administrators may submit bulk deletion requests on behalf of their students by contacting us directly.",
  },
  {
    id: "contact",
    title: "7. Contact Us",
    text: "To submit a deletion request or if you have any questions about this process, please contact our data team:",
    contactBlock: true,
  },
];

export default function DeleteAccount() {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(DELETION_REQUEST_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
        <div className="hidden md:flex items-center gap-6">
          <button onClick={() => navigate("/about")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">About</button>
          <button onClick={() => navigate("/pricing")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Pricing</button>
          <button onClick={() => navigate("/blog")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Blog</button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="text-sm text-theme-text-secondary hover:text-white transition-colors hidden sm:block"
          >
            Log in
          </button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#75D6FF] text-gray-900 hover:bg-white transition-colors"
          >
            Get started free
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center pt-16 pb-10 px-6">
        <div className="inline-block bg-[#75D6FF]/10 border border-[#75D6FF]/30 rounded-full px-4 py-1 text-xs text-[#75D6FF] font-semibold mb-6 tracking-wide uppercase">
          Account
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-4 leading-tight">
          Delete Your Account
        </h1>
        <p className="text-sm text-white/40">
          Last updated: 21 May 2026
        </p>
        <p className="mt-4 text-base text-theme-text-secondary leading-relaxed max-w-xl mx-auto">
          You have full control over your data. This page explains how to request the deletion of your Chikoro AI account and all associated personal information.
        </p>
      </div>

      {/* CTA deletion request button — prominent link for Google Play compliance */}
      <div className="max-w-3xl mx-auto px-6 pb-10">
        <div className="rounded-xl bg-red-500/5 border border-red-500/30 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white mb-1">Ready to delete your account?</p>
            <p className="text-xs text-white/50 max-w-sm">
              Send a deletion request directly to our data team. We will process it within 30 days.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <a
              href={`mailto:${DELETION_REQUEST_EMAIL}?subject=Account%20Deletion%20Request`}
              className="text-sm font-semibold px-5 py-2.5 rounded-lg bg-red-500 text-white hover:bg-red-400 transition-colors whitespace-nowrap"
            >
              Request Deletion
            </a>
            <button
              onClick={handleCopyEmail}
              className="text-xs px-3 py-2.5 rounded-lg border border-white/10 text-white/50 hover:text-white hover:border-white/30 transition-colors whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy email"}
            </button>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-3xl mx-auto px-6 pb-10">
        <div className="rounded-xl bg-theme-bg-secondary border border-white/10 p-6">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Contents</p>
          <ol className="space-y-1.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-[#75D6FF]/80 hover:text-[#75D6FF] transition-colors"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Sections */}
      <div className="max-w-3xl mx-auto px-6 pb-16 space-y-10">
        {sections.map((section) => (
          <div key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className="text-xl font-bold text-white mb-4">{section.title}</h2>

            {/* Plain text */}
            {section.text && (
              <p className="text-sm text-theme-text-secondary leading-relaxed mb-4">{section.text}</p>
            )}

            {/* Sub-sections with headings */}
            {section.content && (
              <div className="space-y-4">
                {section.content.map((item) => (
                  <div key={item.heading} className="rounded-xl bg-theme-bg-secondary border border-white/10 p-5">
                    <p className="text-sm font-bold text-white mb-1">{item.heading}</p>
                    <p className="text-sm text-theme-text-secondary leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Bullet list */}
            {section.bullets && (
              <ul className="space-y-2 mb-4">
                {section.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-sm text-theme-text-secondary leading-relaxed">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#75D6FF] flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {/* Contact block */}
            {section.contactBlock && (
              <div className="rounded-xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-6 mt-4">
                <p className="text-sm font-bold text-white mb-1">Chikoro AI Data Team</p>
                <p className="text-sm text-theme-text-secondary">Zimbabwe</p>
                <a
                  href={`mailto:${DELETION_REQUEST_EMAIL}?subject=Account%20Deletion%20Request`}
                  className="text-sm text-[#75D6FF] hover:underline mt-1 inline-block"
                >
                  {DELETION_REQUEST_EMAIL}
                </a>
                <p className="text-xs text-white/30 mt-3">
                  For general support enquiries:{" "}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-white/40 hover:text-white/60 transition-colors">
                    {CONTACT_EMAIL}
                  </a>
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a0d]">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <p className="text-lg font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-2">Chikoro AI</p>
            <p className="text-xs text-white/40 leading-relaxed max-w-xs">Zimbabwe&apos;s first AI tutor — aligned to ZIMSEC &amp; Cambridge, in English, Shona, and Ndebele.</p>
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
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Legal</p>
            <ul className="space-y-2">
              <li><button onClick={()=>navigate("/privacy-policy")} className="text-xs text-white/40 hover:text-white transition-colors">Privacy Policy</button></li>
              <li><button onClick={()=>navigate("/terms-of-service")} className="text-xs text-white/40 hover:text-white transition-colors">Terms of Service</button></li>
              <li><button onClick={()=>navigate("/delete-account")} className="text-xs text-white/40 hover:text-white transition-colors">Delete Account</button></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} Chikoro AI &mdash; Zimbabwe&apos;s AI Tutor</p>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-xs text-white/25 hover:text-white/50 transition-colors">{CONTACT_EMAIL}</a>
        </div>
      </footer>
    </div>
  );
}
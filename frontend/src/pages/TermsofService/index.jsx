import React from "react";
import { useNavigate } from "react-router-dom";

const CONTACT_EMAIL = "support@chikoro-ai.com";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    text: "By creating an account, accessing, or using Chikoro AI, you agree to be bound by these Terms of Service and our Privacy Policy. If you are using the platform on behalf of a school or institution, you represent that you have the authority to bind that entity to these terms.",
  },
  {
    id: "eligibility",
    title: "2. Eligibility & Accounts",
    content: [
      {
        heading: "Age Requirements",
        text: "Students under the age of 18 may use Chikoro AI only with the consent and supervision of a parent, legal guardian, or authorized school administrator.",
      },
      {
        heading: "Account Security",
        text: "You are responsible for maintaining the confidentiality of your login credentials. You must immediately notify us of any unauthorized use of your account. Chikoro AI cannot be held liable for any loss resulting from unauthorized access.",
      },
    ],
  },
  {
    id: "services",
    title: "3. Use of Services",
    bullets: [
      "Chikoro AI provides AI-driven educational assistance aligned with ZIMSEC and Cambridge curricula.",
      "The service is intended for educational support and should not be used as a tool for academic dishonesty or cheating.",
      "While our AI is highly advanced, it may occasionally generate inaccurate information. Users are encouraged to verify critical facts with their official textbooks and teachers.",
      "We reserve the right to modify, suspend, or discontinue any part of the service at any time.",
    ],
  },
  {
    id: "subscriptions",
    title: "4. Subscriptions & Payments",
    content: [
      {
        heading: "Billing",
        text: "Access to certain features requires a paid subscription. Payments are processed via EcoCash, OneMoney, or supported card processors. All fees are non-refundable unless required by Zimbabwean law.",
      },
      {
        heading: "Cancellations",
        text: "You can cancel your subscription at any time through your account settings. Upon cancellation, you will retain access to premium features until the end of your current billing period.",
      },
    ],
  },
  {
    id: "user-content",
    title: "5. User Content",
    text: "You retain ownership of any materials you upload (exam papers, notes, images). By uploading content, you grant Chikoro AI a license to process this data solely to provide the service to you. You represent that you have the right to upload such content and that it does not infringe on any third-party intellectual property rights.",
  },
  {
    id: "prohibited",
    title: "6. Prohibited Conduct",
    bullets: [
      "Attempting to reverse-engineer, scrape, or disrupt the Chikoro AI platform.",
      "Using the platform to generate harmful, hateful, or inappropriate content.",
      "Sharing account access with unauthorized users outside of your household or classroom license.",
      "Using AI-generated responses to bypass school examinations or formal assessments unfairly.",
    ],
  },
  {
    id: "intellectual-property",
    title: "7. Intellectual Property",
    text: "The Chikoro AI name, logo, software, and original educational content are the exclusive property of Chikoro AI and its licensors. You may not use our branding without prior written consent.",
  },
  {
    id: "disclaimers",
    title: "8. Disclaimers & Limitation of Liability",
    text: "Chikoro AI is provided 'as is' without warranties of any kind. To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including academic performance or data loss.",
  },
  {
    id: "governing-law",
    title: "9. Governing Law",
    text: "These terms are governed by and construed in accordance with the laws of Zimbabwe. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Zimbabwe.",
  },
  {
    id: "contact",
    title: "10. Contact Us",
    text: "If you have any questions regarding these Terms of Service, please reach out to our legal team:",
    contactBlock: true,
  },
];

export default function TermsOfService() {
  const navigate = useNavigate();

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
          Legal
        </div>
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-4 leading-tight">
          Terms of Service
        </h1>
        <p className="text-sm text-white/40">
          Effective date: 31 March 2026 &nbsp;&middot;&nbsp; Last updated: 31 March 2026
        </p>
        <p className="mt-4 text-base text-theme-text-secondary leading-relaxed max-w-xl mx-auto">
          Please read these terms carefully before using Chikoro AI. These terms govern your access to and use of our platform, AI tutoring tools, and educational resources.
        </p>
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
                <p className="text-sm font-bold text-white mb-1">Chikoro AI Legal Team</p>
                <p className="text-sm text-theme-text-secondary">Zimbabwe</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-sm text-[#75D6FF] hover:underline mt-1 inline-block"
                >
                  {CONTACT_EMAIL}
                </a>
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
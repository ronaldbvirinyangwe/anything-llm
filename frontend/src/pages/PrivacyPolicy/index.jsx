import React from "react";
import { useNavigate } from "react-router-dom";

const CONTACT_EMAIL = "instrutech2024@gmail.com";

const sections = [
  {
    id: "information-we-collect",
    title: "1. Information We Collect",
    content: [
      {
        heading: "Account Information",
        text: "When you register, we collect your name, email address, password (stored as a secure hash), and your role (student, teacher, or parent). Schools may provide additional details such as class names and grade levels during enrolment.",
      },
      {
        heading: "Usage Data",
        text: "We collect information about how you interact with Chikoro AI — including questions asked, subjects studied, quiz scores, lesson plans generated, and session timestamps. This helps us personalise your learning experience and improve the platform.",
      },
      {
        heading: "Content You Upload",
        text: "Teachers and students may upload exam papers, images, and documents. These files are processed to provide AI-powered feedback and are stored securely on our servers.",
      },
      {
        heading: "Device & Technical Data",
        text: "We automatically collect your IP address, browser type, device type, and operating system solely for security, fraud prevention, and service reliability purposes.",
      },
      {
        heading: "Payment Information",
        text: "Subscription payments are handled by our third-party payment processors (EcoCash, OneMoney, and card processors). We do not store full payment card details on our servers.",
      },
    ],
  },
  {
    id: "how-we-use",
    title: "2. How We Use Your Information",
    bullets: [
      "Provide and personalise the AI tutoring experience aligned to ZIMSEC and Cambridge curricula.",
      "Allow teachers to track student progress, generate quizzes, create lesson plans, and manage classes.",
      "Allow parents to view their child's learning activity and progress reports.",
      "Send important account notifications such as password resets and subscription updates.",
      "Improve our AI models and platform features using aggregated, anonymised data.",
      "Detect and prevent fraud, abuse, and unauthorised access.",
      "Comply with applicable Zimbabwean laws and regulations.",
    ],
  },
  {
    id: "data-sharing",
    title: "3. Who We Share Your Data With",
    content: [
      {
        heading: "Within the Platform",
        text: "Teachers can see the progress and quiz results of students enrolled in their classes. Parents linked to a student account can view that student's activity. Administrators of a school account can see data for all users in that school.",
      },
      {
        heading: "AI Processing",
        text: "Your messages and uploaded content are sent to AI model providers (including Anthropic's Claude) to generate responses. These providers process data under their own privacy policies and do not use your data to train their models beyond the scope agreed in our contracts.",
      },
      {
        heading: "Service Providers",
        text: "We share limited data with trusted third-party providers for hosting, payment processing, email delivery, and analytics. All providers are contractually bound to protect your data.",
      },
      {
        heading: "Legal Requirements",
        text: "We may disclose your information if required by law, court order, or to protect the rights, property, or safety of Chikoro AI, our users, or the public.",
      },
      {
        heading: "No Selling of Data",
        text: "We do not sell, rent, or trade your personal information to any third party for marketing purposes.",
      },
    ],
  },
  {
    id: "children",
    title: "4. Children's Privacy",
    content: [
      {
        heading: "Students Under 18",
        text: "Chikoro AI is designed to be used by students, including those under 18. Where students are minors, we require that accounts are created or approved by a parent, guardian, or school administrator. We collect only the minimum data necessary to provide the educational service.",
      },
      {
        heading: "Parental Controls",
        text: "Parents linked to a student account can contact us at any time to review, update, or request deletion of their child's data.",
      },
      {
        heading: "School Accounts",
        text: "When Chikoro AI is deployed by a school, the school acts as the responsible party for student data. We process student data on the school's behalf and in accordance with their instructions.",
      },
    ],
  },
  {
    id: "data-retention",
    title: "5. Data Retention",
    text: "We retain your account data for as long as your account is active. Chat history and quiz results are kept for up to 24 months to support progress tracking. Uploaded exam papers are retained for up to 12 months unless you delete them earlier. You may request deletion of your data at any time by contacting us.",
  },
  {
    id: "security",
    title: "6. Security",
    text: "We use industry-standard measures to protect your data, including encrypted connections (HTTPS/TLS), hashed passwords, and access controls that limit who within our team can view your personal information. While no system is completely secure, we continuously review and improve our security practices.",
  },
  {
    id: "your-rights",
    title: "7. Your Rights",
    bullets: [
      "Access — you can request a copy of the personal data we hold about you.",
      "Correction — you can update your account information at any time in your settings.",
      "Deletion — you can request that we delete your account and associated data.",
      "Portability — you can request an export of your chat history and quiz results.",
      "Objection — you can object to certain uses of your data, such as aggregated analytics.",
    ],
    footer: "To exercise any of these rights, please contact us at the address below.",
  },
  {
    id: "cookies",
    title: "8. Cookies & Local Storage",
    text: "We use browser local storage and session cookies solely to keep you logged in and remember your preferences. We do not use advertising or tracking cookies from third parties.",
  },
  {
    id: "changes",
    title: "9. Changes to This Policy",
    text: "We may update this Privacy Policy from time to time. When we make material changes, we will notify you by email or by displaying a notice in the app. Continued use of Chikoro AI after the effective date of the updated policy constitutes your acceptance of the changes.",
  },
  {
    id: "contact",
    title: "10. Contact Us",
    text: `If you have any questions about this Privacy Policy, or wish to exercise your rights, please contact us at:`,
    contactBlock: true,
  },
];

export default function PrivacyPolicy() {
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
          Privacy Policy
        </h1>
        <p className="text-sm text-white/40">
          Effective date: 17 March 2026 &nbsp;&middot;&nbsp; Last updated: 17 March 2026
        </p>
        <p className="mt-4 text-base text-theme-text-secondary leading-relaxed max-w-xl mx-auto">
          Chikoro AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to protecting the privacy of every student, teacher, and parent who uses our platform. This policy explains what data we collect, why we collect it, and how we keep it safe.
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

            {section.footer && (
              <p className="text-sm text-theme-text-secondary leading-relaxed">{section.footer}</p>
            )}

            {/* Contact block */}
            {section.contactBlock && (
              <div className="rounded-xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-6 mt-4">
                <p className="text-sm font-bold text-white mb-1">Chikoro AI</p>
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
              <li><a href={`mailto:${CONTACT_EMAIL}`} className="text-xs text-white/40 hover:text-white transition-colors">Contact us</a></li>
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

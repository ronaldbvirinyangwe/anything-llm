import PublicSiteShell from "@/components/PublicSiteShell";

const CONTACT_EMAIL = "support@chikoro-ai.com";

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
    footer:
      "To exercise any of these rights, please contact us at the address below.",
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
  return (
    <PublicSiteShell>
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center pt-16 pb-10 px-6">
        <div className="mb-6 inline-block rounded-full border border-landing-accent-border bg-landing-accent-soft px-4 py-1 text-xs font-semibold uppercase tracking-wide text-landing-accent">
          Legal
        </div>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-landing-text md:text-5xl">
          Privacy Policy
        </h1>
        <p className="text-sm text-landing-text-faint">
          Effective date: 17 March 2026 &nbsp;&middot;&nbsp; Last updated: 17
          March 2026
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-landing-text-subtle">
          Chikoro AI (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is
          committed to protecting the privacy of every student, teacher, and
          parent who uses our platform. This policy explains what data we
          collect, why we collect it, and how we keep it safe.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="max-w-3xl mx-auto px-6 pb-10">
        <div className="rounded-xl border border-landing-border bg-landing-surface p-6">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-landing-text-muted">
            Contents
          </p>
          <ol className="space-y-1.5">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm text-landing-accent transition-colors hover:text-landing-accent-hover"
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
            <h2 className="mb-4 text-xl font-bold text-landing-text">
              {section.title}
            </h2>

            {/* Plain text */}
            {section.text && (
              <p className="mb-4 text-sm leading-relaxed text-landing-text-subtle">
                {section.text}
              </p>
            )}

            {/* Sub-sections with headings */}
            {section.content && (
              <div className="space-y-4">
                {section.content.map((item) => (
                  <div
                    key={item.heading}
                    className="rounded-xl border border-landing-border bg-landing-surface p-5"
                  >
                    <p className="mb-1 text-sm font-bold text-landing-text">
                      {item.heading}
                    </p>
                    <p className="text-sm leading-relaxed text-landing-text-subtle">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Bullet list */}
            {section.bullets && (
              <ul className="space-y-2 mb-4">
                {section.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm leading-relaxed text-landing-text-subtle"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-landing-accent" />
                    {b}
                  </li>
                ))}
              </ul>
            )}

            {section.footer && (
              <p className="text-sm leading-relaxed text-landing-text-subtle">
                {section.footer}
              </p>
            )}

            {/* Contact block */}
            {section.contactBlock && (
              <div className="mt-4 rounded-xl border border-landing-accent-border bg-landing-accent-soft p-6">
                <p className="mb-1 text-sm font-bold text-landing-text">
                  Chikoro AI
                </p>
                <p className="text-sm text-landing-text-subtle">Zimbabwe</p>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="mt-1 inline-block text-sm text-landing-accent hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </PublicSiteShell>
  );
}

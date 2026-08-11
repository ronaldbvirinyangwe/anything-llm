import PublicSiteShell from "@/components/PublicSiteShell";

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
  return (
    <PublicSiteShell>
      {/* Hero */}
      <div className="max-w-3xl mx-auto text-center pt-16 pb-10 px-6">
        <div className="mb-6 inline-block rounded-full border border-landing-accent-border bg-landing-accent-soft px-4 py-1 text-xs font-semibold uppercase tracking-wide text-landing-accent">
          Legal
        </div>
        <h1 className="mb-4 text-4xl font-bold leading-tight text-landing-text md:text-5xl">
          Terms of Service
        </h1>
        <p className="text-sm text-landing-text-faint">
          Effective date: 31 March 2026 &nbsp;&middot;&nbsp; Last updated: 31
          March 2026
        </p>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-landing-text-subtle">
          Please read these terms carefully before using Chikoro AI. These terms
          govern your access to and use of our platform, AI tutoring tools, and
          educational resources.
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

            {/* Contact block */}
            {section.contactBlock && (
              <div className="mt-4 rounded-xl border border-landing-accent-border bg-landing-accent-soft p-6">
                <p className="mb-1 text-sm font-bold text-landing-text">
                  Chikoro AI Legal Team
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

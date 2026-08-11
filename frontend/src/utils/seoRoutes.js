export const SITE_URL = "https://chikoro-ai.com";

const SITE_NAME = "Chikoro AI";
const DEFAULT_IMAGE = `${SITE_URL}/og-default.png`;
const DEFAULT_IMAGE_ALT =
  "Chikoro AI, Zimbabwe's AI tutor for ZIMSEC and Cambridge students";
const ORGANIZATION = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
};

function pageMetadata(path, title, description, schemaType = "WebPage") {
  const canonical = `${SITE_URL}${path}`;

  return {
    title,
    description,
    robots: "index,follow",
    canonical,
    openGraph: {
      type: "website",
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      image: DEFAULT_IMAGE,
      imageAlt: DEFAULT_IMAGE_ALT,
      imageWidth: "1200",
      imageHeight: "630",
      locale: "en_ZW",
    },
    twitter: {
      card: "summary_large_image",
      url: canonical,
      title,
      description,
      image: DEFAULT_IMAGE,
      imageAlt: DEFAULT_IMAGE_ALT,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": schemaType,
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: title,
      description,
      inLanguage: "en-ZW",
      publisher: ORGANIZATION,
    },
  };
}

function homeMetadata() {
  const metadata = pageMetadata(
    "/",
    "Chikoro AI - AI Homework Help & Tutor for Zimbabwe Students",
    "Chikoro AI is Zimbabwe's personalised AI tutor. Get instant homework help in English, Shona, and Ndebele, aligned to ZIMSEC and Cambridge curricula. Free to try."
  );

  return {
    ...metadata,
    jsonLd: {
      "@context": "https://schema.org",
      "@graph": [
        { ...ORGANIZATION, description: metadata.description },
        {
          "@type": "WebSite",
          "@id": `${SITE_URL}/#website`,
          url: `${SITE_URL}/`,
          name: SITE_NAME,
          publisher: { "@id": ORGANIZATION["@id"] },
        },
        {
          "@type": "SoftwareApplication",
          name: SITE_NAME,
          applicationCategory: "EducationalApplication",
          operatingSystem: "Web, Android",
          url: `${SITE_URL}/`,
          description: metadata.description,
          offers: {
            "@type": "Offer",
            price: "5.00",
            priceCurrency: "USD",
          },
          publisher: { "@id": ORGANIZATION["@id"] },
        },
      ],
    },
  };
}

function articleMetadata(
  path,
  title,
  description,
  publishedDate,
  options = {}
) {
  const metadata = pageMetadata(path, title, description);

  return {
    ...metadata,
    openGraph: {
      ...metadata.openGraph,
      type: "article",
      publishedTime: publishedDate,
    },
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${metadata.canonical}#article`,
      headline: options.headline ?? title,
      description,
      datePublished: publishedDate,
      dateModified: options.modifiedDate ?? publishedDate,
      url: metadata.canonical,
      mainEntityOfPage: metadata.canonical,
      image: DEFAULT_IMAGE,
      author: options.author ?? ORGANIZATION,
      publisher: ORGANIZATION,
      inLanguage: "en-ZW",
      ...(options.about ? { about: options.about } : {}),
    },
  };
}

export const SEO_ROUTES = {
  "/": homeMetadata(),
  "/about": pageMetadata(
    "/about",
    "About Chikoro AI | AI Education Built for Africa",
    "Learn how Chikoro AI is making curriculum-aligned, multilingual tutoring accessible to students, teachers, and families across Zimbabwe and Africa.",
    "AboutPage"
  ),
  "/pricing": pageMetadata(
    "/pricing",
    "Chikoro AI Pricing | Affordable AI Tutoring",
    "Explore affordable Chikoro AI plans for students and schools, with personalised homework help, exam preparation, and teacher tools."
  ),
  "/blog": pageMetadata(
    "/blog",
    "Chikoro AI Blog | Study Tips & Education Insights",
    "Read practical study guides, AI education insights, and ZIMSEC exam tips for Zimbabwean students, parents, and teachers.",
    "CollectionPage"
  ),
  "/blog/chikoro-ai-august-2026-update": articleMetadata(
    "/blog/chikoro-ai-august-2026-update",
    "Chikoro AI August 2026 Update: What's New",
    "Explore Chikoro AI's Today dashboard, mastery tracking, diagnostics, assignments, offline learning and spaced Mastery Recovery for Zimbabwean learners.",
    "2026-08-11",
    {
      headline:
        "What Chikoro AI Can Do Now: Today, Offline Learning and Mastery Recovery",
      about: {
        "@type": "SoftwareApplication",
        name: "Chikoro AI connected learning platform",
      },
    }
  ),
  "/blog/chikoro-ai-features-guide": articleMetadata(
    "/blog/chikoro-ai-features-guide",
    "Chikoro AI Features: Complete Guide for Zimbabwe | Chikoro AI",
    "Explore implemented Chikoro AI features for Zimbabwean students, teachers, parents and schools, including tutoring, quizzes, study plans and reports.",
    "2026-08-11",
    {
      headline:
        "Chikoro AI Features: A Complete Guide for Zimbabwean Learners, Teachers and Families",
      about: {
        "@type": "SoftwareApplication",
        name: "Chikoro AI education platform features",
      },
    }
  ),
  "/blog/chikoro-ai-for-students-zimbabwe": articleMetadata(
    "/blog/chikoro-ai-for-students-zimbabwe",
    "Chikoro AI for Students in Zimbabwe: Study Guide | Chikoro AI",
    "Learn how Zimbabwean students can use Chikoro AI for explanations, uploads, notes, quizzes, flashcards, answer feedback and study plans.",
    "2026-08-11",
    {
      headline:
        "Chikoro AI for Students in Zimbabwe: Study, Practise and Track Your Progress",
      about: {
        "@type": "Thing",
        name: "AI study tools for Zimbabwean students",
      },
    }
  ),
  "/blog/chikoro-ai-for-teachers-zimbabwe": articleMetadata(
    "/blog/chikoro-ai-for-teachers-zimbabwe",
    "Chikoro AI for Teachers: Planning and Quizzes | Chikoro AI",
    "Use Chikoro AI to draft lesson plans and schemes, generate and share quizzes, extract exam questions and review learner performance.",
    "2026-08-11",
    {
      headline:
        "Chikoro AI for Teachers in Zimbabwe: Lesson Plans, Quizzes and Learner Reports",
      about: {
        "@type": "Thing",
        name: "AI teaching tools for Zimbabwean teachers",
      },
    }
  ),
  "/blog/chikoro-ai-for-parents-zimbabwe": articleMetadata(
    "/blog/chikoro-ai-for-parents-zimbabwe",
    "Chikoro AI for Parents: Child Progress Guide | Chikoro AI",
    "Learn how parents can link a child's Chikoro AI account, understand quiz reports and weak areas, and configure learning alerts.",
    "2026-08-11",
    {
      headline:
        "Chikoro AI for Parents in Zimbabwe: Follow Your Child's Learning Progress",
      about: {
        "@type": "Thing",
        name: "Parent access to student learning progress",
      },
    }
  ),
  "/blog/chikoro-ai-for-schools-zimbabwe": articleMetadata(
    "/blog/chikoro-ai-for-schools-zimbabwe",
    "Chikoro AI for Schools: Education Dashboards | Chikoro AI",
    "Explore Chikoro AI school analytics, scoped access, class dashboards and responsible rollout considerations for Zimbabwean education leaders.",
    "2026-08-11",
    {
      headline:
        "Chikoro AI for Schools in Zimbabwe: Assessment Insights and Education Dashboards",
      about: {
        "@type": "Thing",
        name: "School assessment analytics and education leadership dashboards",
      },
    }
  ),
  "/blog/best-ai-tools-homework-help-zimbabwe-2026": articleMetadata(
    "/blog/best-ai-tools-homework-help-zimbabwe-2026",
    "Best AI Tools for Homework Help in Zimbabwe (2026) | Chikoro AI",
    "Compare the best AI homework tools for Zimbabwean students in 2026 across ZIMSEC alignment, local language support, teacher features, and price.",
    "2026-03-05",
    {
      headline: "Best AI Tools for Homework Help in Zimbabwe (2026)",
      about: { "@type": "Thing", name: "AI homework tools in Zimbabwe" },
    }
  ),
  "/blog/how-to-pass-zimsec-o-level-maths": articleMetadata(
    "/blog/how-to-pass-zimsec-o-level-maths",
    "How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide | Chikoro AI",
    "A practical, Zimbabwe-specific guide to passing ZIMSEC O-Level Maths (4004/4008). Covers the syllabus, past papers, exam technique, timed revision, and common mistakes.",
    "2026-03-17",
    {
      headline: "How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide",
      about: { "@type": "Thing", name: "ZIMSEC O-Level Mathematics" },
    }
  ),
  "/blog/chikoro-ai-apk-available-on-apk-pure": articleMetadata(
    "/blog/chikoro-ai-apk-available-on-apk-pure",
    "Chikoro AI APK Now Available on APKPure | Download for Android",
    "Download the Chikoro AI APK directly from APKPure. Get Zimbabwe's AI tutor on your Android phone with support for English, Shona, and Ndebele.",
    "2026-03-14",
    {
      headline: "Chikoro AI APK Now Available on APKPure",
      about: { "@type": "SoftwareApplication", name: "Chikoro AI" },
    }
  ),
  "/blog/the-power-of-home-language-learning": articleMetadata(
    "/blog/the-power-of-home-language-learning",
    "The Power of Home Language Learning for Student Success | Chikoro AI",
    "Discover how learning in home languages like Shona and Ndebele improves comprehension and confidence, and how Chikoro AI bridges the gap between home and school.",
    "2026-04-14",
    {
      headline: "The Power of Home Language Learning for Student Success",
      author: { "@type": "Person", name: "Farirai Dangwa" },
      about: { "@type": "Thing", name: "Home language education" },
    }
  ),
  "/privacy-policy": pageMetadata(
    "/privacy-policy",
    "Privacy Policy | Chikoro AI",
    "Read the Chikoro AI privacy policy to understand how we collect, use, protect, and manage personal information."
  ),
  "/terms-of-service": pageMetadata(
    "/terms-of-service",
    "Terms of Service | Chikoro AI",
    "Read the terms that govern access to and use of Chikoro AI services, applications, and educational tools."
  ),
};

export const DEFAULT_SEO = {
  title: "Chikoro AI",
  description: "Chikoro AI educational platform.",
  robots: "noindex,nofollow",
  canonical: null,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "Chikoro AI",
    description: "Chikoro AI educational platform.",
    image: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
    locale: "en_ZW",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chikoro AI",
    description: "Chikoro AI educational platform.",
    image: DEFAULT_IMAGE,
  },
  jsonLd: null,
};

export function getRouteSeo(pathname) {
  const normalizedPath =
    pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;

  return SEO_ROUTES[normalizedPath] ?? DEFAULT_SEO;
}

export default SEO_ROUTES;

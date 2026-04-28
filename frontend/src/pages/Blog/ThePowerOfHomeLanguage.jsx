import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SEO = {
  title: "The Power of Home Language Learning for Student Success | Chikoro AI",
  description:
    "Discover how learning in home languages like Shona and Ndebele improves comprehension and confidence. Learn how Chikoro AI bridges the gap between home and school.",
  canonical: "https://chikoro-ai.com/blog/power-of-home-language-learning",
  publishedDate: "2026-04-14",
  keywords:
    "home language learning, mother tongue education Zimbabwe, Shona AI tutor, Ndebele AI tutor, Chikoro AI language support, ZIMSEC multilingual learning",
};

const sections = [
  {
    heading: "The Hidden Cost of Learning in an Unfamiliar Language",
    body: [
      "In many countries, large numbers of students are taught in languages that are not their home languages. This creates an invisible barrier to learning. A child may appear weak in a subject when, in reality, they cannot connect the information they are being taught in another language to the information they already have.",
      "When students do not fully understand the language of instruction, their ability to engage with content is compromised. They may struggle to follow lessons, misinterpret questions, or lose confidence. Over time, this affects academic performance and overall self-esteem.",
      "Instead of building understanding, the classroom begins to feel like a place of frustration. For some learners, this can grow into discouragement and, eventually, withdrawal from school altogether.",
    ],
  },
  {
    heading: "Why Learning in a Home Language Makes a Difference",
    body: [
      "Children who begin learning in their home language often perform better because they can understand ideas clearly and engage with lessons more confidently. They are not forced to decode an unfamiliar language before they can grasp a concept.",
      "Learning in a familiar language improves comprehension, strengthens expression, supports emotional security, and helps children participate more actively in class. A child who understands what is being taught is more likely to feel capable and included.",
      "The home language becomes a bridge, not a barrier. A child who understands concepts in Shona or Ndebele can often learn to connect those ideas more easily to English over time through comparison and association.",
    ],
  },
  {
    heading: "How Chikoro AI Turns Language from an Obstacle into a Bridge",
    body: [
      "Chikoro AI supports students with homework, test preparation, and exam revision while allowing them to learn in languages they understand best. A learner can ask a question in English and receive an explanation in Shona or Ndebele.",
      "For example, a student struggling with a History concept in English can ask Chikoro AI to explain it in Shona. This does more than provide a translation; it supports deep understanding. Once the concept is grasped, the learner is in a stronger position to connect it back to the English curriculum.",
      "By making learning more understandable, Chikoro AI helps reduce the risk of dropout. When students understand their work, their confidence grows, paving the way for consistent academic progress.",
    ],
  },
];

export default function HomeLanguageLearning() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = SEO.title;
    const setMeta = (name, content, prop = false) => {
      const sel = prop ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement("meta");
        prop ? el.setAttribute("property", name) : el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const setLink = (rel, href) => {
      let el = document.querySelector(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.setAttribute("rel", rel);
        document.head.appendChild(el);
      }
      el.setAttribute("href", href);
    };
    setMeta("description", SEO.description);
    setMeta("keywords", SEO.keywords);
    setMeta("og:title", SEO.title, true);
    setMeta("og:description", SEO.description, true);
    setMeta("og:url", SEO.canonical, true);
    setMeta("og:type", "article", true);
    setMeta("article:published_time", SEO.publishedDate, true);
    setMeta("twitter:title", SEO.title, true);
    setMeta("twitter:description", SEO.description, true);
    setLink("canonical", SEO.canonical);

    let ld = document.getElementById("ld-article");
    if (!ld) {
      ld = document.createElement("script");
      ld.id = "ld-article";
      ld.type = "application/ld+json";
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: SEO.title,
      description: SEO.description,
      datePublished: SEO.publishedDate,
      dateModified: SEO.publishedDate,
      url: SEO.canonical,
      publisher: {
        "@type": "Organization",
        name: "Chikoro AI",
        url: "https://chikoro-ai.com",
      },
      author: { "@type": "Person", name: "Farirai Dangwa" },
      inLanguage: "en-ZW",
    });

    return () => {
      document.title = "Chikoro AI — AI Homework Help & Tutor for Zimbabwe Students";
      document.getElementById("ld-article")?.remove();
    };
  }, []);

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
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/blog")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Blog</button>
          <button onClick={() => navigate("/pricing")} className="text-sm text-theme-text-secondary hover:text-white transition-colors">Pricing</button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#75D6FF] text-gray-900 hover:bg-white transition-colors"
          >
            Get started free
          </button>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 pt-12 pb-20">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-theme-text-secondary mb-8">
          <button onClick={() => navigate("/blog")} className="hover:text-white transition-colors">Blog</button>
          <span>/</span>
          <span className="text-white">Home Language Learning</span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#75D6FF]/10 text-[#75D6FF] border border-[#75D6FF]/30">
            Education Insights
          </span>
          <span className="text-xs text-theme-text-secondary">By Farirai Dangwa</span>
          <span className="text-xs text-theme-text-secondary">&bull; 14 April 2026</span>
          <span className="text-xs text-theme-text-secondary">&bull; 6 min read</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-6">
          The Power of Home Language Learning for Student Success
        </h1>

        {/* Intro */}
        <p className="text-theme-text-secondary leading-relaxed mb-4">
          Language is more than a means of communication. It is the foundation through which children begin to understand the world. It shapes how they think, ask questions, express ideas, and make sense of what they are taught. 
        </p>
        <p className="text-theme-text-secondary leading-relaxed mb-6">
          When children start school and are suddenly expected to learn in a language they do not fully understand, the challenge is not only academic—it is emotional, social, and developmental. This is where the bridge between home and school often begins to crack.
        </p>

        {/* Quick tip box */}
        <div className="rounded-xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-5 mb-10">
          <p className="text-sm text-[#75D6FF] font-semibold mb-1">Key Insight</p>
          <p className="text-sm text-theme-text-secondary leading-relaxed">
            Students who learn core concepts in their home language (like Shona or Ndebele) develop a stronger cognitive foundation, making it significantly easier to master English later.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map(({ heading, body }) => (
            <div key={heading}>
              <h2 className="text-xl font-bold text-white mb-4">{heading}</h2>
              <div className="space-y-3">
                {body.map((para, i) => (
                  <p key={i} className="text-theme-text-secondary leading-relaxed text-sm">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Language Benefits Table */}
        <div className="mt-12 mb-10 rounded-xl border border-white/10 bg-theme-bg-secondary overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10">
            <h2 className="text-base font-bold text-white">Benefits of Multilingual Support</h2>
          </div>
          <div className="divide-y divide-white/10">
            {[
              { area: "Comprehension", benefit: "Grasp complex ZIMSEC/Cambridge topics faster" },
              { area: "Confidence", benefit: "Less fear of making mistakes or asking questions" },
              { area: "Inclusion", benefit: "Reduces the gap for students in rural or remote areas" },
              { area: "Retention", benefit: "Prevents dropout caused by language frustration" },
            ].map(({ area, benefit }) => (
              <div key={area} className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-3 gap-1">
                <span className="text-sm font-semibold text-[#75D6FF]">{area}</span>
                <span className="text-sm text-theme-text-secondary">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Summary List */}
        <div className="mb-10">
          <h2 className="text-xl font-bold text-white mb-4">How to use Chikoro AI for Language Support</h2>
          <ul className="space-y-3">
            {[
              "Ask questions in Shona or Ndebele for direct answers",
              "Paste an English textbook paragraph and ask for an explanation in your home language",
              "Use the AI to translate difficult exam terms to ensure you understand the core concept",
              "Practice speaking and writing in both English and local languages to build bilingual fluency",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-theme-text-secondary">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#75D6FF]/20 text-[#75D6FF] text-xs flex items-center justify-center font-bold mt-0.5">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Final Thought */}
        <blockquote className="border-l-2 border-[#75D6FF] pl-6 my-10 italic text-theme-text-secondary">
          "Every child deserves the chance to understand before being judged. When education begins in a language a child knows and trusts, learning becomes more natural, more empowering, and more effective."
        </blockquote>

        {/* CTA */}
        <div className="rounded-2xl bg-[#75D6FF]/5 border border-[#75D6FF]/30 p-8 text-center">
          <h2 className="text-xl font-bold text-white mb-3">Learn with clarity, confidence, and dignity</h2>
          <p className="text-sm text-theme-text-secondary mb-6 max-w-md mx-auto">
            Break the language barrier today. Access Zimbabwe's first AI tutor that speaks your language.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-3 rounded-xl bg-[#75D6FF] text-gray-900 font-bold hover:bg-white transition-colors text-sm"
            >
              Start Learning in Shona/Ndebele
            </button>
            <button
              onClick={() => navigate("/about")}
              className="px-8 py-3 rounded-xl border border-white/20 text-white font-semibold hover:border-[#75D6FF] transition-colors text-sm"
            >
              How it works
            </button>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a0d]">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <p className="text-lg font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-2">Chikoro AI</p>
            <p className="text-xs text-white/40 leading-relaxed max-w-xs">Zimbabwe's first AI tutor — aligned to ZIMSEC & Cambridge, in English, Shona, and Ndebele.</p>
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
            <p className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-4">Account</p>
            <ul className="space-y-2">
              {[{l:"Sign up free",p:"/register"},{l:"Log in",p:"/login"}].map(({l,p})=>(
                <li key={l}><button onClick={()=>navigate(p)} className="text-xs text-white/40 hover:text-white transition-colors">{l}</button></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-white/[0.06] px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/25">&copy; {new Date().getFullYear()} Chikoro AI &mdash; Zimbabwe&apos;s AI Tutor</p>
        </div>
      </footer>
    </div>
  );
}
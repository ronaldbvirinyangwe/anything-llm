import React from "react";
import { useNavigate } from "react-router-dom";

const posts = [
  {
    slug: "how-to-pass-zimsec-o-level-maths",
    title: "How to Pass ZIMSEC O-Level Maths: A Step-by-Step Study Guide",
    excerpt:
      "ZIMSEC O-Level Maths is one of the most important — and most feared — subjects on your certificate. Here is exactly what to do from now until exam day to pass with confidence.",
    date: "17 March 2026",
    readTime: "8 min read",
    tag: "Study Tips",
  },
  {
    slug: "best-ai-tools-homework-help-zimbabwe-2026",
    title: "Best AI Tools for Homework Help in Zimbabwe (2026)",
    excerpt:
      "We tested the top AI tools available to Zimbabwean students — here is how they stack up on ZIMSEC content, Shona support, price, and reliability.",
    date: "5 March 2026",
    readTime: "6 min read",
    tag: "AI Tools",
  },
  {
    slug: "chikoro-ai-apk-available-on-apk-pure",
    title: "Chikoro AI APK Available on APK Pure",
    excerpt:
      "Excited to announce that Chikoro AI is now available on APK Pure! Download the app and experience the future of education.",
    date: "14 March 2026",
    readTime: "5 min read",
    tag: "App Updates",
  },
];

export default function Blog() {
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
          <button onClick={() => navigate("/login")} className="text-sm text-theme-text-secondary hover:text-white transition-colors hidden sm:block">Log in</button>
          <button
            onClick={() => navigate("/register")}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-[#75D6FF] text-gray-900 hover:bg-white transition-colors"
          >
            Get started free
          </button>
        </div>
      </nav>

      {/* Header */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-10">
        <div className="inline-block bg-[#75D6FF]/10 border border-[#75D6FF]/30 rounded-full px-4 py-1 text-xs text-[#75D6FF] font-semibold mb-5 tracking-wide uppercase">
          Chikoro AI Blog
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">Study tips, AI tools & Zimbabwe education</h1>
        <p className="text-theme-text-secondary">
          Guides and insights for Zimbabwean students, parents, and teachers.
        </p>
      </div>

      {/* Posts */}
      <div className="max-w-4xl mx-auto px-6 pb-20 space-y-6">
        {posts.map((post) => (
          <button
            key={post.slug}
            onClick={() => navigate(`/blog/${post.slug}`)}
            className="w-full text-left rounded-2xl border border-white/10 bg-theme-bg-secondary p-8 hover:border-[#75D6FF]/50 transition-colors group"
          >
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#75D6FF]/10 text-[#75D6FF] border border-[#75D6FF]/30">
                {post.tag}
              </span>
              <span className="text-xs text-theme-text-secondary">{post.date}</span>
              <span className="text-xs text-theme-text-secondary">&bull; {post.readTime}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-3 group-hover:text-[#75D6FF] transition-colors leading-snug">
              {post.title}
            </h2>
            <p className="text-sm text-theme-text-secondary leading-relaxed">{post.excerpt}</p>
            <p className="text-sm text-[#75D6FF] mt-4 font-semibold">Read article &rarr;</p>
          </button>
        ))}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#060a0d]">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2">
            <p className="text-lg font-bold bg-gradient-to-r from-[#75D6FF] via-white to-[#75D6FF] bg-clip-text text-transparent mb-2">Chikoro AI</p>
            <p className="text-xs text-white/40 leading-relaxed max-w-xs">Zimbabwe's first AI tutor — built around the ZIMSEC curriculum.</p>
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

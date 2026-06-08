import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import Sidebar from "@/components/Sidebar";
import { useSidebarToggle } from "../../components/Sidebar/SidebarToggle/index";
import axios from "axios";

ChartJS.register(
  LineElement, BarElement, CategoryScale, LinearScale,
  PointElement, Tooltip, Legend, Filler
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const getMondayIndex = (date) => (new Date(date).getDay() + 6) % 7;

const getActiveWeekDays = (quizzes) => {
  const now    = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const active = new Set();
  quizzes.forEach((q) => {
    const d = new Date(q.createdAt);
    if (d >= monday) active.add(getMondayIndex(d));
  });
  return active;
};

const scoreColor  = (s) => s >= 80 ? "#16a34a" : s >= 60 ? "#ca8a04" : "#dc2626";
const scoreEmoji  = (s) => s >= 80 ? "🏆"      : s >= 60 ? "✅"      : "📝";
const diffBadge   = (d) => ({
  Easy:   { bg: "rgba(22,163,74,.15)",  color: "#16a34a" },
  Medium: { bg: "rgba(202,138,4,.15)",  color: "#ca8a04" },
  Hard:   { bg: "rgba(220,38,38,.15)",  color: "#dc2626" },
}[d] || { bg: "rgba(202,138,4,.15)", color: "#ca8a04" });

// ─── Shared components ────────────────────────────────────────────────────────

const ProgressBar = ({ value, color = "var(--theme-button-primary)", height = 6 }) => (
  <div style={{ width: "100%", height, background: "var(--theme-sidebar-item-default)", borderRadius: 99, overflow: "hidden" }}>
    <div style={{
      width: `${Math.min(value, 100)}%`, height: "100%",
      background: color, borderRadius: 99,
      transition: "width 1s cubic-bezier(.4,0,.2,1)",
    }} />
  </div>
);

const RingProgress = ({ value, max, label, sublabel, color, size = 110 }) => {
  const r    = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(value / max, 1) * circ);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size/2} cy={size/2} r={r} stroke="var(--theme-sidebar-item-default)" strokeWidth={9} fill="none" />
          <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={9} fill="none"
            strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--theme-text-primary)", lineHeight: 1 }}>{value}</span>
          {sublabel && <span style={{ fontSize: 10, color: "var(--theme-text-secondary)", marginTop: 2 }}>{sublabel}</span>}
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--theme-text-secondary)", textAlign: "center" }}>{label}</span>
    </div>
  );
};

const StreakWidget = ({ streak, activeDays }) => (
  <div className="report-card" style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 160 }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: "var(--theme-sidebar-item-default)",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
      }}>📈</div>
      <div>
        <div style={{ fontWeight: 800, fontSize: 18, color: "var(--theme-text-primary)" }}>{streak}-day Streak</div>
        <div style={{ fontSize: 13, color: "var(--theme-text-secondary)" }}>Keep moving forward!</div>
      </div>
    </div>
    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
      {DAYS.map((day, i) => {
        const done = activeDays.has(i);
        return (
          <div key={day} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11, color: "var(--theme-text-secondary)", fontWeight: 600 }}>{day}</span>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: done ? "var(--theme-button-primary)" : "transparent",
              border: done ? "none" : "2px solid var(--theme-sidebar-border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all .3s",
            }}>
              {done && (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const SubjectCard = ({ subject, average, quizCount, trend }) => {
  const color = average >= 80 ? "#16a34a" : average >= 60 ? "var(--theme-button-primary)" : "#dc2626";
  return (
    <div className="report-card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text-primary)" }}>{subject}</div>
          <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>{quizCount} quiz{quizCount !== 1 ? "zes" : ""}</div>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color }}>{average}%</div>
      </div>
      <ProgressBar value={average} color={color} height={7} />
      {trend !== null && (
        <div style={{ fontSize: 12, color: trend >= 0 ? "#16a34a" : "#dc2626" }}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend).toFixed(1)}% vs last quiz
        </div>
      )}
    </div>
  );
};

const StruggledRow = ({ question, userAnswer, correctAnswer, explanation }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 12,
      border: "1.5px solid rgba(220,38,38,.3)",
      background: "rgba(220,38,38,.05)",
      overflow: "hidden", marginBottom: 8,
    }}>
      <button onClick={() => setOpen((v) => !v)} style={{
        width: "100%", background: "none", border: "none", padding: "14px 18px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--theme-text-primary)", flex: 1, marginRight: 12 }}>{question}</span>
        <span style={{ fontSize: 18, color: "#dc2626", flexShrink: 0 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, display: "flex", gap: 8 }}>
            <span style={{ background: "rgba(220,38,38,.15)", color: "#dc2626", borderRadius: 6, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>Your answer</span>
            <span style={{ color: "var(--theme-text-secondary)" }}>{userAnswer || "—"}</span>
          </div>
          <div style={{ fontSize: 13, display: "flex", gap: 8 }}>
            <span style={{ background: "rgba(22,163,74,.15)", color: "#16a34a", borderRadius: 6, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>Correct</span>
            <span style={{ color: "var(--theme-text-secondary)" }}>{correctAnswer || "—"}</span>
          </div>
          {explanation && (
            <div style={{
              fontSize: 13, color: "var(--theme-text-secondary)",
              background: "var(--theme-sidebar-item-default)",
              borderRadius: 8, padding: "10px 12px", marginTop: 4,
            }}>
              💡 {explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const XPEntry = ({ points, source, date }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 0", borderBottom: "1px solid var(--theme-sidebar-border)" }}>
    <div style={{
      width: 40, height: 40, borderRadius: "50%",
      background: "var(--theme-sidebar-item-default)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 16, flexShrink: 0,
    }}>⭐</div>
    <div style={{ flex: 1 }}>
      <div style={{ fontWeight: 600, fontSize: 14, color: "var(--theme-text-primary)" }}>{source}</div>
      <div style={{ fontSize: 12, color: "var(--theme-text-secondary)" }}>
        {new Date(date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
    </div>
    <div style={{ fontWeight: 800, fontSize: 16, color: "var(--theme-button-primary)" }}>+{points} XP</div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export default function EnhancedStudentReport() {
  const { id }                    = useParams();
  const [report, setReport]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [isMobile, setIsMobile]   = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { showSidebar }           = useSidebarToggle();

  // Lock body scroll only on this page; restored on unmount
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token      = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem("chikoroai_user") || "{}");
        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/reports/student/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.data.success) { setError(res.data.error || "Failed to fetch report"); setLoading(false); return; }
        setReport({ ...res.data, streak: storedUser?.streak ?? 0 });
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Error fetching student performance report.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, border: "4px solid var(--theme-sidebar-border)",
          borderTopColor: "var(--theme-button-primary)", borderRadius: "50%",
          animation: "report-spin 1s linear infinite", margin: "0 auto 16px",
        }} />
        <p style={{ color: "var(--theme-text-secondary)", fontWeight: 600 }}>Loading your report…</p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)",
    }}>
      <div className="report-card" style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: "var(--theme-text-primary)", fontSize: 16 }}>{error}</p>
      </div>
    </div>
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const { student, quizzes, aiSummary, averageScore, totalXP, xpLogs, mastered, totalFlashcards, struggledAreas, streak } = report;

  const activeDays = getActiveWeekDays(quizzes);

  const subjectMap = {};
  quizzes.forEach((q) => {
    const s = q.subject || "General";
    if (!subjectMap[s]) subjectMap[s] = { scores: [] };
    subjectMap[s].scores.push(parseFloat(q.score));
  });
  const subjectStats = Object.entries(subjectMap).map(([subject, { scores }]) => ({
    subject,
    average: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1),
    quizCount: scores.length,
    trend: scores.length >= 2 ? scores[0] - scores[1] : null,
  }));

  const getTrend = () => {
    if (quizzes.length < 2) return "stable";
    const recent = quizzes.slice(0, 3).reduce((s, q) => s + parseFloat(q.score), 0) / Math.min(3, quizzes.length);
    const older  = quizzes.slice(-3).reduce((s, q) => s + parseFloat(q.score), 0) / Math.min(3, quizzes.length);
    if (recent > older + 5) return "improving";
    if (recent < older - 5) return "declining";
    return "stable";
  };
  const trend = getTrend();
  const trendConfig = {
    improving: { emoji: "📈", label: "Improving", color: "#16a34a" },
    declining: { emoji: "📉", label: "Declining", color: "#dc2626" },
    stable:    { emoji: "➡️", label: "Stable",    color: "var(--theme-button-primary)" },
  }[trend];

  // Charts — use CSS vars resolved at runtime for chart colors
  const chartTextColor   = getComputedStyle(document.documentElement).getPropertyValue("--theme-text-secondary").trim()   || "#888";
  const chartGridColor   = getComputedStyle(document.documentElement).getPropertyValue("--theme-sidebar-border").trim()   || "#333";
  const chartAccentColor = getComputedStyle(document.documentElement).getPropertyValue("--theme-button-primary").trim()   || "#46c8ff";

  const trendChartData = {
    labels: [...quizzes].reverse().map((q) =>
      new Date(q.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    ),
    datasets: [{
      label: "Score (%)",
      data: [...quizzes].reverse().map((q) => parseFloat(q.score).toFixed(1)),
      borderColor: chartAccentColor,
      backgroundColor: chartAccentColor + "18",
      tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7,
      pointBackgroundColor: chartAccentColor, pointBorderColor: "var(--theme-bg-primary)", pointBorderWidth: 2,
    }],
  };
  const chartOptions = (extra = {}) => ({
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: chartGridColor + "44" }, ticks: { color: chartTextColor, font: { size: 11 } }, ...extra.y },
      x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 11 } } },
    },
  });

  const subjectChartData = {
    labels: subjectStats.map((s) => s.subject),
    datasets: [{
      label: "Avg Score (%)",
      data: subjectStats.map((s) => s.average),
      backgroundColor: subjectStats.map((s) =>
        s.average >= 80 ? "rgba(22,163,74,.8)" : s.average >= 60 ? chartAccentColor + "cc" : "rgba(220,38,38,.8)"
      ),
      borderRadius: 8, borderSkipped: false,
    }],
  };

  const allStruggled = Object.entries(struggledAreas || {}).flatMap(([subject, qs]) =>
    qs.map((q) => ({ ...q, subject }))
  );

  const TABS = [
    { key: "overview",  label: "Overview" },
    { key: "subjects",  label: "Subjects" },
    { key: "struggles", label: `Needs Review${allStruggled.length ? ` (${allStruggled.length})` : ""}` },
    { key: "activity",  label: "XP & Activity" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex",
      background: "var(--theme-bg-primary)",
      fontFamily: "inherit", // use app's existing font
    }}>
      <style>{`
        @keyframes report-spin { to { transform: rotate(360deg); } }
        @keyframes report-fadeUp { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }

        .report-card {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 1px 8px rgba(0,0,0,.12);
        }
        .report-fade { animation: report-fadeUp .4s cubic-bezier(.4,0,.2,1) both; }

        .report-scroll::-webkit-scrollbar { width: 5px; }
        .report-scroll::-webkit-scrollbar-track { background: transparent; }
        .report-scroll::-webkit-scrollbar-thumb { background: var(--theme-sidebar-border); border-radius: 99px; }

        .report-tab {
          background: none; border: none; cursor: pointer;
          padding: 11px 18px; font-weight: 600; font-size: 14px;
          border-bottom: 2.5px solid transparent;
          color: var(--theme-text-secondary);
          transition: color .2s, border-color .2s;
          font-family: inherit; white-space: nowrap;
        }
        .report-tab.active { color: var(--theme-button-primary); border-bottom-color: var(--theme-button-primary); }
        .report-tab:hover:not(.active) { color: var(--theme-text-primary); }

        .report-stat-card {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 16px; padding: 22px;
          display: flex; flex-direction: column; gap: 6px;
          box-shadow: 0 1px 8px rgba(0,0,0,.12);
        }
        .report-quiz-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px;
          background: var(--theme-bg-container);
          border-radius: 12px;
          border: 1px solid var(--theme-sidebar-border);
        }
      `}</style>

      {/* ── SIDEBAR — static, never scrolls ── */}
      {!isMobile && (
        <div style={{ flexShrink: 0, height: "100vh", overflowY: "hidden", overflowX: "hidden" }}>
          <Sidebar />
        </div>
      )}

      {/* ── SCROLLABLE CONTENT ── */}
      <div className="report-scroll" style={{ flex: 1, height: "100vh", overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 32px" }}>

          {/* Header */}
          <div className="report-card report-fade" style={{
            marginBottom: 20,
            display: "flex", justifyContent: "space-between", alignItems: "center",
            flexWrap: "wrap", gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--theme-button-primary)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
                Performance Report
              </div>
              <h1 style={{ fontSize: isMobile ? 22 : 30, fontWeight: 800, color: "var(--theme-text-primary)", margin: 0 }}>
                Hello, {student.name}! 👋
              </h1>
              <p style={{ color: "var(--theme-text-secondary)", margin: "6px 0 0", fontSize: 14 }}>
              {student.grade} · Here's how you're doing
              </p>
            </div>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--theme-bg-container)",
              border: "1px solid var(--theme-sidebar-border)",
              borderRadius: 12, padding: "12px 18px",
            }}>
              <span style={{ fontSize: 24 }}>{trendConfig.emoji}</span>
              <div>
                <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", fontWeight: 500 }}>Your trend</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: trendConfig.color }}>{trendConfig.label}</div>
              </div>
            </div>
          </div>

          {/* Streak */}
          <div className="report-fade" style={{ marginBottom: 20, animationDelay: ".05s" }}>
            <StreakWidget streak={streak} activeDays={activeDays} />
          </div>

          {/* Stat cards */}
          <div className="report-fade" style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(175px, 1fr))",
            gap: 14, marginBottom: 24, animationDelay: ".1s",
          }}>
            {[
              { emoji: "🎯", label: "Avg Score",         value: `${averageScore}%`,              sub: "weighted by difficulty" },
              { emoji: "📝", label: "Quizzes Taken",     value: quizzes.length,                  sub: "total attempts" },
              { emoji: "⭐", label: "Total XP",           value: totalXP,                         sub: "experience points" },
              { emoji: "🃏", label: "Flashcard Mastery", value: `${mastered}/${totalFlashcards}`, sub: "cards mastered" },
            ].map(({ emoji, label, value, sub }) => (
              <div key={label} className="report-stat-card">
                <div style={{ fontSize: 20 }}>{emoji}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: "var(--theme-text-primary)", lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>{label}</div>
                <div style={{ fontSize: 11, color: "var(--theme-text-secondary)" }}>{sub}</div>
              </div>
            ))}
          </div>

          {/* Tabs panel */}
          <div className="report-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Tab bar */}
            <div style={{
              display: "flex", borderBottom: "1px solid var(--theme-sidebar-border)",
              padding: "0 12px", overflowX: "auto",
              background: "var(--theme-bg-sidebar)",
            }}>
              {TABS.map((tab) => (
                <button key={tab.key} className={`report-tab${activeTab === tab.key ? " active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: isMobile ? "20px 16px" : "28px 30px" }}>

              {/* ── OVERVIEW ── */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>📈 Score Trend</h2>
                    {quizzes.length > 1
                      ? <Line data={trendChartData} options={chartOptions()} />
                      : <p style={{ color: "var(--theme-text-secondary)", fontSize: 14 }}>Take more quizzes to see your trend.</p>
                    }
                  </div>

                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>🧠 AI Performance Summary</h2>
                    <div style={{
                      background: "linear-gradient(135deg, var(--theme-button-primary) 0%, #4f46e5 100%)",
                      borderRadius: 14, padding: "22px 26px",
                    }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h2:     ({ children }) => <h2     style={{ color: "#fff",              fontSize: 15, fontWeight: 700, margin: "14px 0 8px"  }}>{children}</h2>,
                          h3:     ({ children }) => <h3     style={{ color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 700, margin: "10px 0 6px"  }}>{children}</h3>,
                          p:      ({ children }) => <p      style={{ color: "rgba(255,255,255,.85)", margin: "0 0 10px", fontSize: 14, lineHeight: 1.7 }}>{children}</p>,
                          li:     ({ children }) => <li     style={{ color: "rgba(255,255,255,.85)", marginBottom: 4, fontSize: 14 }}>{children}</li>,
                          strong: ({ children }) => <strong style={{ color: "#fff" }}>{children}</strong>,
                        }}
                      >
                        {aiSummary}
                      </ReactMarkdown>
                    </div>
                  </div>

                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>🕐 Recent Quizzes</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {quizzes.slice(0, 5).map((quiz, i) => {
                        const score = parseFloat(quiz.score);
                        const diff  = diffBadge(quiz.difficulty);
                        return (
                          <div key={i} className="report-quiz-row">
                            <div style={{ fontSize: 22, flexShrink: 0 }}>{scoreEmoji(score)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text-primary)" }}>{quiz.subject || "General"}</div>
                              <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                                {new Date(quiz.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                {" · "}{quiz.correct_answers}/{quiz.total} correct
                              </div>
                            </div>
                            <div style={{
                              fontSize: 11, fontWeight: 700, background: diff.bg, color: diff.color,
                              borderRadius: 20, padding: "3px 10px", flexShrink: 0,
                            }}>{quiz.difficulty || "Medium"}</div>
                            <div style={{
                              fontSize: 18, fontWeight: 800, color: scoreColor(score),
                              flexShrink: 0, minWidth: 52, textAlign: "right",
                            }}>{score.toFixed(1)}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>
              )}

              {/* ── SUBJECTS ── */}
              {activeTab === "subjects" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>📚 Performance by Subject</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
                      {subjectStats.map((s) => <SubjectCard key={s.subject} {...s} />)}
                    </div>
                    {subjectStats.length > 1 && (
                      <>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>📊 Subject Comparison</h2>
                        <Bar data={subjectChartData} options={chartOptions()} />
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── NEEDS REVIEW ── */}
              {activeTab === "struggles" && (
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 6px" }}>🔍 Questions to Review</h2>
                  <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", margin: "0 0 20px" }}>
                    Expand each question to see the correct answer and explanation.
                  </p>
                  {allStruggled.length === 0
                    ? <div style={{ textAlign: "center", padding: "40px 0", color: "#16a34a", fontWeight: 700, fontSize: 15 }}>🎉 No struggles found — great work!</div>
                    : Object.entries(struggledAreas || {}).map(([subject, qs]) => (
                        <div key={subject} style={{ marginBottom: 24 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--theme-button-primary)", textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10 }}>
                            {subject}
                          </div>
                          {qs.map((q, i) => <StruggledRow key={i} {...q} />)}
                        </div>
                      ))
                  }
                </div>
              )}

              {/* ── XP & ACTIVITY ── */}
              {activeTab === "activity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 20px" }}>🏅 Stats at a Glance</h2>
                    <div style={{
                      display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center",
                      background: "var(--theme-bg-container)",
                      border: "1px solid var(--theme-sidebar-border)",
                      borderRadius: 16, padding: "28px 24px",
                    }}>
                      <RingProgress value={Math.round(averageScore)}                       max={100}                         label="Average Score"       sublabel="%"               color={chartAccentColor} />
                      <RingProgress value={Math.min(totalXP, 9999)}                        max={1000}                        label="XP Earned"           sublabel="pts"             color="#16a34a" />
                      <RingProgress value={totalFlashcards > 0 ? mastered : 0}             max={Math.max(totalFlashcards,1)} label="Flashcards Mastered" sublabel={`/${totalFlashcards}`} color="#f59e0b" />
                      <RingProgress value={streak}                                         max={30}                          label="Day Streak"          sublabel="days"            color="#ef4444" />
                    </div>
                  </div>

                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>⭐ XP History</h2>
                    {xpLogs.length === 0
                      ? <p style={{ color: "var(--theme-text-secondary)", fontSize: 14 }}>No XP earned yet. Complete quizzes to earn XP!</p>
                      : <>
                          {xpLogs.slice(0, 15).map((log, i) => <XPEntry key={i} {...log} date={log.date} />)}
                          {xpLogs.length > 15 && (
                            <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", textAlign: "center", marginTop: 12 }}>
                              + {xpLogs.length - 15} more entries
                            </p>
                          )}
                        </>
                    }
                  </div>

                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>📅 Activity — Last 30 Days</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 8 }}>
                      {Array.from({ length: 30 }, (_, i) => {
                        const d  = new Date();
                        d.setDate(d.getDate() - (29 - i));
                        const ds = d.toISOString().split("T")[0];
                        const dayQ = quizzes.filter((q) => new Date(q.createdAt).toISOString().split("T")[0] === ds);
                        const avg  = dayQ.length ? dayQ.reduce((s, q) => s + parseFloat(q.score), 0) / dayQ.length : null;
                        const bg   = avg === null
                          ? "var(--theme-sidebar-item-default)"
                          : avg >= 80 ? chartAccentColor
                          : avg >= 60 ? chartAccentColor + "99"
                          : avg >= 40 ? "#f59e0b"
                          : "#ef4444";
                        return (
                          <div key={i}
                            title={`${ds}${avg !== null ? ": " + avg.toFixed(1) + "%" : ": no activity"}`}
                            style={{ height: 32, borderRadius: 6, background: bg, cursor: "default", transition: "transform .15s" }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          />
                        );
                      })}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "var(--theme-text-secondary)" }}>
                      <span>No activity</span>
                      {["var(--theme-sidebar-item-default)", "#ef4444", "#f59e0b", chartAccentColor + "99", chartAccentColor].map((c, i) => (
                        <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
                      ))}
                      <span>High score</span>
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>

          <div style={{ height: 48 }} />
        </div>
      </div>
    </div>
  );
}
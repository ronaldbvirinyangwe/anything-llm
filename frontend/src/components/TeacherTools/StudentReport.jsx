import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Line, Bar, Radar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, BarElement, RadialLinearScale, ArcElement,
  CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler,
} from "chart.js";

ChartJS.register(
  LineElement, BarElement, RadialLinearScale, ArcElement,
  CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scoreColor = (s) => s >= 80 ? "#16a34a" : s >= 60 ? "var(--theme-button-primary)" : "#dc2626";
const scoreLabel = (s) => s >= 80 ? "Strong"  : s >= 60 ? "Satisfactory"               : "Needs Support";

const diffBadge = (d) => ({
  Easy:   { bg: "rgba(22,163,74,.12)",  color: "#16a34a" },
  Medium: { bg: "rgba(202,138,4,.12)",  color: "#ca8a04" },
  Hard:   { bg: "rgba(220,38,38,.12)",  color: "#dc2626" },
}[d] || { bg: "rgba(202,138,4,.12)", color: "#ca8a04" });

const getTrend = (quizzes) => {
  if (!quizzes || quizzes.length < 2) return "stable";
  const sorted = [...quizzes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recent = sorted.slice(-3).reduce((s, q) => s + parseFloat(q.score), 0) / Math.min(3, sorted.length);
  const older  = sorted.slice(0, 3).reduce((s, q) => s + parseFloat(q.score), 0) / Math.min(3, sorted.length);
  if (recent > older + 5) return "improving";
  if (recent < older - 5) return "declining";
  return "stable";
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ children }) => (
  <h2 style={{
    fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)",
    margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8,
  }}>{children}</h2>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 16, padding: "22px 24px",
    boxShadow: "0 1px 6px rgba(0,0,0,.1)",
    ...style,
  }}>{children}</div>
);

const ProgressBar = ({ value, color = "var(--theme-button-primary)", height = 6 }) => (
  <div style={{ width: "100%", height, background: "var(--theme-sidebar-item-default)", borderRadius: 99, overflow: "hidden" }}>
    <div style={{
      width: `${Math.min(value, 100)}%`, height: "100%",
      background: color, borderRadius: 99,
      transition: "width 1s cubic-bezier(.4,0,.2,1)",
    }} />
  </div>
);

const KpiCard = ({ emoji, label, value, sub, color }) => (
  <Card style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    <div style={{ fontSize: 20 }}>{emoji}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: color || "var(--theme-text-primary)", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: "var(--theme-text-secondary)" }}>{sub}</div>}
  </Card>
);

const StruggledRow = ({ question, userAnswer, correctAnswer, explanation }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      borderRadius: 12, border: "1px solid rgba(220,38,38,.25)",
      background: "rgba(220,38,38,.04)", overflow: "hidden", marginBottom: 8,
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", background: "none", border: "none", padding: "13px 16px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", flex: 1, marginRight: 12 }}>
          {question}
        </span>
        <span style={{ fontSize: 16, color: "#dc2626", flexShrink: 0 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 16px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: "rgba(220,38,38,.12)", color: "#dc2626", borderRadius: 6, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>Student answered</span>
            <span style={{ color: "var(--theme-text-secondary)" }}>{userAnswer || "—"}</span>
          </div>
          <div style={{ fontSize: 13, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{ background: "rgba(22,163,74,.12)", color: "#16a34a", borderRadius: 6, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>Correct answer</span>
            <span style={{ color: "var(--theme-text-secondary)" }}>{correctAnswer || "—"}</span>
          </div>
          {explanation && (
            <div style={{
              fontSize: 13, color: "var(--theme-text-secondary)",
              background: "var(--theme-sidebar-item-default)",
              borderRadius: 8, padding: "10px 12px", marginTop: 2,
            }}>
              💡 {explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeacherStudentReport() {
  const { id }            = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/reports/student/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) setReport(res.data);
        else setError(res.data.error || "Failed to fetch report");
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Error fetching student performance report.");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)", fontFamily: "inherit",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, border: "4px solid var(--theme-sidebar-border)",
          borderTopColor: "var(--theme-button-primary)", borderRadius: "50%",
          animation: "tsr-spin 1s linear infinite", margin: "0 auto 14px",
        }} />
        <style>{`@keyframes tsr-spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color: "var(--theme-text-secondary)", fontWeight: 600 }}>Loading report…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)", fontFamily: "inherit",
    }}>
      <div style={{
        background: "var(--theme-bg-secondary)", border: "1px solid var(--theme-sidebar-border)",
        borderRadius: 16, padding: 40, textAlign: "center", maxWidth: 400,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: "var(--theme-text-primary)", marginBottom: 16 }}>{error}</p>
        <Link to="/teacher/reports" style={{ color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 14 }}>← Back to Students</Link>
      </div>
    </div>
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const { student, quizzes, aiSummary, averageScore, totalXP, mastered, totalFlashcards, struggledAreas } = report;

  const quizzesChrono = [...quizzes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const trend         = getTrend(quizzes);
  const trendConfig   = {
    improving: { emoji: "📈", label: "Improving",  color: "#16a34a" },
    declining: { emoji: "📉", label: "Declining",  color: "#dc2626" },
    stable:    { emoji: "➡️", label: "Stable",     color: "var(--theme-button-primary)" },
  }[trend];

  // Subject stats
  const subjectMap = {};
  quizzes.forEach((q) => {
    const s = q.subject || "General";
    if (!subjectMap[s]) subjectMap[s] = { total: 0, count: 0 };
    subjectMap[s].total += parseFloat(q.score);
    subjectMap[s].count += 1;
  });
  const subjectAverages = Object.entries(subjectMap).map(([subject, { total, count }]) => ({
    subject, average: (total / count).toFixed(1),
  }));

  // Difficulty
  const diffCount = { Easy: 0, Medium: 0, Hard: 0 };
  quizzes.forEach((q) => { if (diffCount[q.difficulty] !== undefined) diffCount[q.difficulty]++; });

  // Struggled
  const allStruggled = Object.entries(struggledAreas || {}).flatMap(([subject, qs]) =>
    qs.map((q) => ({ ...q, subject }))
  );

  // Last active
  const lastActive = quizzes[0]?.createdAt;
  const daysSince  = lastActive ? Math.floor((Date.now() - new Date(lastActive)) / 86400000) : null;

  // Chart colors from CSS vars
  const chartText  = getComputedStyle(document.documentElement).getPropertyValue("--theme-text-secondary").trim()  || "#888";
  const chartGrid  = getComputedStyle(document.documentElement).getPropertyValue("--theme-sidebar-border").trim()  || "#333";
  const chartColor = getComputedStyle(document.documentElement).getPropertyValue("--theme-button-primary").trim()  || "#46c8ff";

  const baseChartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: chartGrid + "44" }, ticks: { color: chartText, font: { size: 11 } } },
      x: { grid: { display: false }, ticks: { color: chartText, font: { size: 11 } } },
    },
  };

  const trendChartData = {
    labels: quizzesChrono.map(q => new Date(q.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })),
    datasets: [{
      label: "Score (%)",
      data: quizzesChrono.map(q => parseFloat(q.score)),
      borderColor: chartColor, backgroundColor: chartColor + "18",
      tension: 0.4, fill: true,
      pointBackgroundColor: chartColor, pointBorderColor: "var(--theme-bg-primary)", pointBorderWidth: 2, pointRadius: 4,
    }],
  };

  const subjectChartData = {
    labels: subjectAverages.map(s => s.subject),
    datasets: [{
      label: "Avg Score (%)",
      data: subjectAverages.map(s => s.average),
      backgroundColor: subjectAverages.map(s =>
        s.average >= 80 ? "rgba(22,163,74,.8)" : s.average >= 60 ? chartColor + "cc" : "rgba(220,38,38,.8)"
      ),
      borderRadius: 8, borderSkipped: false,
    }],
  };

  const radarChartData = {
    labels: subjectAverages.map(s => s.subject),
    datasets: [{
      label: "Proficiency",
      data: subjectAverages.map(s => s.average),
      backgroundColor: chartColor + "22",
      borderColor: chartColor,
      pointBackgroundColor: chartColor,
      pointBorderColor: "var(--theme-bg-primary)",
    }],
  };

  const doughnutData = {
    labels: ["Easy", "Medium", "Hard"],
    datasets: [{
      data: [diffCount.Easy, diffCount.Medium, diffCount.Hard],
      backgroundColor: ["rgba(22,163,74,.8)", "rgba(202,138,4,.8)", "rgba(220,38,38,.8)"],
      borderWidth: 0,
    }],
  };

  const radarOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { r: { ticks: { display: false, color: chartText }, grid: { color: chartGrid + "44" }, pointLabels: { color: chartText, font: { size: 11 } } } },
  };

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: "bottom", labels: { color: chartText, font: { size: 11 }, padding: 16 } } },
  };

  // 30-day heatmap
  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    const d  = new Date();
    d.setDate(d.getDate() - (29 - i));
    const ds = d.toISOString().split("T")[0];
    const dayQ = quizzes.filter(q => new Date(q.createdAt).toISOString().split("T")[0] === ds);
    const avg  = dayQ.length ? dayQ.reduce((s, q) => s + parseFloat(q.score), 0) / dayQ.length : null;
    return { date: ds, avg };
  });

  const TABS = [
    { key: "overview",   label: "Overview" },
    { key: "subjects",   label: "Subjects" },
    { key: "struggles",  label: `Struggles${allStruggled.length ? ` (${allStruggled.length})` : ""}` },
    { key: "activity",   label: "Activity" },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes tsr-spin    { to { transform: rotate(360deg); } }
        @keyframes tsr-fadeUp  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .tsr-fade { animation: tsr-fadeUp .4s cubic-bezier(.4,0,.2,1) both; }
        .tsr-tab {
          background: none; border: none; cursor: pointer;
          padding: 11px 18px; font-weight: 600; font-size: 14px;
          border-bottom: 2.5px solid transparent;
          color: var(--theme-text-secondary);
          transition: color .2s, border-color .2s;
          font-family: inherit; white-space: nowrap;
        }
        .tsr-tab.active { color: var(--theme-button-primary); border-bottom-color: var(--theme-button-primary); }
        .tsr-tab:hover:not(.active) { color: var(--theme-text-primary); }
        .tsr-quiz-row {
          display: flex; align-items: center; gap: 14px;
          padding: 13px 16px;
          background: var(--theme-bg-container);
          border-radius: 12px;
          border: 1px solid var(--theme-sidebar-border);
          margin-bottom: 8px;
        }
        .tsr-scroll::-webkit-scrollbar { width: 0; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>

        {/* ── Back nav ── */}
        <Link to="/teacher/reports" style={{
          fontSize: 13, fontWeight: 600, color: "var(--theme-button-primary)",
          textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20,
        }}>← Back to Students</Link>

        {/* ── Header ── */}
        <div className="tsr-fade" style={{
          background: "var(--theme-bg-secondary)",
          border: "1px solid var(--theme-sidebar-border)",
          borderRadius: 20, padding: "28px 32px", marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,.1)",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--theme-button-primary)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
              Performance Analysis
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--theme-text-primary)", margin: 0 }}>{student.name}</h1>
            <p style={{ color: "var(--theme-text-secondary)", margin: "5px 0 0", fontSize: 14 }}>
              Grade {student.grade}
              {daysSince !== null && ` · Last active ${daysSince === 0 ? "today" : `${daysSince}d ago`}`}
            </p>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {/* Trend pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--theme-bg-container)",
              border: "1px solid var(--theme-sidebar-border)",
              borderRadius: 12, padding: "10px 16px",
            }}>
              <span style={{ fontSize: 20 }}>{trendConfig.emoji}</span>
              <div>
                <div style={{ fontSize: 11, color: "var(--theme-text-secondary)", fontWeight: 500 }}>Trend</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: trendConfig.color }}>{trendConfig.label}</div>
              </div>
            </div>
            {/* Score pill */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--theme-bg-container)",
              border: "1px solid var(--theme-sidebar-border)",
              borderRadius: 12, padding: "10px 16px",
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--theme-text-secondary)", fontWeight: 500 }}>Avg Score</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: scoreColor(averageScore) }}>
                  {averageScore}% · {scoreLabel(averageScore)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── KPI row ── */}
        <div className="tsr-fade" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: 14, marginBottom: 20, animationDelay: ".05s",
        }}>
          <KpiCard emoji="🎯" label="Avg Score"         value={`${averageScore}%`}              sub="weighted by difficulty" color={scoreColor(averageScore)} />
          <KpiCard emoji="📝" label="Quizzes Taken"     value={quizzes.length}                  sub="total attempts" />
          <KpiCard emoji="⭐" label="XP Earned"          value={totalXP}                         sub="experience points" />
          <KpiCard emoji="🃏" label="Flashcards"         value={`${mastered}/${totalFlashcards}`} sub="mastered" />
          {allStruggled.length > 0 && (
            <KpiCard emoji="⚠️" label="Struggled Questions" value={allStruggled.length} sub="needs review" color="#dc2626" />
          )}
        </div>

        {/* ── Tabbed panel ── */}
        <div className="tsr-fade" style={{
          background: "var(--theme-bg-secondary)",
          border: "1px solid var(--theme-sidebar-border)",
          borderRadius: 20, overflow: "hidden",
          boxShadow: "0 2px 12px rgba(0,0,0,.08)",
          animationDelay: ".1s",
        }}>
          {/* Tab bar */}
          <div className="tsr-scroll" style={{
            display: "flex", borderBottom: "1px solid var(--theme-sidebar-border)",
            padding: "0 12px", overflowX: "auto",
            background: "var(--theme-bg-sidebar)",
          }}>
            {TABS.map(tab => (
              <button key={tab.key} className={`tsr-tab${activeTab === tab.key ? " active" : ""}`}
                onClick={() => setActiveTab(tab.key)}>
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ padding: "28px 30px" }}>

            {/* ── OVERVIEW ── */}
            {activeTab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                {/* Score trend */}
                <div>
                  <SectionHeader>📈 Score Trend</SectionHeader>
                  {quizzesChrono.length > 1
                    ? <div style={{ height: 220 }}><Line data={trendChartData} options={baseChartOptions} /></div>
                    : <p style={{ color: "var(--theme-text-secondary)", fontSize: 14 }}>Not enough data to show a trend yet.</p>
                  }
                </div>

                {/* AI summary */}
                <div>
                  <SectionHeader>🧠 AI Performance Analysis</SectionHeader>
                  <div style={{
                    background: "linear-gradient(135deg, var(--theme-button-primary) 0%, #4f46e5 100%)",
                    borderRadius: 14, padding: "22px 26px",
                  }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2:     ({ children }) => <h2     style={{ color: "#fff",                fontSize: 15, fontWeight: 700, margin: "14px 0 8px" }}>{children}</h2>,
                        h3:     ({ children }) => <h3     style={{ color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 700, margin: "10px 0 6px" }}>{children}</h3>,
                        p:      ({ children }) => <p      style={{ color: "rgba(255,255,255,.85)", margin: "0 0 10px", fontSize: 14, lineHeight: 1.7 }}>{children}</p>,
                        li:     ({ children }) => <li     style={{ color: "rgba(255,255,255,.85)", marginBottom: 4, fontSize: 14 }}>{children}</li>,
                        strong: ({ children }) => <strong style={{ color: "#fff" }}>{children}</strong>,
                      }}
                    >
                      {aiSummary}
                    </ReactMarkdown>
                  </div>
                </div>

                {/* Recent quizzes */}
                <div>
                  <SectionHeader>🕐 Recent Quizzes</SectionHeader>
                  {quizzes.slice(0, 6).map((quiz, i) => {
                    const score = parseFloat(quiz.score);
                    const diff  = diffBadge(quiz.difficulty);
                    return (
                      <div key={i} className="tsr-quiz-row">
                        <div style={{ fontSize: 20, flexShrink: 0 }}>
                          {score >= 80 ? "🏆" : score >= 60 ? "✅" : "📝"}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text-primary)" }}>{quiz.subject || "General"}</div>
                          <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                            {new Date(quiz.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            {" · "}{quiz.correct_answers}/{quiz.total} correct
                          </div>
                        </div>
                        <div style={{
                          fontSize: 11, fontWeight: 700,
                          background: diff.bg, color: diff.color,
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
            )}

            {/* ── SUBJECTS ── */}
            {activeTab === "subjects" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                {/* Subject cards */}
                <div>
                  <SectionHeader>📚 Subject Averages</SectionHeader>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14, marginBottom: 28 }}>
                    {subjectAverages.map(({ subject, average }) => {
                      const color = scoreColor(average);
                      return (
                        <Card key={subject} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text-primary)" }}>{subject}</div>
                            <div style={{ fontWeight: 800, fontSize: 18, color }}>{average}%</div>
                          </div>
                          <ProgressBar value={average} color={color} height={6} />
                          <div style={{ fontSize: 11, color: "var(--theme-text-secondary)" }}>{scoreLabel(average)}</div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Charts */}
                {subjectAverages.length > 1 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                    <Card>
                      <SectionHeader>📊 Bar Comparison</SectionHeader>
                      <div style={{ height: 200 }}>
                        <Bar data={subjectChartData} options={baseChartOptions} />
                      </div>
                    </Card>
                    <Card>
                      <SectionHeader>🎯 Radar View</SectionHeader>
                      <div style={{ height: 200 }}>
                        <Radar data={radarChartData} options={radarOptions} />
                      </div>
                    </Card>
                  </div>
                )}

                {/* Difficulty doughnut */}
                <Card>
                  <SectionHeader>🔥 Difficulty Mix</SectionHeader>
                  <div style={{ height: 200, maxWidth: 280, margin: "0 auto" }}>
                    <Doughnut data={doughnutData} options={doughnutOptions} />
                  </div>
                </Card>

              </div>
            )}

            {/* ── STRUGGLES ── */}
            {activeTab === "struggles" && (
              <div>
                <SectionHeader>🔍 Questions This Student Struggled With</SectionHeader>
                <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", margin: "0 0 20px" }}>
                  These are specific questions answered incorrectly across all quizzes. Use this to identify knowledge gaps and plan targeted support.
                </p>
                {allStruggled.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#16a34a", fontWeight: 700, fontSize: 15 }}>
                    🎉 No struggles recorded — this student is doing great!
                  </div>
                ) : (
                  Object.entries(struggledAreas || {}).map(([subject, qs]) => (
                    <div key={subject} style={{ marginBottom: 24 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 700, color: "var(--theme-button-primary)",
                        textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 10,
                        display: "flex", alignItems: "center", gap: 8,
                      }}>
                        {subject}
                        <span style={{
                          fontSize: 11, background: "var(--theme-sidebar-item-default)",
                          color: "var(--theme-text-secondary)", borderRadius: 20,
                          padding: "1px 8px", fontWeight: 600, letterSpacing: 0,
                        }}>{qs.length} question{qs.length !== 1 ? "s" : ""}</span>
                      </div>
                      {qs.map((q, i) => <StruggledRow key={i} {...q} />)}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── ACTIVITY ── */}
            {activeTab === "activity" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                {/* 30-day heatmap */}
                <div>
                  <SectionHeader>📅 30-Day Activity</SectionHeader>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 8 }}>
                    {heatmapData.map(({ date, avg }, i) => {
                      const bg = avg === null
                        ? "var(--theme-sidebar-item-default)"
                        : avg >= 80 ? chartColor
                        : avg >= 60 ? chartColor + "99"
                        : avg >= 40 ? "#f59e0b"
                        : "#ef4444";
                      return (
                        <div key={i}
                          title={`${date}${avg !== null ? ": " + avg.toFixed(1) + "%" : ": no activity"}`}
                          style={{ height: 32, borderRadius: 6, background: bg, transition: "transform .15s", cursor: "default" }}
                          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                        />
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, fontSize: 12, color: "var(--theme-text-secondary)" }}>
                    <span>No activity</span>
                    {["var(--theme-sidebar-item-default)", "#ef4444", "#f59e0b", chartColor + "99", chartColor].map((c, i) => (
                      <div key={i} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
                    ))}
                    <span>High score</span>
                  </div>
                </div>

                {/* Full quiz history */}
                <div>
                  <SectionHeader>📋 Full Quiz History</SectionHeader>
                  {quizzesChrono.length === 0
                    ? <p style={{ color: "var(--theme-text-secondary)", fontSize: 14 }}>No quizzes taken yet.</p>
                    : [...quizzesChrono].reverse().map((quiz, i) => {
                        const score = parseFloat(quiz.score);
                        const diff  = diffBadge(quiz.difficulty);
                        return (
                          <div key={i} className="tsr-quiz-row">
                            <div style={{ fontSize: 18, flexShrink: 0 }}>
                              {score >= 80 ? "🏆" : score >= 60 ? "✅" : "📝"}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--theme-text-primary)" }}>{quiz.subject || "General"}</div>
                              <div style={{ fontSize: 11, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                                {new Date(quiz.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                {" · "}{quiz.correct_answers}/{quiz.total} correct
                              </div>
                            </div>
                            <div style={{
                              fontSize: 11, fontWeight: 700, background: diff.bg, color: diff.color,
                              borderRadius: 20, padding: "2px 9px", flexShrink: 0,
                            }}>{quiz.difficulty || "Medium"}</div>
                            <div style={{
                              fontSize: 16, fontWeight: 800, color: scoreColor(score),
                              flexShrink: 0, minWidth: 48, textAlign: "right",
                            }}>{score.toFixed(1)}%</div>
                          </div>
                        );
                      })
                  }
                </div>

              </div>
            )}

          </div>
        </div>

        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}
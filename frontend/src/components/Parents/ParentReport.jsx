import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { Line, Bar, Radar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import useUser from "@/hooks/useUser";
import Sidebar from "@/components/Sidebar";
import { useSidebarToggle } from "../../components/Sidebar/SidebarToggle/index";

ChartJS.register(
  LineElement, BarElement, RadialLinearScale, ArcElement,
  CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const scoreColor  = (s) => s >= 80 ? "#16a34a" : s >= 60 ? "var(--theme-button-primary)" : "#dc2626";
const scoreEmoji  = (s) => s >= 80 ? "🏆" : s >= 60 ? "✅" : "📝";
const diffBadge   = (d) => ({
  Easy:   { bg: "rgba(22,163,74,.15)",  color: "#16a34a" },
  Medium: { bg: "rgba(202,138,4,.15)",  color: "#ca8a04" },
  Hard:   { bg: "rgba(220,38,38,.15)",  color: "#dc2626" },
}[d] || { bg: "rgba(202,138,4,.15)", color: "#ca8a04" });

// ─── Shared UI components ─────────────────────────────────────────────────────

const ProgressBar = ({ value, color = "var(--theme-button-primary)", height = 6 }) => (
  <div style={{ width: "100%", height, background: "var(--theme-sidebar-item-default)", borderRadius: 99, overflow: "hidden" }}>
    <div style={{
      width: `${Math.min(value, 100)}%`, height: "100%",
      background: color, borderRadius: 99,
      transition: "width 1.1s cubic-bezier(.4,0,.2,1)",
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

const StatCard = ({ emoji, label, value, sub, accent }) => (
  <div className="pr-stat-card">
    <div style={{ fontSize: 20, marginBottom: 4 }}>{emoji}</div>
    <div style={{ fontSize: 26, fontWeight: 800, color: accent || "var(--theme-text-primary)", lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", marginTop: 4 }}>{label}</div>
    <div style={{ fontSize: 11, color: "var(--theme-text-secondary)", marginTop: 2 }}>{sub}</div>
  </div>
);

const SectionCard = ({ title, children, style = {} }) => (
  <div className="pr-card" style={style}>
    {title && (
      <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 18px", display: "flex", alignItems: "center", gap: 8 }}>
        {title}
      </h2>
    )}
    {children}
  </div>
);

// Struggled question accordion (mirrored from student report)
const StruggledRow = ({ question, userAnswer, correctAnswer, explanation, timesWrong, resolved }) => {
  const [open, setOpen] = useState(false);
 return (
    <div style={{
      borderRadius: 12,
      border: `1.5px solid ${resolved ? "rgba(22,163,74,.3)" : "rgba(220,38,38,.3)"}`,
      background: resolved ? "rgba(22,163,74,.05)" : "rgba(220,38,38,.05)",
      overflow: "hidden", marginBottom: 8,
    }}>
      <button onClick={() => setOpen(v => !v)} style={{
        width: "100%", background: "none", border: "none", padding: "14px 18px",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        cursor: "pointer", textAlign: "left",
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: "var(--theme-text-primary)", flex: 1, marginRight: 12 }}>
          {question}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* Persistence badge */}
          {timesWrong > 1 && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: timesWrong >= 3 ? "rgba(220,38,38,.15)" : "rgba(202,138,4,.15)",
              color: timesWrong >= 3 ? "#dc2626" : "#ca8a04",
              borderRadius: 20, padding: "2px 8px",
            }}>
              ✗ {timesWrong}x
            </span>
          )}
          {resolved && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              background: "rgba(22,163,74,.15)", color: "#16a34a",
              borderRadius: 20, padding: "2px 8px",
            }}>✓ Resolved</span>
          )}
          <span style={{ fontSize: 18, color: "#dc2626" }}>{open ? "−" : "+"}</span>
        </div>
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 13, display: "flex", gap: 8 }}>
            <span style={{ background: "rgba(220,38,38,.15)", color: "#dc2626", borderRadius: 6, padding: "2px 8px", fontWeight: 600, flexShrink: 0 }}>Your child answered</span>
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

// ─── Printable PDF card ───────────────────────────────────────────────────────

const PrintableCard = ({ printRef, child, averageScore, quizzes, subjectAverages, classAverages, trend, summary, homeAdvice }) => (
  <div
    ref={printRef}
    style={{
      position: "fixed", top: "-9999px", left: "-9999px",
      width: "794px", padding: "48px", backgroundColor: "#ffffff",
      fontFamily: "Inter, system-ui, sans-serif", color: "#0f172a",
    }}
  >
    {/* Header */}
    <div style={{ borderBottom: "3px solid #46c8ff", paddingBottom: "20px", marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#46c8ff", marginBottom: 6 }}>Chikoro AI · Parent Report</div>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#0f172a", margin: 0 }}>{child?.name}</h1>
        <p style={{ color: "#64748b", margin: "4px 0 0", fontSize: "15px" }}>{child?.grade} · Term Report</p>
      </div>
      <div style={{ textAlign: "right" }}>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: 0 }}>Generated by Chikoro AI</p>
        <p style={{ fontSize: "13px", color: "#94a3b8", margin: "2px 0 0" }}>
          {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>
    </div>

    {/* Summary stats */}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "16px", marginBottom: "28px" }}>
      {[
        { label: "Overall Average", value: `${averageScore}%` },
        { label: "Total Quizzes",   value: quizzes.length },
        { label: "Trend",           value: trend.charAt(0).toUpperCase() + trend.slice(1) },
      ].map(s => (
        <div key={s.label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
          <div style={{ fontSize: "28px", fontWeight: 700, color: "#46c8ff" }}>{s.value}</div>
          <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{s.label}</div>
        </div>
      ))}
    </div>

    {/* Subject table */}
    <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "12px", color: "#0f172a" }}>Subject Performance</h2>
    <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "28px", fontSize: "14px" }}>
      <thead>
        <tr style={{ background: "#0f172a", color: "white" }}>
          <th style={{ padding: "10px 14px", textAlign: "left" }}>Subject</th>
          <th style={{ padding: "10px 14px", textAlign: "center" }}>{child?.name}'s Average</th>
          {Object.keys(classAverages || {}).length > 0 && <th style={{ padding: "10px 14px", textAlign: "center" }}>Class Average</th>}
        </tr>
      </thead>
      <tbody>
        {subjectAverages.map((s, i) => (
          <tr key={s.subject} style={{ background: i % 2 === 0 ? "#f8fafc" : "#ffffff" }}>
            <td style={{ padding: "10px 14px", fontWeight: 500 }}>{s.subject}</td>
            <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 700, color: "#46c8ff" }}>{s.average}%</td>
            {Object.keys(classAverages || {}).length > 0 && (
              <td style={{ padding: "10px 14px", textAlign: "center", color: "#64748b" }}>
                {s.classAverage !== null ? `${s.classAverage}%` : "—"}
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>

    <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px", color: "#0f172a" }}>AI Performance Insights</h2>
    <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#334155", marginBottom: "24px" }}>{summary}</p>

    {homeAdvice && (
      <>
        <h2 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "10px", color: "#0f172a" }}>How You Can Help at Home</h2>
        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#334155" }}>{homeAdvice}</p>
      </>
    )}

    <div style={{ marginTop: "40px", borderTop: "1px solid #e2e8f0", paddingTop: "14px", fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>
      Generated by Chikoro AI · {new Date().getFullYear()}
    </div>
  </div>
);

// ─── Tabs config ──────────────────────────────────────────────────────────────

const TABS = (struggledCount) => [
  { key: "overview",   label: "Overview" },
  { key: "subjects",   label: "Subjects" },
  { key: "struggles",  label: `Needs Attention${struggledCount ? ` (${struggledCount})` : ""}` },
  { key: "activity",   label: "Activity" },
  { key: "home",       label: "Help at Home" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ParentReport() {
  const { childId }   = useParams();
  const navigate      = useNavigate();
  const { user }      = useUser();
  const { showSidebar } = useSidebarToggle();

  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState("");
  const [report, setReport]                 = useState(null);
  const [selectedReportIndex, setSelectedReportIndex] = useState(0);
  const [activeTab, setActiveTab]           = useState("overview");
  const [isMobile, setIsMobile]             = useState(false);

  // Notification
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [notifSettings, setNotifSettings]   = useState({ weekly: true, alerts: true });
  const [notifSaving, setNotifSaving]       = useState(false);
  const [notifSaved, setNotifSaved]         = useState(false);

  // Email prompt
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [emailInput, setEmailInput]           = useState("");
  const [emailSaving, setEmailSaving]         = useState(false);
  const [emailSaved, setEmailSaved]           = useState(false);
  const [parentEmail, setParentEmail]         = useState(null);

  // PDF
  const [exportingPdf, setExportingPdf] = useState(false);
  const printRef = useRef(null);

  const accessToken = localStorage.getItem("chikoroai_authToken");
  const API_BASE    = import.meta.env.VITE_API_BASE || "https://api.chikoro-ai.com/api";

  // Lock scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Mobile detect
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!accessToken || !user?.id) { navigate("/login"); return; }
    fetchChildReports();
  }, [childId, user, accessToken]);

  const fetchChildReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/system/parent/child-report/${childId}`, {
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      });
      if (!res.ok) { setError("Failed to load report"); setLoading(false); return; }
      const data = await res.json();
      if (data.success) {
        setReport(data);
        if (data.notifSettings) {
          setNotifSettings({
            weekly: data.notifSettings.weeklyDigest ?? true,
            alerts: data.notifSettings.alertsEnabled ?? true,
          });
        }
        const email = data.parentEmail ?? null;
        setParentEmail(email);
        if (!email) setShowEmailPrompt(true);
      } else {
        setError(data.error || "Could not load report");
      }
    } catch (err) {
      console.error("Error fetching child report:", err);
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const saveNotifSettings = async () => {
    setNotifSaving(true);
    try {
      await fetch(`${API_BASE}/system/parent/notification-settings`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ childId, weeklyDigest: notifSettings.weekly, alertsEnabled: notifSettings.alerts, alertThreshold: 40 }),
      });
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2500);
    } catch (err) {
      console.error("Failed to save notification settings:", err);
    } finally {
      setNotifSaving(false);
    }
  };

  const saveParentEmail = async () => {
    console.log("saveParentEmail called, emailInput:", emailInput);
    if (!emailInput || !emailInput.includes("@")) return;
    setEmailSaving(true);
    try {
      const res = await fetch(`${API_BASE}/system/parent/parent-contact`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput }),
      });
      if (res.ok) {
        setParentEmail(emailInput);
        setEmailSaved(true);
        setTimeout(() => { setShowEmailPrompt(false); setEmailSaved(false); }, 1500);
      }
    } catch (err) {
      console.error("Failed to save email:", err);
    } finally {
      setEmailSaving(false);
    }
  };

  const exportPdf = async () => {
    if (!printRef.current) return;
    setExportingPdf(true);
    try {
      const canvas = await html2canvas(printRef.current, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${child?.name}_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExportingPdf(false);
    }
  };

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
          animation: "pr-spin 1s linear infinite", margin: "0 auto 16px",
        }} />
        <p style={{ color: "var(--theme-text-secondary)", fontWeight: 600 }}>Loading report…</p>
      </div>
    </div>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{
      position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)",
    }}>
      <div className="pr-card" style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: "var(--theme-text-primary)", fontSize: 16, marginBottom: 20 }}>{error}</p>
        <button onClick={() => navigate("/parent/dashboard")} className="pr-btn-primary">
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );

  // ── Derived data ──────────────────────────────────────────────────────────
  const { child = {}, reports = [] } = report || {};
  const selectedReport = reports[selectedReportIndex] || {};

  const {
    date             = "",
    quizzes          = [],
    summary          = "",
    homeAdvice       = "",
    averageScore     = 0,
    totalXP          = 0,
    mastered         = 0,
    totalFlashcards  = 0,
    classAverages    = {},
    classScoreTrend  = [],
    struggledAreas   = {},
  } = selectedReport;

  // Subject breakdown
  const subjectStats = {};
  quizzes.forEach(q => {
    const subj = q.subject || "General";
    if (!subjectStats[subj]) subjectStats[subj] = { total: 0, count: 0, scores: [] };
    const s = parseFloat(q.score);
    subjectStats[subj].total += s;
    subjectStats[subj].count += 1;
    subjectStats[subj].scores.push(s);
  });
  const subjectAverages = Object.keys(subjectStats).map(subj => ({
    subject:      subj,
    average:      (subjectStats[subj].total / subjectStats[subj].count).toFixed(1),
    classAverage: classAverages[subj] ?? null,
    quizCount:    subjectStats[subj].count,
    trend:        subjectStats[subj].scores.length >= 2
      ? subjectStats[subj].scores[0] - subjectStats[subj].scores[1]
      : null,
  }));

  // Difficulty distribution
  const difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };
  quizzes.forEach(q => {
    const diff = q.difficulty || "Medium";
    if (difficultyCount[diff] !== undefined) difficultyCount[diff]++;
  });

  // Score distribution
  const scoreRanges = { "0–20": 0, "21–40": 0, "41–60": 0, "61–80": 0, "81–100": 0 };
  quizzes.forEach(q => {
    const s = parseFloat(q.score);
    if (s <= 20)       scoreRanges["0–20"]++;
    else if (s <= 40)  scoreRanges["21–40"]++;
    else if (s <= 60)  scoreRanges["41–60"]++;
    else if (s <= 80)  scoreRanges["61–80"]++;
    else               scoreRanges["81–100"]++;
  });

  // Trend
  const getImprovementTrend = () => {
    if (quizzes.length < 2) return "stable";
    const recent    = quizzes.slice(0, 3);
    const older     = quizzes.slice(-3);
    const recentAvg = recent.reduce((s, q) => s + parseFloat(q.score), 0) / recent.length;
    const olderAvg  = older.reduce((s, q) => s + parseFloat(q.score), 0) / older.length;
    if (recentAvg > olderAvg + 5) return "improving";
    if (recentAvg < olderAvg - 5) return "declining";
    return "stable";
  };
  const trend = getImprovementTrend();
  const trendConfig = {
    improving: { emoji: "📈", label: "Improving", color: "#16a34a" },
    declining: { emoji: "📉", label: "Declining", color: "#dc2626" },
    stable:    { emoji: "➡️", label: "Stable",    color: "var(--theme-button-primary)" },
  }[trend];

  // Heatmap
  const heatmapData = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayQ = quizzes.filter(q => new Date(q.createdAt).toISOString().split("T")[0] === dateStr);
    return {
      date: dateStr,
      score: dayQ.length > 0 ? dayQ.reduce((s, q) => s + parseFloat(q.score), 0) / dayQ.length : null,
    };
  });

  // Struggled areas (all subjects flattened)
  const allStruggled = Object.entries(struggledAreas || {}).flatMap(([subject, qs]) =>
    qs.map(q => ({ ...q, subject }))
  );

  // Chart theme colours
  const chartTextColor   = getComputedStyle(document.documentElement).getPropertyValue("--theme-text-secondary").trim()  || "#888";
  const chartGridColor   = getComputedStyle(document.documentElement).getPropertyValue("--theme-sidebar-border").trim()  || "#333";
  const chartAccentColor = getComputedStyle(document.documentElement).getPropertyValue("--theme-button-primary").trim()  || "#46c8ff";

  const baseChartOptions = (extra = {}) => ({
    responsive: true,
    plugins: { legend: { labels: { color: chartTextColor, font: { size: 11 } } } },
    scales: {
      y: { beginAtZero: true, max: 100, grid: { color: chartGridColor + "44" }, ticks: { color: chartTextColor, font: { size: 11 } }, ...extra.y },
      x: { grid: { display: false }, ticks: { color: chartTextColor, font: { size: 11 } } },
    },
    ...extra,
  });

  // Chart data
  const trendChartData = {
    labels: [...quizzes].reverse().map(q =>
      new Date(q.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
    ),
    datasets: [
      {
        label: `${child.name}'s Score (%)`,
        data: [...quizzes].reverse().map(q => parseFloat(q.score).toFixed(1)),
        borderColor: chartAccentColor,
        backgroundColor: chartAccentColor + "18",
        tension: 0.4, fill: true, pointRadius: 5, pointHoverRadius: 7,
        pointBackgroundColor: chartAccentColor, pointBorderColor: "var(--theme-bg-primary)", pointBorderWidth: 2,
      },
      ...(classScoreTrend.length > 0 ? [{
        label: "Class Average (%)",
        data: classScoreTrend,
        borderColor: "#f59e0b",
        backgroundColor: "transparent",
        borderDash: [6, 3], tension: 0.4, pointRadius: 0, borderWidth: 2,
      }] : []),
    ],
  };

  const subjectChartData = {
    labels: subjectAverages.map(s => s.subject),
    datasets: [
      {
        label: `${child.name}'s Average (%)`,
        data: subjectAverages.map(s => s.average),
        backgroundColor: chartAccentColor + "cc",
        borderColor: chartAccentColor,
        borderWidth: 2, borderRadius: 8, borderSkipped: false,
      },
      ...(Object.keys(classAverages).length > 0 ? [{
        label: "Class Average (%)",
        data: subjectAverages.map(s => s.classAverage ?? 0),
        backgroundColor: "rgba(245,158,11,.6)",
        borderColor: "rgb(245,158,11)",
        borderWidth: 2, borderRadius: 8, borderSkipped: false,
      }] : []),
    ],
  };

  const radarChartData = {
    labels: subjectAverages.map(s => s.subject),
    datasets: [
      {
        label: child.name,
        data: subjectAverages.map(s => s.average),
        backgroundColor: chartAccentColor + "33",
        borderColor: chartAccentColor,
        borderWidth: 3,
        pointBackgroundColor: chartAccentColor,
        pointBorderColor: "var(--theme-bg-primary)",
      },
      ...(Object.keys(classAverages).length > 0 ? [{
        label: "Class Average",
        data: subjectAverages.map(s => s.classAverage ?? 0),
        backgroundColor: "rgba(245,158,11,.15)",
        borderColor: "rgb(245,158,11)",
        borderWidth: 2,
        pointBackgroundColor: "rgb(245,158,11)",
        pointBorderColor: "var(--theme-bg-primary)",
      }] : []),
    ],
  };

  const radarOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: chartTextColor, font: { size: 11 } } } },
    scales: {
      r: {
        beginAtZero: true, max: 100,
        grid: { color: chartGridColor + "55" },
        angleLines: { color: chartGridColor + "55" },
        ticks: { color: chartTextColor, font: { size: 10 }, backdropColor: "transparent" },
        pointLabels: { color: chartTextColor, font: { size: 11 } },
      },
    },
  };

  const difficultyPieData = {
    labels: ["Easy", "Medium", "Hard"],
    datasets: [{
      data: [difficultyCount.Easy, difficultyCount.Medium, difficultyCount.Hard],
      backgroundColor: ["rgba(22,163,74,.8)", "rgba(202,138,4,.8)", "rgba(220,38,38,.8)"],
      borderColor: ["#16a34a", "#ca8a04", "#dc2626"],
      borderWidth: 2,
    }],
  };

  const histogramData = {
    labels: Object.keys(scoreRanges),
    datasets: [{
      label: "Number of Quizzes",
      data: Object.values(scoreRanges),
      backgroundColor: chartAccentColor + "99",
      borderColor: chartAccentColor,
      borderWidth: 2, borderRadius: 8, borderSkipped: false,
    }],
  };

  const tabs = TABS(allStruggled.length);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      position: "fixed", inset: 0, display: "flex",
      background: "var(--theme-bg-primary)",
      fontFamily: "inherit",
    }}>
      <style>{`
        @keyframes pr-spin     { to { transform: rotate(360deg); } }
        @keyframes pr-fadeUp   { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:none } }
        @keyframes pr-scaleIn  { from { opacity:0; transform:scale(.96) } to { opacity:1; transform:scale(1) } }

        .pr-fade { animation: pr-fadeUp .4s cubic-bezier(.4,0,.2,1) both; }

        .pr-scroll::-webkit-scrollbar { width: 5px; }
        .pr-scroll::-webkit-scrollbar-track { background: transparent; }
        .pr-scroll::-webkit-scrollbar-thumb { background: var(--theme-sidebar-border); border-radius: 99px; }

        .pr-card {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 16px;
          padding: 22px;
          box-shadow: 0 1px 8px rgba(0,0,0,.12);
        }

        .pr-stat-card {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 16px; padding: 20px;
          display: flex; flex-direction: column; gap: 4px;
          box-shadow: 0 1px 8px rgba(0,0,0,.12);
        }

        .pr-tab {
          background: none; border: none; cursor: pointer;
          padding: 11px 18px; font-weight: 600; font-size: 14px;
          border-bottom: 2.5px solid transparent;
          color: var(--theme-text-secondary);
          transition: color .2s, border-color .2s;
          font-family: inherit; white-space: nowrap;
        }
        .pr-tab.active { color: var(--theme-button-primary); border-bottom-color: var(--theme-button-primary); }
        .pr-tab:hover:not(.active) { color: var(--theme-text-primary); }

        .pr-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 18px;
          background: var(--theme-button-primary);
          color: var(--theme-bg-primary);
          border: none; border-radius: 10px; font-weight: 700;
          font-size: 13px; cursor: pointer; font-family: inherit;
          transition: opacity .2s, transform .15s;
        }
        .pr-btn-primary:hover { opacity: .88; transform: translateY(-1px); }
        .pr-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none; }

        .pr-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 10px 16px;
          background: var(--theme-bg-secondary);
          color: var(--theme-text-primary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 10px; font-weight: 600;
          font-size: 13px; cursor: pointer; font-family: inherit;
          transition: border-color .2s, transform .15s, box-shadow .2s;
        }
        .pr-btn-ghost:hover {
          border-color: var(--theme-button-primary);
          box-shadow: 0 0 0 1px var(--theme-button-primary);
          transform: translateY(-1px);
        }

        .pr-quiz-row {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 18px;
          background: var(--theme-bg-container, var(--theme-bg-primary));
          border-radius: 12px;
          border: 1px solid var(--theme-sidebar-border);
        }

        .pr-subject-card {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 14px; padding: 18px;
          display: flex; flex-direction: column; gap: 10px;
          box-shadow: 0 1px 6px rgba(0,0,0,.1);
        }

        .pr-modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center;
          background: rgba(0,0,0,.5);
          backdrop-filter: blur(4px);
          animation: pr-scaleIn .2s ease both;
        }
        .pr-modal {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 20px;
          padding: 32px;
          max-width: 440px; width: calc(100% - 32px);
          box-shadow: 0 24px 80px rgba(0,0,0,.4);
        }

        .pr-toggle {
          position: relative; width: 40px; height: 22px; flex-shrink: 0;
        }
        .pr-toggle input { opacity: 0; width: 0; height: 0; }
        .pr-toggle-track {
          position: absolute; inset: 0; cursor: pointer;
          background: var(--theme-sidebar-item-default);
          border-radius: 99px; transition: background .25s;
        }
        .pr-toggle input:checked + .pr-toggle-track { background: var(--theme-button-primary); }
        .pr-toggle-thumb {
          position: absolute; height: 16px; width: 16px; left: 3px; bottom: 3px;
          background: white; border-radius: 50%; transition: transform .25s;
          pointer-events: none;
        }
        .pr-toggle input:checked ~ .pr-toggle-thumb { transform: translateX(18px); }

        .pr-input {
          width: 100%; padding: 11px 14px;
          background: var(--theme-bg-primary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 10px;
          color: var(--theme-text-primary);
          font-size: 14px; font-family: inherit;
          outline: none; transition: border-color .2s, box-shadow .2s;
          box-sizing: border-box;
        }
        .pr-input:focus {
          border-color: var(--theme-button-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-button-primary) 20%, transparent);
        }
        .pr-input::placeholder { color: var(--theme-text-secondary); opacity: .6; }
      `}</style>

      {/* ── Hidden PDF target ─────────────────────────────────── */}
      <PrintableCard
        printRef={printRef}
        child={child}
        averageScore={averageScore}
        quizzes={quizzes}
        subjectAverages={subjectAverages}
        classAverages={classAverages}
        trend={trend}
        summary={summary}
        homeAdvice={homeAdvice}
      />

      {/* ── Email prompt modal ────────────────────────────────── */}
      {showEmailPrompt && (
        <div className="pr-modal-overlay">
          <div className="pr-modal">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: "var(--theme-sidebar-item-default)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
                }}>📬</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 17, color: "var(--theme-text-primary)" }}>Stay in the loop</div>
                  <div style={{ fontSize: 13, color: "var(--theme-text-secondary)", marginTop: 2 }}>Where should we send updates?</div>
                </div>
              </div>
              <button onClick={() => setShowEmailPrompt(false)} style={{
                background: "none", border: "none", fontSize: 22, cursor: "pointer",
                color: "var(--theme-text-secondary)", lineHeight: 1, padding: 4,
              }}>×</button>
            </div>

            <p style={{ fontSize: 14, color: "var(--theme-text-secondary)", marginBottom: 18, lineHeight: 1.6 }}>
              Get <strong style={{ color: "var(--theme-text-primary)" }}>{child?.name}'s</strong> weekly progress digest and
              low-score alerts sent straight to your inbox.
            </p>

            <div style={{
              background: "var(--theme-sidebar-item-default)",
              borderRadius: 12, padding: "14px 16px",
              marginBottom: 18, display: "flex", flexDirection: "column", gap: 10,
            }}>
              {[
                { icon: "📅", text: <><strong>Weekly digest</strong> — every Sunday morning</> },
                { icon: "⚠️", text: <><strong>Low-score alert</strong> — if {child?.name} scores below 40%</> },
              ].map((item, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--theme-text-secondary)" }}>
                  <span>{item.icon}</span><span>{item.text}</span>
                </div>
              ))}
            </div>

            <input
              type="email" value={emailInput}
              onChange={e => setEmailInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveParentEmail()}
              placeholder="your@email.com"
              className="pr-input"
              style={{ marginBottom: 14 }}
              autoFocus
            />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={saveParentEmail} disabled={emailSaving || !emailInput.includes("@")} className="pr-btn-primary" style={{ flex: 1 }}>
                {emailSaving ? "Saving…" : emailSaved ? "✅ Saved!" : "Save email"}
              </button>
              <button onClick={() => setShowEmailPrompt(false)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "var(--theme-text-secondary)", fontSize: 13, fontWeight: 600, padding: "10px 12px", fontFamily: "inherit",
              }}>
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SCROLLABLE CONTENT ────────────────────────────────── */}
      <div className="pr-scroll" style={{ flex: 1, height: "100vh", overflowY: "auto", overflowX: "hidden" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: isMobile ? "24px 16px" : "40px 32px" }}>

          {/* ── Notification panel ─────────────────────────────── */}
          {showNotifPanel && (
            <div className="pr-card pr-fade" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text-primary)" }}>🔔 Notification Preferences</div>
                  {parentEmail && (
                    <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 4 }}>
                      Sent to <strong>{parentEmail}</strong> ·{" "}
                      <button onClick={() => { setEmailInput(parentEmail); setShowEmailPrompt(true); setShowNotifPanel(false); }} style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 12, fontFamily: "inherit",
                      }}>Change</button>
                    </div>
                  )}
                </div>
                <button onClick={() => setShowNotifPanel(false)} style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: "var(--theme-text-secondary)", fontSize: 20, lineHeight: 1, padding: 4,
                }}>×</button>
              </div>

              {[
                { key: "weekly", label: "Weekly digest email", desc: `Receive a summary of ${child?.name}'s progress every Sunday morning.` },
                { key: "alerts", label: "Low score alerts",   desc: `Get notified if ${child?.name} scores below 40% on any quiz.` },
              ].map(item => (
                <div key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 16 }}>
                  <label className="pr-toggle" style={{ marginTop: 2 }}>
                    <input type="checkbox" checked={notifSettings[item.key]}
                      onChange={e => setNotifSettings(s => ({ ...s, [item.key]: e.target.checked }))} />
                    <div className="pr-toggle-track" />
                    <div className="pr-toggle-thumb" />
                  </label>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--theme-text-primary)" }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 3 }}>{item.desc}</div>
                  </div>
                </div>
              ))}

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
                <button onClick={saveNotifSettings} disabled={notifSaving} className="pr-btn-primary">
                  {notifSaving ? "Saving…" : "Save preferences"}
                </button>
                {notifSaved && <span style={{ fontSize: 13, color: "#16a34a", fontWeight: 600 }}>✅ Saved!</span>}
              </div>
            </div>
          )}

          {/* ── Header ─────────────────────────────────────────── */}
          <div className="pr-card pr-fade" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--theme-button-primary)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
                Parent Report
              </div>
              <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: "var(--theme-text-primary)", margin: 0 }}>
                {child?.name}'s Learning Journey 👨‍👩‍👧
              </h1>
              <p style={{ color: "var(--theme-text-secondary)", margin: "6px 0 0", fontSize: 14 }}>
                {child?.grade} · Here's how they're doing
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Report period selector */}
              {reports.length > 1 && (
                <select
                  value={selectedReportIndex}
                  onChange={e => { setSelectedReportIndex(Number(e.target.value)); setActiveTab("overview"); }}
                  style={{
                    padding: "9px 14px",
                    background: "var(--theme-bg-secondary)",
                    border: "1px solid var(--theme-sidebar-border)",
                    borderRadius: 10, color: "var(--theme-text-primary)",
                    fontSize: 13, fontWeight: 600, fontFamily: "inherit", cursor: "pointer",
                  }}
                >
                  {reports.map((r, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? "This week" : new Date(r.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                    </option>
                  ))}
                </select>
              )}

              {/* Notifications */}
              <button onClick={() => { if (!parentEmail) { setShowEmailPrompt(true); } else { setShowNotifPanel(p => !p); } }} className="pr-btn-ghost" style={{ position: "relative" }}>
                🔔 Notifications
                {!parentEmail && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#dc2626", position: "absolute", top: 8, right: 8 }} />}
              </button>

              {/* Download PDF */}
              <button onClick={exportPdf} disabled={exportingPdf} className="pr-btn-primary">
                {exportingPdf ? "⏳ Exporting…" : "📄 Download Report Card"}
              </button>

              {/* Back */}
              <button onClick={() => navigate("/parent/dashboard")} className="pr-btn-ghost">
                ← Dashboard
              </button>
            </div>
          </div>

          {/* ── Trend + key stats row ───────────────────────────── */}
          <div className="pr-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20, animationDelay: ".05s" }}>
            {/* Trend card */}
            <div className="pr-stat-card" style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: "var(--theme-sidebar-item-default)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0,
              }}>{trendConfig.emoji}</div>
              <div>
                <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", fontWeight: 500 }}>Trend</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: trendConfig.color }}>{trendConfig.label}</div>
              </div>
            </div>

            <StatCard emoji="🎯" label="Avg Score"         value={`${averageScore}%`}              sub="across all quizzes"     accent={scoreColor(averageScore)} />
            <StatCard emoji="📝" label="Quizzes Taken"     value={quizzes.length}                  sub="total attempts" />
            <StatCard emoji="⭐" label="Total XP"           value={totalXP}                         sub="experience points"      accent="var(--theme-button-primary)" />
            <StatCard emoji="🃏" label="Flashcard Mastery" value={`${mastered}/${totalFlashcards}`} sub="cards mastered" />
          </div>

          {/* ── Tabs panel ─────────────────────────────────────── */}
          <div className="pr-card" style={{ padding: 0, overflow: "hidden", animationDelay: ".1s" }}>
            {/* Tab bar */}
            <div style={{
              display: "flex", borderBottom: "1px solid var(--theme-sidebar-border)",
              padding: "0 12px", overflowX: "auto",
              background: "var(--theme-bg-sidebar, var(--theme-bg-secondary))",
            }}>
              {tabs.map(tab => (
                <button key={tab.key} className={`pr-tab${activeTab === tab.key ? " active" : ""}`}
                  onClick={() => setActiveTab(tab.key)}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: isMobile ? "20px 16px" : "28px 30px" }}>

              {/* ── OVERVIEW ─────────────────────────────────────── */}
              {activeTab === "overview" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  {/* Rings */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 20px" }}>🏅 At a Glance</h2>
                    <div style={{
                      display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center",
                      background: "var(--theme-bg-container, var(--theme-bg-primary))",
                      border: "1px solid var(--theme-sidebar-border)",
                      borderRadius: 16, padding: "28px 24px",
                    }}>
                      <RingProgress value={Math.round(averageScore)}   max={100}                          label="Average Score"       sublabel="%"    color={chartAccentColor} />
                      <RingProgress value={Math.min(totalXP, 9999)}    max={Math.max(totalXP, 1000)}      label="XP Earned"           sublabel="pts"  color="#16a34a" />
                      <RingProgress value={totalFlashcards > 0 ? mastered : 0} max={Math.max(totalFlashcards,1)} label="Flashcards Mastered" sublabel={`/${totalFlashcards}`} color="#f59e0b" />
                    </div>
                  </div>

                  {/* Trend chart */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 8px" }}>📈 Score Trend</h2>
                    {classScoreTrend.length > 0 && (
                      <p style={{ fontSize: 12, color: "#f59e0b", margin: "0 0 12px" }}>🟡 Dashed line = class average</p>
                    )}
                    {quizzes.length > 1
                      ? <Line data={trendChartData} options={baseChartOptions()} />
                      : <p style={{ color: "var(--theme-text-secondary)", fontSize: 14 }}>More quizzes needed to show a trend.</p>
                    }
                  </div>

                  {/* AI summary */}
                  {/* <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>🧠 AI Performance Insights</h2>
                    <div style={{
                      background: "linear-gradient(135deg, var(--theme-button-primary) 0%, #4f46e5 100%)",
                      borderRadius: 14, padding: "22px 26px",
                    }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h2:     ({ children }) => <h2     style={{ color: "#fff",                  fontSize: 15, fontWeight: 700, margin: "14px 0 8px"  }}>{children}</h2>,
                          h3:     ({ children }) => <h3     style={{ color: "rgba(255,255,255,.8)",   fontSize: 13, fontWeight: 700, margin: "10px 0 6px"  }}>{children}</h3>,
                          p:      ({ children }) => <p      style={{ color: "rgba(255,255,255,.85)", margin: "0 0 10px", fontSize: 14, lineHeight: 1.7 }}>{children}</p>,
                          li:     ({ children }) => <li     style={{ color: "rgba(255,255,255,.85)", marginBottom: 4, fontSize: 14 }}>{children}</li>,
                          strong: ({ children }) => <strong style={{ color: "#fff" }}>{children}</strong>,
                        }}
                      >
                        {summary}
                      </ReactMarkdown>
                    </div>
                  </div> */}

                  {/* Recent quizzes */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>🕐 Recent Quizzes</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {quizzes.slice(0, 5).map((quiz, i) => {
                        const score = parseFloat(quiz.score);
                        const diff  = diffBadge(quiz.difficulty);
                        return (
                          <div key={i} className="pr-quiz-row">
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

              {/* ── SUBJECTS ──────────────────────────────────────── */}
              {activeTab === "subjects" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  {/* Subject cards */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>📚 Performance by Subject</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 14, marginBottom: 28 }}>
                      {subjectAverages.map(s => {
                        const avg   = parseFloat(s.average);
                        const color = avg >= 80 ? "#16a34a" : avg >= 60 ? "var(--theme-button-primary)" : "#dc2626";
                        return (
                          <div key={s.subject} className="pr-subject-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <div>
                                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text-primary)" }}>{s.subject}</div>
                                <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>{s.quizCount} quiz{s.quizCount !== 1 ? "zes" : ""}</div>
                              </div>
                              <div style={{ fontSize: 22, fontWeight: 800, color }}>{s.average}%</div>
                            </div>
                            <ProgressBar value={avg} color={color} height={7} />
                            {s.classAverage !== null && (
                              <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", display: "flex", justifyContent: "space-between" }}>
                                <span>Class avg</span>
                                <span style={{ fontWeight: 700 }}>{s.classAverage}%</span>
                              </div>
                            )}
                            {s.trend !== null && (
                              <div style={{ fontSize: 12, color: s.trend >= 0 ? "#16a34a" : "#dc2626" }}>
                                {s.trend >= 0 ? "▲" : "▼"} {Math.abs(s.trend).toFixed(1)}% vs last quiz
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Charts */}
                  {subjectAverages.length > 1 && (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 20 }}>
                      <div>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 8px" }}>📊 Subject Comparison</h2>
                        {Object.keys(classAverages).length > 0 && (
                          <p style={{ fontSize: 12, color: "#f59e0b", margin: "0 0 12px" }}>🟡 Orange = class average</p>
                        )}
                        <Bar data={subjectChartData} options={baseChartOptions()} />
                      </div>
                      <div>
                        <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 8px" }}>🎯 Radar Overview</h2>
                        {Object.keys(classAverages).length > 0 && (
                          <p style={{ fontSize: 12, color: "#f59e0b", margin: "0 0 12px" }}>🟡 Orange = class average</p>
                        )}
                        <Radar data={radarChartData} options={radarOptions} />
                      </div>
                    </div>
                  )}

                  {/* Score distribution */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>📈 Score Distribution</h2>
                    <Bar
                      data={histogramData}
                      options={baseChartOptions({ y: { beginAtZero: true, max: undefined } })}
                    />
                  </div>

                  {/* Difficulty doughnut */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>🔥 Difficulty Distribution</h2>
                    <div style={{ maxWidth: 320, margin: "0 auto" }}>
                      <Doughnut data={difficultyPieData} options={{
                        responsive: true,
                        plugins: { legend: { labels: { color: chartTextColor, font: { size: 12 } } } },
                      }} />
                    </div>
                  </div>

                </div>
              )}

              {/* ── NEEDS ATTENTION ───────────────────────────────── */}
              {activeTab === "struggles" && (
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 6px" }}>🔍 Questions That Need Attention</h2>
                  <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", margin: "0 0 20px" }}>
                    These are questions {child?.name} got wrong. Expand each one to see the correct answer and an explanation you can go through together.
                  </p>
                  {allStruggled.length === 0
                    ? (
                      <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <div style={{ fontSize: 40, marginBottom: 12 }}>🎉</div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "#16a34a" }}>No struggles found — great work, {child?.name}!</div>
                      </div>
                    )
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

              {/* ── ACTIVITY ──────────────────────────────────────── */}
              {activeTab === "activity" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  {/* Heatmap */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>📅 Activity — Last 30 Days</h2>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 8 }}>
                      {heatmapData.map((day, i) => {
                        const avg = day.score;
                        const bg  = avg === null
                          ? "var(--theme-sidebar-item-default)"
                          : avg >= 80 ? chartAccentColor
                          : avg >= 60 ? chartAccentColor + "99"
                          : avg >= 40 ? "#f59e0b"
                          : "#ef4444";
                        return (
                          <div key={i}
                            title={`${day.date}${avg !== null ? ": " + avg.toFixed(1) + "%" : ": no activity"}`}
                            style={{ height: 32, borderRadius: 6, background: bg, cursor: "default", transition: "transform .15s" }}
                            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.15)"}
                            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
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

                  {/* Recent activity timeline */}
                  <div>
                    <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>🕐 Recent Activity</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {quizzes.slice(0, 8).map((quiz, i) => {
                        const score = parseFloat(quiz.score);
                        const diff  = diffBadge(quiz.difficulty);
                        return (
                          <div key={i} className="pr-quiz-row">
                            <div style={{ fontSize: 22, flexShrink: 0 }}>{scoreEmoji(score)}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text-primary)" }}>{quiz.subject || "General"}</div>
                              <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                                {new Date(quiz.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                {" · "}
                                {new Date(quiz.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
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

              {/* ── HELP AT HOME ──────────────────────────────────── */}
              {activeTab === "home" && (
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 6px" }}>
                    🏠 How to Help {child?.name} at Home This Week
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", margin: "0 0 20px" }}>
                    Personalised suggestions based on {child?.name}'s recent performance.
                  </p>

                  {homeAdvice ? (
                    <div style={{
                      background: "linear-gradient(135deg, rgba(22,163,74,.12) 0%, rgba(16,185,129,.08) 100%)",
                      border: "1.5px solid rgba(22,163,74,.3)",
                      borderRadius: 16, padding: "22px 26px",
                    }}>
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h2:     ({ children }) => <h2     style={{ color: "var(--theme-text-primary)",   fontSize: 15, fontWeight: 700, margin: "14px 0 8px" }}>{children}</h2>,
                          h3:     ({ children }) => <h3     style={{ color: "var(--theme-text-primary)",   fontSize: 13, fontWeight: 700, margin: "10px 0 6px" }}>{children}</h3>,
                          p:      ({ children }) => <p      style={{ color: "var(--theme-text-secondary)", margin: "0 0 10px", fontSize: 14, lineHeight: 1.7 }}>{children}</p>,
                          li:     ({ children }) => <li     style={{ color: "var(--theme-text-secondary)", marginBottom: 6, fontSize: 14 }}>{children}</li>,
                          strong: ({ children }) => <strong style={{ color: "var(--theme-text-primary)" }}>{children}</strong>,
                        }}
                      >
                        {homeAdvice}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "40px 0", color: "var(--theme-text-secondary)", fontSize: 14 }}>
                      No home advice available for this period yet.
                    </div>
                  )}

                  {/* Quick tips banner */}
                  <div style={{
                    marginTop: 20,
                    background: "var(--theme-sidebar-item-default)",
                    borderRadius: 14, padding: "18px 22px",
                    display: "flex", flexDirection: "column", gap: 12,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--theme-text-primary)", marginBottom: 4 }}>
                      💡 General tips for supporting learning at home
                    </div>
                    {[
                      "Ask your child to explain what they learned today — teaching reinforces memory.",
                      "Set a consistent study time each day, even if it's just 20 minutes.",
                      "Celebrate effort and improvement, not just high scores.",
                      "Review the \"Needs Attention\" tab together — go through wrong answers calmly.",
                    ].map((tip, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "var(--theme-text-secondary)" }}>
                        <span style={{ color: "var(--theme-button-primary)", fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                        <span>{tip}</span>
                      </div>
                    ))}
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
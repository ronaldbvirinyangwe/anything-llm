import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getStatus = (avg, lastActive) => {
  if (avg === null) return "no-data";
  const daysSince = lastActive
    ? Math.floor((Date.now() - new Date(lastActive)) / 86400000)
    : 999;
  if (daysSince > 7) return "inactive";
  if (avg < 50)  return "at-risk";
  if (avg >= 80) return "excelling";
  return "on-track";
};

const STATUS_META = {
  "at-risk":   { label: "At Risk",   bg: "rgba(220,38,38,.12)",  color: "#dc2626", dot: "#dc2626" },
  "inactive":  { label: "Inactive",  bg: "rgba(202,138,4,.12)",  color: "#ca8a04", dot: "#ca8a04" },
  "excelling": { label: "Excelling", bg: "rgba(22,163,74,.12)",  color: "#16a34a", dot: "#16a34a" },
  "on-track":  { label: "On Track",  bg: "rgba(14,165,233,.12)", color: "var(--theme-button-primary)", dot: "var(--theme-button-primary)" },
  "no-data":   { label: "No Data",   bg: "var(--theme-sidebar-item-default)", color: "var(--theme-text-secondary)", dot: "var(--theme-text-secondary)" },
};

const getTrend = (quizzes) => {
  if (!quizzes || quizzes.length < 2) return "stable";
  const sorted = [...quizzes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const recent = sorted.slice(-3).reduce((s, q) => s + parseFloat(q.score), 0) / Math.min(3, sorted.length);
  const older  = sorted.slice(0, 3).reduce((s, q) => s + parseFloat(q.score), 0) / Math.min(3, sorted.length);
  if (recent > older + 5) return "improving";
  if (recent < older - 5) return "declining";
  return "stable";
};

const scoreColor = (s) => s >= 80 ? "#16a34a" : s >= 60 ? "var(--theme-button-primary)" : "#dc2626";

// ─── Sub-components ───────────────────────────────────────────────────────────

const SkeletonCard = () => (
  <div style={{
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 16, padding: 20,
    display: "flex", flexDirection: "column", gap: 12,
  }}>
    {[80, 50, 100, 60].map((w, i) => (
      <div key={i} style={{
        height: i === 0 ? 18 : 12, width: `${w}%`,
        background: "var(--theme-sidebar-item-default)",
        borderRadius: 6, animation: "tr-pulse 1.5s ease-in-out infinite",
        animationDelay: `${i * 0.1}s`,
      }} />
    ))}
  </div>
);

const StatPill = ({ emoji, label, value, color }) => (
  <div style={{
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 14, padding: "16px 20px",
    display: "flex", alignItems: "center", gap: 12,
    boxShadow: "0 1px 6px rgba(0,0,0,.1)",
    flex: "1 1 160px",
  }}>
    <div style={{ fontSize: 22 }}>{emoji}</div>
    <div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || "var(--theme-text-primary)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 3 }}>{label}</div>
    </div>
  </div>
);

const StudentCard = ({ student, report }) => {
  const avg        = report ? parseFloat(report.averageScore) : null;
  const lastActive = report?.quizzes?.[0]?.createdAt || null;
  const status     = getStatus(avg, lastActive);
  const meta       = STATUS_META[status];
  const trend      = report ? getTrend(report.quizzes) : "stable";
  const trendIcon  = trend === "improving" ? "📈" : trend === "declining" ? "📉" : "➡️";
  const quizCount  = report?.quizzes?.length ?? 0;

  return (
    <Link
      to={`/teacher/reports/student/${student.id}`}
      style={{ textDecoration: "none" }}
    >
      <div style={{
        background: "var(--theme-bg-secondary)",
        border: "1px solid var(--theme-sidebar-border)",
        borderRadius: 16, padding: 20,
        display: "flex", flexDirection: "column", gap: 14,
        cursor: "pointer", transition: "transform .15s, box-shadow .15s",
        boxShadow: "0 1px 6px rgba(0,0,0,.1)",
      }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,.15)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = "none";             e.currentTarget.style.boxShadow = "0 1px 6px rgba(0,0,0,.1)"; }}
      >
        {/* Top row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text-primary)" }}>{student.name}</div>
            <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>
              Grade {student.grade}
              {student.subjects?.length > 0 && " · " + student.subjects.join(", ")}
            </div>
          </div>
          {/* Status badge */}
          <div style={{
            fontSize: 11, fontWeight: 700,
            background: meta.bg, color: meta.color,
            borderRadius: 20, padding: "3px 10px",
            display: "flex", alignItems: "center", gap: 5, flexShrink: 0,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: meta.dot }} />
            {meta.label}
          </div>
        </div>

        {/* Score + trend */}
        {report ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: avg !== null ? scoreColor(avg) : "var(--theme-text-secondary)", lineHeight: 1 }}>
                  {avg !== null ? `${avg.toFixed(1)}%` : "—"}
                </div>
                <div style={{ fontSize: 11, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                  avg · {quizCount} quiz{quizCount !== 1 ? "zes" : ""}
                </div>
              </div>
              <div style={{ fontSize: 20 }} title={`Trend: ${trend}`}>{trendIcon}</div>
            </div>

            {/* Progress bar */}
            {avg !== null && (
              <div style={{ width: "100%", height: 5, background: "var(--theme-sidebar-item-default)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{
                  width: `${Math.min(avg, 100)}%`, height: "100%",
                  background: scoreColor(avg), borderRadius: 99,
                  transition: "width 1s cubic-bezier(.4,0,.2,1)",
                }} />
              </div>
            )}

            {/* XP + last active */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--theme-text-secondary)" }}>
              <span>⭐ {report.totalXP} XP</span>
              {lastActive && (
                <span>Last active {new Date(lastActive).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}</span>
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--theme-text-secondary)", fontStyle: "italic" }}>No quiz data yet</div>
        )}

        {/* View report link hint */}
        <div style={{
          fontSize: 12, fontWeight: 600,
          color: "var(--theme-button-primary)",
          display: "flex", alignItems: "center", gap: 4,
          marginTop: 2,
        }}>
          View Full Report →
        </div>
      </div>
    </Link>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeacherReports() {
  const navigate = useNavigate();
  const [students,    setStudents]    = useState([]);
  const [reports,     setReports]     = useState({}); // { [studentId]: reportData | null }
  const [loadingList, setLoadingList] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error,       setError]       = useState("");
  const [searchTerm,  setSearchTerm]  = useState("");
  const [groupBy,     setGroupBy]     = useState("all");
  const [sortBy,      setSortBy]      = useState("name"); // name | score | status
  const [statusFilter, setStatusFilter] = useState("all");

  // ── Fetch student list ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token      = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem("chikoroai_user") || "{}");
        const teacherId  = storedUser?.id;
        if (!teacherId) { navigate("/login"); return; }

        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/teacher/my-students/${teacherId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.data.success) { setError(res.data.error || "Failed to fetch students"); setLoadingList(false); return; }

        // Deduplicate + merge subjects (same logic as your original)
        const unique = res.data.students.reduce((acc, s) => {
          const existing = acc.find((x) => x.id === s.id);
          if (existing) {
            if (s.subject && !existing.subjects.includes(s.subject)) existing.subjects.push(s.subject);
          } else {
            acc.push({ ...s, subjects: s.subject ? [s.subject] : [] });
          }
          return acc;
        }, []);

        setStudents(unique);
        setLoadingList(false);

        // ── Batch-fetch all student reports in parallel ──────────────────
        setLoadingReports(true);
        const token2 = localStorage.getItem("chikoroai_authToken");
        const results = await Promise.allSettled(
          unique.map((s) =>
            axios.get(
              `https://api.chikoro-ai.com/api/system/reports/student/${s.id}`,
              { headers: { Authorization: `Bearer ${token2}` } }
            )
          )
        );

        const reportMap = {};
        results.forEach((result, i) => {
          const id = unique[i].id;
          if (result.status === "fulfilled" && result.value.data.success) {
            reportMap[id] = result.value.data;
          } else {
            reportMap[id] = null;
          }
        });
        setReports(reportMap);
        setLoadingReports(false);

      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Error loading students.");
        setLoadingList(false);
      }
    };

    fetchStudents();
  }, [navigate]);

  // ── Derived class-wide stats (only when reports are loaded) ───────────────
  const classStats = useMemo(() => {
    const withData = students.filter((s) => reports[s.id]?.averageScore != null);
    if (withData.length === 0) return null;

    const scores     = withData.map((s) => parseFloat(reports[s.id].averageScore));
    const classAvg   = scores.reduce((a, b) => a + b, 0) / scores.length;
    const atRisk     = students.filter((s) => {
      const r = reports[s.id];
      return r && parseFloat(r.averageScore) < 50;
    }).length;
    const inactive   = students.filter((s) => {
      const r = reports[s.id];
      if (!r) return false;
      const last = r.quizzes?.[0]?.createdAt;
      return !last || Math.floor((Date.now() - new Date(last)) / 86400000) > 7;
    }).length;
    const topStudent = withData.reduce((best, s) =>
      parseFloat(reports[s.id].averageScore) > parseFloat(reports[best.id]?.averageScore ?? 0) ? s : best
    , withData[0]);

    // Subject weak spots — which subject has the lowest class average
    const subjectTotals = {};
    students.forEach((s) => {
      const r = reports[s.id];
      if (!r) return;
      r.quizzes?.forEach((q) => {
        const subj = q.subject || "General";
        if (!subjectTotals[subj]) subjectTotals[subj] = { total: 0, count: 0 };
        subjectTotals[subj].total += parseFloat(q.score);
        subjectTotals[subj].count += 1;
      });
    });
    const subjectAvgs = Object.entries(subjectTotals).map(([subj, { total, count }]) => ({
      subject: subj, avg: total / count,
    })).sort((a, b) => a.avg - b.avg);
    const weakestSubject = subjectAvgs[0] || null;

    return { classAvg, atRisk, inactive, topStudent, weakestSubject };
  }, [students, reports]);

  // ── Filtered + sorted students ────────────────────────────────────────────
  const displayStudents = useMemo(() => {
    let list = students.filter((s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.grade && s.grade.toString().includes(searchTerm)) ||
      s.subjects?.some((sub) => sub.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (statusFilter !== "all") {
      list = list.filter((s) => {
        const r = reports[s.id];
        const avg  = r ? parseFloat(r.averageScore) : null;
        const last = r?.quizzes?.[0]?.createdAt || null;
        return getStatus(avg, last) === statusFilter;
      });
    }

    list = [...list].sort((a, b) => {
      if (sortBy === "score") {
        const sa = reports[a.id] ? parseFloat(reports[a.id].averageScore) : -1;
        const sb = reports[b.id] ? parseFloat(reports[b.id].averageScore) : -1;
        return sb - sa;
      }
      if (sortBy === "status") {
        const order = { "at-risk": 0, "inactive": 1, "on-track": 2, "excelling": 3, "no-data": 4 };
        const ra = reports[a.id]; const rb = reports[b.id];
        const sa = getStatus(ra ? parseFloat(ra.averageScore) : null, ra?.quizzes?.[0]?.createdAt);
        const sb = getStatus(rb ? parseFloat(rb.averageScore) : null, rb?.quizzes?.[0]?.createdAt);
        return (order[sa] ?? 4) - (order[sb] ?? 4);
      }
      return a.name.localeCompare(b.name);
    });

    if (groupBy === "subject") {
      const groups = {};
      list.forEach((s) => {
        const key = s.subjects?.[0] || "Unknown";
        if (!groups[key]) groups[key] = [];
        groups[key].push(s);
      });
      return groups;
    }

    return { "All Students": list };
  }, [students, reports, searchTerm, sortBy, statusFilter, groupBy]);

  // ── Needs attention list ──────────────────────────────────────────────────
  const needsAttention = useMemo(() =>
    students.filter((s) => {
      const r    = reports[s.id];
      const avg  = r ? parseFloat(r.averageScore) : null;
      const last = r?.quizzes?.[0]?.createdAt || null;
      const st   = getStatus(avg, last);
      return st === "at-risk" || st === "inactive";
    }),
    [students, reports]
  );

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loadingList) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)", fontFamily: "inherit",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, border: "4px solid var(--theme-sidebar-border)",
          borderTopColor: "var(--theme-button-primary)", borderRadius: "50%",
          animation: "tr-spin 1s linear infinite", margin: "0 auto 14px",
        }} />
        <style>{`@keyframes tr-spin{to{transform:rotate(360deg)}} @keyframes tr-pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
        <p style={{ color: "var(--theme-text-secondary)", fontWeight: 600 }}>Loading your students…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)",
    }}>
      <div style={{
        background: "var(--theme-bg-secondary)", border: "1px solid var(--theme-sidebar-border)",
        borderRadius: 16, padding: 40, textAlign: "center", maxWidth: 400,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: "var(--theme-text-primary)" }}>{error}</p>
        <Link to="/teacher-dashboard" style={{
          display: "inline-block", marginTop: 16,
          color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 14,
        }}>← Back to Dashboard</Link>
      </div>
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--theme-bg-primary)",
      fontFamily: "inherit",
    }}>
      <style>{`
        @keyframes tr-spin  { to { transform: rotate(360deg); } }
        @keyframes tr-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes tr-fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .tr-fade { animation: tr-fadeUp .4s cubic-bezier(.4,0,.2,1) both; }
        .tr-input {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          color: var(--theme-text-primary);
          border-radius: 10px; padding: 9px 14px; font-size: 14px;
          font-family: inherit; outline: none;
          transition: border-color .2s;
        }
        .tr-input:focus { border-color: var(--theme-button-primary); }
        .tr-input::placeholder { color: var(--theme-text-secondary); }
        .tr-select {
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          color: var(--theme-text-primary);
          border-radius: 10px; padding: 9px 12px; font-size: 14px;
          font-family: inherit; outline: none; cursor: pointer;
        }
        .tr-attention-card {
          background: rgba(220,38,38,.07);
          border: 1px solid rgba(220,38,38,.2);
          border-radius: 12px; padding: 14px 16px;
          display: flex; align-items: center; gap: 14px;
          text-decoration: none;
          transition: background .15s;
        }
        .tr-attention-card:hover { background: rgba(220,38,38,.13); }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 32px" }}>

        {/* ── Header ── */}
        <div className="tr-fade" style={{ marginBottom: 28 }}>
          <Link to="/teacher-dashboard" style={{
            fontSize: 13, fontWeight: 600, color: "var(--theme-button-primary)",
            textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16,
          }}>← Back to Dashboard</Link>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--theme-text-primary)", margin: 0 }}>
            📊 Class Performance
          </h1>
          <p style={{ color: "var(--theme-text-secondary)", margin: "6px 0 0", fontSize: 14 }}>
            {students.length} student{students.length !== 1 ? "s" : ""} · {loadingReports ? "Loading scores…" : "Scores loaded"}
          </p>
        </div>

        {/* ── Class stats bar ── */}
        {classStats && (
          <div className="tr-fade" style={{
            display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 28, animationDelay: ".05s",
          }}>
            <StatPill emoji="🎯" label="Class Average"    value={`${classStats.classAvg.toFixed(1)}%`} color={scoreColor(classStats.classAvg)} />
            <StatPill emoji="⚠️" label="At Risk / Inactive" value={classStats.atRisk + classStats.inactive} color={classStats.atRisk + classStats.inactive > 0 ? "#dc2626" : "#16a34a"} />
            <StatPill emoji="✅" label="On Track or Better" value={students.length - classStats.atRisk - classStats.inactive} color="#16a34a" />
            {classStats.weakestSubject && (
              <StatPill emoji="📚" label={`Weakest Subject · ${classStats.weakestSubject.avg.toFixed(1)}%`} value={classStats.weakestSubject.subject} />
            )}
            {classStats.topStudent && (
              <StatPill emoji="🏆" label="Top Performer" value={classStats.topStudent.name} />
            )}
          </div>
        )}

        {/* ── Needs Attention ── */}
        {!loadingReports && needsAttention.length > 0 && (
          <div className="tr-fade" style={{
            background: "var(--theme-bg-secondary)",
            border: "1px solid rgba(220,38,38,.25)",
            borderRadius: 16, padding: "20px 24px", marginBottom: 28,
            animationDelay: ".1s",
          }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#dc2626", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              🚨 Needs Your Attention
              <span style={{
                fontSize: 11, fontWeight: 700, background: "rgba(220,38,38,.12)",
                color: "#dc2626", borderRadius: 20, padding: "2px 9px",
              }}>{needsAttention.length}</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {needsAttention.map((s) => {
                const r    = reports[s.id];
                const avg  = r ? parseFloat(r.averageScore) : null;
                const last = r?.quizzes?.[0]?.createdAt;
                const st   = getStatus(avg, last);
                const days = last ? Math.floor((Date.now() - new Date(last)) / 86400000) : null;
                return (
                  <Link key={s.id} to={`/teacher/reports/student/${s.id}`} className="tr-attention-card">
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                      background: "rgba(220,38,38,.12)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 14, color: "#dc2626",
                    }}>
                      {s.name.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text-primary)" }}>{s.name}</div>
                      <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                        Grade {s.grade}
                        {s.subjects?.length > 0 && " · " + s.subjects.join(", ")}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {avg !== null && (
                        <div style={{ fontWeight: 800, fontSize: 16, color: "#dc2626" }}>{avg.toFixed(1)}%</div>
                      )}
                      <div style={{ fontSize: 11, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                        {st === "inactive"
                          ? days !== null ? `Inactive ${days}d` : "No activity"
                          : "Below 50%"}
                      </div>
                    </div>
                    <div style={{ color: "var(--theme-button-primary)", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>View →</div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Controls ── */}
        <div className="tr-fade" style={{
          display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24,
          alignItems: "center", animationDelay: ".15s",
        }}>
          {/* Search */}
          <div style={{ position: "relative", flex: "1 1 240px" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
            <input
              type="text"
              placeholder="Search by name, grade or subject…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="tr-input"
              style={{ paddingLeft: 34, width: "100%" }}
            />
          </div>

          {/* Status filter */}
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="tr-select">
            <option value="all">All statuses</option>
            <option value="at-risk">At Risk</option>
            <option value="inactive">Inactive</option>
            <option value="on-track">On Track</option>
            <option value="excelling">Excelling</option>
            <option value="no-data">No Data</option>
          </select>

          {/* Sort */}
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="tr-select">
            <option value="name">Sort: Name</option>
            <option value="score">Sort: Score ↓</option>
            <option value="status">Sort: Needs Attention First</option>
          </select>

          {/* Group */}
          <select value={groupBy} onChange={(e) => setGroupBy(e.target.value)} className="tr-select">
            <option value="all">All Students</option>
            <option value="subject">Group by Subject</option>
          </select>
        </div>

        {/* ── Student grid ── */}
        {students.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--theme-text-secondary)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p style={{ fontWeight: 600 }}>No students linked yet.</p>
            <Link to="/teacher/link-student" style={{ color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 14 }}>
              Link Students →
            </Link>
          </div>
        ) : Object.values(displayStudents).every((l) => l.length === 0) ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--theme-text-secondary)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <p style={{ fontWeight: 600 }}>No students match your filters.</p>
            <button onClick={() => { setSearchTerm(""); setStatusFilter("all"); }} style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 14,
            }}>Clear filters</button>
          </div>
        ) : (
          Object.entries(displayStudents).map(([category, list]) => (
            <div key={category} style={{ marginBottom: 32 }}>
              {groupBy === "subject" && (
                <div style={{
                  fontSize: 12, fontWeight: 700, color: "var(--theme-button-primary)",
                  textTransform: "uppercase", letterSpacing: ".07em", marginBottom: 14,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  {category}
                  <span style={{
                    fontSize: 11, background: "var(--theme-sidebar-item-default)",
                    color: "var(--theme-text-secondary)", borderRadius: 20, padding: "1px 8px",
                    fontWeight: 600, letterSpacing: 0,
                  }}>{list.length}</span>
                </div>
              )}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: 16,
              }}>
                {list.map((student) =>
                  loadingReports && !reports[student.id]
                    ? <SkeletonCard key={student.id} />
                    : <StudentCard key={student.id} student={student} report={reports[student.id]} />
                )}
              </div>
            </div>
          ))
        )}

      </div>
    </div>
  );
}
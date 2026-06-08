import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiCopy, FiCheck } from "react-icons/fi";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scoreColor = (s) => s >= 80 ? "#16a34a" : s >= 60 ? "var(--theme-button-primary)" : "#dc2626";
const scoreBg    = (s) => s >= 80 ? "rgba(22,163,74,.12)" : s >= 60 ? "rgba(var(--theme-button-primary-rgb, 70,200,255),.12)" : "rgba(220,38,38,.12)";
const scoreLabel = (s) => s >= 80 ? "Excellent" : s >= 60 ? "Good" : s >= 40 ? "Average" : "Poor";

const diffColor = (d) => ({
  Easy:   { bg: "rgba(22,163,74,.12)",  color: "#16a34a" },
  Medium: { bg: "rgba(202,138,4,.12)",  color: "#ca8a04" },
  Hard:   { bg: "rgba(220,38,38,.12)",  color: "#dc2626" },
}[d] || { bg: "rgba(202,138,4,.12)", color: "#ca8a04" });

const Tag = ({ label, style = {} }) => (
  <span style={{
    fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px",
    background: "var(--theme-sidebar-item-default)", color: "var(--theme-text-secondary)",
    ...style,
  }}>{label}</span>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 16, padding: "20px 22px",
    boxShadow: "0 1px 6px rgba(0,0,0,.1)",
    ...style,
  }}>{children}</div>
);

const SectionHeader = ({ children }) => (
  <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 16px" }}>
    {children}
  </h2>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeacherQuizResults() {
  const { quizId }   = useParams();
  const navigate     = useNavigate();
  const showQuizList = !quizId;

  const [quizzes,    setQuizzes]    = useState([]);
  const [quizData,   setQuizData]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode,   setViewMode]   = useState("grid");
  const [copied,     setCopied]     = useState(false);
  const [sortBy,     setSortBy]     = useState("date"); // date | score | name

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token      = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem("chikoroai_user") || "{}");
        if (!storedUser?.id || !token) { navigate("/login"); return; }

        if (showQuizList) {
          const res = await axios.get(
            `https://api.chikoro-ai.com/api/system/teacher/my-quizzes`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data.success) setQuizzes(res.data.quizzes || []);
          else setError(res.data.error || "Failed to fetch quizzes");
        } else {
          const res = await axios.get(
            `https://api.chikoro-ai.com/api/system/teacher/quiz-results/${quizId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (res.data.success) setQuizData(res.data);
          else setError(res.data.error || "Failed to fetch quiz results");
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Error loading data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [quizId, showQuizList, navigate]);

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
          animation: "tqr-spin 1s linear infinite", margin: "0 auto 14px",
        }} />
        <style>{`@keyframes tqr-spin{to{transform:rotate(360deg)}} @keyframes tqr-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
        <p style={{ color: "var(--theme-text-secondary)", fontWeight: 600 }}>Loading…</p>
      </div>
    </div>
  );

  if (error) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)", fontFamily: "inherit",
    }}>
      <Card style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: "var(--theme-text-primary)", marginBottom: 16 }}>{error}</p>
        <Link to="/teacher-dashboard" style={{ color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 14 }}>
          ← Back to Dashboard
        </Link>
      </Card>
    </div>
  );

  // ── VIEW 1: Quiz list ─────────────────────────────────────────────────────
  if (showQuizList) {
    const filtered = quizzes.filter((q) =>
      q.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.quiz_code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
        <style>{`@keyframes tqr-spin{to{transform:rotate(360deg)}} @keyframes tqr-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}} .tqr-fade{animation:tqr-fade .4s cubic-bezier(.4,0,.2,1) both} .tqr-quiz-card{background:var(--theme-bg-secondary);border:1px solid var(--theme-sidebar-border);border-radius:16px;padding:20px 22px;text-decoration:none;display:flex;flex-direction:column;gap:12px;transition:transform .15s,box-shadow .15s;box-shadow:0 1px 6px rgba(0,0,0,.1)} .tqr-quiz-card:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.15)} .tqr-quiz-row{background:var(--theme-bg-secondary);border:1px solid var(--theme-sidebar-border);border-radius:12px;padding:14px 18px;text-decoration:none;display:flex;align-items:center;gap:14px;transition:background .15s} .tqr-quiz-row:hover{background:var(--theme-sidebar-item-hover,var(--theme-bg-container))} .tqr-input{background:var(--theme-bg-secondary);border:1px solid var(--theme-sidebar-border);color:var(--theme-text-primary);border-radius:10px;padding:9px 14px;font-size:14px;font-family:inherit;outline:none;transition:border-color .2s} .tqr-input:focus{border-color:var(--theme-button-primary)} .tqr-input::placeholder{color:var(--theme-text-secondary)} .tqr-toggle{background:none;border:1px solid var(--theme-sidebar-border);color:var(--theme-text-secondary);border-radius:8px;padding:8px 14px;font-size:13px;font-family:inherit;cursor:pointer;transition:all .2s} .tqr-toggle.active{background:var(--theme-button-primary);color:#fff;border-color:var(--theme-button-primary)}`}</style>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>

          {/* Header */}
          <div className="tqr-fade" style={{ marginBottom: 28 }}>
            <Link to="/teacher-dashboard" style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-button-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
              ← Back to Dashboard
            </Link>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--theme-text-primary)", margin: 0 }}>📋 My Quizzes</h1>
            <p style={{ color: "var(--theme-text-secondary)", margin: "6px 0 0", fontSize: 14 }}>
              {quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""} created
            </p>
          </div>

          {/* Controls */}
          <div className="tqr-fade" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 24, alignItems: "center", animationDelay: ".05s" }}>
            <div style={{ position: "relative", flex: "1 1 240px" }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>🔍</span>
              <input
                type="text"
                placeholder="Search by topic, subject, or code…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="tqr-input"
                style={{ paddingLeft: 34, width: "100%" }}
              />
            </div>
            <button className={`tqr-toggle${viewMode === "grid" ? " active" : ""}`} onClick={() => setViewMode("grid")}>⊞ Grid</button>
            <button className={`tqr-toggle${viewMode === "list" ? " active" : ""}`} onClick={() => setViewMode("list")}>☰ List</button>
          </div>

          {/* Quiz list / grid */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--theme-text-secondary)" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <p style={{ fontWeight: 600 }}>{searchTerm ? `No quizzes match "${searchTerm}"` : "No quizzes created yet."}</p>
              {!searchTerm && (
                <Link to="/teacher-tools/quiz-generator" style={{ color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 14 }}>
                  Create Your First Quiz →
                </Link>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {filtered.map((quiz) => {
                const diff = diffColor(quiz.difficulty);
                return (
                  <Link key={quiz.id} to={`/teacher/quizzes/${quiz.id}`} className="tqr-quiz-card">
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text-primary)" }}>{quiz.topic}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Tag label={quiz.subject} />
                      <Tag label={quiz.difficulty} style={{ background: diff.bg, color: diff.color }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--theme-text-secondary)", fontWeight: 600 }}>
                        Code: <span style={{ color: "var(--theme-button-primary)" }}>{quiz.quiz_code}</span>
                      </span>
                      <span style={{ fontSize: 12, color: "var(--theme-text-secondary)" }}>
                        👥 {quiz.submissionCount || 0} submission{quiz.submissionCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--theme-button-primary)", marginTop: 2 }}>
                      View Results →
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filtered.map((quiz) => {
                const diff = diffColor(quiz.difficulty);
                return (
                  <Link key={quiz.id} to={`/teacher/quizzes/${quiz.id}`} className="tqr-quiz-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--theme-text-primary)" }}>{quiz.topic}</div>
                      <div style={{ fontSize: 12, color: "var(--theme-text-secondary)", marginTop: 2 }}>
                        Code: <span style={{ color: "var(--theme-button-primary)", fontWeight: 600 }}>{quiz.quiz_code}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                      <Tag label={quiz.subject} />
                      <Tag label={quiz.difficulty} style={{ background: diff.bg, color: diff.color }} />
                      <span style={{ fontSize: 12, color: "var(--theme-text-secondary)" }}>👥 {quiz.submissionCount || 0}</span>
                    </div>
                    <div style={{ color: "var(--theme-button-primary)", fontWeight: 700, fontSize: 13, flexShrink: 0 }}>→</div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── VIEW 2: Single quiz results ───────────────────────────────────────────
  const { quiz, statistics, results, questionStats } = quizData || {};

  if (!quiz) return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--theme-bg-primary)" }}>
      <Card style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
        <p style={{ color: "var(--theme-text-primary)" }}>Quiz data unavailable.</p>
        <Link to="/teacher/quizzes" style={{ color: "var(--theme-button-primary)", fontWeight: 600, fontSize: 14, display: "block", marginTop: 12 }}>← Back to Quizzes</Link>
      </Card>
    </div>
  );

  // Copy quiz link
  const handleCopyLink = () => {
    const code = quiz?.quizCode || quiz?.quiz_code;
    if (!code) return;
    navigator.clipboard.writeText(`https://chikoro-ai.com/student/quiz/${code}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Question insights
  const insights = questionStats?.length > 0
    ? (() => {
        const sorted = [...questionStats].sort((a, b) => a.successRate - b.successRate);
        return { hardest: sorted[0], easiest: sorted[sorted.length - 1] };
      })()
    : null;

  // Sorted results
  const sortedResults = [...(results || [])].sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "name")  return a.studentName.localeCompare(b.studentName);
    return new Date(b.submittedAt) - new Date(a.submittedAt);
  });

  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes tqr-spin { to { transform: rotate(360deg); } }
        @keyframes tqr-fade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .tqr-fade { animation: tqr-fade .4s cubic-bezier(.4,0,.2,1) both; }
        .tqr-input { background:var(--theme-bg-secondary); border:1px solid var(--theme-sidebar-border); color:var(--theme-text-primary); border-radius:10px; padding:9px 14px; font-size:14px; font-family:inherit; outline:none; }
        .tqr-input:focus { border-color: var(--theme-button-primary); }
        .tqr-select { background:var(--theme-bg-secondary); border:1px solid var(--theme-sidebar-border); color:var(--theme-text-primary); border-radius:10px; padding:9px 12px; font-size:14px; font-family:inherit; outline:none; cursor:pointer; }
        .tqr-tr { border-bottom: 1px solid var(--theme-sidebar-border); }
        .tqr-tr:last-child { border-bottom: none; }
        .tqr-tr:hover td { background: var(--theme-bg-container); }
        .tqr-copy-btn { display:inline-flex; align-items:center; gap:6px; background:var(--theme-bg-container); border:1px solid var(--theme-sidebar-border); color:var(--theme-text-primary); border-radius:20px; padding:4px 12px; font-size:12px; font-weight:600; cursor:pointer; font-family:inherit; transition:background .15s; }
        .tqr-copy-btn:hover { background:var(--theme-sidebar-item-default); }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 32px" }}>

        {/* Back */}
        <Link to="/teacher/quizzes" style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-button-primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
          ← Back to Quizzes
        </Link>

        {/* Header */}
        <div className="tqr-fade" style={{
          background: "var(--theme-bg-secondary)",
          border: "1px solid var(--theme-sidebar-border)",
          borderRadius: 20, padding: "28px 32px", marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,.1)",
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--theme-button-primary)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
            Quiz Results
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--theme-text-primary)", margin: "0 0 12px" }}>{quiz.topic}</h1>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Tag label={quiz.subject} />
            {quiz.difficulty && <Tag label={quiz.difficulty} style={{ ...diffColor(quiz.difficulty) }} />}
            <button className="tqr-copy-btn" onClick={handleCopyLink}>
              {copied ? <><FiCheck size={12} /> Link Copied!</> : <><FiCopy size={12} /> Code: {quiz.quizCode || quiz.quiz_code}</>}
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="tqr-fade" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20, animationDelay: ".05s" }}>
          {[
            { label: "Submissions",   value: statistics?.totalSubmissions ?? 0, emoji: "📝", color: null },
            { label: "Class Average", value: `${statistics?.averageScore ?? 0}%`, emoji: "🎯", color: scoreColor(statistics?.averageScore ?? 0) },
            { label: "Highest Score", value: `${statistics?.highestScore ?? 0}%`, emoji: "🏆", color: "#16a34a" },
            { label: "Lowest Score",  value: `${statistics?.lowestScore ?? 0}%`,  emoji: "📉", color: "#dc2626" },
          ].map(({ label, value, emoji, color }) => (
            <Card key={label} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 18 }}>{emoji}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: color || "var(--theme-text-primary)", lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, color: "var(--theme-text-secondary)" }}>{label}</div>
            </Card>
          ))}
        </div>

        {/* Question insights */}
        {insights && (
          <div className="tqr-fade" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20, animationDelay: ".1s" }}>
            <Card style={{ border: "1px solid rgba(220,38,38,.25)", background: "rgba(220,38,38,.04)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dc2626", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                ⚠️ Most Challenging Question
              </div>
              <p style={{ fontSize: 14, color: "var(--theme-text-primary)", margin: "0 0 8px", fontStyle: "italic" }}>
                "{insights.hardest.text}"
              </p>
              <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", margin: 0 }}>
                Only <strong style={{ color: "#dc2626" }}>{insights.hardest.successRate}%</strong> of students answered correctly.
              </p>
            </Card>
            <Card style={{ border: "1px solid rgba(22,163,74,.25)", background: "rgba(22,163,74,.04)" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#16a34a", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                ✅ Best Answered Question
              </div>
              <p style={{ fontSize: 14, color: "var(--theme-text-primary)", margin: "0 0 8px", fontStyle: "italic" }}>
                "{insights.easiest.text}"
              </p>
              <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", margin: 0 }}>
                <strong style={{ color: "#16a34a" }}>{insights.easiest.successRate}%</strong> of students got this right.
              </p>
            </Card>
          </div>
        )}

        {/* Results table */}
        <div className="tqr-fade" style={{ animationDelay: ".15s" }}>
          <Card style={{ padding: 0, overflow: "hidden" }}>
            {/* Table header bar */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 22px", borderBottom: "1px solid var(--theme-sidebar-border)",
              background: "var(--theme-bg-sidebar)", flexWrap: "wrap", gap: 12,
            }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--theme-text-primary)" }}>
                👥 Student Results
                <span style={{
                  fontSize: 12, fontWeight: 600, background: "var(--theme-sidebar-item-default)",
                  color: "var(--theme-text-secondary)", borderRadius: 20, padding: "2px 9px", marginLeft: 8,
                }}>{results?.length ?? 0}</span>
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="tqr-select">
                <option value="date">Sort: Latest First</option>
                <option value="score">Sort: Score ↓</option>
                <option value="name">Sort: Name A–Z</option>
              </select>
            </div>

            {/* Table */}
            {!results || results.length === 0 ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "var(--theme-text-secondary)" }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📝</div>
                <p style={{ fontWeight: 600 }}>No students have taken this quiz yet.</p>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--theme-sidebar-border)" }}>
                    {["Student", "Grade", "Score", "Correct", "Submitted", ""].map((h) => (
                      <th key={h} style={{
                        padding: "11px 16px", textAlign: "left",
                        fontSize: 12, fontWeight: 700, color: "var(--theme-text-secondary)",
                        textTransform: "uppercase", letterSpacing: ".06em",
                        background: "var(--theme-bg-sidebar)",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedResults.map((result) => (
                    <tr key={result.id} className="tqr-tr">
                      <td style={{ padding: "13px 16px", fontWeight: 700, fontSize: 14, color: "var(--theme-text-primary)" }}>
                        {result.studentName}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--theme-text-secondary)" }}>
                        {result.studentGrade || "N/A"}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <span style={{
                          fontSize: 13, fontWeight: 700,
                          background: scoreBg(result.score), color: scoreColor(result.score),
                          borderRadius: 20, padding: "3px 10px",
                        }}>{result.score}% · {scoreLabel(result.score)}</span>
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 13, color: "var(--theme-text-secondary)" }}>
                        {result.correctAnswers}/{result.totalQuestions}
                      </td>
                      <td style={{ padding: "13px 16px", fontSize: 12, color: "var(--theme-text-secondary)" }}>
                        {new Date(result.submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
                        {" "}
                        {new Date(result.submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "13px 16px" }}>
                        <Link to={`/teacher/result/${result.id}`} style={{
                          fontSize: 12, fontWeight: 700,
                          color: "var(--theme-button-primary)", textDecoration: "none",
                        }}>View Details →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

      </div>
    </div>
  );
}
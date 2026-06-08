import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const scoreColor = (s, accent) => s >= 80 ? "#16a34a" : s >= 60 ? accent : "#dc2626";
const scoreLabel = (s) => s >= 80 ? "Excellent" : s >= 60 ? "Satisfactory" : "Needs Support";

const diffColor = (d) => ({
  Easy:   { bg: "rgba(22,163,74,.12)",  color: "#16a34a" },
  Medium: { bg: "rgba(202,138,4,.12)",  color: "#ca8a04" },
  Hard:   { bg: "rgba(220,38,38,.12)",  color: "#dc2626" },
}[d] || { bg: "rgba(202,138,4,.12)", color: "#ca8a04" });

const Card = ({ children, style = {} }) => (
  <div style={{
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 16, padding: "22px 24px",
    boxShadow: "0 1px 6px rgba(0,0,0,.1)",
    ...style,
  }}>{children}</div>
);

const Tag = ({ label, style = {} }) => (
  <span style={{
    fontSize: 12, fontWeight: 700, borderRadius: 20, padding: "4px 12px",
    background: "var(--theme-sidebar-item-default)", color: "var(--theme-text-secondary)",
    ...style,
  }}>{label}</span>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TeacherResultDetail() {
  const { resultId } = useParams();
  const navigate     = useNavigate();
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [openIdx, setOpenIdx] = useState(null);

  // Resolve CSS vars once at render time so JS interpolation works correctly
  const css = (prop, fallback) =>
    getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback;

  const accentColor  = css("--theme-button-primary",        "#46c8ff");
  const bgSecondary  = css("--theme-bg-secondary",          "#1b1b1e");
  const bgContainer  = css("--theme-bg-container",          "#0e0f0f");
  const borderMuted  = css("--theme-sidebar-item-default",  "rgba(255,255,255,.1)");
  const sidebarBorder = css("--theme-sidebar-border",       "rgba(255,255,255,.1)");
  const textPrimary  = css("--theme-text-primary",          "#ffffff");
  const textSecondary = css("--theme-text-secondary",       "rgba(255,255,255,.6)");

  useEffect(() => {
    const fetchResultDetail = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const res = await axios.get(
          `http://localhost:3009/api/system/teacher/result-detail/${resultId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) setResult(res.data.result);
        else setError(res.data.error || "Failed to fetch result");
      } catch (err) {
        console.error("Error fetching result:", err);
        setError("Error loading result");
      } finally {
        setLoading(false);
      }
    };
    fetchResultDetail();
  }, [resultId]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)", fontFamily: "inherit",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 52, height: 52,
          border: `4px solid ${sidebarBorder}`,
          borderTopColor: accentColor,
          borderRadius: "50%",
          animation: "trd-spin 1s linear infinite", margin: "0 auto 14px",
        }} />
        <style>{`@keyframes trd-spin{to{transform:rotate(360deg)}} @keyframes trd-fade{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
        <p style={{ color: textSecondary, fontWeight: 600 }}>Loading result…</p>
      </div>
    </div>
  );

  if (error || !result) return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--theme-bg-primary)", fontFamily: "inherit",
    }}>
      <Card style={{ textAlign: "center", maxWidth: 400, padding: 40 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
        <p style={{ color: textPrimary, marginBottom: 16 }}>{error || "Result not found"}</p>
        <button onClick={() => navigate(-1)} style={{
          background: "none", border: "none", cursor: "pointer",
          color: accentColor, fontWeight: 600, fontSize: 14, fontFamily: "inherit",
        }}>← Go Back</button>
      </Card>
    </div>
  );

  const {
    studentName, studentGrade, quizName, subject, difficulty,
    quizCode, score, totalQuestions, correctAnswers, submittedAt, detailedFeedback,
  } = result;

  const diff       = diffColor(difficulty);
  const wrongCount = detailedFeedback.filter(f =>
    f.type === "multiple-choice" ? !f.isCorrect : f.pointsEarned < f.pointsPossible
  ).length;

  const sc = scoreColor(score, accentColor); // resolved score color for this result

  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes trd-spin { to { transform: rotate(360deg); } }
        @keyframes trd-fade { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .trd-fade { animation: trd-fade .4s cubic-bezier(.4,0,.2,1) both; }
        .trd-feedback-header {
          display:flex; justify-content:space-between; align-items:center;
          padding:16px 20px; cursor:pointer; background:none; border:none;
          width:100%; text-align:left; font-family:inherit; transition:background .15s;
        }
        .trd-feedback-header:hover { background: ${bgContainer}; }
        .trd-action-btn {
          display:inline-flex; align-items:center; gap:6px;
          padding:10px 18px; border-radius:10px; font-size:13px; font-weight:600;
          cursor:pointer; font-family:inherit; transition:opacity .15s; border:none;
        }
        .trd-action-btn:hover { opacity:.85; }
        .trd-mark-scheme summary {
          cursor:pointer; font-size:13px; font-weight:600;
          color:${accentColor}; padding:10px 0 4px;
        }
        .trd-mark-scheme { border-top: 1px solid ${sidebarBorder}; padding: 0 20px 16px; margin-top: 4px; }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 32px" }}>

        {/* Back */}
        <button onClick={() => navigate(-1)} style={{
          background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
          fontSize: 13, fontWeight: 600, color: accentColor,
          display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 20, padding: 0,
        }}>← Back</button>

        {/* Header card */}
        <div className="trd-fade" style={{
          background: bgSecondary,
          border: `1px solid ${sidebarBorder}`,
          borderRadius: 20, padding: "28px 32px", marginBottom: 20,
          boxShadow: "0 2px 12px rgba(0,0,0,.1)",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start",
          flexWrap: "wrap", gap: 20,
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 8 }}>
              Result Detail
            </div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: textPrimary, margin: "0 0 4px" }}>{studentName}</h1>
            <p style={{ color: textSecondary, margin: "0 0 14px", fontSize: 14 }}>
              {studentGrade}
              {" · "}
              {new Date(submittedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}
              {" "}
              {new Date(submittedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Tag label={quizName} />
              <Tag label={subject} />
              {difficulty && <Tag label={difficulty} style={diff} />}
              {quizCode && <Tag label={`Code: ${quizCode}`} />}
            </div>
          </div>

          {/* Score circle — all values resolved from CSS vars */}
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div style={{
              width: 90, height: 90, borderRadius: "50%",
              background: `conic-gradient(${sc} ${score}%, ${borderMuted} 0)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 8px",
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: "50%",
                background: bgSecondary,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column",
              }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: sc, lineHeight: 1 }}>{score}%</span>
              </div>
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: sc }}>{scoreLabel(score)}</div>
            <div style={{ fontSize: 12, color: textSecondary, marginTop: 2 }}>
              {correctAnswers}/{totalQuestions} correct
            </div>
          </div>
        </div>

        {/* KPI row */}
        <div className="trd-fade" style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12, marginBottom: 24, animationDelay: ".05s",
        }}>
          {[
            { emoji: "🎯", label: "Final Score",     value: `${score}%`,                        color: sc },
            { emoji: "✅", label: "Correct",          value: `${correctAnswers}/${totalQuestions}`, color: "#16a34a" },
            { emoji: "❌", label: "Wrong",            value: wrongCount,                         color: wrongCount > 0 ? "#dc2626" : "#16a34a" },
            { emoji: "📝", label: "Total Questions", value: totalQuestions,                      color: textPrimary },
          ].map(({ emoji, label, value, color }) => (
            <Card key={label} style={{ display: "flex", flexDirection: "column", gap: 5, padding: "16px 18px" }}>
              <div style={{ fontSize: 18 }}>{emoji}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 11, color: textSecondary }}>{label}</div>
            </Card>
          ))}
        </div>

        {/* Detailed feedback */}
        <div className="trd-fade" style={{ animationDelay: ".1s" }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: textPrimary, margin: "0 0 16px" }}>
            📋 Detailed Answer Analysis
          </h2>

          {detailedFeedback.map((fb, idx) => {
            const isOpen    = openIdx === idx;
            const isCorrect = fb.type === "multiple-choice" ? fb.isCorrect : fb.pointsEarned >= fb.pointsPossible;
            const isPartial = !isCorrect && fb.pointsEarned > 0;

            // All colors resolved — no CSS var strings in JS interpolation
            const bColor = isCorrect ? "rgba(22,163,74,.25)"  : isPartial ? "rgba(202,138,4,.25)"  : "rgba(220,38,38,.25)";
            const bgCol  = isCorrect ? "rgba(22,163,74,.03)"  : isPartial ? "rgba(202,138,4,.03)"  : "rgba(220,38,38,.03)";
            const stColor = isCorrect ? "#16a34a"             : isPartial ? "#ca8a04"              : "#dc2626";
            const stLabel = isCorrect ? "Correct"             : isPartial ? "Partial"              : "Incorrect";
            const stEmoji = isCorrect ? "✅"                  : isPartial ? "⚠️"                   : "❌";

            return (
              <div key={idx} style={{
                background: bgCol, border: `1px solid ${bColor}`,
                borderRadius: 14, overflow: "hidden", marginBottom: 10,
              }}>
                {/* Header row — always visible */}
                <button className="trd-feedback-header" onClick={() => setOpenIdx(isOpen ? null : idx)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 16, flexShrink: 0 }}>{stEmoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: textPrimary }}>
                        Q{fb.questionNumber} · <span style={{ fontWeight: 400 }}>{fb.question}</span>
                      </div>
                      <div style={{ fontSize: 11, color: textSecondary, marginTop: 2 }}>
                        {fb.type?.replace("-", " ")}
                        {fb.pointsPossible !== undefined && ` · ${fb.pointsEarned}/${fb.pointsPossible} pts`}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: stColor,
                      background: `${stColor}22`, borderRadius: 20, padding: "2px 10px",
                    }}>{stLabel}</span>
                    <span style={{
                      fontSize: 16, color: textSecondary,
                      display: "inline-block",
                      transform: isOpen ? "rotate(180deg)" : "none",
                      transition: "transform .2s",
                    }}>▾</span>
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${bColor}` }}>
                    <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                      {/* Student answer */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                          Student's Answer
                        </div>
                        <div style={{
                          background: bgContainer, border: `1px solid ${bColor}`,
                          borderRadius: 10, padding: "10px 14px",
                          fontSize: 14, color: textPrimary,
                        }}>
                          {fb.studentAnswer || "—"}
                        </div>
                      </div>

                      {/* Correct answer — MC wrong only */}
                      {fb.type === "multiple-choice" && !fb.isCorrect && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                            Correct Answer
                          </div>
                          <div style={{
                            background: "rgba(22,163,74,.08)", border: "1px solid rgba(22,163,74,.25)",
                            borderRadius: 10, padding: "10px 14px",
                            fontSize: 14, color: "#16a34a", fontWeight: 600,
                          }}>
                            {fb.correctAnswer}
                          </div>
                        </div>
                      )}

                      {/* AI feedback */}
                      {fb.explanation && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: textSecondary, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>
                            ✨ AI Insight & Feedback
                          </div>
                          <div style={{
                            background: bgContainer, border: `1px solid ${sidebarBorder}`,
                            borderRadius: 10, padding: "12px 16px",
                            fontSize: 14, color: textPrimary, lineHeight: 1.7,
                          }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}
                              components={{
                                p:      ({ children }) => <p      style={{ margin: "0 0 8px",  color: textPrimary }}>{children}</p>,
                                strong: ({ children }) => <strong style={{ color: textPrimary }}>{children}</strong>,
                                li:     ({ children }) => <li     style={{ color: textPrimary, marginBottom: 4 }}>{children}</li>,
                              }}
                            >{fb.explanation}</ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Mark scheme */}
                    {fb.markScheme && (
                      <div className="trd-mark-scheme">
                        <details>
                          <summary>View Grading Criteria (Mark Scheme)</summary>
                          <div style={{
                            marginTop: 10, fontSize: 13, color: textSecondary,
                            background: bgContainer, borderRadius: 8, padding: "10px 14px",
                          }}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{fb.markScheme}</ReactMarkdown>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="trd-fade" style={{ marginTop: 28, animationDelay: ".15s", display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="trd-action-btn"
            onClick={() => window.print()}
            style={{ background: accentColor, color: "#fff" }}
          >
            🖨️ Print Report
          </button>
          <button
            className="trd-action-btn"
            onClick={() => {
              const data = JSON.stringify(result, null, 2);
              const blob = new Blob([data], { type: "application/json" });
              const url  = URL.createObjectURL(blob);
              const a    = document.createElement("a");
              a.href = url;
              a.download = `${studentName.replace(/\s+/g, "-")}-${quizName}-results.json`;
              a.click();
            }}
            style={{
              background: bgSecondary,
              border: `1px solid ${sidebarBorder}`,
              color: textPrimary,
            }}
          >
            💾 Export JSON
          </button>
        </div>

        <div style={{ height: 48 }} />
      </div>
    </div>
  );
}
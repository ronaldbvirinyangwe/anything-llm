import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css"; // Required for math equations to display correctly

// ─── Markdown / Math Renderer Wrapper ─────────────────────────────────────────
// This component safely renders standard Markdown + LaTeX math ($ inline, $$ block)
// while overriding default margins so it doesn't break your tight UI layouts.
const FormattedText = ({ children }) => {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ node, ...props }) => <p style={{ margin: "0 0 8px 0", display: "inline-block", width: "100%" }} {...props} />,
        ul: ({ node, ...props }) => <ul style={{ margin: "0 0 8px 0", paddingLeft: 20 }} {...props} />,
        ol: ({ node, ...props }) => <ol style={{ margin: "0 0 8px 0", paddingLeft: 20 }} {...props} />,
        li: ({ node, ...props }) => <li style={{ marginBottom: 4 }} {...props} />,
        code: ({ node, inline, ...props }) => (
          inline 
            ? <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.9em", color: "#e2e8f0" }} {...props} />
            : <code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: 6, fontFamily: "monospace", overflowX: "auto", margin: "8px 0" }} {...props} />
        ),
      }}
    >
      {String(children)}
    </ReactMarkdown>
  );
};

// ─── Data normaliser ─────────────────────────────────────────────────────────
function normaliseQuiz(raw) {
  if (!raw) return null;

  const rawQs = Array.isArray(raw.questions)
    ? raw.questions
    : Array.isArray(raw?.quiz?.questions)
    ? raw.quiz.questions
    : [];

  const questions = rawQs.map((q, i) => {
    const rawOpts = Array.isArray(q.options) ? q.options : [];
    const displayOptions = rawOpts.map((o) =>
      String(o).replace(/^[A-Da-d][).\s]\s*/, "").trim()
    );

    const ca = String(q.correct_answer || "A").trim();
    const correctLetter = ca.match(/^([A-Da-d])/)?.[1]?.toUpperCase() ?? "A";
    const correctIdx = Math.max(0, "ABCD".indexOf(correctLetter));

    const type =
      (q.type || "mcq").toLowerCase().includes("mcq") ||
      (q.type || "").toLowerCase().includes("multiple")
        ? "mcq"
        : "structured";

    return {
      id: i + 1,
      question: q.question || q.text || q.body || `Question ${i + 1}`,
      displayOptions,
      correctIdx,
      correctLetter,
      type,
      points: q.points || (type === "mcq" ? 1 : 4),
      raw: q,
    };
  });

  return {
    title: raw.title || raw.subject || "Quiz",
    subject: raw.subject || raw.metadata?.subject || "",
    topic: raw.topic || raw.metadata?.topic || "",
    difficulty: raw.difficulty || raw.metadata?.difficulty || "medium",
    duration: raw.duration || 60 * 60,
    questions,
    rawQuestions: rawQs,
  };
}

// ─── Build the answers array the backend expects ──────────────────────────────
function buildBackendAnswers(quiz, mcqAnswers, textAnswers) {
  return quiz.questions.map((q) => {
    if (q.type === "mcq") {
      const optIdx = mcqAnswers[q.id];
      if (optIdx === undefined || optIdx === null) return "";
      const letter = ["A", "B", "C", "D"][optIdx];
      const originalOpt = q.raw.options?.[optIdx] ?? q.displayOptions[optIdx] ?? "";
      const hasPrefix = /^[A-Da-d][).\s]/.test(originalOpt);
      return hasPrefix ? originalOpt : `${letter}) ${originalOpt}`;
    }
    return textAnswers[q.id] ?? "";
  });
}

// ─── Status constants ─────────────────────────────────────────────────────────
const S = {
  UNVISITED:  "unvisited",
  VISITED:    "visited",
  ANSWERED:   "answered",
  MARKED:     "marked",
  ANS_MARKED: "ans_marked",
};
const ST = {
  [S.UNVISITED]:  { bg: "#111827", border: "#1f2937", color: "#4b5563" },
  [S.VISITED]:    { bg: "#2d1f1f", border: "#7c2d2d", color: "#f87171" },
  [S.ANSWERED]:   { bg: "#052e16", border: "#166534", color: "#4ade80" },
  [S.MARKED]:     { bg: "#1e1a2e", border: "#6d28d9", color: "#a78bfa" },
  [S.ANS_MARKED]: { bg: "#14290e", border: "#4d7c0f", color: "#86efac" },
};

function pad(n) { return String(n).padStart(2, "0"); }
function fmt(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${pad(h)} : ${pad(m)} : ${pad(s)}`;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExamPanel({ externalTest, onClose }) {
  const quiz = normaliseQuiz(externalTest);

  const [idx, setIdx]                   = useState(0);
  const [mcqAnswers, setMcqAnswers]     = useState({});
  const [textAnswers, setTextAnswers]   = useState({});
  const [statuses, setStatuses]         = useState(() =>
    Object.fromEntries((quiz?.questions || []).map((q) => [q.id, S.UNVISITED]))
  );
  const [timeLeft, setTimeLeft]         = useState(quiz?.duration || 3600);
  const [phase, setPhase]               = useState("exam");
  const [result, setResult]             = useState(null);
  const [submitError, setSubmitError]   = useState(null);
  const [showInstr, setShowInstr]       = useState(false);
  const timerRef                        = useRef(null);

  const mcqRef  = useRef(mcqAnswers);
  const textRef = useRef(textAnswers);
  useEffect(() => { mcqRef.current  = mcqAnswers; }, [mcqAnswers]);
  useEffect(() => { textRef.current = textAnswers; }, [textAnswers]);

  const q = quiz?.questions?.[idx];

  // ── Timer ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          submitToBackend(mcqRef.current, textRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [phase]);

  // ── Mark visited on navigate ───────────────────────────────────────────────
  useEffect(() => {
    if (!q) return;
    setStatuses((prev) => ({
      ...prev,
      [q.id]: prev[q.id] === S.UNVISITED ? S.VISITED : prev[q.id],
    }));
  }, [idx]);

  // ── Core submit function ───────────────────────────────────────────────────
  const submitToBackend = useCallback(async (currentMcq, currentText) => {
    if (!quiz) return;
    clearInterval(timerRef.current);
    setPhase("submitting");
    setSubmitError(null);

    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const answersArray = buildBackendAnswers(quiz, currentMcq, currentText);

      const payload = {
        quiz: {
          subject:    quiz.subject,
          topic:      quiz.topic,
          difficulty: quiz.difficulty,
          questions:  quiz.rawQuestions,
        },
        answers: answersArray,
      };

      const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3001/api";
      const res = await fetch(`${API_BASE}/quiz/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server error ${res.status}`);
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Submission failed");

      setResult(data);
      setPhase("result");
    } catch (err) {
      console.error("Quiz submit error:", err);
      setSubmitError(err.message || "Something went wrong. Please try again.");
      setPhase("error");
    }
  }, [quiz]);

  const handleConfirmSubmit = () => {
    submitToBackend(mcqAnswers, textAnswers);
  };

  const selectOption = (optIdx) => {
    if (!q) return;
    setMcqAnswers((prev) => ({ ...prev, [q.id]: optIdx }));
    setStatuses((prev) => ({
      ...prev,
      [q.id]:
        prev[q.id] === S.MARKED || prev[q.id] === S.ANS_MARKED
          ? S.ANS_MARKED
          : S.ANSWERED,
    }));
  };

  const clearAnswer = () => {
    if (!q) return;
    setMcqAnswers((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setTextAnswers((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setStatuses((prev) => ({
      ...prev,
      [q.id]: prev[q.id] === S.ANS_MARKED ? S.MARKED : S.VISITED,
    }));
  };

  const toggleBookmark = () => {
    if (!q) return;
    setStatuses((prev) => {
      const c = prev[q.id];
      if (c === S.ANSWERED)   return { ...prev, [q.id]: S.ANS_MARKED };
      if (c === S.ANS_MARKED) return { ...prev, [q.id]: S.ANSWERED };
      if (c === S.MARKED)     return { ...prev, [q.id]: S.VISITED };
      return { ...prev, [q.id]: S.MARKED };
    });
  };

  const prev = () => setIdx((i) => Math.max(0, i - 1));
  const next = () => setIdx((i) => Math.min((quiz?.questions?.length ?? 1) - 1, i + 1));

  const reset = () => {
    setPhase("exam");
    setIdx(0);
    setMcqAnswers({});
    setTextAnswers({});
    setStatuses(Object.fromEntries(quiz.questions.map((q) => [q.id, S.UNVISITED])));
    setResult(null);
    setSubmitError(null);
    setTimeLeft(quiz.duration || 3600);
  };

  if (!quiz) {
    return (
      <div style={{ ...css.root, alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#64748b", fontSize: 15 }}>No quiz data available.</p>
      </div>
    );
  }

  const sv = Object.values(statuses);
  const stats = {
    total:      quiz.questions.length,
    answered:   sv.filter((s) => s === S.ANSWERED || s === S.ANS_MARKED).length,
    notAns:     sv.filter((s) => s === S.VISITED).length,
    notVisited: sv.filter((s) => s === S.UNVISITED).length,
    marked:     sv.filter((s) => s === S.MARKED || s === S.ANS_MARKED).length,
  };

  const danger      = timeLeft < 300;
  const warning     = timeLeft < 600 && !danger;
  const isBookmarked = q && (statuses[q.id] === S.MARKED || statuses[q.id] === S.ANS_MARKED);

  // ════════════════════════════════════════════════════════════════════════════
  // SUBMITTING & ERROR SCREENS
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "submitting") {
    return (
      <div style={{ ...css.root, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={css.spinner} />
        <p style={{ color: "#818cf8", fontSize: 15, fontWeight: 600 }}>Submitting your answers…</p>
        <p style={{ color: "#4b5563", fontSize: 13, textAlign: "center", maxWidth: 280 }}>
          AI feedback is being generated for each question. This may take 15–30 seconds.
        </p>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div style={{ ...css.root, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <p style={{ color: "#f87171", fontSize: 15, fontWeight: 600 }}>Submission failed</p>
        <p style={{ color: "#4b5563", fontSize: 14, textAlign: "center", maxWidth: 300 }}>{submitError}</p>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button style={css.btnSecondary} onClick={reset}>Start over</button>
          <button style={css.btnPrimary} onClick={() => submitToBackend(mcqAnswers, textAnswers)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // RESULT SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === "result" && result) {
    const pct  = result.score ?? 0;
    const arc  = 2 * Math.PI * 76; 
    const fill = arc * (1 - pct / 100);
    const grade =
      pct >= 75 ? { label: "Excellent", color: "#4ade80" }
      : pct >= 50 ? { label: "Good",    color: "#fbbf24" }
      : { label: "Needs work",           color: "#f87171" };

    return (
      <div style={css.root}>
        <div style={css.topBar}>
          <div style={css.breadcrumb}>
            <span style={css.bMain}>{quiz.title}</span>
            <ChevR />
            <span style={css.bSub}>{quiz.subject}</span>
          </div>
          {onClose && <button style={css.btnExit} onClick={onClose}>Exit</button>}
        </div>

        <div style={css.resultWrap}>
          <div style={css.resultCard}>
            <div style={css.resultBadge}>Results</div>
            <h2 style={css.resultH}>{quiz.topic || quiz.subject}</h2>

            {/* Scaled-up Score circle */}
            <svg width="180" height="180" viewBox="0 0 180 180" style={{ margin: "24px auto 0", display: "block" }}>
              <circle cx="90" cy="90" r="76" fill="none" stroke="#1f2937" strokeWidth="14"/>
              <circle cx="90" cy="90" r="76" fill="none"
                stroke={grade.color} strokeWidth="14" strokeLinecap="round"
                strokeDasharray={arc} strokeDashoffset={fill}
                transform="rotate(-90 90 90)"
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)" }}/>
              <text x="90" y="84" textAnchor="middle" fill="#f1f5f9" fontSize="42" fontWeight="700">{pct}%</text>
              <text x="90" y="112" textAnchor="middle" fill="#64748b" fontSize="16">{grade.label}</text>
            </svg>

            {/* Score summary */}
            <p style={{ fontSize: 16, color: "#64748b", margin: "20px 0 24px", lineHeight: 1.6 }}>{result.summary}</p>

            {/* XP earned */}
            {result.xpEarned > 0 && (
              <div style={css.xpChip}>+{result.xpEarned} XP earned</div>
            )}

            {/* Spread out 4-column grid */}
            <div style={css.resGrid}>
              {[
                { l: "Total Score", v: `${result.earnedPoints}/${result.totalPoints}`, c: "#e2e8f0" },
                { l: "Correct",     v: result.feedback?.filter((f) => f.isCorrect).length ?? "—", c: "#4ade80" },
                { l: "Attempted",   v: result.feedback?.length ?? "—", c: "#818cf8" },
                { l: "Skipped",     v: stats.total - (result.feedback?.length ?? 0), c: "#64748b" },
              ].map(({ l, v, c }) => (
                <div key={l} style={css.resStatCard}>
                  <span style={{ ...css.resStatVal, color: c }}>{v}</span>
                  <span style={css.resStatLabel}>{l}</span>
                </div>
              ))}
            </div>

            {/* Per-question feedback */}
            {Array.isArray(result.feedback) && result.feedback.length > 0 && (
              <div style={css.feedbackList}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>
                  Question Feedback
                </div>
                {result.feedback.map((fb, i) => (
                  <div key={i} style={{ ...css.fbCard, borderColor: fb.isCorrect ? "#166534" : "#7c2d2d" }}>
                    <div style={css.fbHeader}>
                      <span style={css.fbQNum}>Question {fb.questionNumber ?? i + 1}</span>
                      <span style={{ ...css.fbBadge, color: fb.isCorrect ? "#4ade80" : "#f87171", background: fb.isCorrect ? "#052e16" : "#2d1f1f", border: `1px solid ${fb.isCorrect ? "#166534" : "#7c2d2d"}` }}>
                        {fb.isCorrect ? "Correct" : "Incorrect"}
                      </span>
                      {fb.pointsEarned !== undefined && (
                        <span style={css.fbPoints}>{fb.pointsEarned} / {fb.pointsPossible ?? fb.pointsEarned} pts</span>
                      )}
                    </div>
                    
                    {/* Rendered Feedback Question */}
                    <div style={css.fbQuestion}>
                      <FormattedText>{fb.question}</FormattedText>
                    </div>

                    {/* Rendered Feedback Answer/Explanation */}
                    {fb.feedback && (
                      <div style={css.fbFeedback}>
                        <FormattedText>{fb.feedback}</FormattedText>
                      </div>
                    )}

                    {/* Rendered Correct Answer */}
                    {fb.correctAnswer && !fb.isCorrect && (
                      <div style={css.fbCorrect}>
                        Correct answer: <strong style={{color:"#e2e8f0"}}><FormattedText>{fb.correctAnswer}</FormattedText></strong>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...css.resActions, marginTop: 32 }}>
              <button style={{...css.btnSecondary, padding: "12px 28px", fontSize: 16}} onClick={reset}>Retake Quiz</button>
              {onClose && <button style={{...css.btnPrimary, padding: "12px 28px", fontSize: 16}} onClick={onClose}>Back to chat</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // EXAM SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div style={css.root}>

      {/* ── TOP BAR ── */}
      <div style={css.topBar}>
        <div style={css.breadcrumb}>
          <span style={css.bMain}>{quiz.title}</span>
          <ChevR />
          <span style={css.bSub}>{quiz.subject}</span>
          {quiz.topic && <><ChevR /><span style={css.bSub}>{quiz.topic}</span></>}
        </div>
        <div style={css.topRight}>
          <div style={{ ...css.timer, ...(danger ? css.timerDanger : warning ? css.timerWarn : {}) }}>
            <ClockIcon />
            <span style={css.timerText}>{fmt(timeLeft)}</span>
          </div>
          <button style={css.btnSubmitTop} onClick={() => setPhase("confirm")}>
            Review & Submit <ChevR />
          </button>
          {onClose && <button style={css.btnExit} onClick={onClose}>Exit</button>}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={css.body}>

        {/* LEFT — Navigator */}
        <div style={css.left}>
          <div style={css.leftInner}>
            <div style={css.legend}>
              {[
                [S.ANSWERED,  "Answered"],
                [S.VISITED,   "Not answered"],
                [S.MARKED,    "Marked"],
                [S.UNVISITED, "Not visited"],
              ].map(([s, l]) => (
                <div key={s} style={css.legendRow}>
                  <div style={{ ...css.legendDot, background: ST[s].bg, border: `1.5px solid ${ST[s].border}` }} />
                  <span style={css.legendLabel}>{l}</span>
                </div>
              ))}
            </div>

            <div style={css.navScroll}>
              <div style={css.navSectionHead}>
                <span style={css.navSecLabel}>Questions</span>
                <span style={css.navSecCount}>
                  <span style={{ color: "#4ade80" }}>{stats.answered}</span>
                  <span style={{ color: "#374151" }}>/</span>
                  <span style={{ color: "#6b7280" }}>{stats.total}</span>
                </span>
              </div>
              <div style={css.navGrid}>
                {quiz.questions.map((question, i) => {
                  const st = statuses[question.id];
                  const active = i === idx;
                  return (
                    <button key={question.id} onClick={() => setIdx(i)} style={{
                      ...css.navBtn,
                      background: active ? "#312e81" : ST[st].bg,
                      border: `1.5px solid ${active ? "#818cf8" : ST[st].border}`,
                      color: active ? "#e0e7ff" : ST[st].color,
                      boxShadow: active ? "0 0 0 3px rgba(129,140,248,0.18)" : "none",
                      transform: active ? "scale(1.07)" : "scale(1)",
                    }}>
                      {pad(i + 1)}
                      {(st === S.MARKED || st === S.ANS_MARKED) && <span style={css.markDot} />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — Question */}
        <div style={css.center}>
          <div style={css.qScroll}>
            {q && (
              <>
                <div style={css.qHeader}>
                  <div style={css.qNumBadge}>Q {idx + 1}</div>
                  <div style={css.qMarks}>
                    <span style={css.markGreen}>+{q.points} correct</span>
                    {q.type === "mcq" && <span style={css.markRed}>−1 wrong</span>}
                  </div>
                  <span style={css.qTypeBadge}>
                    {q.type === "mcq" ? "Multiple Choice" : "Structured"}
                  </span>
                  <button style={css.reportBtn}><FlagIcon /> Report</button>
                </div>

                {/* Rendered Exam Question */}
                <div style={css.qText}>
                  <FormattedText>{q.question}</FormattedText>
                </div>

                {q.type === "mcq" ? (
                  <div style={css.optionList}>
                    {q.displayOptions.map((opt, i) => {
                      const sel = mcqAnswers[q.id] === i;
                      return (
                        <button key={i} onClick={() => selectOption(i)} style={{
                          ...css.optBtn,
                          ...(sel ? css.optBtnSel : {}),
                        }}>
                          <div style={{ ...css.optLetter, ...(sel ? css.optLetterSel : {}) }}>
                            {["A","B","C","D"][i]}
                          </div>
                          <div style={css.optText}>
                            {/* Rendered Options */}
                            <FormattedText>{opt || `Option ${["A","B","C","D"][i]}`}</FormattedText>
                          </div>
                          {sel && <CheckIcon />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    style={css.textarea}
                    placeholder="Type your answer here…"
                    value={textAnswers[q.id] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setTextAnswers((prev) => ({ ...prev, [q.id]: val }));
                      if (val.trim()) {
                        setStatuses((prev) => ({
                          ...prev,
                          [q.id]:
                            prev[q.id] === S.MARKED || prev[q.id] === S.ANS_MARKED
                              ? S.ANS_MARKED : S.ANSWERED,
                        }));
                      }
                    }}
                  />
                )}
              </>
            )}
          </div>

          {/* Action bar */}
          <div style={css.actionBar}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={toggleBookmark} style={{ ...css.actionBtn, ...(isBookmarked ? css.actionBtnLit : {}) }}>
                <BookmarkIcon filled={isBookmarked} /> Bookmark
              </button>
              <button onClick={clearAnswer} style={css.actionBtn}>
                <ClearIcon /> Clear
              </button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={prev} disabled={idx === 0}
                style={{ ...css.actionBtnNav, ...(idx === 0 ? css.disabled : {}) }}>
                <ChevL /> Prev
              </button>
              <button onClick={next} disabled={idx === quiz.questions.length - 1}
                style={{ ...css.actionBtnPrimary, ...(idx === quiz.questions.length - 1 ? css.disabled : {}) }}>
                Save & Next <ChevR />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — Overview */}
        <div style={css.right}>
          <div style={css.rightInner}>
            <div style={css.sectionLabel}>Overview</div>
            <div style={css.overviewGrid}>
              {[
                { l: "Total",      v: stats.total,      c: "#94a3b8" },
                { l: "Answered",   v: stats.answered,   c: "#4ade80" },
                { l: "Not Ans.",   v: stats.notAns,     c: "#f87171" },
                { l: "Not Visited",v: stats.notVisited, c: "#475569" },
                { l: "Bookmarked", v: stats.marked,     c: "#a78bfa" },
              ].map(({ l, v, c }) => (
                <div key={l} style={css.oCard}>
                  <span style={{ ...css.oVal, color: c }}>{v}</span>
                  <span style={css.oLabel}>{l}</span>
                </div>
              ))}
            </div>

            <div style={css.divider} />
            <button onClick={() => setShowInstr(true)} style={css.instrBtn}>
              <InfoIcon /> Instructions
            </button>
            <div style={css.divider} />

            <div style={css.sectionLabel}>Progress</div>
            <div style={css.progressTrack}>
              <div style={{
                ...css.progressFill,
                width: `${stats.total > 0 ? Math.round((stats.answered / stats.total) * 100) : 0}%`,
              }} />
            </div>
            <p style={css.progressLabel}>{stats.answered}/{stats.total} answered</p>
            <div style={css.diffChip}>
              {(quiz.difficulty || "medium").charAt(0).toUpperCase() + (quiz.difficulty || "medium").slice(1)} difficulty
            </div>
          </div>
        </div>
      </div>

      {/* ── INSTRUCTIONS MODAL ── */}
      {showInstr && (
        <div style={css.overlay} onClick={() => setShowInstr(false)}>
          <div style={css.modal} onClick={(e) => e.stopPropagation()}>
            <div style={css.modalHdr}>
              <span style={css.modalTitle}>Instructions</span>
              <button style={css.modalX} onClick={() => setShowInstr(false)}>✕</button>
            </div>
            <div style={css.modalBody}>
              {[
                ["Marking scheme", "MCQ: +1 per correct, −1 per wrong. Structured: AI-graded against mark scheme."],
                ["Navigation",     "Click any question number in the left panel or use Prev / Save & Next."],
                ["Bookmarking",    "Bookmark questions to revisit them before submitting."],
                ["Submission",     "Click 'Review & Submit'. The timer auto-submits when it hits zero."],
              ].map(([h, b]) => (
                <div key={h} style={{ marginBottom: 14 }}>
                  <div style={css.instrH}>{h}</div>
                  <div style={css.instrB}>{b}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMIT CONFIRM MODAL ── */}
      {phase === "confirm" && (
        <div style={css.overlay} onClick={() => setPhase("exam")}>
          <div style={{ ...css.modal, maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={css.modalHdr}>
              <span style={css.modalTitle}>Submit test?</span>
              <button style={css.modalX} onClick={() => setPhase("exam")}>✕</button>
            </div>
            <div style={css.modalBody}>
              <div style={css.confirmGrid}>
                {[
                  { l: "Answered",   v: stats.answered,                      c: "#4ade80" },
                  { l: "Unanswered", v: stats.notAns + stats.notVisited,     c: "#f87171" },
                  { l: "Bookmarked", v: stats.marked,                        c: "#a78bfa" },
                ].map(({ l, v, c }) => (
                  <div key={l} style={css.confirmRow}>
                    <span style={css.confirmLabel}>{l}</span>
                    <span style={{ fontSize: 22, fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
              <p style={css.confirmWarn}>Once submitted you cannot change your answers.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button style={css.btnSecondary} onClick={() => setPhase("exam")}>Cancel</button>
                <button style={css.btnPrimary} onClick={handleConfirmSubmit}>Submit now</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevR = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const ChevL = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>;
const ClockIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const FlagIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>;
const CheckIcon = () => <svg style={{marginLeft:"auto",flexShrink:0}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const InfoIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const BookmarkIcon = ({ filled }) => <svg width="16" height="16" viewBox="0 0 24 24" fill={filled?"#818cf8":"none"} stroke={filled?"#818cf8":"currentColor"} strokeWidth="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>;
const ClearIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;

// ─── Styles ───────────────────────────────────────────────────────────────────
// Notice: whiteSpace: "pre-line" has been removed from text containers since React Markdown handles spacing.
const css = {
  root:        { display:"flex", flexDirection:"column", height:"100%", background:"#0d1117", fontFamily:"'DM Sans',-apple-system,sans-serif", color:"#e2e8f0", overflow:"hidden", position:"relative" },
  topBar:      { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:"1px solid #1f2937", flexShrink:0, gap:12 },
  breadcrumb:  { display:"flex", alignItems:"center", gap:6, flex:1, overflow:"hidden", color:"#6b7280" },
  bMain:       { fontSize:14, fontWeight:600, color:"#94a3b8", whiteSpace:"nowrap" },
  bSub:        { fontSize:13, color:"#4b5563", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" },
  topRight:    { display:"flex", alignItems:"center", gap:9, flexShrink:0 },
  timer:       { display:"flex", alignItems:"center", gap:6, background:"#111827", border:"1px solid #1f2937", borderRadius:8, padding:"6px 12px", color:"#6b7280" },
  timerWarn:   { background:"#1c1407", borderColor:"#78350f", color:"#fbbf24" },
  timerDanger: { background:"#1c0707", borderColor:"#7f1d1d", color:"#f87171" },
  timerText:   { fontSize:14, fontWeight:700, fontFamily:"'DM Mono',monospace", letterSpacing:"0.15em" },
  btnSubmitTop:{ display:"flex", alignItems:"center", gap:6, background:"#312e81", border:"1px solid #4338ca", borderRadius:8, padding:"8px 14px", color:"#e0e7ff", fontSize:14, fontWeight:600, cursor:"pointer" },
  btnExit:     { background:"transparent", border:"1px solid #1f2937", borderRadius:8, padding:"8px 12px", color:"#6b7280", fontSize:13, cursor:"pointer" },
  body:        { display:"flex", flex:1, overflow:"hidden" },
  left:        { width:220, borderRight:"1px solid #1f2937", display:"flex", flexDirection:"column", flexShrink:0 },
  leftInner:   { display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" },
  legend:      { padding:"12px 12px 10px", borderBottom:"1px solid #1f2937", display:"flex", flexDirection:"column", gap:6 },
  legendRow:   { display:"flex", alignItems:"center", gap:8 },
  legendDot:   { width:11, height:11, borderRadius:4, flexShrink:0 },
  legendLabel: { fontSize:12, color:"#4b5563" },
  navScroll:   { flex:1, overflowY:"auto", padding:"12px 12px 18px" },
  navSectionHead:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  navSecLabel: { fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:1 },
  navSecCount: { display:"flex", gap:4, fontSize:13, fontWeight:700 },
  navGrid:     { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 },
  navBtn:      { position:"relative", borderRadius:8, padding:"8px 2px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.12s", lineHeight:1, textAlign:"center" },
  markDot:     { position:"absolute", top:3, right:3, width:5, height:5, borderRadius:"50%", background:"#a78bfa" },
  center:      { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 },
  qScroll:     { flex:1, overflowY:"auto", padding:"20px 22px 12px" },
  qHeader:     { display:"flex", alignItems:"center", gap:9, marginBottom:16, flexWrap:"wrap" },
  qNumBadge:   { background:"#312e81", border:"1px solid #4338ca", borderRadius:8, padding:"5px 12px", fontSize:14, fontWeight:700, color:"#c7d2fe" },
  qMarks:      { display:"flex", gap:6 },
  markGreen:   { fontSize:12, padding:"4px 9px", borderRadius:5, fontWeight:600, color:"#4ade80", background:"#052e16", border:"1px solid #166534" },
  markRed:     { fontSize:12, padding:"4px 9px", borderRadius:5, fontWeight:600, color:"#f87171", background:"#2d1f1f", border:"1px solid #7c2d2d" },
  qTypeBadge:  { fontSize:12, padding:"4px 9px", borderRadius:5, fontWeight:600, color:"#818cf8", background:"#1e1a2e", border:"1px solid #4338ca", marginLeft:"auto" },
  reportBtn:   { display:"flex", alignItems:"center", gap:5, background:"transparent", border:"1px solid #1f2937", borderRadius:7, padding:"4px 10px", fontSize:13, color:"#4b5563", cursor:"pointer" },
  
  qText:       { fontSize:16, lineHeight:1.8, color:"#cbd5e1", marginBottom:22 },
  optionList:  { display:"flex", flexDirection:"column", gap:10 },
  optBtn:      { display:"flex", alignItems:"center", gap:12, width:"100%", background:"#0f172a", border:"1px solid #1f2937", borderRadius:12, padding:"14px 18px", cursor:"pointer", textAlign:"left", transition:"all 0.12s", color:"#94a3b8" },
  optBtnSel:   { background:"#1e1b4b", border:"1px solid #4338ca", boxShadow:"0 0 0 2px rgba(67,56,202,.2)" },
  optLetter:   { width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0, background:"#1f2937", color:"#4b5563", border:"1px solid #374151" },
  optLetterSel:{ background:"#312e81", color:"#e0e7ff", border:"1px solid #4338ca" },
  optText:     { fontSize:15, lineHeight:1.55, color:"#cbd5e1", flex:1 },
  textarea:    { width:"100%", minHeight:160, background:"#0f172a", border:"1px solid #1f2937", borderRadius:12, padding:14, color:"#cbd5e1", fontSize:15, lineHeight:1.7, resize:"vertical", outline:"none", fontFamily:"inherit", boxSizing:"border-box" },
  
  actionBar:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 22px", borderTop:"1px solid #1f2937", flexShrink:0 },
  actionBtn:   { display:"flex", alignItems:"center", gap:6, background:"transparent", border:"1px solid #1f2937", borderRadius:9, padding:"8px 14px", fontSize:14, color:"#6b7280", cursor:"pointer" },
  actionBtnLit:{ borderColor:"#4338ca", color:"#818cf8", background:"#1e1b4b" },
  actionBtnNav:{ display:"flex", alignItems:"center", gap:6, background:"#111827", border:"1px solid #1f2937", borderRadius:9, padding:"8px 16px", fontSize:14, color:"#6b7280", cursor:"pointer" },
  actionBtnPrimary:{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#312e81,#4338ca)", border:"none", borderRadius:9, padding:"9px 18px", fontSize:14, color:"#e0e7ff", cursor:"pointer", fontWeight:600 },
  disabled:    { opacity:0.3, cursor:"not-allowed" },
  right:       { width:200, borderLeft:"1px solid #1f2937", flexShrink:0 },
  rightInner:  { padding:"16px 14px", height:"100%", overflowY:"auto" },
  sectionLabel:{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:1, marginBottom:10 },
  overviewGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 },
  oCard:       { background:"#0f172a", borderRadius:10, border:"1px solid #1f2937", padding:"10px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 },
  oVal:        { fontSize:24, fontWeight:700, lineHeight:1 },
  oLabel:      { fontSize:11, color:"#4b5563", fontWeight:600, textAlign:"center" },
  divider:     { height:1, background:"#1f2937", margin:"14px 0" },
  instrBtn:    { display:"flex", alignItems:"center", gap:8, background:"transparent", border:"1px solid #1f2937", borderRadius:9, padding:"8px 10px", fontSize:13, color:"#6b7280", cursor:"pointer", width:"100%" },
  progressTrack:{ height:6, background:"#1f2937", borderRadius:6, overflow:"hidden", marginBottom:6 },
  progressFill:{ height:"100%", borderRadius:6, background:"linear-gradient(90deg,#312e81,#4338ca)", transition:"width .4s ease" },
  progressLabel:{ fontSize:12, color:"#4b5563", margin:"0 0 12px" },
  diffChip:    { fontSize:12, fontWeight:600, color:"#818cf8", background:"#1e1b4b", border:"1px solid #312e81", borderRadius:6, padding:"4px 10px", display:"inline-block" },
  overlay:     { position:"absolute", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 },
  modal:       { background:"#111827", border:"1px solid #1f2937", borderRadius:16, width:"90%", maxWidth:520, display:"flex", flexDirection:"column", overflow:"hidden" },
  modalHdr:    { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid #1f2937" },
  modalTitle:  { fontSize:18, fontWeight:700, color:"#e2e8f0" },
  modalX:      { background:"transparent", border:"none", color:"#4b5563", fontSize:20, cursor:"pointer" },
  modalBody:   { padding:"20px" },
  instrH:      { fontSize:14, fontWeight:700, color:"#818cf8", marginBottom:6 },
  instrB:      { fontSize:14, color:"#6b7280", lineHeight:1.6 },
  confirmGrid: { background:"#1f2937", borderRadius:12, padding:16, marginBottom:16, display:"flex", flexDirection:"column", gap:2 },
  confirmRow:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #111827" },
  confirmLabel:{ fontSize:14, color:"#6b7280" },
  confirmWarn: { fontSize:13, color:"#4b5563", marginBottom:18, textAlign:"center" },
  resultWrap:  { flex:1, overflowY:"auto", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"32px 24px" },
  resultCard:  { background:"#111827", border:"1px solid #1f2937", borderRadius:24, padding:"36px 32px", width:"100%", maxWidth:720, textAlign:"center" },
  resultBadge: { display:"inline-block", background:"#1e1b4b", border:"1px solid #312e81", borderRadius:24, padding:"6px 16px", fontSize:14, fontWeight:600, color:"#818cf8", marginBottom:12 },
  resultH:     { fontSize:26, fontWeight:700, color:"#e2e8f0", margin:"0 0 8px" },
  xpChip:      { display:"inline-block", background:"#1c2a0e", border:"1px solid #4d7c0f", borderRadius:24, padding:"6px 16px", fontSize:14, fontWeight:700, color:"#86efac", marginBottom:20 },
  resGrid:     { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, margin:"24px 0 32px" },
  resStatCard: { background:"#0f172a", borderRadius:14, border:"1px solid #1f2937", padding:"18px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:6 },
  resStatVal:  { fontSize:32, fontWeight:700, lineHeight:1 },
  resStatLabel:{ fontSize:14, color:"#4b5563", fontWeight:600 },
  resActions:  { display:"flex", gap:16, justifyContent:"center" },
  feedbackList:{ textAlign:"left", marginTop:24 },
  fbCard:      { background:"#0f172a", borderRadius:14, border:"1px solid", padding:"18px 20px", marginBottom:16 },
  fbHeader:    { display:"flex", alignItems:"center", gap:10, marginBottom:10 },
  fbQNum:      { fontSize:15, fontWeight:700, color:"#64748b" },
  fbBadge:     { fontSize:13, fontWeight:600, borderRadius:6, padding:"4px 10px" },
  fbPoints:    { fontSize:14, color:"#64748b", marginLeft:"auto" },
  
  fbQuestion:  { fontSize:16, color:"#94a3b8", marginBottom:12, lineHeight:1.6 },
  fbFeedback:  { fontSize:15, color:"#64748b", lineHeight:1.6, marginBottom:8 },
  fbCorrect:   { fontSize:15, color:"#4ade80" },
  
  btnPrimary:  { background:"linear-gradient(135deg,#312e81,#4338ca)", border:"none", borderRadius:10, padding:"10px 20px", fontSize:15, fontWeight:600, color:"#e0e7ff", cursor:"pointer" },
  btnSecondary:{ background:"transparent", border:"1px solid #1f2937", borderRadius:10, padding:"10px 20px", fontSize:15, color:"#94a3b8", cursor:"pointer" },
  spinner:     { width:40, height:40, border:"3px solid #1f2937", borderTop:"3px solid #818cf8", borderRadius:"50%", animation:"spin 0.8s linear infinite" },
};
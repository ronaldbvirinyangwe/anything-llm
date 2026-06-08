import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import axios from "axios";

// ─── Formatted Text Wrapper ──────────────────────────────────────────────────
const FormattedText = ({ children }) => {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ node, ...props }) => <p style={{ margin: "0", display: "inline-block", width: "100%" }} {...props} />,
        ul: ({ node, ...props }) => <ul style={{ margin: "8px 0", paddingLeft: 20, textAlign: "left" }} {...props} />,
        ol: ({ node, ...props }) => <ol style={{ margin: "8px 0", paddingLeft: 20, textAlign: "left" }} {...props} />,
        code: ({ node, inline, ...props }) => (
          inline 
            ? <code style={{ background: "rgba(255,255,255,0.1)", padding: "2px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.9em" }} {...props} />
            : <code style={{ display: "block", background: "rgba(0,0,0,0.3)", padding: "12px", borderRadius: 8, fontFamily: "monospace", overflowX: "auto", margin: "8px 0", textAlign: "left" }} {...props} />
        ),
      }}
    >
      {String(children)}
    </ReactMarkdown>
  );
};

// ─── Status Constants ────────────────────────────────────────────────────────
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

// ─── Question Parser ─────────────────────────────────────────────────────────
function parseQuestions(content) {
  if (!content) return [];
  let processed = content
    .replace(/\\\([\s\S]*?\\\)/g, (m) => m.replace(/\n/g, " "))
    .replace(/\\\[[\s\S]*?\\\]/g, (m) => m.replace(/\n/g, " "))
    .replace(/\$\$[\s\S]*?\$\$/g, (m) => m.replace(/\n/g, " "))
    .replace(/\$(?!\$)[\s\S]*?(?<!\$)\$/g, (m) => m.replace(/\n/g, " "));

  const lines = processed.split("\n");
  const questions = [];
  let current = null;
  let inMarkScheme = false;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const questionMatch = trimmed.match(/^(\d+)\.\s+(.+)/);

    if (questionMatch) {
      inMarkScheme = false;
      if (current) questions.push(current);

      let questionText = questionMatch[2].trim();
      let marks = null;

      const marksInQuestion = questionText.match(/\[(\d+)\s*marks?\]\s*\*?\s*$/i);
      if (marksInQuestion) {
        marks = parseInt(marksInQuestion[1]);
        questionText = questionText.replace(/\[?\(?\d+\s*marks?\)?\]?\s*\*?\s*$/i, "").trim();
      }

      current = {
        id: parseInt(questionMatch[1]) - 1, // 0-indexed for state
        question: questionText.replace(/^\*+|\*+$/g, "").trim(),
        options: [],
        lines: [],
        marks,
        type: "structured" // Default, changes to mcq if options found
      };
      continue;
    }

    if (!current) continue;

    if (/^\*?\*?\s*(correct\s*)?answer\s*[:=]/i.test(trimmed)) continue;
    if (/^(mark\s*scheme|marking\s*(guide|criteria|rubric))\s*:/i.test(trimmed)) {
      inMarkScheme = true;
      continue;
    }

    if (inMarkScheme) continue;

    const standaloneMarks = trimmed.match(/^\*?\*?\[?\(?\s*(\d+)\s*marks?\s*\)?\]?\*?\*?\s*$/i);
    if (standaloneMarks) {
      if (!current.marks) current.marks = parseInt(standaloneMarks[1]);
      continue;
    }

    if (/^[A-Da-d][).]\s+/.test(trimmed)) {
      current.options.push(trimmed);
      current.type = "mcq";
      continue;
    }

    current.lines.push(trimmed);
  }

  if (current) questions.push(current);
  return questions;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function StudentQuiz() {
  const { quizCode } = useParams();
  const navigate = useNavigate();
  
  // Quiz Data State
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  // UX State
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [statuses, setStatuses] = useState({});
  const [phase, setPhase] = useState("loading"); // loading | start | exam | confirm | submitting | result | error
  const [feedback, setFeedback] = useState(null);
  const [showInstr, setShowInstr] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Security & Timer State
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [tabViolations, setTabViolations] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);
  
  const timerRef = useRef(null);
  const tabViolationsRef = useRef(0);
  const isSubmittingRef = useRef(false);

  const q = questions[idx];

  // 1. Load Quiz
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`https://api.chikoro-ai.com/api/system/quiz/${quizCode}`);
        if (res.data.success) {
          setQuiz(res.data.quiz);
          const parsed = parseQuestions(res.data.quiz.content);
          setQuestions(parsed);
          setStatuses(Object.fromEntries(parsed.map((_, i) => [i, S.UNVISITED])));
          setPhase("start");
        }
      } catch (err) {
        setPhase("error");
        setSubmitError("Failed to load quiz. It may not exist or has expired.");
      }
    };
    fetchQuiz();
  }, [quizCode]);

  // 2. Security & Timer Hooks
  const startExam = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
      
      // Initialize Timer
      if (quiz.timeLimit > 0) {
        const storageKey = `quiz_${quizCode}_start`;
        let startTime = localStorage.getItem(storageKey);
        if (!startTime) {
          startTime = Date.now();
          localStorage.setItem(storageKey, startTime);
        }
        const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
        const remaining = (quiz.timeLimit * 60) - elapsed;
        setTimeRemaining(remaining > 0 ? remaining : 0);
      }
      
      setPhase("exam");
    } catch (err) {
      alert("⚠️ Fullscreen mode is required for this secure assessment.");
    }
  };

  useEffect(() => {
    if (phase !== "exam") return;
    
    // Timer Loop
    if (quiz?.timeLimit > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            submitQuiz(tabViolationsRef.current, true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }

    // Security Listeners
    const maxTabSwitches = quiz?.tabLimit || 1;
    
    const handleVisibility = () => {
      if (document.hidden && phase === "exam") {
        const newV = tabViolationsRef.current + 1;
        tabViolationsRef.current = newV;
        setTabViolations(newV);
        
        if (newV === 1 && !hasWarned) {
          setHasWarned(true);
          alert(`⚠️ WARNING: Focus Loss Detected!\nYou have ${maxTabSwitches} allowed violation(s). You have used ${newV}.`);
        }
        if (newV > maxTabSwitches) {
          alert(`🚨 VIOLATION LIMIT EXCEEDED!\nYour quiz will now be automatically submitted.`);
          submitQuiz(newV, false);
        }
      }
    };

    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFullscreen && phase === "exam") {
        const newV = tabViolationsRef.current + 1;
        tabViolationsRef.current = newV;
        setTabViolations(newV);
        if (newV > maxTabSwitches) {
          alert("🚨 Fullscreen exit violation limit exceeded. Submitting quiz.");
          submitQuiz(newV, false);
        } else {
          alert(`⚠️ Fullscreen exited! Violations: ${newV}/${maxTabSwitches}`);
        }
      }
    };

    const preventKeys = (e) => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault(); return false;
      }
    };
    const preventContextMenu = (e) => e.preventDefault();
    const warnUnload = (e) => { e.returnValue = "Progress may be lost."; return e.returnValue; };

    document.addEventListener("visibilitychange", handleVisibility);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventKeys);
    window.addEventListener("beforeunload", warnUnload);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventKeys);
      window.removeEventListener("beforeunload", warnUnload);
    };
  }, [phase, quiz, hasWarned]);

  // Mark visited on navigate
  useEffect(() => {
    if (phase !== "exam" || !q) return;
    setStatuses((prev) => ({
      ...prev,
      [q.id]: prev[q.id] === S.UNVISITED ? S.VISITED : prev[q.id],
    }));
  }, [idx, phase, q]);

  // 3. Submission Logic
  const submitQuiz = async (violations = tabViolationsRef.current, isTimeExpired = false) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setPhase("submitting");
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const student = JSON.parse(localStorage.getItem("chikoroai_user"));
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index), answer: answer || "",
      }));

      const payload = {
        quizCode,
        studentId: student.id,
        answers: formattedAnswers,
        tabViolations: violations,
        tabLimitExceeded: !isTimeExpired && violations > (quiz?.tabLimit || 1),
        autoSubmitted: isTimeExpired || violations > (quiz?.tabLimit || 1),
        timeExpired: isTimeExpired,
      };

      const res = await axios.post("https://api.chikoro-ai.com/api/system/student/submit-quiz", payload);
      
      if (res.data.success) {
        setFeedback({ ...res.data, timeExpired: isTimeExpired });
        localStorage.removeItem(`quiz_${quizCode}_start`);
        if (document.fullscreenElement) document.exitFullscreen();
        setPhase("result");
      }
    } catch (err) {
      setSubmitError(err.response?.data?.alreadySubmitted ? "Quiz already submitted." : "Submission failed.");
      setPhase("error");
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // 4. UI Handlers
  const handleAnswerChange = (val) => {
    setAnswers((prev) => ({ ...prev, [q.id]: val }));
    if (val) {
      setStatuses((prev) => ({
        ...prev,
        [q.id]: prev[q.id] === S.MARKED || prev[q.id] === S.ANS_MARKED ? S.ANS_MARKED : S.ANSWERED,
      }));
    }
  };

  const clearAnswer = () => {
    setAnswers((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
    setStatuses((prev) => ({
      ...prev,
      [q.id]: prev[q.id] === S.ANS_MARKED ? S.MARKED : S.VISITED,
    }));
  };

  const toggleBookmark = () => {
    setStatuses((prev) => {
      const c = prev[q.id];
      if (c === S.ANSWERED)   return { ...prev, [q.id]: S.ANS_MARKED };
      if (c === S.ANS_MARKED) return { ...prev, [q.id]: S.ANSWERED };
      if (c === S.MARKED)     return { ...prev, [q.id]: S.VISITED };
      return { ...prev, [q.id]: S.MARKED };
    });
  };

  // ─── Render Pipeline ───────────────────────────────────────────────────────
  
  if (phase === "loading") {
    return <div style={{ ...css.root, justifyContent: "center", alignItems: "center" }}><div style={css.spinner} /></div>;
  }

  if (phase === "error") {
    return (
      <div style={{ ...css.root, alignItems: "center", justifyContent: "center", gap: 14 }}>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <p style={{ color: "#f87171", fontSize: 16, fontWeight: 600 }}>{submitError}</p>
        <button style={css.btnPrimary} onClick={() => navigate("/")}>Go Back</button>
      </div>
    );
  }

  // START SCREEN (Dark Theme)
  if (phase === "start") {
    return (
      <div style={{...css.root, alignItems: "center", justifyContent: "center", padding: "20px"}}>
        <div style={css.startCard}>
          <div style={css.startIcon}><ShieldIcon /></div>
          <h1 style={{fontSize: "2rem", color: "#e2e8f0", margin: "0 0 10px"}}>Secure Assessment</h1>
          <h2 style={{fontSize: "1.2rem", color: "#94a3b8", margin: "0 0 30px", fontWeight: 500}}>
            {quiz.subject} • {quiz.topic}
          </h2>
          
          <div style={css.startGrid}>
            <div style={css.infoBox}><span style={css.infoLabel}>Difficulty</span><span style={css.infoVal}>{quiz.difficulty}</span></div>
            <div style={css.infoBox}><span style={css.infoLabel}>Time Limit</span><span style={css.infoVal}>{quiz.timeLimit > 0 ? `${quiz.timeLimit} min` : "None"}</span></div>
            <div style={css.infoBox}><span style={css.infoLabel}>Focus Limit</span><span style={css.infoVal}>{quiz.tabLimit} violations</span></div>
          </div>

          <div style={css.securityNotice}>
            <h3 style={{color: "#fbbf24", margin: "0 0 10px", display: "flex", gap: "8px"}}><AlertIcon/> Strict Rules Apply</h3>
            <ul style={{margin: 0, paddingLeft: "20px", color: "#d97706", lineHeight: 1.6, fontSize: "14px"}}>
              <li>Opens in strict <strong>fullscreen mode</strong>.</li>
              <li>Switching tabs, windows, or applications is tracked.</li>
              <li>Copy, paste, and right-click are disabled.</li>
              <li>Exceeding violations auto-submits your test.</li>
            </ul>
          </div>
          
          <div style={{display: "flex", gap: "12px", justifyContent: "center"}}>
            <button style={css.btnSecondary} onClick={() => navigate("/")}>Cancel</button>
            <button style={css.btnPrimary} onClick={startExam}>Enter Secure Mode</button>
          </div>
        </div>
      </div>
    );
  }

  // EXAM SCREEN STATS
  const sv = Object.values(statuses);
  const stats = {
    total:      questions.length,
    answered:   sv.filter((s) => s === S.ANSWERED || s === S.ANS_MARKED).length,
    notAns:     sv.filter((s) => s === S.VISITED).length,
    notVisited: sv.filter((s) => s === S.UNVISITED).length,
    marked:     sv.filter((s) => s === S.MARKED || s === S.ANS_MARKED).length,
  };

  const danger = timeRemaining < 300 && quiz.timeLimit > 0;
  const warning = timeRemaining < 600 && !danger && quiz.timeLimit > 0;
  const isBookmarked = q && (statuses[q.id] === S.MARKED || statuses[q.id] === S.ANS_MARKED);

  if (phase === "submitting") {
    return (
      <div style={{ ...css.root, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={css.spinner} />
        <p style={{ color: "#818cf8", fontSize: 16, fontWeight: 600 }}>Submitting securely…</p>
      </div>
    );
  }

  // RESULT SCREEN
  if (phase === "result" && feedback) {
    const pct  = feedback.score ?? 0;
    const arc  = 2 * Math.PI * 76; 
    const fill = arc * (1 - pct / 100);
    const grade = pct >= 75 ? { label: "Excellent", color: "#4ade80" } : pct >= 50 ? { label: "Passed", color: "#fbbf24" } : { label: "Needs work", color: "#f87171" };

    return (
      <div style={css.root}>
        <div style={css.resultWrap}>
          <div style={css.resultCard}>
            <div style={css.resultBadge}>Official Results</div>
            <h2 style={css.resultH}>{quiz.topic}</h2>

            {(feedback.timeExpired || feedback.autoSubmitted) && (
              <div style={{background: "#2d1f1f", border: "1px solid #7c2d2d", color: "#f87171", padding: "10px", borderRadius: "8px", margin: "10px 0", fontSize: "13px", fontWeight: 600}}>
                ⚠️ {feedback.timeExpired ? "Time Limit Reached. Auto-submitted." : `Security Violations (${feedback.tabViolations}/${quiz.tabLimit}). Auto-submitted.`}
              </div>
            )}

            <svg width="180" height="180" viewBox="0 0 180 180" style={{ margin: "24px auto 0", display: "block" }}>
              <circle cx="90" cy="90" r="76" fill="none" stroke="#1f2937" strokeWidth="14"/>
              <circle cx="90" cy="90" r="76" fill="none" stroke={grade.color} strokeWidth="14" strokeLinecap="round" strokeDasharray={arc} strokeDashoffset={fill} transform="rotate(-90 90 90)" style={{ transition: "stroke-dashoffset 1.2s ease" }}/>
              <text x="90" y="84" textAnchor="middle" fill="#f1f5f9" fontSize="42" fontWeight="700">{pct}%</text>
              <text x="90" y="112" textAnchor="middle" fill="#64748b" fontSize="16">{grade.label}</text>
            </svg>

            <div style={css.resGrid}>
              <div style={css.resStatCard}><span style={{...css.resStatVal, color: "#e2e8f0"}}>{feedback.earnedPoints}/{feedback.totalPoints}</span><span style={css.resStatLabel}>Score</span></div>
              <div style={css.resStatCard}><span style={{...css.resStatVal, color: "#4ade80"}}>{feedback.feedback.filter(f=>f.isCorrect).length}</span><span style={css.resStatLabel}>Correct</span></div>
              <div style={css.resStatCard}><span style={{...css.resStatVal, color: "#818cf8"}}>{Object.keys(answers).length}</span><span style={css.resStatLabel}>Attempted</span></div>
              <div style={css.resStatCard}><span style={{...css.resStatVal, color: "#64748b"}}>{questions.length - Object.keys(answers).length}</span><span style={css.resStatLabel}>Skipped</span></div>
            </div>

            <div style={css.feedbackList}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16 }}>Teacher Review</div>
              {feedback.feedback.map((fb, i) => (
                <div key={i} style={{ ...css.fbCard, borderColor: fb.isCorrect ? "#166534" : (fb.isCorrect===false ? "#7c2d2d" : "#4338ca") }}>
                  <div style={css.fbHeader}>
                    <span style={css.fbQNum}>Q {fb.questionNumber}</span>
                    <span style={{ ...css.fbBadge, color: fb.isCorrect ? "#4ade80" : (fb.isCorrect===false ? "#f87171" : "#a5b4fc"), background: fb.isCorrect ? "#052e16" : (fb.isCorrect===false ? "#2d1f1f" : "#1e1b4b") }}>
                      {fb.isCorrect ? "Correct" : (fb.isCorrect===false ? "Incorrect" : "Structured")}
                    </span>
                    <span style={css.fbPoints}>{fb.pointsEarned}/{fb.pointsPossible} pts</span>
                  </div>
                  
                  <div style={css.fbQuestion}><FormattedText>{fb.question}</FormattedText></div>
                  
                  <div style={{background: "#1f2937", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "14px"}}>
                    <strong style={{color:"#94a3b8", display:"block", marginBottom:"4px"}}>Your Answer:</strong>
                    <FormattedText>{fb.studentAnswer || "No answer provided"}</FormattedText>
                  </div>

                  {fb.explanation && (
                    <div style={{background: "#1e1b4b", padding: "10px", borderRadius: "8px", marginBottom: "12px", fontSize: "14px"}}>
                      <strong style={{color:"#818cf8", display:"block", marginBottom:"4px"}}>Teacher Insight:</strong>
                      <FormattedText>{fb.explanation}</FormattedText>
                    </div>
                  )}

                  {fb.correctAnswer && fb.isCorrect === false && (
                    <div style={{fontSize: "14px", color: "#f87171"}}>
                      Correct Answer: <strong style={{color:"#e2e8f0"}}><FormattedText>{fb.correctAnswer}</FormattedText></strong>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ ...css.resActions, marginTop: 32 }}>
              <button style={css.btnPrimary} onClick={() => navigate("/")}>Return to Dashboard</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // EXAM SCREEN
  return (
    <div style={css.root}>
      {/* ── TOP BAR ── */}
      <div style={css.topBar}>
        <div style={css.breadcrumb}>
          <span style={css.bMain}>{quiz.subject}</span>
          <ChevR />
          <span style={css.bSub}>{quiz.topic}</span>
        </div>
        <div style={css.topRight}>
          {quiz.timeLimit > 0 && (
            <div style={{ ...css.timer, ...(danger ? css.timerDanger : warning ? css.timerWarn : {}) }}>
              <ClockIcon />
              <span style={css.timerText}>{fmt(timeRemaining)}</span>
            </div>
          )}
          {tabViolations > 0 && (
            <div style={css.violationPill}>
              <AlertIcon/> {tabViolations}/{quiz.tabLimit} Violations
            </div>
          )}
          <button style={css.btnSubmitTop} onClick={() => setPhase("confirm")}>
            Review & Submit <ChevR />
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={css.body}>
        {/* LEFT — Navigator */}
        <div style={css.left}>
          <div style={css.leftInner}>
            <div style={css.legend}>
              {[[S.ANSWERED,"Answered"], [S.VISITED,"Not answered"], [S.MARKED,"Marked"], [S.UNVISITED,"Not visited"]].map(([s, l]) => (
                <div key={s} style={css.legendRow}>
                  <div style={{ ...css.legendDot, background: ST[s].bg, border: `1.5px solid ${ST[s].border}` }} />
                  <span style={css.legendLabel}>{l}</span>
                </div>
              ))}
            </div>
            <div style={css.navScroll}>
              <div style={css.navSectionHead}>
                <span style={css.navSecLabel}>Questions</span>
                <span style={css.navSecCount}><span style={{color:"#4ade80"}}>{stats.answered}</span>/<span style={{color:"#6b7280"}}>{stats.total}</span></span>
              </div>
              <div style={css.navGrid}>
                {questions.map((question, i) => {
                  const st = statuses[question.id];
                  const active = i === idx;
                  return (
                    <button key={question.id} onClick={() => setIdx(i)} style={{
                      ...css.navBtn, background: active ? "#312e81" : ST[st].bg,
                      border: `1.5px solid ${active ? "#818cf8" : ST[st].border}`,
                      color: active ? "#e0e7ff" : ST[st].color,
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
                  {q.marks && <span style={css.markGreen}>{q.marks} Marks</span>}
                  <span style={css.qTypeBadge}>{q.type === "mcq" ? "Multiple Choice" : "Structured"}</span>
                </div>

                <div style={css.qText}><FormattedText>{q.question}</FormattedText></div>
                {q.lines?.length > 0 && (
                  <div style={css.qContext}>
                    {q.lines.map((l, i) => <p key={i} style={{margin:"4px 0"}}><FormattedText>{l}</FormattedText></p>)}
                  </div>
                )}

                {q.type === "mcq" ? (
                  <div style={css.optionList}>
                    {q.options.map((opt, i) => {
                      const sel = answers[q.id] === opt;
                      return (
                        <button key={i} onClick={() => handleAnswerChange(opt)} style={{ ...css.optBtn, ...(sel ? css.optBtnSel : {}) }}>
                          <div style={{ ...css.optLetter, ...(sel ? css.optLetterSel : {}) }}>{["A","B","C","D"][i]}</div>
                          <div style={css.optText}><FormattedText>{opt.replace(/^[A-D]\)\s*/, "")}</FormattedText></div>
                          {sel && <CheckIcon />}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    style={css.textarea}
                    placeholder="Type your answer here..."
                    value={answers[q.id] || ""}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                  />
                )}
              </>
            )}
          </div>

          <div style={css.actionBar}>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={toggleBookmark} style={{ ...css.actionBtn, ...(isBookmarked ? css.actionBtnLit : {}) }}>Bookmark</button>
              <button onClick={clearAnswer} style={css.actionBtn}>Clear</button>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setIdx(Math.max(0, idx-1))} disabled={idx === 0} style={css.actionBtnNav}>Prev</button>
              <button onClick={() => setIdx(Math.min(questions.length-1, idx+1))} disabled={idx === questions.length-1} style={css.actionBtnPrimary}>Next</button>
            </div>
          </div>
        </div>

        {/* RIGHT — Overview */}
        <div style={css.right}>
          <div style={css.rightInner}>
            <div style={css.sectionLabel}>Overview</div>
            <div style={css.overviewGrid}>
              {[{ l: "Total", v: stats.total, c: "#94a3b8" }, { l: "Answered", v: stats.answered, c: "#4ade80" }, { l: "Not Ans.", v: stats.notAns, c: "#f87171" }, { l: "Marked", v: stats.marked, c: "#a78bfa" }].map(({ l, v, c }) => (
                <div key={l} style={css.oCard}><span style={{ ...css.oVal, color: c }}>{v}</span><span style={css.oLabel}>{l}</span></div>
              ))}
            </div>
            <div style={css.divider} />
            <button onClick={() => setShowInstr(true)} style={css.instrBtn}>Instructions</button>
            <div style={css.divider} />
            <div style={css.sectionLabel}>Progress</div>
            <div style={css.progressTrack}><div style={{...css.progressFill, width: `${(stats.answered/stats.total)*100}%`}} /></div>
            <p style={css.progressLabel}>{stats.answered}/{stats.total} answered</p>
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {phase === "confirm" && (
        <div style={css.overlay} onClick={() => setPhase("exam")}>
          <div style={css.modal} onClick={(e) => e.stopPropagation()}>
            <div style={css.modalHdr}>
              <span style={css.modalTitle}>Submit Assessment?</span>
              <button style={css.modalX} onClick={() => setPhase("exam")}>✕</button>
            </div>
            <div style={css.modalBody}>
              <div style={css.confirmGrid}>
                <div style={css.confirmRow}><span style={css.confirmLabel}>Answered</span><span style={{fontSize:22, fontWeight:700, color:"#4ade80"}}>{stats.answered}</span></div>
                <div style={css.confirmRow}><span style={css.confirmLabel}>Unanswered</span><span style={{fontSize:22, fontWeight:700, color:"#f87171"}}>{stats.notAns + stats.notVisited}</span></div>
              </div>
              <p style={css.confirmWarn}>Once submitted, answers cannot be changed.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button style={css.btnSecondary} onClick={() => setPhase("exam")}>Cancel</button>
                <button style={css.btnPrimary} onClick={() => submitQuiz()}>Submit Now</button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {showInstr && (
        <div style={css.overlay} onClick={() => setShowInstr(false)}>
           <div style={css.modal} onClick={(e) => e.stopPropagation()}>
             <div style={css.modalHdr}><span style={css.modalTitle}>Exam Rules</span><button style={css.modalX} onClick={()=>setShowInstr(false)}>✕</button></div>
             <div style={css.modalBody}>
                <p style={css.confirmWarn}>Do not exit fullscreen. Switching tabs will trigger a violation warning and may auto-submit your exam.</p>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const ChevR = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>;
const ClockIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const CheckIcon = () => <svg style={{marginLeft:"auto",flexShrink:0}} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>;
const ShieldIcon = () => <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const AlertIcon = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

// ─── Styles ───────────────────────────────────────────────────────────────────
const css = {
  root:        { display:"flex", flexDirection:"column", height:"100vh", background:"#0d1117", fontFamily:"'DM Sans',-apple-system,sans-serif", color:"#e2e8f0", overflow:"hidden" },
  
  // Start Screen
  startCard:   { background: "#111827", border: "1px solid #1f2937", borderRadius: 24, padding: "40px", maxWidth: 600, width: "100%", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" },
  startIcon:   { color: "#818cf8", marginBottom: 16 },
  startGrid:   { display: "flex", gap: 12, justifyContent: "center", marginBottom: 30 },
  infoBox:     { background: "#0f172a", border: "1px solid #1e293b", padding: "12px 20px", borderRadius: 12, display: "flex", flexDirection: "column", gap: 4 },
  infoLabel:   { fontSize: 11, textTransform: "uppercase", color: "#64748b", fontWeight: 700 },
  infoVal:     { fontSize: 16, color: "#e2e8f0", fontWeight: 600 },
  securityNotice:{ background: "#1c1407", border: "1px solid #78350f", borderRadius: 12, padding: "20px", textAlign: "left", marginBottom: 30 },

  // Exam Layout
  topBar:      { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 18px", borderBottom:"1px solid #1f2937", flexShrink:0, gap:12 },
  breadcrumb:  { display:"flex", alignItems:"center", gap:6, flex:1, color:"#6b7280" },
  bMain:       { fontSize:14, fontWeight:600, color:"#94a3b8" },
  bSub:        { fontSize:13, color:"#4b5563" },
  topRight:    { display:"flex", alignItems:"center", gap:9 },
  timer:       { display:"flex", alignItems:"center", gap:6, background:"#111827", border:"1px solid #1f2937", borderRadius:8, padding:"6px 12px", color:"#6b7280" },
  timerWarn:   { background:"#1c1407", borderColor:"#78350f", color:"#fbbf24" },
  timerDanger: { background:"#1c0707", borderColor:"#7f1d1d", color:"#f87171" },
  timerText:   { fontSize:14, fontWeight:700, fontFamily:"monospace" },
  violationPill:{ display:"flex", alignItems:"center", gap:6, background:"#2d1f1f", border:"1px solid #7c2d2d", borderRadius:8, padding:"6px 12px", color:"#f87171", fontSize: 13, fontWeight: 600 },
  btnSubmitTop:{ display:"flex", alignItems:"center", gap:6, background:"#312e81", border:"1px solid #4338ca", borderRadius:8, padding:"8px 14px", color:"#e0e7ff", fontSize:14, fontWeight:600, cursor:"pointer" },
  
  body:        { display:"flex", flex:1, overflow:"hidden" },
  left:        { width:220, borderRight:"1px solid #1f2937", display:"flex", flexDirection:"column" },
  leftInner:   { display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" },
  legend:      { padding:"12px 12px 10px", borderBottom:"1px solid #1f2937", display:"flex", flexDirection:"column", gap:6 },
  legendRow:   { display:"flex", alignItems:"center", gap:8 },
  legendDot:   { width:11, height:11, borderRadius:4 },
  legendLabel: { fontSize:12, color:"#4b5563" },
  navScroll:   { flex:1, overflowY:"auto", padding:"12px 12px 18px" },
  navSectionHead:{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 },
  navSecLabel: { fontSize:12, fontWeight:700, color:"#374151", textTransform:"uppercase" },
  navSecCount: { display:"flex", gap:4, fontSize:13, fontWeight:700 },
  navGrid:     { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6 },
  navBtn:      { position:"relative", borderRadius:8, padding:"8px 2px", fontSize:12, fontWeight:700, cursor:"pointer", transition:"all 0.12s" },
  markDot:     { position:"absolute", top:3, right:3, width:5, height:5, borderRadius:"50%", background:"#a78bfa" },
  
  center:      { flex:1, display:"flex", flexDirection:"column", overflow:"hidden" },
  qScroll:     { flex:1, overflowY:"auto", padding:"30px 40px" },
  qHeader:     { display:"flex", alignItems:"center", gap:9, marginBottom:20 },
  qNumBadge:   { background:"#312e81", border:"1px solid #4338ca", borderRadius:8, padding:"5px 12px", fontSize:14, fontWeight:700, color:"#c7d2fe" },
  markGreen:   { fontSize:12, padding:"4px 9px", borderRadius:5, fontWeight:600, color:"#4ade80", background:"#052e16", border:"1px solid #166534" },
  qTypeBadge:  { fontSize:12, padding:"4px 9px", borderRadius:5, fontWeight:600, color:"#818cf8", background:"#1e1a2e", border:"1px solid #4338ca", marginLeft:"auto" },
  qText:       { fontSize:18, lineHeight:1.6, color:"#f1f5f9", marginBottom:16 },
  qContext:    { background: "#0f172a", borderLeft: "4px solid #374151", padding: "16px", borderRadius: "0 8px 8px 0", marginBottom: "24px", color: "#94a3b8", fontSize: "15px" },
  
  optionList:  { display:"flex", flexDirection:"column", gap:10 },
  optBtn:      { display:"flex", alignItems:"center", gap:12, width:"100%", background:"#0f172a", border:"1px solid #1f2937", borderRadius:12, padding:"16px 20px", cursor:"pointer", textAlign:"left", transition:"all 0.12s", color:"#94a3b8" },
  optBtnSel:   { background:"#1e1b4b", border:"1px solid #4338ca", boxShadow:"0 0 0 2px rgba(67,56,202,.2)" },
  optLetter:   { width:32, height:32, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, flexShrink:0, background:"#1f2937", color:"#4b5563" },
  optLetterSel:{ background:"#312e81", color:"#e0e7ff" },
  optText:     { fontSize:16, lineHeight:1.55, color:"#cbd5e1", flex:1 },
  textarea:    { width:"100%", minHeight:200, background:"#0f172a", border:"1px solid #1f2937", borderRadius:12, padding:16, color:"#cbd5e1", fontSize:16, lineHeight:1.7, resize:"vertical", outline:"none" },
  
  actionBar:   { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 40px", borderTop:"1px solid #1f2937" },
  actionBtn:   { display:"flex", alignItems:"center", gap:6, background:"transparent", border:"1px solid #1f2937", borderRadius:9, padding:"8px 14px", fontSize:14, color:"#6b7280", cursor:"pointer" },
  actionBtnLit:{ borderColor:"#4338ca", color:"#818cf8", background:"#1e1b4b" },
  actionBtnNav:{ display:"flex", alignItems:"center", gap:6, background:"#111827", border:"1px solid #1f2937", borderRadius:9, padding:"8px 16px", fontSize:14, color:"#6b7280", cursor:"pointer" },
  actionBtnPrimary:{ display:"flex", alignItems:"center", gap:6, background:"linear-gradient(135deg,#312e81,#4338ca)", border:"none", borderRadius:9, padding:"9px 18px", fontSize:14, color:"#e0e7ff", cursor:"pointer", fontWeight:600 },
  
  right:       { width:200, borderLeft:"1px solid #1f2937", flexShrink:0 },
  rightInner:  { padding:"16px 14px", height:"100%", overflowY:"auto" },
  sectionLabel:{ fontSize:11, fontWeight:700, color:"#374151", textTransform:"uppercase", letterSpacing:1, marginBottom:10 },
  overviewGrid:{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:16 },
  oCard:       { background:"#0f172a", borderRadius:10, border:"1px solid #1f2937", padding:"10px 8px", display:"flex", flexDirection:"column", alignItems:"center", gap:4 },
  oVal:        { fontSize:20, fontWeight:700, lineHeight:1 },
  oLabel:      { fontSize:10, color:"#4b5563", fontWeight:600, textAlign:"center" },
  divider:     { height:1, background:"#1f2937", margin:"14px 0" },
  instrBtn:    { width:"100%", padding:"8px", background:"transparent", border:"1px solid #1f2937", borderRadius:8, color:"#6b7280", fontSize:13, cursor:"pointer" },
  progressTrack:{ height:6, background:"#1f2937", borderRadius:6, overflow:"hidden", marginBottom:6 },
  progressFill:{ height:"100%", borderRadius:6, background:"linear-gradient(90deg,#312e81,#4338ca)", transition:"width .4s ease" },
  progressLabel:{ fontSize:12, color:"#4b5563" },

  // Modals
  overlay:     { position:"fixed", inset:0, background:"rgba(0,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50 },
  modal:       { background:"#111827", border:"1px solid #1f2937", borderRadius:16, width:"90%", maxWidth:400, overflow:"hidden" },
  modalHdr:    { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid #1f2937" },
  modalTitle:  { fontSize:16, fontWeight:700, color:"#e2e8f0" },
  modalX:      { background:"transparent", border:"none", color:"#4b5563", fontSize:20, cursor:"pointer" },
  modalBody:   { padding:"20px" },
  confirmGrid: { background:"#1f2937", borderRadius:12, padding:16, marginBottom:16, display:"flex", flexDirection:"column", gap:2 },
  confirmRow:  { display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid #111827" },
  confirmLabel:{ fontSize:14, color:"#6b7280" },
  confirmWarn: { fontSize:13, color:"#94a3b8", marginBottom:18, textAlign:"center" },
  
  btnPrimary:  { background:"linear-gradient(135deg,#312e81,#4338ca)", border:"none", borderRadius:10, padding:"10px 20px", fontSize:15, fontWeight:600, color:"#e0e7ff", cursor:"pointer" },
  btnSecondary:{ background:"transparent", border:"1px solid #1f2937", borderRadius:10, padding:"10px 20px", fontSize:15, color:"#94a3b8", cursor:"pointer" },
  spinner:     { width:40, height:40, border:"3px solid #1f2937", borderTop:"3px solid #818cf8", borderRadius:"50%", animation:"spin 0.8s linear infinite" },

  // Results
  resultWrap:  { flex:1, overflowY:"auto", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"32px 24px" },
  resultCard:  { background:"#111827", border:"1px solid #1f2937", borderRadius:24, padding:"36px 32px", width:"100%", maxWidth:720, textAlign:"center" },
  resultBadge: { display:"inline-block", background:"#1e1b4b", border:"1px solid #312e81", borderRadius:24, padding:"6px 16px", fontSize:14, fontWeight:600, color:"#818cf8", marginBottom:12 },
  resultH:     { fontSize:26, fontWeight:700, color:"#e2e8f0", margin:"0 0 8px" },
  resGrid:     { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16, margin:"24px 0 32px" },
  resStatCard: { background:"#0f172a", borderRadius:14, border:"1px solid #1f2937", padding:"18px 12px", display:"flex", flexDirection:"column", alignItems:"center", gap:6 },
  resStatVal:  { fontSize:28, fontWeight:700, lineHeight:1 },
  resStatLabel:{ fontSize:13, color:"#4b5563", fontWeight:600 },
  feedbackList:{ textAlign:"left", marginTop:24 },
  fbCard:      { background:"#0f172a", borderRadius:14, border:"1px solid", padding:"20px", marginBottom:16 },
  fbHeader:    { display:"flex", alignItems:"center", gap:10, marginBottom:12 },
  fbQNum:      { fontSize:15, fontWeight:700, color:"#64748b" },
  fbBadge:     { fontSize:13, fontWeight:600, borderRadius:6, padding:"4px 10px" },
  fbPoints:    { fontSize:14, color:"#64748b", marginLeft:"auto" },
  fbQuestion:  { fontSize:16, color:"#e2e8f0", marginBottom:16, lineHeight:1.6 },
};
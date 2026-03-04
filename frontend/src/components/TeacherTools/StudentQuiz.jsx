import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import "katex/dist/katex.min.css";
import "./studentquiz.css";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { 
  FiClock, FiShield, FiAlertTriangle, FiCheckCircle, 
  FiXCircle, FiPrinter, FiArrowLeft, FiSend, FiInfo 
} from "react-icons/fi";

// Helper to render text with inline LaTeX
function MathText({ text }) {
  if (!text) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <span>{children}</span>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

// Robust question parser
function parseQuestions(content) {
  if (!content) return [];
  let processed = content;
  processed = processed.replace(/\\\([\s\S]*?\\\)/g, (m) => m.replace(/\n/g, ' '));
  processed = processed.replace(/\\\[[\s\S]*?\\\]/g, (m) => m.replace(/\n/g, ' '));
  processed = processed.replace(/\$\$[\s\S]*?\$\$/g, (m) => m.replace(/\n/g, ' '));
  processed = processed.replace(/\$(?!\$)[\s\S]*?(?<!\$)\$/g, (m) => m.replace(/\n/g, ' '));

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
      let pendingMarks = current?._pendingMarks || null;

      if (current) {
        delete current._pendingMarks;
        questions.push(current);
      }

      let questionText = questionMatch[2].trim();
      let marks = pendingMarks; 

      const marksInQuestion = questionText.match(/\[(\d+)\s*marks?\]\s*\*?\s*$/i);
      if (marksInQuestion) {
        marks = parseInt(marksInQuestion[1]);
        questionText = questionText.replace(/\[?\(?\d+\s*marks?\)?\]?\s*\*?\s*$/i, "").trim();
      }

      if (!questionText.includes("\\(") && !questionText.includes("\\[")) {
        questionText = questionText.replace(/^\*+|\*+$/g, "").trim();
        questionText = questionText.replace(/^_+|_+$/g, "").trim();
      }

      current = {
        number: parseInt(questionMatch[1]),
        text: questionText,
        options: [],
        lines: [],
        marks: marks,
      };
      continue;
    }

    if (!current) continue;

    if (/^\*?\*?\s*(correct\s*)?answer\s*[:=]/i.test(trimmed)) continue;
    if (/^(mark\s*scheme|marking\s*(guide|criteria|rubric))\s*:/i.test(trimmed)) {
      inMarkScheme = true;
      continue;
    }

    if (inMarkScheme) {
      const nextQ = trimmed.match(/^(\d+)\.\s+(.+)/);
      if (nextQ) {
        inMarkScheme = false;
        i--; 
      }
      continue;
    }

    const standaloneMarks = trimmed.match(/^\*?\*?\[?\(?\s*(\d+)\s*marks?\s*\)?\]?\*?\*?\s*$/i);
    if (standaloneMarks) {
      if (!current.marks) current.marks = parseInt(standaloneMarks[1]);
      else current._pendingMarks = parseInt(standaloneMarks[1]);
      continue;
    }

    if (/^\*?\*?\s*(model\s*answer|expected\s*answer|suggested\s*answer|sample\s*answer|solution|explanation)\s*[:=]/i.test(trimmed)) {
      continue;
    }

    if (/^[A-Da-d][).]\s+/.test(trimmed)) {
      current.options.push(trimmed);
      continue;
    }

    let cleaned = trimmed;
    if (!cleaned.includes("\\(") && !cleaned.includes("\\[") && !cleaned.includes("$")) {
      cleaned = cleaned.replace(/^\*+|\*+$/g, "").trim();
      cleaned = cleaned.replace(/^_+|_+$/g, "").trim();
    }

    const contextMarks = cleaned.match(/\[(\d+)\s*marks?\]\s*\*?\s*$/i);
    if (contextMarks && !current.marks) {
      current.marks = parseInt(contextMarks[1]);
    }
    cleaned = cleaned.replace(/\[?\(?\d+\s*marks?\)?\]?\s*/gi, "").trim();
    cleaned = cleaned.replace(/[\*_]+\s*$/, "").trim();
    cleaned = cleaned.replace(/^[\*_]+\s*/, "").trim();

    if (cleaned) current.lines.push(cleaned);
  }

  if (current) {
    delete current._pendingMarks;
    questions.push(current);
  }

  return questions;
}

export default function StudentQuiz() {
  const { quizCode } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tabViolations, setTabViolations] = useState(0);
  const [hasWarned, setHasWarned] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const tabViolationsRef = useRef(0);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`https://api.chikoro-ai.com/api/system/quiz/${quizCode}`);
        if (res.data.success) setQuiz(res.data.quiz);
      } catch (err) { console.error("Error loading quiz:", err); }
    };
    fetchQuiz();
  }, [quizCode]);

  const initializeTimer = () => {
    if (quiz.timeLimit && quiz.timeLimit > 0) {
      const storageKey = `quiz_${quizCode}_start`;
      let startTime = localStorage.getItem(storageKey);
      if (!startTime) {
        startTime = Date.now();
        localStorage.setItem(storageKey, startTime);
      }
      const elapsed = Math.floor((Date.now() - parseInt(startTime)) / 1000);
      const totalTime = quiz.timeLimit * 60;
      const remaining = totalTime - elapsed;

      if (remaining > 0) setTimeRemaining(remaining);
      else {
        setTimeRemaining(0);
        setTimerExpired(true);
        autoSubmitQuiz(0, true);
      }
    }
  };

  const startQuizInFullscreen = async () => {
    try {
      const elem = document.documentElement;
      if (elem.requestFullscreen) await elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) await elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) await elem.msRequestFullscreen();
      
      setFullscreenActive(true);
      setQuizStarted(true);
      initializeTimer();
    } catch (err) {
      console.error("Fullscreen request failed:", err);
      alert("⚠️ Fullscreen mode is required. Please allow fullscreen when prompted.");
    }
  };

  useEffect(() => {
    if (!quizStarted) return;
    const handleFullscreenChange = () => {
      const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isFullscreen && quizStarted && !submitted) {
        const newViolations = tabViolationsRef.current + 1;
        tabViolationsRef.current = newViolations;
        setTabViolations(newViolations);
        alert("🚨 FULLSCREEN EXIT DETECTED!\n\nThis counts as a security violation. Your quiz will be automatically submitted.");
        autoSubmitQuiz(newViolations, false);
      }
      setFullscreenActive(isFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, [quizStarted, submitted]);

  useEffect(() => {
    if (!quizStarted || submitted || timeRemaining === null || timeRemaining <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timerRef.current);
          setTimerExpired(true);
          autoSubmitQuiz(tabViolationsRef.current, true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [quizStarted, submitted, timeRemaining]);

  useEffect(() => {
    if (!quizStarted || submitted) return;
    const maxTabSwitches = quiz?.tabLimit || 1;

    const handleVisibility = () => {
      if (document.hidden) {
        const newV = tabViolationsRef.current + 1;
        tabViolationsRef.current = newV;
        setTabViolations(newV);

        if (newV === 1 && !hasWarned) {
          setHasWarned(true);
          alert(`⚠️ WARNING: Focus Loss Detected!\nYou have ${maxTabSwitches} allowed violation(s). You have used ${newV}.`);
        }
        if (newV > maxTabSwitches) {
          alert(`🚨 VIOLATION LIMIT EXCEEDED!\nYour quiz will now be automatically submitted.`);
          autoSubmitQuiz(newV, false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [quizStarted, submitted, hasWarned, quiz]);

  useEffect(() => {
    if (!quizStarted) return;
    const prevent = (e) => { e.preventDefault(); return false; };
    const preventDevTools = (e) => {
      if (e.keyCode === 123 || (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74)) || (e.ctrlKey && e.keyCode === 85)) {
        e.preventDefault(); return false;
      }
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("keydown", preventDevTools);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("keydown", preventDevTools);
    };
  }, [quizStarted]);

  useEffect(() => {
    if (!quizStarted || submitted) return;
    const warnUnload = (e) => {
      e.preventDefault();
      e.returnValue = "Are you sure you want to leave? Your quiz progress may be lost.";
      return e.returnValue;
    };
    window.addEventListener("beforeunload", warnUnload);
    return () => window.removeEventListener("beforeunload", warnUnload);
  }, [quizStarted, submitted]);

  const autoSubmitQuiz = async (violations, isTimeExpired = false) => {
    if (submitted || loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitted(true); setLoading(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const student = JSON.parse(localStorage.getItem("chikoroai_user"));
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index), answer: answer || "",
      }));

      const res = await axios.post("https://api.chikoro-ai.com/api/system/student/submit-quiz", {
        quizCode, answers: formattedAnswers, studentId: student.id,
        tabViolations: violations, tabLimitExceeded: !isTimeExpired && violations > (quiz?.tabLimit || 1),
        autoSubmitted: true, timeExpired: isTimeExpired,
      });

      if (res.data.success) {
        setFeedback({ ...res.data, timeExpired: isTimeExpired });
        localStorage.removeItem(`quiz_${quizCode}_start`);
        if (document.fullscreenElement) document.exitFullscreen();
      }
    } catch (err) {
      if (err.response?.data?.alreadySubmitted) alert("❌ You have already submitted this quiz.");
      else alert("❌ Auto-submission failed.");
    } finally { setLoading(false); isSubmittingRef.current = false; }
  };

  const handleChange = (qIndex, value) => setAnswers({ ...answers, [qIndex]: value });

  const confirmSubmit = async () => {
    setShowSubmitConfirm(false);
    if (loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setSubmitted(true); setLoading(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const student = JSON.parse(localStorage.getItem("chikoroai_user"));
      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index), answer,
      }));

      const res = await axios.post("https://api.chikoro-ai.com/api/system/student/submit-quiz", {
        quizCode, answers: formattedAnswers, studentId: student.id,
        tabViolations: tabViolationsRef.current, tabLimitExceeded: tabViolationsRef.current > (quiz?.tabLimit || 1),
        autoSubmitted: false, timeExpired: false,
      });

      if (res.data.success) {
        setFeedback(res.data);
        localStorage.removeItem(`quiz_${quizCode}_start`);
        if (document.fullscreenElement) document.exitFullscreen();
      }
    } catch (err) {
      if (err.response?.data?.alreadySubmitted) alert("❌ You have already submitted this quiz.");
      else { setSubmitted(false); alert("❌ Submission failed. Please try again."); }
    } finally { setLoading(false); isSubmittingRef.current = false; }
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!quiz) return <div className="loading-screen"><div className="spinner"></div><p>Loading your quiz...</p></div>;

  if (submitted && feedback) {
    return <QuizFeedback feedback={feedback} quiz={quiz} quizCode={quizCode} />;
  }

  if (!quiz.content) {
    return (
      <div className="error-screen fade-in">
        <FiAlertTriangle className="error-icon" />
        <h2>Quiz Not Ready</h2>
        <p>Quiz content is missing or not yet generated for this code.</p>
        <Link to="/" className="btn-secondary"><FiArrowLeft/> Go Back</Link>
      </div>
    );
  }

  // --- START SCREEN ---
  if (!quizStarted) {
    return (
      <div className="quiz-start-container fade-in">
        <div className="quiz-start-card">
          <div className="start-icon"><FiShield /></div>
          <h1>Secure Assessment</h1>
          <h2 className="subject-title">{quiz.subject} - {quiz.topic}</h2>

          <div className="quiz-info-grid">
            <div className="info-box">
              <span className="info-label">Difficulty</span>
              <span className="info-value">{quiz.difficulty}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Time Limit</span>
              <span className="info-value">{quiz.timeLimit && quiz.timeLimit > 0 ? `${quiz.timeLimit} mins` : 'None'}</span>
            </div>
            <div className="info-box">
              <span className="info-label">Focus Limit</span>
              <span className="info-value">{quiz.tabLimit || 1} violations</span>
            </div>
          </div>

          <div className="security-notice">
            <h3><FiAlertTriangle style={{marginBottom: '-2px'}}/> Rules & Requirements</h3>
            <ul>
              <li>Opens in strict <strong>fullscreen mode</strong>.</li>
              <li>Do not switch tabs, windows, or applications.</li>
              <li>Copy, paste, and right-click are disabled.</li>
              <li>Exiting fullscreen automatically submits the quiz.</li>
            </ul>
          </div>

          <div className="start-actions">
            <Link to="/" className="btn-secondary">Cancel</Link>
            <button className="btn-primary start-btn" onClick={startQuizInFullscreen}>
              Enter Secure Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- QUIZ TAKING INTERFACE ---
  const questions = parseQuestions(quiz.content);
  const maxTabSwitches = quiz.tabLimit || 1;

  return (
    <div className="student-quiz-container fade-in">
      <header className="modern-quiz-header">
        <div className="header-main">
          <div className="header-titles">
            <h1>{quiz.subject}</h1>
            <span className="topic-badge">{quiz.topic}</span>
          </div>

          {timeRemaining !== null && quiz.timeLimit > 0 && (
            <div className={`timer-pill ${timeRemaining < 60 ? 'critical' : timeRemaining < 300 ? 'warning' : ''}`}>
              <FiClock className="timer-icon" />
              <span>{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>

        {tabViolations > 0 && (
          <div className="violation-banner">
            <FiAlertTriangle />
            Warning: {tabViolations} violation(s) detected. Limit: {maxTabSwitches}.
          </div>
        )}
      </header>

      <div className="quiz-questions-wrapper">
        {questions.map((q, idx) => (
          <div key={idx} className="student-question-card">
            <div className="question-meta-row">
              <span className={`q-type-badge ${q.options.length > 0 ? 'mcq' : 'structured'}`}>
                {q.options.length > 0 ? 'Multiple Choice' : 'Structured'}
              </span>
              {q.marks && <span className="marks-badge">{q.marks} Marks</span>}
            </div>

            <h3 className="q-text">
              <span className="q-number">{q.number}.</span> <MathText text={q.text} />
            </h3>

            {q.lines.length > 0 && (
              <div className="q-context">
                {q.lines.map((line, i) => <p key={i}><MathText text={line} /></p>)}
              </div>
            )}

            {q.options.length > 0 ? (
              <div className="options-grid">
                {q.options.map((opt, i) => (
                  <label key={i} className={`option-label ${answers[idx] === opt ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name={`q${idx}`}
                      value={opt}
                      checked={answers[idx] === opt}
                      onChange={() => handleChange(idx, opt)}
                      className="hidden-radio"
                    />
                    <div className="custom-radio"></div>
                    <span className="option-text"><MathText text={opt} /></span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                className="modern-textarea"
                placeholder="Type your comprehensive answer here..."
                value={answers[idx] || ""}
                onChange={(e) => handleChange(idx, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="quiz-footer-actions">
        <button className="btn-primary submit-final-btn" onClick={() => setShowSubmitConfirm(true)} disabled={loading || Object.keys(answers).length === 0}>
          {loading ? "Submitting..." : <><FiSend /> Finish & Submit Assessment</>}
        </button>
      </div>

      {showSubmitConfirm && (
        <div className="modal-overlay fade-in">
          <div className="modern-modal">
            <div className="modal-icon"><FiInfo /></div>
            <h2>Ready to Submit?</h2>
            <p>Once submitted, you cannot change your answers.</p>
            
            <div className="modal-progress">
              You answered <strong>{Object.keys(answers).length}</strong> out of <strong>{questions.length}</strong> questions.
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowSubmitConfirm(false)} disabled={loading}>
                Continue Checking
              </button>
              <button className="btn-primary confirm" onClick={confirmSubmit} disabled={loading}>
                {loading ? "Processing..." : "Yes, Submit Now"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- FEEDBACK COMPONENT ---
function QuizFeedback({ feedback, quiz, quizCode }) {
  const isPass = feedback.score >= 60;

  return (
    <div className="feedback-container fade-in">
      <header className="feedback-header">
        <div className="feedback-status-icon">
          {isPass ? <FiCheckCircle className="pass-icon" /> : <FiXCircle className="fail-icon" />}
        </div>
        <h1>Assessment Complete</h1>

        {(feedback.timeExpired || feedback.autoSubmitted) && (
          <div className="auto-submit-banner">
            <FiAlertTriangle />
            {feedback.timeExpired 
              ? "Time limit reached. Quiz auto-submitted." 
              : `Security violations exceeded (${feedback.tabViolations} / ${quiz.tabLimit}). Quiz auto-submitted.`}
          </div>
        )}

        <div className="score-widget">
          <div className={`circular-score ${isPass ? 'pass' : 'fail'}`}>
            <span>{feedback.score}%</span>
          </div>
          <p>{feedback.earnedPoints} of {feedback.totalPoints} Points Earned</p>
        </div>
      </header>

      <div className="feedback-list">
        {feedback.feedback.map((item, idx) => (
          <div key={idx} className={`result-card ${item.isCorrect !== undefined ? (item.isCorrect ? 'correct' : 'incorrect') : 'structured'}`}>
            <div className="result-card-header">
              <span className="q-num">Question {item.questionNumber}</span>
              <span className="pts-badge">{item.pointsEarned}/{item.pointsPossible} pts</span>
            </div>

            <h3 className="result-q-text"><MathText text={item.question} /></h3>

            <div className="student-response-box">
              <span className="response-label">Your Answer:</span>
              <div className="response-content"><MathText text={item.studentAnswer} /></div>
            </div>

            {item.type === "multiple-choice" && (
              <div className={`validation-box ${item.isCorrect ? 'match' : 'mismatch'}`}>
                {item.isCorrect ? (
                  <><FiCheckCircle /> Correct Answer</>
                ) : (
                  <><FiXCircle /> Incorrect. Correct is: <strong><MathText text={item.correctAnswer} /></strong></>
                )}
              </div>
            )}

            <div className="ai-insight-box">
              <h4>Teacher Insight</h4>
              <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                {item.explanation}
              </ReactMarkdown>
            </div>

            {item.markScheme && (
              <details className="modern-details">
                <summary>View Grading Criteria</summary>
                <div className="details-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {item.markScheme}
                  </ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="feedback-footer">
        <Link to="/" className="btn-primary"><FiArrowLeft /> Return to Learning</Link>
        <button className="btn-secondary" onClick={() => window.print()}><FiPrinter /> Print Results</button>
      </div>
    </div>
  );
}
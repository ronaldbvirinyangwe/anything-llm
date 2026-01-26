import React, { useEffect, useState, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import axios from "axios";
import "./studentquiz.css";

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
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [timerExpired, setTimerExpired] = useState(false);
  const timerRef = useRef(null);
  const isSubmittingRef = useRef(false);
  const tabViolationsRef = useRef(0);

  const cleanQuizText = (rawQuiz) => {
    if (!rawQuiz || typeof rawQuiz !== "string") return "";
    return rawQuiz
      .replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, '')
      .replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, '')
      .replace(/```.*?```/gs, '')
      .trim();
  };

  // Fetch quiz details
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`https://api.chikoro-ai.com/api/system/quiz/${quizCode}`);
        if (res.data.success) {
          setQuiz(res.data.quiz);
        }
      } catch (err) {
        console.error("Error loading quiz:", err);
      }
    };
    fetchQuiz();
  }, [quizCode]);

  // Initialize timer when quiz starts
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
      
      if (remaining > 0) {
        setTimeRemaining(remaining);
      } else {
        setTimeRemaining(0);
        setTimerExpired(true);
        autoSubmitQuiz(0, true);
      }
    }
  };

  // Request fullscreen and start quiz
  const startQuizInFullscreen = async () => {
    try {
      const elem = document.documentElement;
      
      // Try different fullscreen methods for cross-browser compatibility
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      }
      
      setFullscreenActive(true);
      setQuizStarted(true);
      initializeTimer();
    } catch (err) {
      console.error("Fullscreen request failed:", err);
      alert(
        "⚠️ Fullscreen mode is required to take this quiz.\n\n" +
        "Please allow fullscreen when prompted by your browser.\n" +
        "If you continue to have issues, try a different browser."
      );
    }
  };

  // Fullscreen change detection
  useEffect(() => {
    if (!quizStarted) return;

    const handleFullscreenChange = () => {
      const isFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );

      if (!isFullscreen && quizStarted && !submitted) {
        // Student exited fullscreen
        const newViolations = tabViolationsRef.current + 1;
        tabViolationsRef.current = newViolations;
        setTabViolations(newViolations);
        
        alert(
          "🚨 FULLSCREEN EXIT DETECTED!\n\n" +
          "You exited fullscreen mode. This counts as a security violation.\n" +
          "Your quiz will be automatically submitted."
        );
        
        autoSubmitQuiz(newViolations, false);
      }

      setFullscreenActive(isFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    document.addEventListener("mozfullscreenchange", handleFullscreenChange);
    document.addEventListener("MSFullscreenChange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      document.removeEventListener("mozfullscreenchange", handleFullscreenChange);
      document.removeEventListener("MSFullscreenChange", handleFullscreenChange);
    };
  }, [quizStarted, submitted]);

  // Countdown timer that auto-submits when time expires
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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [quizStarted, submitted, timeRemaining]);

  // Tab/window focus detection with warning and auto-submit
  useEffect(() => {
    if (!quizStarted || submitted) return;

    const maxTabSwitches = quiz?.tabLimit || 1;

    const handleVisibility = () => {
      if (document.hidden) {
        const newViolations = tabViolationsRef.current + 1;
        tabViolationsRef.current = newViolations;
        setTabViolations(newViolations);

        // First violation - show warning
        if (newViolations === 1 && !hasWarned) {
          setHasWarned(true);
          alert(
            `⚠️ WARNING: Focus Loss Detected!\n\n` +
            `You switched away from the quiz (tab switch, window switch, or other app).\n` +
            `You have ${maxTabSwitches} allowed violation(s).\n` +
            `You have used ${newViolations} so far.\n\n` +
            `If you exceed the limit, your quiz will be automatically submitted.`
          );
        }

        // Exceeded limit - auto-submit
        if (newViolations > maxTabSwitches) {
          alert(
            `🚨 VIOLATION LIMIT EXCEEDED!\n\n` +
            `You had ${newViolations} focus violations (limit: ${maxTabSwitches}).\n` +
            `Your quiz will now be automatically submitted.\n\n` +
            `Your teacher will be notified of this violation.`
          );
          
          autoSubmitQuiz(newViolations, false);
        }
      }
    };

    const handleBlur = () => {
      if (!document.hidden) {
        // Window lost focus but tab is still visible (e.g., clicked outside browser)
        const newViolations = tabViolationsRef.current + 1;
        tabViolationsRef.current = newViolations;
        setTabViolations(newViolations);

        if (newViolations > maxTabSwitches) {
          alert(
            `🚨 VIOLATION LIMIT EXCEEDED!\n\n` +
            `Focus violations: ${newViolations} (limit: ${maxTabSwitches}).\n` +
            `Your quiz will now be automatically submitted.`
          );
          autoSubmitQuiz(newViolations, false);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [quizStarted, submitted, hasWarned, quiz]);

  // Prevent right-click, copy, paste, cut, devtools
  useEffect(() => {
    if (!quizStarted) return;

    const prevent = (e) => {
      e.preventDefault();
      return false;
    };

    const preventDevTools = (e) => {
      // F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
        (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
        (e.ctrlKey && e.keyCode === 85) // Ctrl+U
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener("contextmenu", prevent);
    document.addEventListener("copy", prevent);
    document.addEventListener("paste", prevent);
    document.addEventListener("cut", prevent);
    document.addEventListener("keydown", preventDevTools);

    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("copy", prevent);
      document.removeEventListener("paste", prevent);
      document.removeEventListener("cut", prevent);
      document.removeEventListener("keydown", preventDevTools);
    };
  }, [quizStarted]);

  // Warn before leaving page
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

  // Auto-submit function with duplicate check
  const autoSubmitQuiz = async (violations, isTimeExpired = false) => {
    if (submitted || loading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    // Stop the timer immediately
    setSubmitted(true);
    setLoading(true);
    
    // Clear the timer interval immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    try {
      const student = JSON.parse(localStorage.getItem("chikoroai_user"));

      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index),
        answer: answer || "",
      }));

      const res = await axios.post("https://api.chikoro-ai.com/api/system/student/submit-quiz", {
        quizCode,
        answers: formattedAnswers,
        studentId: student.id,
        tabViolations: violations,
        tabLimitExceeded: !isTimeExpired && violations > (quiz?.tabLimit || 1),
        autoSubmitted: true,
        timeExpired: isTimeExpired,
      });

      if (res.data.success) {
        // submitted already set to true at function start
        setFeedback({
          ...res.data,
          timeExpired: isTimeExpired,
        });
        
        // Clear the timer storage
        localStorage.removeItem(`quiz_${quizCode}_start`);
        
        // Exit fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error auto-submitting quiz:", err);
      
      if (err.response?.data?.alreadySubmitted) {
        // Keep submitted as true
        alert("❌ You have already submitted this quiz. Multiple submissions are not allowed.");
      } else {
        // Keep submitted as true for auto-submit failures (teacher should be contacted)
        alert("❌ Auto-submission failed. Please contact your teacher.");
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleChange = (qIndex, value) => {
    setAnswers({ ...answers, [qIndex]: value });
  };

  // Manual submit with duplicate check
  const handleSubmit = async () => {
    if (loading || isSubmittingRef.current) return;
    
    // Show custom confirmation modal instead of window.confirm
    setShowSubmitConfirm(true);
  };

  // Actual submission after confirmation
  const confirmSubmit = async () => {
    setShowSubmitConfirm(false);
    
    if (loading || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;

    const maxTabSwitches = quiz?.tabLimit || 1;
    
    // Stop the timer immediately by setting submitted to true
    setSubmitted(true);
    setLoading(true);
    
    // Clear the timer interval immediately
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    try {
      const student = JSON.parse(localStorage.getItem("chikoroai_user"));

      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index),
        answer,
      }));

      const res = await axios.post("https://api.chikoro-ai.com/api/system/student/submit-quiz", {
        quizCode,
        answers: formattedAnswers,
        studentId: student.id,
        tabViolations: tabViolationsRef.current,
        tabLimitExceeded: tabViolationsRef.current > maxTabSwitches,
        autoSubmitted: false,
        timeExpired: false,
      });

      if (res.data.success) {
        // Keep submitted as true
        setFeedback(res.data);
        
        // Clear the timer storage
        localStorage.removeItem(`quiz_${quizCode}_start`);
        
        // Exit fullscreen
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      
      if (err.response?.data?.alreadySubmitted) {
        // Keep submitted as true for already submitted
        alert("❌ You have already submitted this quiz. Multiple submissions are not allowed.");
      } else {
        // Submission failed - allow retry by resetting submitted state
        setSubmitted(false);
        
        // Restart timer if there was time remaining
        if (timeRemaining !== null && timeRemaining > 0 && !timerExpired) {
          // Timer will restart automatically via useEffect
        }
        
        alert("❌ Submission failed. Please try again or contact your teacher.");
      }
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const cancelSubmit = () => {
    setShowSubmitConfirm(false);
  };

  // Helper function to format time remaining
  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Early returns
  if (!quiz) return <div className="loading">Loading quiz...</div>;

  if (submitted && feedback) {
    return <QuizFeedback feedback={feedback} quiz={quiz} quizCode={quizCode} />;
  }

  if (!quiz.content) {
    return (
      <div className="error">
        ⚠️ Quiz content is missing or not yet generated for this code.
        <br />
        <Link to="/">← Go Back</Link>
      </div>
    );
  }

  // Show start screen before quiz begins
  if (!quizStarted) {
    return (
      <div className="quiz-start-container">
        <div className="quiz-start-card">
          <h1>🔒 Secure Quiz Mode</h1>
          <h2>{quiz.subject} - {quiz.topic}</h2>
          
          <div className="quiz-info">
            <p><strong>Difficulty:</strong> {quiz.difficulty}</p>
            {quiz.timeLimit && quiz.timeLimit > 0 && (
              <p><strong>Time Limit:</strong> {quiz.timeLimit} minutes</p>
            )}
            <p><strong>Focus Loss Limit:</strong> {quiz.tabLimit || 1} violation(s)</p>
          </div>

          <div className="security-notice">
            <h3>⚠️ Important Security Rules:</h3>
            <ul>
              <li>✅ Quiz will open in <strong>fullscreen mode</strong></li>
              <li>✅ You <strong>cannot</strong> switch tabs, windows, or apps</li>
              <li>✅ Right-click, copy, and paste are <strong>disabled</strong></li>
              <li>✅ Exiting fullscreen will <strong>auto-submit</strong> your quiz</li>
              <li>✅ Timer will start when you click "Start Quiz"</li>
              <li>✅ Focus violations will be <strong>tracked and reported</strong></li>
            </ul>
          </div>

          <button 
            className="start-quiz-btn" 
            onClick={startQuizInFullscreen}
          >
            🚀 Start Quiz in Fullscreen
          </button>
          
          <Link to="/" className="back-btn">← Cancel and Go Back</Link>
        </div>
      </div>
    );
  }

  const questions = quiz.content.split(/\n(?=\d+\.)/);
  const maxTabSwitches = quiz.tabLimit || 1;
  const violationsRemaining = maxTabSwitches - tabViolations;

  return (
    <div className="student-quiz-container">
      <header className="quiz-header">
        <div className="header-top">
          <div className="header-left">
            <h1>{quiz.subject} Quiz</h1>
            <h2>{quiz.topic}</h2>
            <p>Difficulty: <strong>{quiz.difficulty}</strong></p>
          </div>
          
          {/* Timer display */}
          {timeRemaining !== null && quiz.timeLimit > 0 && (
            <div className={`timer-display ${timeRemaining < 300 ? 'warning' : ''} ${timeRemaining < 60 ? 'critical' : ''}`}>
              <span className="timer-icon">⏱️</span>
              <span className="timer-text">Time Remaining: </span>
              <span className="timer-value">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>

        <div className={`security-status ${!fullscreenActive ? 'violation' : ''}`}>
          <span className="status-icon">{fullscreenActive ? '🔒' : '⚠️'}</span>
          <span className="status-text">
            {fullscreenActive ? 'Secure Mode Active' : 'Security Violation Detected'}
          </span>
        </div>

        <div className={`tab-warning ${tabViolations > 0 ? 'active' : ''} ${tabViolations > maxTabSwitches ? 'critical' : ''}`}>
          {tabViolations === 0 ? (
            <p>✅ No violations detected</p>
          ) : tabViolations > maxTabSwitches ? (
            <p className="critical-text">
              🚨 LIMIT EXCEEDED - Quiz will be auto-submitted
            </p>
          ) : (
            <p className="warning-text">
              ⚠️ Warning: {tabViolations} violation(s) detected. {violationsRemaining} remaining before auto-submit.
            </p>
          )}
        </div>
      </header>

      <div className="quiz-questions">
        {questions.map((q, idx) => {
          const lines = q.split("\n").filter((l) => l.trim());
          const questionText = lines[0]?.replace(/^\d+\.\s*/, "");
          const options = lines.filter((line) => /^[A-D]\)/.test(line.trim()));
          const isMultipleChoice = options.length > 0;

          return (
            <div key={idx} className="student-question-card">
              <div className="question-header">
                <span className={`question-badge ${isMultipleChoice ? "" : "structured-badge"}`}>
                  {isMultipleChoice ? "Multiple Choice" : "Structured"}
                </span>
                <h3>{idx + 1}. {questionText}</h3>
              </div>

              {isMultipleChoice ? (
                <ul className="option-list">
                  {options.map((opt, i) => (
                    <li key={i} className="option">
                      <label>
                        <input
                          type="radio"
                          name={`q${idx}`}
                          value={opt}
                          checked={answers[idx] === opt}
                          onChange={() => handleChange(idx, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="structured-answer-wrapper">
                  <textarea
                    className="structured-answer"
                    placeholder="Write your answer here..."
                    value={answers[idx] || ""}
                    onChange={(e) => handleChange(idx, e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button 
        className="submit-btn" 
        onClick={handleSubmit}
        disabled={loading || Object.keys(answers).length === 0}
      >
        {loading ? "Submitting & Grading..." : "Submit Quiz"}
      </button>

      {/* Custom Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>⚠️ Submit Quiz?</h2>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to submit your quiz?</p>
              <p className="modal-warning">
                You <strong>cannot change your answers</strong> after submission.
              </p>
              {Object.keys(answers).length < questions.length && (
                <p className="modal-alert">
                  ⚠️ You have answered {Object.keys(answers).length} out of {questions.length} questions.
                </p>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="modal-btn cancel-btn" 
                onClick={cancelSubmit}
                disabled={loading}
              >
                ← Go Back
              </button>
              <button 
                className="modal-btn confirm-btn" 
                onClick={confirmSubmit}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Yes, Submit Quiz"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Feedback component
function QuizFeedback({ feedback, quiz, quizCode }) {
  const wasAutoSubmitted = feedback.autoSubmitted || false;
  const timeExpired = feedback.timeExpired || false;
  const tabViolations = feedback.tabViolations || 0;
  const tabLimit = quiz.tabLimit || 1;

  return (
    <div className="quiz-feedback-container">
      <header className="feedback-header">
        <h1>📊 Quiz Results</h1>

        {timeExpired && (
          <div className="auto-submit-alert time-expired">
            ⏰ <strong>Time's up!</strong> This quiz was automatically submitted when the time limit was reached.
          </div>
        )}

        {wasAutoSubmitted && !timeExpired && (
          <div className="auto-submit-alert">
            🚨 <strong>This quiz was automatically submitted</strong> due to security violations 
            ({tabViolations}/{tabLimit} violations).
            Your teacher has been notified.
          </div>
        )}

        <div className="score-display">
          <div className="score-circle">
            <span className="score-number">{feedback.score}%</span>
          </div>
          <p className="score-breakdown">
            {feedback.earnedPoints} / {feedback.totalPoints} points
          </p>
        </div>
      </header>

      <div className="feedback-questions">
        {feedback.feedback.map((item, idx) => (
          <div key={idx} className={`feedback-card ${item.isCorrect !== undefined ? (item.isCorrect ? 'correct' : 'incorrect') : 'structured'}`}>
            <div className="feedback-header-section">
              <span className="question-number">Question {item.questionNumber}</span>
              <span className="points-badge">
                {item.pointsEarned}/{item.pointsPossible} points
              </span>
            </div>

            <h3 className="feedback-question">{item.question}</h3>

            <div className="answer-section">
              <p className="student-answer-label">Your Answer:</p>
              <div className="student-answer-display">
                {item.studentAnswer}
              </div>
            </div>

            {item.type === 'multiple-choice' && (
              <div className={`correct-answer-section ${item.isCorrect ? 'match' : 'mismatch'}`}>
                {item.isCorrect ? (
                  <p className="correct-indicator">✅ Correct!</p>
                ) : (
                  <p className="incorrect-indicator">
                    ❌ Incorrect. Correct answer: <strong>{item.correctAnswer}</strong>
                  </p>
                )}
              </div>
            )}

            <div className="ai-feedback-section">
              <h4>💬 Teacher Feedback:</h4>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {item.explanation}
              </ReactMarkdown>
            </div>

            {item.markScheme && (
              <details className="mark-scheme-details">
                <summary>📋 View Mark Scheme</summary>
                <div className="mark-scheme-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {item.markScheme}
                  </ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        ))}
      </div>

      <div className="feedback-actions">
        <Link to="/" className="btn-primary">
          ← Back To Learning
        </Link>
        <button 
          className="btn-secondary"
          onClick={() => window.print()}
        >
          🖨️ Print Results
        </button>
      </div>
    </div>
  );
}
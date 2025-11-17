import React, { useEffect, useState } from "react";
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
  const cleanQuizText = (rawQuiz) => {
  if (!rawQuiz || typeof rawQuiz !== "string") return "";
  return rawQuiz
    .replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, '') // remove intros like "Here's your quiz:"
    .replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, '') // remove chatty prefixes
    .replace(/```.*?```/gs, '') // remove markdown code fences
    .trim();
};

  // Fetch quiz details
  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await axios.get(`http://localhost:3001/api/system/quiz/${quizCode}`);
        if (res.data.success) setQuiz(res.data.quiz);
      } catch (err) {
        console.error("Error loading quiz:", err);
      }
    };
    fetchQuiz();
  }, [quizCode]);

  // Restrict tab switching
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        setTabViolations((v) => v + 1);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const handleChange = (qIndex, value) => {
    setAnswers({ ...answers, [qIndex]: value });
  };

 const handleSubmit = async () => {
    setLoading(true);
    try {
      const student = JSON.parse(localStorage.getItem("chikoroai_user"));

      const formattedAnswers = Object.entries(answers).map(([index, answer]) => ({
        questionIndex: parseInt(index),
        answer,
      }));

      const res = await axios.post("http://localhost:3001/api/system/student/submit-quiz", {
        quizCode,
        answers: formattedAnswers,
        studentId: student.id,
      });

      if (res.data.success) {
        setSubmitted(true);
        setFeedback(res.data);
      }
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("❌ Submission failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!quiz) return <div className="loading">Loading quiz...</div>;

  if (submitted && feedback) {
    return <QuizFeedback feedback={feedback} quiz={quiz} quizCode={quizCode} />;
  }


  if (!quiz) return <div className="loading">Loading quiz...</div>;

// 🛡️ Protect against missing quiz_content
if (!quiz.quiz_content) {
  return (
    <div className="error">
      ⚠️ Quiz content is missing or not yet generated for this code.
      <br />
      <Link to="/student-dashboard">← Go Back</Link>
    </div>
  );
}

const questions = quiz.quiz_content.split(/\n(?=\d+\.)/);

    return (
    <div className="student-quiz-container">
      <header className="quiz-header">
        <h1>{quiz.subject} Quiz</h1>
        <h2>{quiz.topic}</h2>
        <p>Difficulty: <strong>{quiz.difficulty}</strong></p>
        <p className="warning">⚠️ Tab switches detected: {tabViolations}</p>
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
      <Link to="/student-dashboard" className="back-btn">← Back to Dashboard</Link>
    </div>
  );
}

// ✅ New Feedback Component
function QuizFeedback({ feedback, quiz, quizCode }) {
  return (
    <div className="quiz-feedback-container">
      <header className="feedback-header">
        <h1>📊 Quiz Results</h1>
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
        <Link to="/student-dashboard" className="btn-primary">
          ← Back to Dashboard
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
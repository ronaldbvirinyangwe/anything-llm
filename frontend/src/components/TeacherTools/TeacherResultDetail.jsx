import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./teacher-result-detail.css";

export default function TeacherResultDetail() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResultDetail = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/teacher/result-detail/${resultId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.success) {
          setResult(res.data.result);
        } else {
          setError(res.data.error || "Failed to fetch result");
        }
      } catch (err) {
        console.error("Error fetching result:", err);
        setError("Error loading result");
      } finally {
        setLoading(false);
      }
    };

    fetchResultDetail();
  }, [resultId]);

  if (loading) return <div className="loading-screen">Loading result...</div>;

  if (error || !result) {
    return (
      <div className="result-detail-container">
        <div className="error-message">{error || "Result not found"}</div>
        <Link to="/teacher/reports" className="back-btn">← Back to Reports</Link>
      </div>
    );
  }

  return (
    <div className="result-detail-container">
      <nav className="detail-nav">
        <button onClick={() => navigate(-1)} className="back-btn">
          <span className="icon">←</span> Back to Dashboard
        </button>
      </nav>

      <header className="detail-header">
        <div className="header-content">
          <div className="student-info">
            <h1>{result.studentName}</h1>
            <span className="student-grade">Grade {result.studentGrade}</span>
          </div>
          <div className="quiz-info">
            <h2>{result.quizName}</h2>
            <div className="quiz-meta">
              <span className="meta-item">{result.subject}</span>
              {result.difficulty && <span className="meta-item">{result.difficulty}</span>}
              <span className="meta-item">Code: {result.quizCode}</span>
            </div>
            <p className="detail-date">
              Submitted on {new Date(result.submittedAt).toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        
        <div className="score-summary">
          <div className="score-circle">
            <div className={`final-score ${result.score >= 70 ? 'pass' : 'fail'}`}>
              {result.score}%
            </div>
            <p className="score-text">{result.correctAnswers} / {result.totalQuestions} correct</p>
          </div>
        </div>
      </header>

      <section className="feedback-section">
        <h2 className="section-title">Detailed Answer Analysis</h2>
        
        {result.detailedFeedback.map((feedback, index) => (
          <div key={index} className="feedback-card">
            <div className="question-header">
              <div className="question-title-group">
                <h3>Question {feedback.questionNumber}</h3>
                <span className="question-type">{feedback.type.replace('-', ' ')}</span>
              </div>
              
              {feedback.pointsEarned !== undefined && (
                <div className={`points-badge ${feedback.pointsEarned === feedback.pointsPossible ? 'full-points' : 'partial-points'}`}>
                  {feedback.pointsEarned} / {feedback.pointsPossible} pts
                </div>
              )}
            </div>

            <div className="question-content">
              <p className="question-text">{feedback.question}</p>
            </div>

            <div className="answer-section">
              <div className="student-answer">
                <strong>Student's Answer:</strong>
                <div className="answer-box">
                  <p>{feedback.studentAnswer}</p>
                </div>
              </div>

              {feedback.type === "multiple-choice" && (
                <div className={`correctness ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                  {feedback.isCorrect ? (
                    <span>✓ Correct</span>
                  ) : (
                    <span>✗ Incorrect — Correct answer: <strong>{feedback.correctAnswer}</strong></span>
                  )}
                </div>
              )}
            </div>

            <div className="ai-feedback">
              <strong>✨ AI Insight & Feedback</strong>
              <div className="markdown-content">
                <ReactMarkdown>{feedback.explanation}</ReactMarkdown>
              </div>
            </div>

            {feedback.markScheme && (
              <details className="mark-scheme">
                <summary>View Grading Criteria (Mark Scheme)</summary>
                <div className="mark-scheme-content">
                  <ReactMarkdown>{feedback.markScheme}</ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        ))}
      </section>

      <section className="teacher-actions">
        <h3>Report Actions</h3>
        <div className="action-buttons">
          <button className="action-btn primary" onClick={() => window.print()}>
            🖨️ Print Report
          </button>
          <button className="action-btn secondary" onClick={() => {
            const data = JSON.stringify(result, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${result.studentName.replace(/\s+/g, '-')}-${result.quizName}-results.json`;
            a.click();
          }}>
            💾 Export Raw JSON
          </button>
        </div>
      </section>
    </div>
  );
}
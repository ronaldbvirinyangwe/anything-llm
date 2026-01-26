import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
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

  if (loading) {
    return <div className="loading-screen">Loading result...</div>;
  }

  if (error || !result) {
    return (
      <div className="result-detail-container">
        <div className="error-message">{error || "Result not found"}</div>
        <Link to="/teacher/reports" className="back-btn">
          ← Back to Reports
        </Link>
      </div>
    );
  }

  return (
    <div className="result-detail-container">
      <nav className="detail-nav">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>
      </nav>

      <header className="detail-header">
        <div className="header-content">
          <div className="student-info">
            <h1>{result.studentName}</h1>
            <p className="student-grade">Grade {result.studentGrade}</p>
          </div>
          <div className="quiz-info">
            <h2>{result.quizName}</h2>
            <p className="detail-subject">{result.subject}</p>
            {result.difficulty && (
              <p className="detail-difficulty">Difficulty: {result.difficulty}</p>
            )}
            <p className="detail-code">Quiz Code: {result.quizCode}</p>
            <p className="detail-date">
              Submitted on {new Date(result.submittedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div className="score-summary">
          <div className={`final-score ${result.score >= 70 ? 'pass' : 'fail'}`}>
            {result.score}%
          </div>
          <p>{result.correctAnswers}/{result.totalQuestions} correct</p>
        </div>
      </header>

      <section className="feedback-section">
        <h2>Detailed Answer Analysis</h2>
        
        {result.detailedFeedback.map((feedback, index) => (
          <div key={index} className="feedback-card">
            <div className="question-header">
              <h3>Question {feedback.questionNumber}</h3>
              <div className="question-meta">
                <span className="question-type">{feedback.type}</span>
                {feedback.pointsEarned !== undefined && (
                  <span className={`points-badge ${feedback.pointsEarned === feedback.pointsPossible ? 'full-points' : 'partial-points'}`}>
                    {feedback.pointsEarned}/{feedback.pointsPossible} points
                  </span>
                )}
              </div>
            </div>

            <div className="question-content">
              <p className="question-text">{feedback.question}</p>
            </div>

            <div className="answer-section">
              <div className="student-answer">
                <strong>Student's Answer:</strong>
                <p>{feedback.studentAnswer}</p>
              </div>

              {feedback.type === "multiple-choice" && (
                <div className={`correctness ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                  {feedback.isCorrect ? (
                    <>✓ Correct</>
                  ) : (
                    <>✗ Incorrect - Correct answer: {feedback.correctAnswer}</>
                  )}
                </div>
              )}
            </div>

            <div className="ai-feedback">
              <strong>AI-Generated Feedback:</strong>
              <p>{feedback.explanation}</p>
            </div>

            {feedback.markScheme && (
              <details className="mark-scheme">
                <summary>View Mark Scheme</summary>
                <pre>{feedback.markScheme}</pre>
              </details>
            )}
          </div>
        ))}
      </section>

      <section className="teacher-actions">
        <h3>Teacher Actions</h3>
        <div className="action-buttons">
          <button className="action-btn" onClick={() => window.print()}>
            🖨️ Print Report
          </button>
          <button className="action-btn" onClick={() => {
            const data = JSON.stringify(result, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${result.studentName}-${result.quizName}-results.json`;
            a.click();
          }}>
            💾 Export Data
          </button>
        </div>
      </section>
    </div>
  );
}
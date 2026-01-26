import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./student-result-detail.css";

export default function StudentResultDetail() {
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
          `https://api.chikoro-ai.com/api/system/student/result-detail/${resultId}`,
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
        <Link to="/student/results" className="back-btn">
          ← Back to Results
        </Link>
      </div>
    );
  }

  return (
    <div className="result-detail-container">
      <nav className="detail-nav">
        <Link to="/student/results" className="back-btn">
          ← Back to Results
        </Link>
      </nav>

      <header className="detail-header">
        <div className="header-content">
          <h1>{result.quizName}</h1>
          <p className="detail-subject">{result.subject}</p>
          <p className="detail-teacher">Teacher: {result.teacherName}</p>
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
        <div className="score-summary">
          <div className={`final-score ${result.score >= 70 ? 'pass' : 'fail'}`}>
            {result.score}%
          </div>
          <p>{result.correctAnswers}/{result.totalQuestions} correct</p>
        </div>
      </header>

      <section className="feedback-section">
        <h2>Detailed Feedback</h2>
        
        {result.detailedFeedback.map((feedback, index) => (
          <div key={index} className="feedback-card">
            <div className="question-header">
              <h3>Question {feedback.questionNumber}</h3>
              {feedback.pointsEarned !== undefined && (
                <span className="points-badge">
                  {feedback.pointsEarned}/{feedback.pointsPossible} points
                </span>
              )}
            </div>

            <div className="question-content">
              <p className="question-text">{feedback.question}</p>
            </div>

            <div className="answer-section">
              <div className="your-answer">
                <strong>Your Answer:</strong>
                <p>{feedback.studentAnswer}</p>
              </div>

              {feedback.type === "multiple-choice" && (
                <div className={`correctness ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
                  {feedback.isCorrect ? '✓ Correct' : `✗ Incorrect - Correct answer: ${feedback.correctAnswer}`}
                </div>
              )}
            </div>

            <div className="ai-feedback">
              <strong>Feedback:</strong>
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
    </div>
  );
}
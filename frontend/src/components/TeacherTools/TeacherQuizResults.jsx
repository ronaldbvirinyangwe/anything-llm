import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./teacher-student-results.css";

export default function TeacherQuizResults() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // If no quizId in URL, show list of quizzes
  const showQuizList = !quizId;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem("chikoroai_user"));
        const teacherId = storedUser?.id;

        if (!teacherId || !token) {
          navigate("/login");
          return;
        }

        if (showQuizList) {
          // ✅ FIX: Use the specific endpoint for the list
          // This prevents the conflict where the backend thinks teacherId is a quizId
          const res = await axios.get(
            `https://api.chikoro-ai.com/api/system/teacher/my-quizzes`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.data.success) {
            setQuizzes(res.data.quizzes || []);
          } else {
            setError(res.data.error || "Failed to fetch quizzes");
          }
        } else {
          // Fetch specific quiz results
          const res = await axios.get(
            `https://api.chikoro-ai.com/api/system/teacher/quiz-results/${quizId}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.data.success) {
            setQuizData(res.data);
          } else {
            setError(res.data.error || "Failed to fetch quiz results");
          }
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

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="report-container">
        <div className="error-message">{error}</div>
        <Link to="/teacher-dashboard" className="back-btn">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // --- VIEW 1: Show List of Quizzes ---
  if (showQuizList) {
    return (
      <div className="report-container">
        <nav className="reports-nav">
          <Link to="/teacher-dashboard" className="back-btn">
            ← Back to Dashboard
          </Link>
        </nav>

        <header className="reports-header">
          <h1>📋 My Quizzes</h1>
          <p>Select a quiz to view all student results</p>
        </header>

        {(!quizzes || quizzes.length === 0) ? (
          <div className="empty-state">
            <p>No quizzes created yet.</p>
            <Link to="/teacher-tools/quiz-generator" className="link-btn">
              Create Your First Quiz
            </Link>
          </div>
        ) : (
          <div className="students-grid">
            {quizzes.map((quiz) => (
              <Link
                key={quiz.id}
                to={`/teacher/quizzes/${quiz.id}`}
                className="student-card"
              >
                <div className="student-info">
                  <h3>{quiz.topic}</h3>
                  <p className="student-grade">{quiz.subject}</p>
                  <p className="student-subject">Difficulty: {quiz.difficulty}</p>
                  <p className="student-subject">Code: {quiz.quiz_code}</p>
                  {quiz.submissionCount !== undefined && (
                    <p className="student-subject">
                      {quiz.submissionCount} submission{quiz.submissionCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <div className="student-arrow">→</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 2: Show Specific Quiz Results ---
  
  // Safe Destructuring with Defaults to prevent crashes
  const { quiz, statistics, results } = quizData || {};

  // Fallback if data is missing despite success
  if (!quiz) {
    return (
        <div className="report-container">
            <div className="error-message">Quiz data unavailable.</div>
            <Link to="/teacher/quizzes" className="back-btn">← Back</Link>
        </div>
    );
  }

  return (
    <div className="report-container">
      <nav className="reports-nav">
        <Link to="/teacher/quizzes" className="back-btn">
          ← Back to Quizzes
        </Link>
      </nav>

      <header className="reports-header">
        <h1>📊 Quiz Results: {quiz?.topic || "Unknown Quiz"}</h1>
        <div className="quiz-meta">
          <span className="badge">{quiz?.subject}</span>
          <span className="badge">{quiz?.difficulty}</span>
          <span className="badge">Code: {quiz?.quizCode}</span>
        </div>
      </header>

      <section className="statistics-section">
        <h2>📈 Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <h3>{statistics?.totalSubmissions || 0}</h3>
            <p>Total Submissions</p>
          </div>
          <div className="stat-card">
            <h3>{statistics?.averageScore || 0}%</h3>
            <p>Average Score</p>
          </div>
          <div className="stat-card">
            <h3>{statistics?.highestScore || 0}%</h3>
            <p>Highest Score</p>
          </div>
          <div className="stat-card">
            <h3>{statistics?.lowestScore || 0}%</h3>
            <p>Lowest Score</p>
          </div>
        </div>
      </section>

      <section className="results-section">
        <h2>👥 Student Results ({results?.length || 0})</h2>
        
        {(!results || results.length === 0) ? (
          <div className="empty-state">
            <p>No students have taken this quiz yet.</p>
          </div>
        ) : (
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Grade</th>
                  <th>Score</th>
                  <th>Correct Answers</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td>{result.studentName}</td>
                    <td>{result.studentGrade || "N/A"}</td>
                    <td>
                      <span className={`score-badge ${getScoreClass(result.score)}`}>
                        {result.score}%
                      </span>
                    </td>
                    <td>
                      {result.correctAnswers} / {result.totalQuestions}
                    </td>
                    <td>{new Date(result.submittedAt).toLocaleString()}</td>
                    <td>
                      <Link 
                        to={`/teacher/result/${result.id}`}
                        className="view-detail-btn"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function getScoreClass(score) {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "poor";
}
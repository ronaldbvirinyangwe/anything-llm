import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./student-results.css";

export default function StudentResults() {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem("chikoroai_user"));
        const studentId = storedUser?.id;

        if (!studentId) {
          navigate("/login");
          return;
        }

        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/student/my-results/${studentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.success) {
          setResults(res.data.results);
        } else {
          setError(res.data.error || "Failed to fetch results");
        }
      } catch (err) {
        console.error("Error fetching results:", err);
        setError("Error loading results");
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [navigate]);

  if (loading) {
    return <div className="loading-screen">Loading your results...</div>;
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="error-message">{error}</div>
        <Link to="/student-dashboard" className="back-btn">
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  // Get unique subjects for filter
  const subjects = ["all", ...new Set(results.map(r => r.subject))];

  // Filter results by subject
  const filteredResults = filterSubject === "all" 
    ? results 
    : results.filter(r => r.subject === filterSubject);

  // Calculate overall stats
  const averageScore = filteredResults.length > 0
    ? Math.round(filteredResults.reduce((sum, r) => sum + r.score, 0) / filteredResults.length)
    : 0;

  const totalQuizzes = filteredResults.length;

  return (
    <div className="results-container">
      <nav className="results-nav">
        <Link to="/student-dashboard" className="back-btn">
          ← Back to Dashboard
        </Link>
      </nav>

      <header className="results-header">
        <h1>📊 My Quiz Results</h1>
        <p>View your performance and detailed feedback</p>
      </header>

      {results.length === 0 ? (
        <div className="empty-state">
          <p>You haven't submitted any quizzes yet.</p>
          <Link to="/student-quizzes" className="link-btn">
            Take a Quiz
          </Link>
        </div>
      ) : (
        <>
          <div className="stats-overview">
            <div className="stat-card">
              <h3>Total Quizzes</h3>
              <p className="stat-number">{totalQuizzes}</p>
            </div>
            <div className="stat-card">
              <h3>Average Score</h3>
              <p className="stat-number">{averageScore}%</p>
            </div>
          </div>

          <div className="filter-section">
            <label>Filter by Subject:</label>
            <select 
              value={filterSubject} 
              onChange={(e) => setFilterSubject(e.target.value)}
              className="filter-select"
            >
              {subjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject === "all" ? "All Subjects" : subject}
                </option>
              ))}
            </select>
          </div>

          <div className="results-grid">
            {filteredResults.map((result) => (
              <Link
                key={result.id}
                to={`/student/result/${result.id}`}
                className="result-card"
              >
                <div className="result-header">
                  <h3>{result.quizName}</h3>
                  <span className={`score-badge ${result.score >= 70 ? 'pass' : 'fail'}`}>
                    {result.score}%
                  </span>
                </div>
                
                <div className="result-details">
                  <p className="result-subject">{result.subject}</p>
                  <p className="result-teacher">Teacher: {result.teacherName}</p>
                  <p className="result-stats">
                    {result.correctAnswers}/{result.totalQuestions} correct
                  </p>
                  <p className="result-date">
                    {new Date(result.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="result-arrow">View Feedback →</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
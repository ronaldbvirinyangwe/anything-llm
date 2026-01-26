import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import "./teacher-student-results.css";

export default function TeacherStudentResults() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [studentInfo, setStudentInfo] = useState({ name: "", grade: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterSubject, setFilterSubject] = useState("all");

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");

        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/teacher/student-results/${studentId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.success) {
          setResults(res.data.results);
          setStudentInfo({
            name: res.data.studentName,
            grade: res.data.studentGrade,
          });
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
  }, [studentId]);

  if (loading) {
    return <div className="loading-screen">Loading student results...</div>;
  }

  if (error) {
    return (
      <div className="results-container">
        <div className="error-message">{error}</div>
        <Link to="/teacher/reports" className="back-btn">
          ← Back to Reports
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
  const passRate = filteredResults.length > 0
    ? Math.round((filteredResults.filter(r => r.score >= 70).length / filteredResults.length) * 100)
    : 0;

  return (
    <div className="results-container">
      <nav className="results-nav">
        <Link to="/teacher/reports" className="back-btn">
          ← Back to Reports
        </Link>
      </nav>

      <header className="results-header">
        <div className="student-info-header">
          <h1>{studentInfo.name}'s Performance</h1>
          <p className="student-grade">Grade {studentInfo.grade}</p>
        </div>
      </header>

      {results.length === 0 ? (
        <div className="empty-state">
          <p>This student hasn't submitted any quizzes yet.</p>
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
            <div className="stat-card">
              <h3>Pass Rate</h3>
              <p className="stat-number">{passRate}%</p>
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
                to={`/teacher/result/${result.id}`}
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
                  {result.difficulty && (
                    <p className="result-difficulty">Difficulty: {result.difficulty}</p>
                  )}
                  <p className="result-stats">
                    {result.correctAnswers}/{result.totalQuestions} correct
                  </p>
                  <p className="result-code">Code: {result.quizCode}</p>
                  <p className="result-date">
                    {new Date(result.submittedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>

                <div className="result-arrow">View Details →</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
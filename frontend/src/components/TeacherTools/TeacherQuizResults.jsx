import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { FiCopy, FiCheck } from "react-icons/fi"; // 🆕 Imported icons for the copy button
import "./teacher-student-results.css";

export default function TeacherQuizResults() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [quizData, setQuizData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- NEW STATE FOR MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [copied, setCopied] = useState(false); // 🆕 State for copy feedback

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

  // --- FILTER LOGIC ---
  const filteredQuizzes = quizzes.filter(quiz => 
    quiz.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    quiz.quiz_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 🆕 --- COPY LINK LOGIC ---
  const handleCopyLink = () => {
    const codeToCopy = quiz?.quizCode || quiz?.quiz_code;
    if (!codeToCopy) return;
    
    const link = `https://chikoro-ai.com/student/quiz/${codeToCopy}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    }).catch(err => {
      console.error("Failed to copy link: ", err);
    });
  };

  if (loading) return <div className="loading-screen">Loading data...</div>;

  if (error) {
    return (
      <div className="report-container">
        <div className="error-message">{error}</div>
        <Link to="/teacher-dashboard" className="back-btn">
          <span className="icon">←</span> Back to Dashboard
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
            <span className="icon">←</span> Back to Dashboard
          </Link>
        </nav>

        <header className="reports-header modern-header">
          <h1>📋 My Quizzes</h1>
          <p>Manage and review student performance</p>
        </header>

        <div className="controls-toolbar">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search by topic, subject, or code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="view-toggles">
            <button 
              className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞ Grid
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰ List
            </button>
          </div>
        </div>

        {(!filteredQuizzes || filteredQuizzes.length === 0) ? (
          <div className="empty-state">
            <p>
              {searchTerm ? "No quizzes match your search." : "No quizzes created yet."}
            </p>
            {!searchTerm && (
              <Link to="/teacher-tools/quiz-generator" className="action-btn primary">
                Create Your First Quiz
              </Link>
            )}
          </div>
        ) : (
          <div className={viewMode === 'grid' ? "quizzes-grid" : "quizzes-list-container"}>
            {filteredQuizzes.map((quiz) => (
              viewMode === 'grid' ? (
                // --- GRID CARD VIEW ---
                <Link key={quiz.id} to={`/teacher/quizzes/${quiz.id}`} className="quiz-card">
                  <div className="quiz-card-content">
                    <h3>{quiz.topic}</h3>
                    <div className="quiz-tags">
                      <span className="tag subject">{quiz.subject}</span>
                      <span className="tag difficulty">{quiz.difficulty}</span>
                    </div>
                    <div className="quiz-footer">
                      <span className="quiz-code">Code: <strong>{quiz.quiz_code}</strong></span>
                      <span className="submission-count">
                        {quiz.submissionCount || 0} Submissions
                      </span>
                    </div>
                  </div>
                  <div className="quiz-arrow">→</div>
                </Link>
              ) : (
                // --- COMPACT LIST ROW VIEW ---
                <Link key={quiz.id} to={`/teacher/quizzes/${quiz.id}`} className="quiz-row">
                  <div className="row-main">
                    <span className="row-code">{quiz.quiz_code}</span>
                    <h3 className="row-topic">{quiz.topic}</h3>
                  </div>
                  <div className="row-meta">
                    <span className="tag subject">{quiz.subject}</span>
                    <span className="tag difficulty">{quiz.difficulty}</span>
                    <span className="submission-pill">
                      👥 {quiz.submissionCount || 0}
                    </span>
                  </div>
                  <div className="row-arrow">→</div>
                </Link>
              )
            ))}
          </div>
        )}
      </div>
    );
  }

  // --- VIEW 2: Show Specific Quiz Results ---
  const { quiz, statistics, results, questionStats } = quizData || {};

  const getQuestionInsights = () => {
    if (!questionStats || questionStats.length === 0) return null;
    const sorted = [...questionStats].sort((a, b) => a.successRate - b.successRate);
    return { hardest: sorted[0], easiest: sorted[sorted.length - 1] };
  };

  const insights = getQuestionInsights();

  if (!quiz) {
    return (
      <div className="report-container">
        <div className="error-message">Quiz data unavailable.</div>
        <Link to="/teacher/quizzes" className="back-btn">
          <span className="icon">←</span> Back to Quizzes
        </Link>
      </div>
    );
  }

  return (
    <div className="report-container">
      <nav className="reports-nav">
        <Link to="/teacher/quizzes" className="back-btn">
          <span className="icon">←</span> Back to Quizzes
        </Link>
      </nav>

      <header className="reports-header modern-header">
        <h1>{quiz?.topic || "Unknown Quiz"}</h1>
        <div className="quiz-meta-badges">
          <span className="header-badge">{quiz?.subject}</span>
          <span className="header-badge">{quiz?.difficulty}</span>
          
          {/* 🆕 UPDATED: Interactive Copyable Badge */}
          <span 
            className="header-badge outline copyable" 
            onClick={handleCopyLink}
            title="Click to copy direct student link"
          >
            {copied ? (
              <><FiCheck style={{ marginRight: '4px' }}/> Link Copied!</>
            ) : (
              <><FiCopy style={{ marginRight: '4px' }}/> Code: {quiz?.quizCode || quiz?.quiz_code}</>
            )}
          </span>
          
        </div>
      </header>

      <section className="statistics-section">
        <h2 className="section-title">📊 Class Performance</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <p className="stat-label">Total Submissions</p>
            <h3 className="stat-value">{statistics?.totalSubmissions || 0}</h3>
          </div>
          <div className="stat-card">
            <p className="stat-label">Average Score</p>
            <h3 className="stat-value text-blue">{statistics?.averageScore || 0}%</h3>
          </div>
          <div className="stat-card">
            <p className="stat-label">Highest Score</p>
            <h3 className="stat-value text-green">{statistics?.highestScore || 0}%</h3>
          </div>
          <div className="stat-card">
            <p className="stat-label">Lowest Score</p>
            <h3 className="stat-value text-red">{statistics?.lowestScore || 0}%</h3>
          </div>
        </div>
      </section>

      {insights && (
        <section className="insights-section">
          <h2 className="section-title">💡 Question Insights</h2>
          <div className="insights-grid">
            <div className="insight-card hard">
              <div className="insight-header">
                <span className="insight-icon">⚠️</span>
                <h4>Most Challenging Question</h4>
              </div>
              <p className="question-text">"{insights.hardest.text}"</p>
              <p className="insight-stat">Only <strong>{insights.hardest.successRate}%</strong> of students answered correctly.</p>
            </div>
            
            <div className="insight-card easy">
              <div className="insight-header">
                <span className="insight-icon">✅</span>
                <h4>Best Answered Question</h4>
              </div>
              <p className="question-text">"{insights.easiest.text}"</p>
              <p className="insight-stat">A total of <strong>{insights.easiest.successRate}%</strong> of students got this right.</p>
            </div>
          </div>
        </section>
      )}

      <section className="results-section">
        <h2 className="section-title">👥 Student Results ({results?.length || 0})</h2>
        {(!results || results.length === 0) ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>No students have taken this quiz yet.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Grade</th>
                  <th>Score</th>
                  <th>Correct</th>
                  <th>Submitted At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result) => (
                  <tr key={result.id}>
                    <td className="font-medium">{result.studentName}</td>
                    <td className="text-muted">{result.studentGrade || "N/A"}</td>
                    <td>
                      <span className={`status-badge ${getScoreClass(result.score)}`}>
                        {result.score}%
                      </span>
                    </td>
                    <td className="text-muted">
                      {result.correctAnswers} / {result.totalQuestions}
                    </td>
                    <td className="text-muted date-cell">
                      {new Date(result.submittedAt).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td>
                      <Link to={`/teacher/result/${result.id}`} className="btn-view">
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
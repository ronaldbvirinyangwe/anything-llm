import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  FiArrowLeft, FiActivity, FiStar, FiTarget, FiLayers, FiTrendingUp, FiTrendingDown, FiMinus
} from "react-icons/fi";
import {
  Line, Bar, Radar, Doughnut,
} from "react-chartjs-2";
import {
  Chart as ChartJS, LineElement, BarElement, RadialLinearScale, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler,
} from "chart.js";
import './reports.css';

ChartJS.register(
  LineElement, BarElement, RadialLinearScale, ArcElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend, Filler
);

// --- Reusable Radial Progress Component ---
const RadialProgress = ({ percentage, label, color, icon }) => {
  const size = 100;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="radial-card">
      <div className="radial-wrapper">
        <svg width={size} height={size} className="radial-svg">
          <circle cx="50" cy="50" r={radius} className="radial-bg" />
          <circle
            cx="50" cy="50" r={radius}
            stroke={color}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="radial-progress"
          />
        </svg>
        <div className="radial-icon" style={{ color: color }}>{icon}</div>
      </div>
      <div className="radial-info">
        <span className="radial-value">{percentage}%</span>
        <span className="radial-label">{label}</span>
      </div>
    </div>
  );
};

export default function EnhancedStudentReport() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/reports/student/${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.success) {
          setReport(res.data);
        } else {
          setError(res.data.error || "Failed to fetch report");
        }
      } catch (err) {
        console.error("Error fetching report:", err);
        setError("Error fetching student performance report.");
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [id]);

  if (loading) return <div className="loading-screen"><div className="spinner"></div><p>Generating analytics...</p></div>;
  if (error) return <div className="error-screen"><p>⚠️ {error}</p></div>;

  const { student, quizzes, summary, averageScore, totalXP, mastered, totalFlashcards } = report;

  // --- Data Processing Logic ---
  const subjectStats = {};
  quizzes.forEach((q) => {
    const subj = q.subject || "General";
    if (!subjectStats[subj]) subjectStats[subj] = { total: 0, count: 0 };
    subjectStats[subj].total += parseFloat(q.score);
    subjectStats[subj].count += 1;
  });

  const quizzesChrono = [...quizzes].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  
  const subjectAverages = Object.keys(subjectStats).map((subj) => ({
    subject: subj,
    average: (subjectStats[subj].total / subjectStats[subj].count).toFixed(1),
  }));

  // Difficulty stats
  const difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };
  quizzes.forEach((q) => {
    if (difficultyCount[q.difficulty] !== undefined) difficultyCount[q.difficulty]++;
  });

  // Trend Logic
  const getImprovementTrend = () => {
    if (quizzesChrono.length < 2) return "stable";
    const recent = quizzesChrono.slice(-3);
    const older = quizzesChrono.slice(0, 3);
    const recentAvg = recent.reduce((sum, q) => sum + parseFloat(q.score), 0) / recent.length;
    const olderAvg = older.reduce((sum, q) => sum + parseFloat(q.score), 0) / older.length;
    if (recentAvg > olderAvg + 5) return "improving";
    if (recentAvg < olderAvg - 5) return "declining";
    return "stable";
  };
  const trend = getImprovementTrend();

  // Heatmap Data
  const generateHeatmapData = () => {
    const today = new Date();
    const heatmapData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayQuizzes = quizzes.filter(q => new Date(q.createdAt).toISOString().split("T")[0] === dateStr);
      const avgScore = dayQuizzes.length > 0 ? dayQuizzes.reduce((sum, q) => sum + parseFloat(q.score), 0) / dayQuizzes.length : null;
      heatmapData.push({ date: dateStr, score: avgScore });
    }
    return heatmapData;
  };
  const heatmapData = generateHeatmapData();

  // --- Chart Configs ---
  const trendChartData = {
    labels: quizzesChrono.map(q => new Date(q.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })),
    datasets: [{
      label: "Quiz Scores (%)",
      data: quizzesChrono.map(q => parseFloat(q.score)),
      borderColor: "#4f46e5",
      backgroundColor: "rgba(79, 70, 229, 0.1)",
      tension: 0.4,
      fill: true,
      pointBackgroundColor: "#ffffff",
      pointBorderColor: "#4f46e5",
      pointBorderWidth: 2,
      pointRadius: 4
    }]
  };

  const subjectChartData = {
    labels: subjectAverages.map((s) => s.subject),
    datasets: [{
      label: "Avg Score",
      data: subjectAverages.map((s) => s.average),
      backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
      borderRadius: 6,
    }],
  };

  const radarChartData = {
    labels: subjectAverages.map((s) => s.subject),
    datasets: [{
      label: "Proficiency",
      data: subjectAverages.map((s) => s.average),
      backgroundColor: "rgba(99, 102, 241, 0.2)",
      borderColor: "#6366f1",
      pointBackgroundColor: "#6366f1",
    }],
  };

  const difficultyPieData = {
    labels: ["Easy", "Medium", "Hard"],
    datasets: [{
      data: [difficultyCount.Easy, difficultyCount.Medium, difficultyCount.Hard],
      backgroundColor: ["#10b981", "#f59e0b", "#ef4444"],
      borderWidth: 0,
    }],
  };

  return (
    <div className="report-container">
      <nav className="report-nav">
        <Link to="/teacher/reports" className="back-btn">
          <FiArrowLeft /> Back to Students
        </Link>
      </nav>

      <header className="report-header">
        <div className="header-content">
          <h1>{student.name}</h1>
          <p className="student-meta">Grade {student.grade} • Performance Analysis</p>
        </div>
        <div className={`trend-badge ${trend}`}>
          {trend === "improving" && <FiTrendingUp />}
          {trend === "declining" && <FiTrendingDown />}
          {trend === "stable" && <FiMinus />}
          <span>{trend.charAt(0).toUpperCase() + trend.slice(1)} Performance</span>
        </div>
      </header>

      {/* Top Level KPIs */}
      <section className="kpi-grid">
        <RadialProgress percentage={Math.round(averageScore)} label="Avg Score" color="#4f46e5" icon={<FiTarget />} />
        <RadialProgress percentage={Math.min(Math.round((totalXP / 1000) * 100), 100)} label="XP Goal" color="#10b981" icon={<FiStar />} />
        
        <div className="stat-card blue">
          <div className="stat-icon"><FiLayers /></div>
          <div className="stat-info">
            <h3>Total Quizzes</h3>
            <p>{quizzes.length}</p>
          </div>
        </div>
        
        <div className="stat-card orange">
          <div className="stat-icon"><FiActivity /></div>
          <div className="stat-info">
            <h3>Flashcards</h3>
            <p>{mastered} / {totalFlashcards}</p>
          </div>
        </div>
      </section>

      {/* Charts Section */}
      <div className="charts-layout">
        <div className="chart-card wide">
          <h3>📈 Performance Trend</h3>
          <div className="chart-wrapper">
            <Line data={trendChartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>📚 Subject Breakdown</h3>
          <div className="chart-wrapper">
            <Bar data={subjectChartData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>🎯 Subject Balance</h3>
          <div className="chart-wrapper radar">
            <Radar data={radarChartData} options={{ responsive: true, maintainAspectRatio: false, scales: { r: { ticks: { display: false } } } }} />
          </div>
        </div>

        <div className="chart-card">
          <h3>🔥 Difficulty Mix</h3>
          <div className="chart-wrapper doughnut">
            <Doughnut data={difficultyPieData} options={{ responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>
      </div>

      {/* Activity Heatmap */}
      <section className="heatmap-section">
        <h3>📅 30-Day Activity Heatmap</h3>
        <div className="heatmap-grid">
          {heatmapData.map((day, idx) => {
            let status = "empty";
            if (day.score !== null) {
              if (day.score >= 80) status = "high";
              else if (day.score >= 60) status = "medium";
              else status = "low";
            }
            return (
              <div 
                key={idx} 
                className={`heatmap-cell ${status}`} 
                title={`${day.date}: ${day.score ? day.score.toFixed(0) + '%' : 'No activity'}`}
              ></div>
            );
          })}
        </div>
      </section>

      {/* Recent Activity List */}
      <section className="activity-section">
        <h3>🕐 Recent Quizzes</h3>
        <div className="activity-list">
          {quizzes.slice(0, 5).map((quiz, idx) => (
            <div key={idx} className="activity-item">
              <div className={`score-circle ${parseFloat(quiz.score) >= 60 ? 'pass' : 'fail'}`}>
                {Math.round(quiz.score)}%
              </div>
              <div className="activity-details">
                <h4>{quiz.subject || "General Knowledge"}</h4>
                <p>{new Date(quiz.createdAt).toLocaleDateString()} • {quiz.difficulty || "Medium"}</p>
              </div>
              <div className="activity-meta">
                {quiz.correct_answers}/{quiz.total} Correct
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AI Summary */}
      <section className="ai-summary-card">
        <h3>🧠 AI Performance Analysis</h3>
        <div className="markdown-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
        </div>
      </section>
    </div>
  );
}
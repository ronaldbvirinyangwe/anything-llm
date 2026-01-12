import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Line,
  Bar,
  Radar,
  Pie,
  Doughnut,
} from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import useUser from "@/hooks/useUser";

ChartJS.register(
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

export default function ParentReport() {
  const { childId } = useParams();
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [report, setReport] = useState(null);

  const accessToken = localStorage.getItem("chikoroai_authToken");
 const API_BASE = import.meta.env.VITE_API_BASE || "https://api.chikoro-ai.com/api";

  useEffect(() => {
    if (!accessToken || !user?.id) {
      navigate("/login");
      return;
    }

    fetchChildReports();
  }, [childId, user, accessToken]);

  const fetchChildReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `${API_BASE}/system/parent/child-report/${childId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        console.error("Failed to fetch report:", res.status);
        setError("Failed to load report");
        setLoading(false);
        return;
      }

      const data = await res.json();
      if (data.success) {
        console.log("✅ Child report fetched:", data);
        setReport(data);
      } else {
        setError(data.error || "Could not load report");
      }
    } catch (err) {
      console.error("Error fetching child report:", err);
      setError("Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl text-gray-700 font-medium">
            Loading your child's performance report...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md">
          <div className="text-red-500 text-6xl mb-4 text-center">⚠️</div>
          <p className="text-xl text-gray-800 text-center mb-4">{error}</p>
          <button
            onClick={() => navigate("/parent/dashboard")}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

// Top-level data from backend
const { child = {}, reports = [] } = report || {};

// Grab the most recent report (you can change logic if you want multiple)
const latestReport = reports[0] || {};

// Now destructure safely
const {
  date = "",
  quizzes = [],
  summary = "",
  averageScore = 0,
  totalXP = 0,
  mastered = 0,
  totalFlashcards = 0,
} = latestReport;

  // Calculate subject breakdown
  const subjectStats = {};
  quizzes.forEach((q) => {
    const subj = q.subject || "General";
    if (!subjectStats[subj]) {
      subjectStats[subj] = { total: 0, count: 0 };
    }
    subjectStats[subj].total += parseFloat(q.score);
    subjectStats[subj].count += 1;
  });

  const subjectAverages = Object.keys(subjectStats).map((subj) => ({
    subject: subj,
    average: (subjectStats[subj].total / subjectStats[subj].count).toFixed(1),
  }));

  // Calculate difficulty distribution
  const difficultyCount = { Easy: 0, Medium: 0, Hard: 0 };
  quizzes.forEach((q) => {
    const diff = q.difficulty || "Medium";
    if (difficultyCount[diff] !== undefined) {
      difficultyCount[diff]++;
    }
  });

  // Score distribution
  const scoreRanges = {
    "0-20": 0,
    "21-40": 0,
    "41-60": 0,
    "61-80": 0,
    "81-100": 0,
  };
  quizzes.forEach((q) => {
    const score = parseFloat(q.score);
    if (score <= 20) scoreRanges["0-20"]++;
    else if (score <= 40) scoreRanges["21-40"]++;
    else if (score <= 60) scoreRanges["41-60"]++;
    else if (score <= 80) scoreRanges["61-80"]++;
    else scoreRanges["81-100"]++;
  });

  // Calculate improvement trend
  const getImprovementTrend = () => {
    if (quizzes.length < 2) return "neutral";
    const recent = quizzes.slice(0, 3);
    const older = quizzes.slice(-3);
    const recentAvg =
      recent.reduce((sum, q) => sum + parseFloat(q.score), 0) / recent.length;
    const olderAvg =
      older.reduce((sum, q) => sum + parseFloat(q.score), 0) / older.length;
    if (recentAvg > olderAvg + 5) return "improving";
    if (recentAvg < olderAvg - 5) return "declining";
    return "stable";
  };

  const trend = getImprovementTrend();

  // Generate activity heatmap data (last 30 days)
  const generateHeatmapData = () => {
    const today = new Date();
    const heatmapData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayQuizzes = quizzes.filter(
        (q) => new Date(q.createdAt).toISOString().split("T")[0] === dateStr
      );
      const avgScore =
        dayQuizzes.length > 0
          ? dayQuizzes.reduce((sum, q) => sum + parseFloat(q.score), 0) /
            dayQuizzes.length
          : null;
      heatmapData.push({ date: dateStr, score: avgScore });
    }
    return heatmapData;
  };

  const heatmapData = generateHeatmapData();

  // Chart configurations
  const trendChartData = {
    labels: quizzes.map((q) =>
      new Date(q.createdAt).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    ),
    datasets: [
      {
        label: "Quiz Scores (%)",
        data: quizzes.map((q) => parseFloat(q.score).toFixed(1)),
        borderColor: "#2563eb",
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        tension: 0.4,
        fill: true,
        pointRadius: 6,
        pointHoverRadius: 8,
        pointBackgroundColor: "#2563eb",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const subjectChartData = {
    labels: subjectAverages.map((s) => s.subject),
    datasets: [
      {
        label: "Average Score (%)",
        data: subjectAverages.map((s) => s.average),
        backgroundColor: [
          "rgba(59, 130, 246, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
          "rgba(139, 92, 246, 0.8)",
          "rgba(236, 72, 153, 0.8)",
        ],
        borderColor: [
          "rgb(59, 130, 246)",
          "rgb(16, 185, 129)",
          "rgb(245, 158, 11)",
          "rgb(239, 68, 68)",
          "rgb(139, 92, 246)",
          "rgb(236, 72, 153)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const radarChartData = {
    labels: subjectAverages.map((s) => s.subject),
    datasets: [
      {
        label: child.name,
        data: subjectAverages.map((s) => s.average),
        backgroundColor: "rgba(59, 130, 246, 0.2)",
        borderColor: "rgb(59, 130, 246)",
        borderWidth: 3,
        pointBackgroundColor: "rgb(59, 130, 246)",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "rgb(59, 130, 246)",
      },
    ],
  };

  const difficultyPieData = {
    labels: ["Easy", "Medium", "Hard"],
    datasets: [
      {
        data: [
          difficultyCount.Easy,
          difficultyCount.Medium,
          difficultyCount.Hard,
        ],
        backgroundColor: [
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
        borderColor: [
          "rgb(16, 185, 129)",
          "rgb(245, 158, 11)",
          "rgb(239, 68, 68)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const histogramData = {
    labels: Object.keys(scoreRanges),
    datasets: [
      {
        label: "Number of Quizzes",
        data: Object.values(scoreRanges),
        backgroundColor: "rgba(139, 92, 246, 0.8)",
        borderColor: "rgb(139, 92, 246)",
        borderWidth: 2,
      },
    ],
  };

  // Radial progress component
  const RadialProgress = ({ percentage, label, color, size = 120 }) => {
    const radius = size / 2 - 10;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-gray-800">
              {percentage}%
            </span>
          </div>
        </div>
        <p className="mt-3 text-sm font-medium text-gray-600">{label}</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Navigation */}
        <nav className="mb-6">
          <button
            onClick={() => navigate("/parent/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow text-gray-700 font-medium"
          >
            <span className="text-xl">←</span> Back to Dashboard
          </button>
        </nav>

        {/* Header */}
        <header className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-800 mb-2">
                📊 {child.name}'s Learning Journey
              </h1>
              <p className="text-xl text-gray-600">{child.grade}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">Progress Trend</div>
              <div className="flex items-center gap-2">
                {trend === "improving" && (
                  <span className="text-3xl text-green-500">📈</span>
                )}
                {trend === "declining" && (
                  <span className="text-3xl text-red-500">📉</span>
                )}
                {trend === "stable" && (
                  <span className="text-3xl text-blue-500">➡️</span>
                )}
                <span className="text-lg font-semibold text-gray-700 capitalize">
                  {trend}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Radial Progress Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-center items-center">
            <RadialProgress
              percentage={Math.min(averageScore, 100)}
              label="Average Score"
              color="#3b82f6"
            />
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-center items-center">
            <RadialProgress
              percentage={Math.min((totalXP / 1000) * 100, 100)}
              label="XP Progress"
              color="#10b981"
            />
          </div>
          <div className="bg-white rounded-2xl shadow-lg p-6 flex justify-center items-center">
            <RadialProgress
              percentage={
                totalFlashcards > 0
                  ? Math.round((mastered / totalFlashcards) * 100)
                  : 0
              }
              label="Flashcards Mastered"
              color="#f59e0b"
            />
          </div>
        </section>

        {/* Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="text-4xl mb-2">📝</div>
            <h3 className="text-lg font-semibold mb-1">Total Quizzes</h3>
            <p className="text-4xl font-bold">{quizzes.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="text-4xl mb-2">⭐</div>
            <h3 className="text-lg font-semibold mb-1">Total XP</h3>
            <p className="text-4xl font-bold">{totalXP}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="text-4xl mb-2">🎯</div>
            <h3 className="text-lg font-semibold mb-1">Avg Score</h3>
            <p className="text-4xl font-bold">{averageScore}%</p>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="text-4xl mb-2">🃏</div>
            <h3 className="text-lg font-semibold mb-1">Flashcards</h3>
            <p className="text-4xl font-bold">
              {mastered}/{totalFlashcards}
            </p>
          </div>
        </section>

        {/* Activity Heatmap */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            📅 Activity Heatmap (Last 30 Days)
          </h2>
          <div className="grid grid-cols-10 gap-2">
            {heatmapData.map((day, idx) => {
              let bgColor = "bg-gray-100";
              if (day.score !== null) {
                if (day.score >= 80) bgColor = "bg-green-500";
                else if (day.score >= 60) bgColor = "bg-green-300";
                else if (day.score >= 40) bgColor = "bg-yellow-300";
                else bgColor = "bg-red-300";
              }
              return (
                <div
                  key={idx}
                  className={`${bgColor} rounded h-8 w-full transition-all hover:scale-110 cursor-pointer`}
                  title={`${day.date}: ${
                    day.score !== null ? day.score.toFixed(1) + "%" : "No activity"
                  }`}
                ></div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded"></div>
              <div className="w-4 h-4 bg-red-300 rounded"></div>
              <div className="w-4 h-4 bg-yellow-300 rounded"></div>
              <div className="w-4 h-4 bg-green-300 rounded"></div>
              <div className="w-4 h-4 bg-green-500 rounded"></div>
            </div>
            <span>More</span>
          </div>
        </section>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Trend Chart */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              📈 Quiz Score Trends
            </h2>
            <Line data={trendChartData} options={{ responsive: true }} />
          </section>

          {/* Subject Bar Chart */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              📚 Subject Performance
            </h2>
            <Bar
              data={subjectChartData}
              options={{
                responsive: true,
                scales: { y: { beginAtZero: true, max: 100 } },
              }}
            />
          </section>

          {/* Radar Chart */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🎯 Subject Radar
            </h2>
            <Radar
              data={radarChartData}
              options={{
                responsive: true,
                scales: { r: { beginAtZero: true, max: 100 } },
              }}
            />
          </section>

          {/* Difficulty Distribution */}
          <section className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              🔥 Difficulty Distribution
            </h2>
            <Doughnut data={difficultyPieData} options={{ responsive: true }} />
          </section>

          {/* Score Distribution Histogram */}
          <section className="bg-white rounded-2xl shadow-lg p-6 lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              📊 Score Distribution
            </h2>
            <Bar
              data={histogramData}
              options={{
                responsive: true,
                scales: { y: { beginAtZero: true } },
              }}
            />
          </section>
        </div>

        {/* Recent Activity Timeline */}
        <section className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🕐 Recent Activity
          </h2>
          <div className="space-y-4">
            {quizzes.slice(0, 5).map((quiz, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-shrink-0 w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                  {parseFloat(quiz.score) >= 80
                    ? "🏆"
                    : parseFloat(quiz.score) >= 60
                    ? "✅"
                    : "📝"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {quiz.subject || "General"}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {new Date(quiz.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    •{" "}
                    {new Date(quiz.createdAt).toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">
                    {parseFloat(quiz.score).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    {quiz.correct_answers || 0}/{quiz.total || 0}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* AI Summary */}
        <section className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🧠 AI Performance Insights
          </h2>
          <div className="prose prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{summary}</ReactMarkdown>
          </div>
        </section>
      </div>
    </div>
  );
}
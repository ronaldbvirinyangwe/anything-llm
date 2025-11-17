// src/components/TeacherDashboard/TeacherDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBookOpen,
  FiFileText,
  FiClipboard,
  FiMessageSquare,
  FiBarChart2,
} from "react-icons/fi";
import DashboardStatsCard from "./DashboardStatsCard";
import "./dashboard.css";

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    quizzesCreated: 0,
    lessonPlans: 0,
  });
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧠 Load from localStorage immediately
  useEffect(() => {
    const storedUser = localStorage.getItem("chikoroai_user");
    const storedToken = localStorage.getItem("chikoroai_authToken");

    if (!storedUser || !storedToken) {
      navigate("/login"); // redirect if not authenticated
      return;
    }

    setUser(JSON.parse(storedUser));
    setAccessToken(storedToken);
  }, [navigate]);

// 🧾 Fetch teacher profile by user ID
useEffect(() => {
  if (!accessToken || !user?.id) return;

  const fetchTeacherProfile = async () => {
    try {
      const res = await fetch(
        `http://localhost:3001/api/system/profile/${user.id}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        console.error("Profile fetch failed:", res.status);
        return;
      }

      const data = await res.json();
      if (data.success && data.profile?.name) {
        setTeacherProfile(data.profile);
      } else {
        console.warn("Unexpected profile response:", data);
      }
    } catch (err) {
      console.error("Error fetching teacher profile:", err);
    }
  };

  fetchTeacherProfile();
}, [accessToken, user]);

  // 📊 Fetch teacher statistics
  useEffect(() => {
    if (!accessToken) return;

    const fetchStats = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("chikoroai_user"));
        const res = await fetch(`http://localhost:3001/api/system/teacher-dashboard/stats/${user.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!res.ok) {
          console.warn("Stats route not found:", res.status);
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (err) {
        console.error("Error fetching teacher stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [accessToken]);

  if (loading)
    return <div className="loading-container">Loading dashboard...</div>;

  return (
    <div className="teacher-dashboard">
      <header className="dashboard-header">
      <h1>
  Welcome back,{" "}
  {teacherProfile?.name ? (
    (() => {
      const name = teacherProfile.name.trim();
      // Regex checks for typical respectful prefixes
      const hasPrefix = /^(Mr\.|Mrs\.|Ms\.|Miss|Dr\.)/i.test(name);

      if (hasPrefix) {
        // If already has prefix, display as-is
        return name;
      }

      // If not, display first name + last name
      const parts = name.split(/\s+/); // Split on whitespace
      if (parts.length === 1) {
        // Only one name part
        return parts[0];
      }
      // Otherwise, display first + last name only
      return `${parts[0]} ${parts[parts.length - 1]}`;
    })()
  ) : (
    user?.username || "Teacher"
  )}
</h1>

        <p>Manage your classes, create content, and review student progress.</p>
      </header>

      {/* Top Stats Section */}
      <div className="stats-grid">
        <DashboardStatsCard title="Total Students" value={stats.totalStudents} />
        <DashboardStatsCard title="My Classes" value={stats.totalClasses} />
        <DashboardStatsCard title="Quizzes Created" value={stats.quizzesCreated} />
        <DashboardStatsCard title="Lesson Plans" value={stats.lessonPlans} />
      </div>

      {/* Tool Quick Links */}
      <section className="tool-links">
        <h2>AI Teaching Tools</h2>
        <div className="tool-grid">
          <Link to="/teacher-tools/lesson-planner" className="tool-card">
            <FiBookOpen className="tool-icon" />
            <h3>AI Lesson Planner</h3>
            <p>Create engaging, structured lesson plans instantly.</p>
          </Link>

          <Link to="/teacher-tools/quiz-generator" className="tool-card">
            <FiClipboard className="tool-icon" />
            <h3>AI Quiz Generator</h3>
            <p>Generate quizzes and tests with AI-driven difficulty control.</p>
          </Link>
          <Link to="/upload-exam" className="tool-card">
            <FiClipboard className="tool-icon" />
            <h3>Exam Paper Upload</h3>
            <p>Generate quizzes and tests from exam papers</p>
          </Link>

          <Link to="/teacher-tools/scheme-creator" className="tool-card">
            <FiFileText className="tool-icon" />
            <h3>Scheme of Work Creator</h3>
            <p>Plan your term week-by-week effortlessly.</p>
          </Link>

          <Link to="/teacher/link-student" className="tool-card">
            <FiMessageSquare className="tool-icon" />
            <h3>Link to Students</h3>
            <p>Connect students to their respective classes and resources.</p>
          </Link>

          <Link to="/teacher/reports" className="tool-card">
            <FiBarChart2 className="tool-icon" />
            <h3>Performance Reports</h3>
            <p>View AI-generated analytics for student progress.</p>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default TeacherDashboard;
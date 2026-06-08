// src/components/TeacherDashboard/TeacherDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiBookOpen, FiFileText, FiClipboard, FiMessageSquare,
  FiBarChart2, FiAlertCircle, FiUsers, FiLayers
} from "react-icons/fi";
import DashboardStatsCard from "./DashboardStatsCard";

const TeacherDashboard = () => {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalClasses: 0,
    quizzesCreated: 0,
    studentsNeedingAttention: 0,
  });

  const [teacherProfile, setTeacherProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("chikoroai_user");
    const storedToken = localStorage.getItem("chikoroai_authToken");
    if (!storedUser || !storedToken) { navigate("/login"); return; }
    setUser(JSON.parse(storedUser));
    setAccessToken(storedToken);
  }, [navigate]);

  useEffect(() => {
    if (!accessToken || !user?.id) return;
    const fetchTeacherProfile = async () => {
      try {
        const res = await fetch(`https://api.chikoro-ai.com/api/system/profile/${user.id}`, {
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.profile?.name) setTeacherProfile(data.profile);
      } catch (err) { console.error("Error fetching teacher profile:", err); }
    };
    fetchTeacherProfile();
  }, [accessToken, user]);

  useEffect(() => {
    if (!accessToken) return;
    const fetchStats = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("chikoroai_user"));
        const res = await fetch(`https://api.chikoro-ai.com/api/system/teacher-dashboard/stats/${user.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) { setLoading(false); return; }
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (err) { console.error("Error fetching teacher stats:", err); }
      finally { setLoading(false); }
    };
    fetchStats();
  }, [accessToken]);

  const getDisplayName = () => {
    if (teacherProfile?.name) {
      const name = teacherProfile.name.trim();
      if (/^(Mr\.|Mrs\.|Ms\.|Miss|Dr\.)/i.test(name)) return name;
      const parts = name.split(/\s+/);
      return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1]}`;
    }
    return user?.username || "Teacher";
  };

  const tools = [
    { to: "/teacher-tools/lesson-planner", icon: FiBookOpen,      title: "AI Lesson Planner",       desc: "Create engaging, structured lesson plans instantly." },
    { to: "/teacher-tools/quiz-generator", icon: FiClipboard,     title: "Quiz & Homework Builder", desc: "Save prep time. Generate tailored assessments automatically." },
    { to: "/upload-exam",                  icon: FiFileText,       title: "Exam Paper Upload",       desc: "Digitize and generate quizzes directly from exam papers." },
    { to: "/teacher-tools/scheme-creator", icon: FiLayers,         title: "Scheme of Work Creator",  desc: "Plan your term week-by-week effortlessly." },
    { to: "/teacher/link-student",         icon: FiMessageSquare,  title: "Link Students",           desc: "Connect students to their respective classes." },
    { to: "/teacher/quizzes",              icon: FiBarChart2,      title: "Quiz Results",            desc: "View detailed results of quizzes and homework." },
    { to: "/teacher/reports",              icon: FiBarChart2,      title: "Performance Reports",     desc: "View AI-generated analytics for student progress." },
  ];

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "var(--theme-bg-primary)",
      }}>
        <div style={{
          width: 44, height: 44,
          border: "4px solid var(--theme-sidebar-border)",
          borderTopColor: "var(--theme-button-primary)",
          borderRadius: "50%",
          animation: "td-spin 1s linear infinite",
        }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes td-spin    { to { transform: rotate(360deg); } }
        @keyframes td-fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .td-fade  { animation: td-fadeUp .5s cubic-bezier(.4,0,.2,1) both; }
        .td-tool-card {
          display: flex; flex-direction: column;
          padding: 22px 20px;
          background: var(--theme-bg-secondary);
          border: 1px solid var(--theme-sidebar-border);
          border-radius: 14px;
          text-decoration: none;
          transition: box-shadow .2s, border-color .2s, transform .18s;
        }
        .td-tool-card:hover {
          box-shadow: 0 8px 24px rgba(0,0,0,.15);
          border-color: color-mix(in srgb, var(--theme-button-primary) 40%, var(--theme-sidebar-border));
          transform: translateY(-2px);
        }
        .td-tool-card:hover .td-tool-icon {
          background: var(--theme-button-primary);
          color: #fff;
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(1rem, 4vw, 2.5rem)" }}>

        {/* Header */}
        <div className="td-fade" style={{
          background: "var(--theme-bg-secondary)",
          borderRadius: 18, padding: "36px 40px",
          textAlign: "center", marginBottom: 32,
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
            Welcome back, {getDisplayName()} 👋
          </h1>
          <p style={{ color: "#e0e7ff", fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            Manage your classes, create content, and review student progress.
          </p>
        </div>

        {/* Stats grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}>
          <DashboardStatsCard title="Total Students"   value={stats.totalStudents}            icon={<FiUsers />} />
          <DashboardStatsCard title="My Classes"       value={stats.totalClasses}             icon={<FiLayers />} />
          <DashboardStatsCard title="Quizzes Created"  value={stats.quizzesCreated}           icon={<FiClipboard />} />
          <DashboardStatsCard
            title="Needs Attention"
            value={stats.studentsNeedingAttention}
            icon={<FiAlertCircle style={{ color: "#ef4444" }} />}
            label="Avg Score < 50%"
          />
        </div>

        {/* Tool links */}
        <section>
          <h2 style={{
            fontSize: 16, fontWeight: 700, color: "var(--theme-text-primary)",
            margin: "0 0 16px", paddingBottom: 12,
            borderBottom: "1px solid var(--theme-sidebar-border)",
          }}>
            AI Teaching Tools
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}>
            {tools.map(({ to, icon: Icon, title, desc }) => (
              <Link key={to} to={to} className="td-tool-card">
                <div
                  className="td-tool-icon"
                  style={{
                    width: 40, height: 40, borderRadius: 10, marginBottom: 14, flexShrink: 0,
                    background: "color-mix(in srgb, var(--theme-button-primary) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--theme-button-primary) 25%, transparent)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--theme-button-primary)", fontSize: 18,
                    transition: "background .2s, color .2s",
                  }}
                >
                  <Icon size={18} />
                </div>
                <h3 style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "var(--theme-text-primary)" }}>
                  {title}
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--theme-text-secondary)", lineHeight: 1.5 }}>
                  {desc}
                </p>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
};

export default TeacherDashboard;
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./teacher-reports.css";

export default function TeacherReports() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("all"); // 'all' or 'subject'
  const [searchTerm, setSearchTerm] = useState(""); // --- NEW: Search State ---

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem("chikoroai_user"));
        const teacherId = storedUser?.id;

        if (!teacherId) {
          navigate("/login");
          return;
        }

        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/teacher/my-students/${teacherId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.success) {
          // ✅ Deduplicate students and group their subjects
          const uniqueStudents = res.data.students.reduce((acc, student) => {
            const existing = acc.find((s) => s.id === student.id);

            if (existing) {
              if (!existing.subjects.includes(student.subject)) {
                existing.subjects.push(student.subject);
              }
            } else {
              acc.push({
                ...student,
                subjects: student.subject ? [student.subject] : [],
              });
            }

            return acc;
          }, []);

          setStudents(uniqueStudents);
        } else {
          setError(res.data.error || "Failed to fetch students");
        }
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Error loading students");
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [navigate]);

  if (loading) {
    return <div className="loading-screen">Loading your students...</div>;
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

  // --- NEW: Filter students based on search term before grouping ---
  const filteredStudents = students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.subject && student.subject.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (student.grade && student.grade.toString().includes(searchTerm))
  );

  // Group the *filtered* students by subject if needed
  const groupedStudents =
    groupBy === "subject"
      ? filteredStudents.reduce((acc, student) => {
          const subject = student.subject || "Unknown";
          if (!acc[subject]) acc[subject] = [];
          acc[subject].push(student);
          return acc;
        }, {})
      : { "All Students": filteredStudents };

  return (
    <div className="report-container">
      <nav className="reports-nav">
        <Link to="/teacher-dashboard" className="back-btn">
          ← Back to Dashboard
        </Link>
      </nav>

      <header className="reports-header">
        <h1>📊 Student Performance Reports</h1>
        <p>Search and select a student to view their detailed performance analysis</p>
      </header>

      {/* --- UPDATED: Controls Toolbar with Search & Filter --- */}
      <div className="controls-toolbar">
        <div className="search-wrapper">
          <span className="search-icon">🔍</span>
          <input 
            type="text" 
            placeholder="Search students by name, grade, or subject..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <label>View by:</label>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Students</option>
            <option value="subject">By Subject</option>
          </select>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="empty-state">
          <p>No students linked yet.</p>
          <Link to="/teacher/link-student" className="link-btn">
            Link Students
          </Link>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="empty-state">
          <p>No students match your search for "{searchTerm}".</p>
          <button onClick={() => setSearchTerm("")} className="link-btn secondary">
            Clear Search
          </button>
        </div>
      ) : (
        Object.entries(groupedStudents).map(([category, studentList]) => (
          <section key={category} className="students-section">
            <h2>{category}</h2>
            <div className="students-grid">
              {studentList.map((student) => (
                <Link
                  key={student.id}
                  to={`/teacher/reports/student/${student.id}`}
                  className="student-card"
                >
                  <div className="student-info">
                    <h3>{student.name}</h3>
                    <p className="student-grade">Grade {student.grade}</p>
                    {groupBy === "all" && student.subject && (
                      <p className="student-subject">{student.subject}</p>
                    )}
                  </div>
                  <div className="student-arrow">→</div>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
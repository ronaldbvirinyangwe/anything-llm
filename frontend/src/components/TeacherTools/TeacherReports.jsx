import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./teacher-student-results.css";

export default function TeacherReports() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groupBy, setGroupBy] = useState("all"); // 'all' or 'subject'

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
          `http://localhost:3001/api/system/teacher/my-students/${teacherId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.success) {
          setStudents(res.data.students);
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

  // Group students by subject if needed
  const groupedStudents = groupBy === "subject" 
    ? students.reduce((acc, student) => {
        const subject = student.subject || "Unknown";
        if (!acc[subject]) acc[subject] = [];
        acc[subject].push(student);
        return acc;
      }, {})
    : { "All Students": students };

  return (
    <div className="report-container">
      <nav className="reports-nav">
        <Link to="/teacher-dashboard" className="back-btn">
          ← Back to Dashboard
        </Link>
      </nav>

      <header className="reports-header">
        <h1>📊 Student Performance Reports</h1>
        <p>Select a student to view their detailed performance analysis</p>
      </header>

      <div className="filter-section">
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

      {students.length === 0 ? (
        <div className="empty-state">
          <p>No students linked yet.</p>
          <Link to="/teacher/link-student" className="link-btn">
            Link Students
          </Link>
        </div>
      ) : (
        Object.entries(groupedStudents).map(([category, studentList]) => (
          <section key={category} className="students-section">
            <h2>{category}</h2>
            <div className="students-grid">
              {studentList.map((student) => (
  <Link
    key={`${student.id}-${student.subject || 'default'}`}  // ✅ Composite key
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
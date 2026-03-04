import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import { 
  FiArrowLeft, FiLink, FiCopy, FiCheck, FiUsers, FiBook, FiUserPlus 
} from "react-icons/fi";
import "./linkstudent.css";

export default function LinkStudent() {
  const { theme } = useTheme();
  const [students, setStudents] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);
  const [form, setForm] = useState({ studentId: "", subject: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [generatedLink, setGeneratedLink] = useState("");
  const [subjectName, setSubjectName] = useState(""); 
  const [copied, setCopied] = useState(false); // 🆕 State for copy button

  // 🧠 Fetch linked students
  const fetchLinkedStudents = async () => {
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const storedUser = JSON.parse(localStorage.getItem("chikoroai_user"));
      const teacherId = storedUser?.id;

      if (!teacherId) {
        console.warn("Teacher ID not found in localStorage");
        return;
      }

      const res = await axios.get(
        `https://api.chikoro-ai.com/api/system/teacher/my-students/${teacherId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) setStudents(res.data.students);
      else console.warn("Failed to fetch linked students:", res.data);
    } catch (err) {
      console.error("Error fetching linked students:", err);
    }
  };

  // 🧠 Fetch all students (for dropdown search)
  const fetchAllStudents = async () => {
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.get(`https://api.chikoro-ai.com/api/system/students`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setAvailableStudents(res.data.students);
    } catch (err) {
      console.error("Error fetching available students:", err);
    }
  };

  useEffect(() => {
    fetchLinkedStudents();
    fetchAllStudents();
  }, []);

  const handleCopyLink = () => {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`linkstudent-container ${theme}`}>
      <nav className="tool-nav">
        <Link to="/teacher-dashboard" className="back-btn">
          <FiArrowLeft /> Back to Dashboard
        </Link>
      </nav>

      <header className="modern-header">
        <h1>👩‍🏫 Manage Your Classes</h1>
        <p>Generate shareable class links and view the students currently connected to your profile.</p>
      </header>

      <div className="dashboard-grid">
        
        {/* --- LEFT COLUMN: Generate Link --- */}
        <section className="action-panel fade-in">
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-icon"><FiLink /></div>
              <h2>Generate Class Join Link</h2>
            </div>
            <p className="panel-desc">
              Enter a subject name to create a unique, shareable link. When students click this link, they will be automatically enrolled in your class.
            </p>

            <div className="generate-form">
              <div className="form-group">
                <label><FiBook /> Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mathematics Form 3"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="modern-input"
                />
              </div>
              
              <button
                className="action-btn primary full-width"
                onClick={async () => {
                  if (!subjectName.trim()) {
                    alert("⚠️ Please enter a subject name!");
                    return;
                  }
                  try {
                    const token = localStorage.getItem("chikoroai_authToken");
                    const res = await axios.post(
                      `https://api.chikoro-ai.com/api/system/teacher/create-class-link`,
                      { subject: subjectName },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );

                    if (res.data.success) {
                      setGeneratedLink(res.data.classLink.joinUrl);
                      setCopied(false);
                    } else {
                      alert(`⚠️ Failed: ${res.data.error || "Could not generate link"}`);
                    }
                  } catch (err) {
                    console.error("Error generating class link:", err);
                    alert("❌ Error generating class link.");
                  }
                }}
              >
                <FiUserPlus /> Generate Invite Link
              </button>
            </div>

            {generatedLink && (
              <div className="generated-link-box fade-in">
                <p className="success-label">✅ Link Generated Successfully!</p>
                <div className="link-copier">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className="link-display"
                    onClick={(e) => e.target.select()}
                  />
                  <button className={`copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopyLink}>
                    {copied ? <FiCheck /> : <FiCopy />}
                  </button>
                </div>
                <p className="link-hint">Share this link directly with your students via WhatsApp, email, or Google Classroom.</p>
              </div>
            )}
          </div>
        </section>

        {/* --- RIGHT COLUMN: Linked Students --- */}
        <section className="list-panel fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="panel-card h-full">
            <div className="panel-header">
              <div className="panel-icon purple"><FiUsers /></div>
              <h2>Linked Students <span className="count-badge">{students.length}</span></h2>
            </div>
            
            {students.length > 0 ? (
              <div className="students-grid">
                {students.map((s) => (
                  <div key={s.id} className="student-card">
                    <div className="student-avatar">
                      {s.name ? s.name.charAt(0).toUpperCase() : "🎓"}
                    </div>
                    <div className="student-info">
                      <h3>{s.name}</h3>
                      <div className="student-meta">
                        <span className="meta-item subject">{s.subject}</span>
                        <span className="meta-item grade">{s.grade}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-box">
                <div className="empty-icon">📭</div>
                <h3>No Students Yet</h3>
                <p>Generate a link on the left and share it with your class to get started.</p>
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
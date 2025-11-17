import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
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
      `http://localhost:3001/api/system/teacher/my-students/${teacherId}`,
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
      const storedUser = JSON.parse(localStorage.getItem("chikoroai_user"));
      const teacherId = storedUser?.id;
      const res = await axios.get( `http://localhost:3001/api/system/students`, {
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

 const handleLink = async (e) => {
  e.preventDefault();
  if (!form.studentId || !form.subject) {
    setError("Please select a student and subject.");
    return;
  }

  setLoading(true);
  setSuccess("");
  setError("");

  try {
    const token = localStorage.getItem("chikoroai_authToken");
    const storedUser = JSON.parse(localStorage.getItem("chikoroai_user"));
    const teacherId = storedUser?.id;   // ✅ reliable source of teacher ID

    const res = await axios.post(
      `http://localhost:3001/api/system/link-student/${teacherId}`,
      { studentId: parseInt(form.studentId), subject: form.subject }, // ✅ clean body
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.data.success) {
      setSuccess("✅ Student linked successfully!");
      setForm({ studentId: "", subject: "" });
      fetchLinkedStudents();
    } else {
      setError(res.data.error || "Failed to link student.");
    }
  } catch (err) {
    console.error("Error linking student:", err);
    setError("Error linking student.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className={`linkstudent-container ${theme}`}>
      <nav className="tool-nav">
        <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
      </nav>

      <header className="tool-header">
        <h1>👩‍🏫 Link Student to Teacher</h1>
        <p>Connect your students to your profile to monitor their progress and generate reports.</p>
      </header>

      {/* <section className="link-form-section">
        <form onSubmit={handleLink}>
          <div className="form-group">
            <label>Select Student</label>
            <select
              value={form.studentId}
              onChange={(e) => setForm({ ...form, studentId: e.target.value })}
            >
              <option value="">-- Choose a student --</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.grade})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subject</label>
            <input
              type="text"
              placeholder="e.g. Mathematics"
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>

          <button type="submit" className="generate-btn" disabled={loading}>
            {loading ? "Linking..." : "Link Student"}
          </button>

          {success && <p className="success-message">{success}</p>}
          {error && <p className="error-message">{error}</p>}
        </form>
      </section> */}

      <section className="generate-class-link">
  <h2>🔗 Generate Class Join Link</h2>
  <p>
    Enter a subject name and create a shareable class link. Students can click
    this link to automatically join your class.
  </p>

  <div className="generate-form">
    <input
      type="text"
      placeholder="Enter subject name (e.g. Mathematics)"
      value={subjectName}
      onChange={(e) => setSubjectName(e.target.value)}
      className="subject-input"
    />
    <button
      className="generate-btn secondary"
      onClick={async () => {
        if (!subjectName.trim()) {
          alert("⚠️ Please enter a subject name!");
          return;
        }

        try {
          const token = localStorage.getItem("chikoroai_authToken");
          const user = JSON.parse(localStorage.getItem("chikoroai_user"));
          const teacherId = user?.id;

          const res = await axios.post(
            `http://localhost:3001/api/system/teacher/create-class-link`,
            { subject: subjectName },
            { headers: { Authorization: `Bearer ${token}` } }
          );

          if (res.data.success) {
            const link = res.data.classLink.joinUrl;
            setGeneratedLink(link); // Save link to state
          } else {
            alert(`⚠️ Failed: ${res.data.error || "Could not generate link"}`);
          }
        } catch (err) {
          console.error("Error generating class link:", err);
          alert("❌ Error generating class link. Check console for details.");
        }
      }}
    >
      Generate Class Link
    </button>
  </div>

  {generatedLink && (
    <div className="generated-link-box">
      <p><strong>Class Join Link:</strong></p>
      <input
        type="text"
        value={generatedLink}
        readOnly
        className="link-display"
        onClick={(e) => e.target.select()}
      />
      <button
        className="copy-btn"
        onClick={() => {
          navigator.clipboard.writeText(generatedLink);
          alert("✅ Link copied to clipboard!");
        }}
      >
        Copy Link
      </button>
    </div>
  )}
</section>

      <section className="linked-students-section">
        <h2>🎓 Linked Students</h2>
        {students.length > 0 ? (
          <ul className="students-list">
            {students.map((s) => (
              <li key={s.id}>
                <span>{s.name}</span> <em>{s.subject}</em> <strong>{s.grade}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p>No students linked yet.</p>
        )}
      </section>
    </div>
  );
}
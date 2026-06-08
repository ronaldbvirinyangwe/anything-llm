import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useTheme } from "@/hooks/useTheme";
import {
  FiArrowLeft, FiLink, FiCopy, FiCheck, FiUsers, FiBook, FiUserPlus
} from "react-icons/fi";

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
  const [copied, setCopied] = useState(false);

  const fetchLinkedStudents = async () => {
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const storedUser = JSON.parse(localStorage.getItem("chikoroai_user"));
      const teacherId = storedUser?.id;
      if (!teacherId) return;
      const res = await axios.get(
        `https://api.chikoro-ai.com/api/system/teacher/my-students/${teacherId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) setStudents(res.data.students);
    } catch (err) {
      console.error("Error fetching linked students:", err);
    }
  };

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

  const handleGenerateLink = async () => {
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
  };

  const inputStyle = {
    padding: "10px 14px",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 8,
    fontSize: 14,
    background: "var(--theme-bg-container)",
    color: "var(--theme-text-primary)",
    fontFamily: "inherit",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color .2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes ls-fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .ls-fade  { animation: ls-fadeUp .5s cubic-bezier(.4,0,.2,1) both; }
        .ls-fade2 { animation: ls-fadeUp .5s cubic-bezier(.4,0,.2,1) .1s both; }
        .ls-input:focus {
          border-color: var(--theme-button-primary) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-button-primary) 15%, transparent) !important;
        }
        .ls-student-card:hover {
          background: color-mix(in srgb, var(--theme-button-primary) 5%, var(--theme-bg-container)) !important;
          border-color: color-mix(in srgb, var(--theme-button-primary) 30%, var(--theme-sidebar-border)) !important;
        }
        .ls-copy-btn:hover { opacity: .8; }
        .ls-gen-btn:not(:disabled):hover { opacity: .88; }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "clamp(1rem, 4vw, 2.5rem)" }}>

        {/* Back nav */}
        <div style={{ marginBottom: 24 }}>
          <Link to="/teacher-dashboard" style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            padding: "8px 16px",
            background: "var(--theme-bg-secondary)",
            border: "1px solid var(--theme-sidebar-border)",
            borderRadius: 12, color: "var(--theme-text-primary)",
            fontWeight: 600, fontSize: 13, textDecoration: "none",
            transition: "box-shadow .2s",
          }}>
            <FiArrowLeft /> Back to Dashboard
          </Link>
        </div>

        {/* Header */}
        <div className="ls-fade" style={{
          background: "var(--theme-bg-secondary)",
          borderRadius: 18, padding: "36px 40px",
          textAlign: "center", marginBottom: 32,
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
            👩‍🏫 Manage Your Classes
          </h1>
          <p style={{ color: "#e0e7ff", fontSize: 15, margin: 0, maxWidth: 560, marginInline: "auto", lineHeight: 1.6 }}>
            Generate shareable class links and view the students currently connected to your profile.
          </p>
        </div>

        {/* Two-column grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
          alignItems: "start",
        }}>

          {/* ── Left: Generate Link ── */}
          <div className="ls-fade" style={{
            background: "var(--theme-bg-secondary)",
            border: "1px solid var(--theme-sidebar-border)",
            borderRadius: 16, padding: 24,
            boxShadow: "0 4px 12px rgba(0,0,0,.1)",
          }}>
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "color-mix(in srgb, var(--theme-button-primary) 12%, transparent)",
                border: "1px solid color-mix(in srgb, var(--theme-button-primary) 25%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--theme-button-primary)",
              }}>
                <FiLink size={17} />
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--theme-text-primary)" }}>
                Generate Class Join Link
              </h2>
            </div>

            <p style={{ fontSize: 13, color: "var(--theme-text-secondary)", lineHeight: 1.6, margin: "0 0 20px", paddingBottom: 16, borderBottom: "1px solid var(--theme-sidebar-border)" }}>
              Enter a subject name to create a unique, shareable link. When students click this link, they will be automatically enrolled in your class.
            </p>

            {/* Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                  <FiBook size={13} /> Subject Name
                </label>
                <input
                  className="ls-input"
                  type="text"
                  placeholder="e.g. Mathematics Form 3"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <button
                className="ls-gen-btn"
                onClick={handleGenerateLink}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "11px 20px", borderRadius: 10, border: "none",
                  background: "var(--theme-button-primary)", color: "#fff",
                  fontWeight: 700, fontSize: 14, cursor: "pointer",
                  fontFamily: "inherit", width: "100%",
                  transition: "opacity .2s",
                }}
              >
                <FiUserPlus size={15} /> Generate Invite Link
              </button>
            </div>

            {/* Generated link box */}
            {generatedLink && (
              <div style={{
                marginTop: 20,
                padding: "16px",
                background: "color-mix(in srgb, #059669 8%, var(--theme-bg-container))",
                border: "1px solid color-mix(in srgb, #059669 25%, var(--theme-sidebar-border))",
                borderRadius: 12,
                animation: "ls-fadeUp .4s cubic-bezier(.4,0,.2,1) both",
              }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "#059669", display: "flex", alignItems: "center", gap: 6 }}>
                  <FiCheck size={14} /> Link Generated Successfully!
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    onClick={(e) => e.target.select()}
                    style={{
                      ...inputStyle,
                      fontSize: 12,
                      color: "var(--theme-text-secondary)",
                      background: "var(--theme-bg-primary)",
                      cursor: "text",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  />
                  <button
                    className="ls-copy-btn"
                    onClick={handleCopyLink}
                    title={copied ? "Copied!" : "Copy link"}
                    style={{
                      flexShrink: 0,
                      width: 40, height: 40,
                      borderRadius: 8, border: "none",
                      background: copied
                        ? "color-mix(in srgb, #059669 15%, transparent)"
                        : "color-mix(in srgb, var(--theme-button-primary) 12%, transparent)",
                      color: copied ? "#059669" : "var(--theme-button-primary)",
                      cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all .2s",
                    }}
                  >
                    {copied ? <FiCheck size={16} /> : <FiCopy size={16} />}
                  </button>
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 11, color: "var(--theme-text-secondary)", lineHeight: 1.5 }}>
                  Share this link directly with your students via WhatsApp, email, or Google Classroom.
                </p>
              </div>
            )}
          </div>

          {/* ── Right: Linked Students ── */}
          <div className="ls-fade2" style={{
            background: "var(--theme-bg-secondary)",
            border: "1px solid var(--theme-sidebar-border)",
            borderRadius: 16, padding: 24,
            boxShadow: "0 4px 12px rgba(0,0,0,.1)",
          }}>
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, paddingBottom: 16, borderBottom: "1px solid var(--theme-sidebar-border)" }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "color-mix(in srgb, #7c3aed 12%, transparent)",
                border: "1px solid color-mix(in srgb, #7c3aed 25%, transparent)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#7c3aed",
              }}>
                <FiUsers size={17} />
              </div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 10 }}>
                Linked Students
                <span style={{
                  padding: "2px 9px", borderRadius: 20, fontSize: 12, fontWeight: 700,
                  background: "color-mix(in srgb, #7c3aed 12%, transparent)",
                  color: "#7c3aed",
                  border: "1px solid color-mix(in srgb, #7c3aed 25%, transparent)",
                }}>
                  {students.length}
                </span>
              </h2>
            </div>

            {students.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {students.map((s) => (
                  <div
                    key={s.id}
                    className="ls-student-card"
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px",
                      background: "var(--theme-bg-container)",
                      border: "1px solid var(--theme-sidebar-border)",
                      borderRadius: 11,
                      transition: "background .15s, border-color .15s",
                      cursor: "default",
                    }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: "color-mix(in srgb, var(--theme-button-primary) 15%, transparent)",
                      border: "1px solid color-mix(in srgb, var(--theme-button-primary) 25%, transparent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, fontWeight: 800,
                      color: "var(--theme-button-primary)",
                    }}>
                      {s.name ? s.name.charAt(0).toUpperCase() : "🎓"}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 700, color: "var(--theme-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {s.name}
                      </h3>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {s.subject && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: "color-mix(in srgb, var(--theme-button-primary) 10%, transparent)",
                            color: "var(--theme-button-primary)",
                            border: "1px solid color-mix(in srgb, var(--theme-button-primary) 20%, transparent)",
                          }}>
                            {s.subject}
                          </span>
                        )}
                        {s.grade && (
                          <span style={{
                            padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                            background: "color-mix(in srgb, #7c3aed 10%, transparent)",
                            color: "#7c3aed",
                            border: "1px solid color-mix(in srgb, #7c3aed 20%, transparent)",
                          }}>
                            {s.grade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                padding: "48px 24px", textAlign: "center",
              }}>
                <div style={{ fontSize: 44, marginBottom: 14, opacity: .5 }}>📭</div>
                <h3 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700, color: "var(--theme-text-primary)" }}>
                  No Students Yet
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: "var(--theme-text-secondary)", lineHeight: 1.6, maxWidth: 280 }}>
                  Generate a link on the left and share it with your class to get started.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
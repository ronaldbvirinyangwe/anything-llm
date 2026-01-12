import React, { useState, useEffect } from "react";
import useUser from "@/hooks/useUser";
import Sidebar from "../Sidebar";
import "./GenerateLinkCode.css"; // 👈 Import your page-specific styles

export default function GenerateLinkCode() {
  const [linkCode, setLinkCode] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [studentId, setStudentId] = useState(null);

  const { user } = useUser();
  const API_BASE = import.meta.env.VITE_API_BASE || "https://api.chikoro-ai.com/api";

  useEffect(() => {
    async function fetchStudentProfile() {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        if (!token || !user?.id) return;

        const res = await fetch(`${API_BASE}/system/profile/${user.id}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;
        const { success, profile } = await res.json();
        if (success && profile) {
          setStudentId(profile.id || user.id);
        }
      } catch {
        setError("Failed to load student info");
      }
    }

    if (user?.id) fetchStudentProfile();
  }, [user, API_BASE]);

  useEffect(() => {
    if (studentId) fetchActiveLinkCode();
  }, [studentId]);

  const fetchActiveLinkCode = async () => {
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await fetch(`${API_BASE}/system/student/active-link-code/${studentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success && data.linkCode) {
        setLinkCode(data.linkCode.code);
        setExpiresAt(data.linkCode.expiresAt);
      }
    } catch (err) {
      console.error("Error fetching active link code:", err);
    }
  };

  const generateNewCode = async () => {
    if (!studentId) return setError("Student ID not available");
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await fetch(`${API_BASE}/system/student/generate-link-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ studentId: Number(studentId) }),
      });

      const data = await res.json();
      if (data.success) {
        setLinkCode(data.linkCode);
        setExpiresAt(data.expiresAt);
      } else {
        setError(data.error || "Failed to generate link code");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(linkCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExpiryDate = (date) =>
    new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  return (
    <div className="link-page">
      <Sidebar />
      <div className="link-content">
        <div className="link-card">
          <h3 className="link-title">👨‍👩‍👧 Parent Link Code</h3>

          {!user || !studentId ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <span>Loading student information...</span>
            </div>
          ) : (
            <>
              <p className="link-subtitle">
                Share this code with your parent or guardian so they can view your progress and reports.
              </p>

              {linkCode && !isExpired ? (
                <div className="link-details">
                  <div className="code-box">
                    <div className="code-header">
                      <span>Your Code:</span>
                      <button onClick={copyToClipboard} className="copy-btn">
                        {copied ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="code-display">{linkCode}</div>
                  </div>

                  <div className="expiry-box">
                    <p>
                      <strong>⏰ Expires:</strong> {formatExpiryDate(expiresAt)}
                    </p>
                    <p className="hint">This code can only be used once</p>
                  </div>

                  <button onClick={generateNewCode} disabled={loading} className="generate-btn">
                    Generate New Code
                  </button>
                </div>
              ) : (
                <div className="link-details">
                  {isExpired && (
                    <div className="expired-alert">Your previous code has expired. Generate a new one below.</div>
                  )}
                  {error && <div className="error-alert">{error}</div>}

                  <button onClick={generateNewCode} disabled={loading} className="generate-btn primary">
                    {loading ? "⏳ Generating..." : "Generate Parent Link Code"}
                  </button>
                </div>
              )}

              <div className="footer-note">
                💡 <strong>How it works:</strong> Give this code to your parent. They can enter it in their dashboard to
                link your account and view your progress.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
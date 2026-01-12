import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

export default function JoinClass() {
  const { classCode } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const joinClass = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        
        if (!token) {
          setError("Please log in to join a class");
          setLoading(false);
          setTimeout(() => navigate("/login"), 2000);
          return;
        }

        const res = await axios.post(
          `https://api.chikoro-ai.com/api/system/student/join-class/${classCode}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.success) {
          setMessage(res.data.message);
          setTimeout(() => navigate("/"), 2000);
        } else {
          setError(res.data.error);
        }
      } catch (err) {
        console.error("Error joining class:", err);
        setError(err.response?.data?.error || "Failed to join class");
      } finally {
        setLoading(false);
      }
    };

    joinClass();
  }, [classCode, navigate]);

  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>🎓 Joining Class</h1>
      
      {loading && <p>Processing class code: {classCode}...</p>}
      
      {message && (
        <div style={{ color: "green", marginTop: "1rem" }}>
          <p>✅ {message}</p>
          <p>Redirecting to dashboard...</p>
        </div>
      )}
      
      {error && (
        <div style={{ color: "red", marginTop: "1rem" }}>
          <p>❌ {error}</p>
        </div>
      )}
    </div>
  );
}
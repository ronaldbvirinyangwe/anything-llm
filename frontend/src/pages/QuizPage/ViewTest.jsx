import React, { useEffect } from "react";
import { create } from "zustand";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import "./test.css";

// 🧠 Zustand store
const useViewStore = create((set) => ({
  result: null,
  loading: false,
  error: "",
  setResult: (r) => set({ result: r }),
  setError: (e) => set({ error: e }),
  setLoading: (v) => set({ loading: v }),
}));

export default function ViewTest() {
  const { result, loading, error, setResult, setError, setLoading } = useViewStore();
  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const { id } = useParams();

  // 📡 Fetch result + feedback
  useEffect(() => {
    if (!id) return;
    setLoading(true);

    fetch(`http://localhost:3001/api/quiz/result/${id}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("📊 Loaded result data:", data);
        if (data.success && data.result) setResult(data.result);
        else setError("No result data found.");
      })
      .catch((err) => setError("Error fetching result: " + err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <div className="test-home">
        <main className="main-content">
          <div className="loading-overlay">
            <div className="loading-bar" />
            <p>Fetching quiz results...</p>
          </div>
        </main>
      </div>
    );

  if (error)
    return (
      <div className="test-home">
        <main className="main-content">
          <div className="test-error">{error}</div>
          <button className="secondary-button" onClick={() => navigate("/quiz")}>
            Back to Quizzes
          </button>
        </main>
      </div>
    );

  if (!result)
    return (
      <div className="test-home">
        <main className="main-content">
          <p>Loading result data...</p>
        </main>
      </div>
    );

  const { subject, score, correct_answers, total_questions, submitted_at, feedback } = result;

  return (
    <div className={`test-home ${darkMode ? "dark" : ""}`}>
      <main className="main-content">
        <div className="test-container">
          {/* 🧾 Summary */}
          <div className="test-summary-card">
            <h2>{subject || "Quiz Result"}</h2>
            <p>
              <b>Score:</b> {score}%<br />
              <b>Correct Answers:</b> {correct_answers}/{total_questions}<br />
              <b>Date:</b>{" "}
              {submitted_at ? new Date(submitted_at).toLocaleString() : "Unknown"}
            </p>

            <div className="score-bar-container">
              <div
                className="score-bar"
                style={{
                  width: `${score}%`,
                  backgroundColor: score >= 80 ? "#4caf50" : score >= 50 ? "#ff9800" : "#f44336",
                }}
              ></div>
            </div>

            <p className="score-feedback">
              {score >= 80
                ? "🌟 Excellent performance! Keep it up 👏"
                : score >= 50
                ? "📘 Good effort! Review your missed questions."
                : "💪 Needs improvement — keep practicing!"}
            </p>
          </div>

          {/* 🧩 Feedback Section */}
          {Array.isArray(feedback) && feedback.length > 0 && (
            <div className="feedback-section">
              <h3>Detailed Feedback</h3>
              {feedback.map((f, i) => (
                <div
                  key={i}
                  className={`feedback-item ${f.correct ? "correct" : "incorrect"}`}
                >
                  <div className="feedback-header">
                    <h4>Question {i + 1}</h4>
                    <span className={`status-tag ${f.correct ? "correct" : "incorrect"}`}>
                      {f.correct ? "✅ Correct" : "❌ Incorrect"}
                    </span>
                  </div>

                  <p><b>Question:</b> {f.question}</p>
                  <p><b>Your Answer:</b> {f.userAnswer || "—"}</p>
                  <p><b>Correct Answer:</b> {f.correct_answer || "—"}</p>
                  <p
  className="feedback-text"
  dangerouslySetInnerHTML={{
    __html: (f.feedback || "")
      // Convert **bold** → <strong>bold</strong>
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Convert line breaks → <br/>
      .replace(/\n/g, "<br/>"),
  }}
/>
                </div>
              ))}
            </div>
          )}

          <button className="secondary-button" onClick={() => navigate("/quiz")}>
            Back to Quizzes
          </button>
        </div>
      </main>
    </div>
  );
}
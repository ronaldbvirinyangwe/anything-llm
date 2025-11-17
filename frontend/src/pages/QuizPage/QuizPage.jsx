import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./quiz.css";

export default function QuizPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [numQuestions, setNumQuestions] = useState(5);
  const [error, setError] = useState(null);
  const [quiz, setQuiz] = useState(null);

  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [difficultyLevel, setDifficultyLevel] = useState("medium");

  const [authToken, setAuthToken] = useState(localStorage.getItem("chikoroai_authToken"));
  const navigate = useNavigate();

  // 🧠 Load subject from localStorage (as in ChatContainer)
  useEffect(() => {
    const storedSubject = localStorage.getItem("selected_subject");
    if (storedSubject) {
      setSelectedSubject(storedSubject);
    }
  }, []);

  // 🧠 Fetch grade and curriculum from profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const storedUser = JSON.parse(localStorage.getItem("chikoroai_user") || "{}");
        const userId = storedUser?.id;
        if (!userId || !token) return;

        const res = await fetch(`http://localhost:3001/api/system/profile/${userId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (data.success && data.profile) {
          setSelectedGrade(data.profile.grade || "");
          setCurriculum(data.profile.curriculum || "");
        }
      } catch (err) {
        console.error("Failed to fetch user profile:", err);
      }
    }

    fetchProfile();
  }, []);

  // 🧠 Fetch past results
  useEffect(() => {
    const token = localStorage.getItem("chikoroai_authToken");

    async function fetchResults() {
      try {
        const res = await fetch(
          import.meta.env.MODE === "development"
            ? "http://localhost:3001/api/quiz/results"
            : "https://chikoro-ai.com/quiz/results",
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.success) setResults(data.results);
      } catch (err) {
        console.error("Failed to fetch quiz results:", err);
      }
    }

    fetchResults();
  }, []);

  // 🧠 Generate AI quiz
  const generateAIQuiz = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        subject: selectedSubject,
        grade: selectedGrade,
        numQuestions: parseInt(numQuestions) || 10,
        difficulty: difficultyLevel,
      };

      if (!payload.subject || !payload.grade) {
        setError("Missing subject or grade. Please ensure your profile is set correctly.");
        setLoading(false);
        return;
      }

      const res = await fetch("http://localhost:3001/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz.");

      console.log("✅ Generated AI quiz:", data.quiz);
      navigate("/test", { state: { externalTest: data.quiz } });
    } catch (err) {
      console.error("Backend error:", err);
      setError(err.message || "Server error while generating quiz.");
    } finally {
      setLoading(false);
    }
  };

return (
  <div className="quiz-page">
    <h1>Quizzes</h1>

    <div className="quiz-layout">
      {/* 🧠 Left Column: AI Test Setup */}
      <section className="ai-quiz-setup">
        <h2>AI Generated Test</h2>
        <p>
          <b>Subject:</b> {selectedSubject || "—"} <br />
          <b>Grade:</b> {selectedGrade || "—"} <br />
          <b>Curriculum:</b> {curriculum || "—"}
        </p>

        <input
          type="number"
          placeholder="Number of Questions"
          value={numQuestions}
          onChange={(e) => setNumQuestions(e.target.value)}
        />

        <button
          className="primary-button"
          onClick={generateAIQuiz}
          disabled={loading || !selectedSubject || !selectedGrade}
        >
          {loading ? "Generating..." : "Generate AI Test"}
        </button>

        {error && <p className="error">{error}</p>}
      </section>

      {/* 📊 Right Column: Past Results Table */}
      <section className="past-results">
        <h2>Past Results</h2>
        {results.length === 0 ? (
          <p className="no-results">No past attempts yet.</p>
        ) : (
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Correct / Total</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id}>
                    <td>{r.subject}</td>
                    <td>
                      <span
                        className={`score-tag ${
                          r.score >= 80
                            ? "excellent"
                            : r.score >= 50
                            ? "average"
                            : "poor"
                        }`}
                      >
                        {r.score}%
                      </span>
                    </td>
                    <td>
                      {r.correct_answers}/{r.total_questions}
                    </td>
                    <td>{new Date(r.submitted_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="view-btn"
                        onClick={() => navigate(`/test/result/${r.id}`)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  </div>
);
}
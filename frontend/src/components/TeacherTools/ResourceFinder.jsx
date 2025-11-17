import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { create } from "zustand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./lessonplanner.css"; // Reuse your elegant theme
import { useTheme } from "@/hooks/useTheme";

const cleanMarkdown = (text) => {
  if (!text) return "";
  return text
    .replace(/```markdown\s*([\s\S]*?)```/, "$1")
    .replace(/^(Okay,?|Sure,?|Alright,?|Here('s| is)|Here you go)[^.!?\n]*[.!?]\s*/i, "")
    .trim();
};

// Zustand store for AI Resource Finder
const useResourceFinderStore = create((set, get) => ({
  formData: {
    subject: "",
    topic: "",
    grade: "",
    curriculum: "ZIMSEC",
    notes: "",
  },
  resources: "",
  isLoading: false,
  error: "",
  setFormField: (field, value) =>
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    })),
  generateResources: async () => {
    const { formData } = get();
    if (!formData.subject || !formData.topic) {
      set({ error: "Please enter both subject and topic." });
      return;
    }

    set({ isLoading: true, error: "", resources: "" });
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}`,
      };
      const response = await axios.post(
        "http://localhost:3001/api/system/teacher-tools/resource-finder",
        formData,
        { headers }
      );

      if (response.data?.resources) {
        const cleaned = cleanMarkdown(response.data.resources);
        set({ resources: cleaned, isLoading: false });
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err) {
      console.error("Error fetching resources:", err);
      const errorMessage =
        err.response?.data?.error || "An error occurred while fetching resources.";
      set({ error: errorMessage, isLoading: false });
    }
  },
  reset: () =>
    set({
      formData: {
        subject: "",
        topic: "",
        grade: "",
        curriculum: "ZIMSEC",
        notes: "",
      },
      resources: "",
      isLoading: false,
      error: "",
    }),
}));

export default function ResourceFinder() {
  const { theme } = useTheme();
  const {
    formData,
    resources,
    isLoading,
    error,
    setFormField,
    generateResources,
    reset,
  } = useResourceFinderStore();

  const resourceRef = useRef(null);

  useEffect(() => reset, [reset]);

  const handleSubmit = (e) => {
    e.preventDefault();
    generateResources();
  };

  const saveAsPdf = async () => {
    if (!resourceRef.current) return;
    const element = resourceRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(
      `${formData.subject}_${formData.topic}_resources_${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`
    );
  };

  return (
    <div className={`tool-container ${theme}`}>
      <nav className="tool-nav">
        <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
      </nav>

      <header className="tool-header">
        <h1>📚 AI Resource Finder</h1>
        <p>
          Enter your subject and topic, and let Chikoro AI find the most relevant
          learning materials for your class.
        </p>
      </header>

      <div className="lesson-planner-content">
        {/* 🧾 Form Section */}
        <div className="planner-form-section">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormField("subject", e.target.value)}
                  placeholder="e.g. Geography"
                  required
                />
              </div>

              <div className="form-group">
                <label>Grade / Level</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormField("grade", e.target.value)}
                  placeholder="e.g. Form 3"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Topic / Keyword</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormField("topic", e.target.value)}
                placeholder="e.g. Rivers of Africa"
                required
              />
            </div>

            <div className="form-group">
              <label>Curriculum</label>
              <select
                value={formData.curriculum}
                onChange={(e) => setFormField("curriculum", e.target.value)}
              >
                <option value="ZIMSEC">ZIMSEC</option>
                <option value="Cambridge">Cambridge</option>
                <option value="General">General</option>
              </select>
            </div>

            <div className="form-group">
              <label>Notes (Optional)</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormField("notes", e.target.value)}
                rows="3"
                placeholder="e.g. Focus on local Zimbabwean context, include YouTube videos"
              ></textarea>
            </div>

            <div className="button-group">
              <button
                type="submit"
                disabled={isLoading}
                className="generate-btn"
              >
                {isLoading ? "Searching..." : "Find Resources"}
              </button>

              {resources && !isLoading && (
                <button
                  type="button"
                  onClick={saveAsPdf}
                  className="generate-btn secondary"
                >
                  Save as PDF
                </button>
              )}
            </div>
          </form>
        </div>

        {/* 🧩 Results Section */}
        <div className="planner-output-section">
          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Finding educational resources...</p>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          {resources && !isLoading ? (
            <div className="generated-plan markdown-body" ref={resourceRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {resources}
              </ReactMarkdown>
            </div>
          ) : (
            !isLoading && (
              <div className="placeholder-text">
                Your AI-curated teaching resources will appear here.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
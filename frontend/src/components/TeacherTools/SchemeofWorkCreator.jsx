import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { create } from "zustand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./lessonplanner.css"; // Reuse same styles
import { useTheme } from "@/hooks/useTheme";

const cleanMarkdown = (text) => {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(
    /^(Okay,?|Sure,?|Alright,?|Here('s| is)|Here you go|Let me create)[^.!?\n]*[.!?]\s*/i,
    ""
  );
  const codeBlockMatch = cleaned.match(/```markdown\s*([\s\S]*?)```/);
  if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();
  cleaned = cleaned.replace(/```markdown|```/g, "").trim();
  return cleaned;
};

// Zustand store for managing state
const useSchemeStore = create((set, get) => ({
  formData: {
    subject: "",
    grade: "",
    term: "",
    weeks: 8,
    curriculum: "",
    notes: "",
  },
  scheme: "",
  isLoading: false,
  error: "",
  setFormField: (field, value) =>
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    })),
  generateScheme: async () => {
    const { formData } = get();
    if (!formData.subject || !formData.grade || !formData.term) {
      set({ error: "Subject, Grade, and Term are required fields." });
      return;
    }

    set({ isLoading: true, error: "", scheme: "" });
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}`,
      };
      const response = await axios.post(
        "http://localhost:3001/api/system/teacher-tools/generate-scheme-of-work",
        formData,
        { headers }
      );

      if (response.data?.scheme) {
        const cleanedScheme = cleanMarkdown(response.data.scheme);
        set({ scheme: cleanedScheme, isLoading: false });
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err) {
      console.error("Error generating scheme of work:", err);
      const message =
        err.response?.data?.error ||
        "An error occurred while generating the scheme of work.";
      set({ error: message, isLoading: false });
    }
  },
  reset: () =>
    set({
      formData: {
        subject: "",
        grade: "",
        term: "",
        weeks: 8,
        curriculum: "",
        notes: "",
      },
      scheme: "",
      isLoading: false,
      error: "",
    }),
}));

export default function SchemeOfWorkCreator() {
  const { theme } = useTheme();
  const {
    formData,
    scheme,
    isLoading,
    error,
    setFormField,
    generateScheme,
    reset,
  } = useSchemeStore();

  const planRef = useRef(null);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const handleSubmit = (e) => {
    e.preventDefault();
    generateScheme();
  };

  const saveAsPdf = async () => {
    if (!planRef.current) return;
    const canvas = await html2canvas(planRef.current, { scale: 2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = (canvas.height * width) / canvas.width;
    pdf.addImage(img, "PNG", 0, 0, width, height);
    pdf.save(
      `${formData.subject}_SchemeOfWork_${new Date()
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
        <h1>📚 AI Scheme of Work Creator</h1>
        <p>
          Automatically generate a detailed scheme of work for your subject and term using Chikoro AI.
        </p>
      </header>

      <div className="lesson-planner-content">
        <div className="planner-form-section">
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormField("subject", e.target.value)}
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>

              <div className="form-group">
                <label>Grade / Form</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormField("grade", e.target.value)}
                  placeholder="e.g. Form 3"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Term</label>
              <select
                value={formData.term}
                onChange={(e) => setFormField("term", e.target.value)}
                required
              >
                <option value="">Select Term</option>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>

            <div className="form-group">
              <label>Number of Weeks</label>
              <input
                type="number"
                min="1"
                max="15"
                value={formData.weeks}
                onChange={(e) => setFormField("weeks", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Curriculum (Optional)</label>
              <input
                type="text"
                placeholder="e.g. ZIMSEC, Cambridge"
                value={formData.curriculum}
                onChange={(e) => setFormField("curriculum", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Additional Notes (Optional)</label>
              <textarea
                rows="3"
                placeholder="e.g. Focus on practical topics this term"
                value={formData.notes}
                onChange={(e) => setFormField("notes", e.target.value)}
              ></textarea>
            </div>

            <div className="button-group">
              <button
                type="submit"
                className="generate-btn"
                disabled={isLoading}
              >
                {isLoading ? "Generating..." : "Generate Scheme of Work"}
              </button>

              {scheme && !isLoading && (
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

        <div className="planner-output-section">
          {isLoading && (
            <div className="loading-overlay">
              <div className="spinner"></div>
              <p>Generating your scheme of work...</p>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}
          {scheme && !isLoading ? (
            <div className="generated-plan markdown-body" ref={planRef}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {scheme}
              </ReactMarkdown>
            </div>
          ) : (
            !isLoading && (
              <div className="placeholder-text">
                Your generated scheme of work will appear here.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
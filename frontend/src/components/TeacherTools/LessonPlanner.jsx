import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { create } from "zustand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./lessonplanner.css";
import { useTheme } from "@/hooks/useTheme";

const cleanMarkdown = (text) => {
  if (!text) return "";
  
  let cleaned = text;
  
  // Remove conversational introductions
  cleaned = cleaned.replace(
    /^(Okay,?|Sure,?|Alright,?|Here('s| is)|Here you go|Let me create)[^.!?\n]*[.!?]\s*/i, 
    ""
  );
  
  // Extract from markdown code blocks
  const codeBlockMatch = cleaned.match(/```markdown\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    const firstHeadingIndex = cleaned.search(/^#\s/m);
    if (firstHeadingIndex > 50) {
      cleaned = cleaned.substring(firstHeadingIndex);
    }
  }
  
  // Remove remaining code block markers
  cleaned = cleaned.replace(/```markdown\s*/g, "");
  cleaned = cleaned.replace(/```\s*$/g, "");
  
  // Remove extra phrases
  cleaned = cleaned.replace(/It's structured in Markdown format for readability\.\s*/gi, "");
  
  return cleaned.trim();
};

// Zustand store for state management
const useLessonPlannerStore = create((set, get) => ({
  formData: {
    subject: "",
    topic: "",
    grade: "",
    duration: "40 minutes",
    objectives: "",
  },
  lessonPlan: "",
  isLoading: false,
  error: "",
  setFormField: (field, value) =>
    set((state) => ({
      formData: { ...state.formData, [field]: value },
    })),
  generatePlan: async () => {
    const { formData } = get();
    if (!formData.subject || !formData.topic || !formData.grade) {
      set({ error: "Subject, Topic, and Grade are required fields." });
      return;
    }

    set({ isLoading: true, error: "", lessonPlan: "" });
    try {
      const headers = {
        Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}`,
      };
      const response = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher-tools/generate-lesson-plan",
        formData,
        { headers }
      );

    if (response.data?.lessonPlan) {
  const cleanedPlan = cleanMarkdown(response.data.lessonPlan);  // ✨ Add this line
  set({ lessonPlan: cleanedPlan, isLoading: false });
} else {
  throw new Error("Invalid response format from server.");
}
    } catch (err) {
      console.error("Error generating lesson plan:", err);
      const errorMessage =
        err.response?.data?.error || "An error occurred while generating.";
      set({ error: errorMessage, isLoading: false });
    }
  },
  reset: () =>
    set({
      formData: {
        subject: "",
        topic: "",
        grade: "",
        duration: "40 minutes",
        objectives: "",
      },
      lessonPlan: "",
      isLoading: false,
      error: "",
    }),
}));

export default function LessonPlanner() {
     const { theme } = useTheme(); 
  const {
    formData,
    lessonPlan,
    isLoading,
    error,
    setFormField,
    generatePlan,
    reset,
  } = useLessonPlannerStore();

  const planRef = useRef(null);

  useEffect(() => {
    return () => reset();
  }, [reset]);

  const handleSubmit = (e) => {
    e.preventDefault();
    generatePlan();
  };

  // 🧾 Save as PDF
  const saveAsPdf = async () => {
    if (!planRef.current) return;
    const element = planRef.current;
    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(
      `${formData.subject}_${formData.topic}_${new Date()
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
        <h1>🧠 AI Lesson Planner</h1>
        <p>
          Fill in the details below and let Chikoro AI create a structured
          lesson plan for you.
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
                  placeholder="e.g. English"
                  required
                />
              </div>

              <div className="form-group">
                <label>Grade / Form</label>
                <input
                  type="text"
                  value={formData.grade}
                  onChange={(e) => setFormField("grade", e.target.value)}
                  placeholder="e.g. Grade 7"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Topic</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormField("topic", e.target.value)}
                placeholder="e.g. Verbs"
                required
              />
            </div>
<div className="form-group">
  <label>Duration</label>
  <select
    value={
      ["30 minutes", "40 minutes", "60 minutes", "80 minutes (Double Period)"].includes(
        formData.duration
      )
        ? formData.duration
        : "custom"
    }
    onChange={(e) => {
      const value = e.target.value;
      if (value !== "custom") {
        setFormField("duration", value);
      } else {
        // keep current custom input until typed
        setFormField("duration", "");
      }
    }}
  >
    <option value="30 minutes">30 minutes</option>
    <option value="40 minutes">40 minutes</option>
    <option value="60 minutes">60 minutes</option>
    <option value="80 minutes (Double Period)">80 minutes (Double Period)</option>
    <option value="custom">Custom...</option>
  </select>

  {(!["30 minutes", "40 minutes", "60 minutes", "80 minutes (Double Period)"].includes(
    formData.duration
  ) || formData.duration === "") && (
    <input
      type="text"
      placeholder="Enter custom duration (e.g. 75 minutes or 1h 30min)"
      value={formData.duration}
      onChange={(e) => setFormField("duration", e.target.value)}
      className="custom-duration-input"
    />
  )}
</div>

            <div className="form-group">
              <label>Objectives (Optional)</label>
              <textarea
                value={formData.objectives}
                onChange={(e) => setFormField("objectives", e.target.value)}
                rows="3"
                placeholder="e.g. Students should be able to explain..."
              ></textarea>
            </div>

            <div className="button-group">
              <button type="submit" disabled={isLoading} className="generate-btn">
                {isLoading ? "Generating..." : "Generate Lesson Plan"}
              </button>

              {lessonPlan && !isLoading && (
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
              <p>Creating your lesson plan...</p>
            </div>
          )}
          {error && <div className="error-message">{error}</div>}

          {lessonPlan && !isLoading ? (
            <div className="generated-plan markdown-body" ref={planRef}>
  <ReactMarkdown remarkPlugins={[remarkGfm]}>
    {lessonPlan}
  </ReactMarkdown>
</div>
          ) : (
            !isLoading && (
              <div className="placeholder-text">
                Your generated lesson plan will appear here.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { create } from "zustand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  FiArrowLeft, FiFileText, FiDownload, FiBook, FiCalendar, FiClock, FiLayers 
} from "react-icons/fi";
import "./lessonplanner.css"; // Uses the newly modernized CSS!
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
        "https://api.chikoro-ai.com/api/system/teacher-tools/generate-scheme-of-work",
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
    const element = planRef.current;
    
    // Add class for clean PDF rendering
    element.classList.add('pdf-export-mode');
    
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(
      `${formData.subject}_SchemeOfWork_${new Date().toISOString().slice(0, 10)}.pdf`
    );
    
    element.classList.remove('pdf-export-mode');
  };

  return (
    <div className={`lesson-planner-container ${theme}`}>
      <nav className="tool-nav">
        <Link to="/teacher-dashboard" className="back-btn">
          <FiArrowLeft /> Back to Dashboard
        </Link>
      </nav>

      <header className="tool-header modern-header">
        <h1>📚 AI Scheme of Work Creator</h1>
        <p>
          Automatically generate a detailed, week-by-week scheme of work for your subject and term in seconds.
        </p>
      </header>

      <div className="planner-layout">
        {/* --- Sidebar Form --- */}
        <div className="planner-sidebar">
          <form className="modern-form" onSubmit={handleSubmit}>
            <h2 className="form-title">Scheme Details</h2>
            
            <div className="form-group">
              <label><FiBook /> Subject</label>
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

            <div className="form-group">
              <label><FiCalendar /> Term</label>
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
              <label><FiClock /> Number of Weeks</label>
              <input
                type="number"
                min="1"
                max="15"
                value={formData.weeks}
                onChange={(e) => setFormField("weeks", parseInt(e.target.value) || "")}
              />
            </div>

            <div className="form-group">
              <label><FiLayers /> Curriculum (Optional)</label>
              <input
                type="text"
                placeholder="e.g. ZIMSEC, Cambridge"
                value={formData.curriculum}
                onChange={(e) => setFormField("curriculum", e.target.value)}
              />
            </div>

            <div className="form-group">
              <label><FiFileText /> Additional Notes (Optional)</label>
              <textarea
                rows="3"
                placeholder="e.g. Focus on practical experiments this term"
                value={formData.notes}
                onChange={(e) => setFormField("notes", e.target.value)}
              ></textarea>
            </div>

            <button type="submit" disabled={isLoading} className="action-btn primary full-width">
              {isLoading ? (
                <><span className="spinner-small"></span> Generating...</>
              ) : (
                <><FiFileText /> Generate Scheme</>
              )}
            </button>
          </form>
        </div>

        {/* --- Output Area --- */}
        <div className="planner-main">
          {isLoading && (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Mapping out your term schedule...</p>
            </div>
          )}
          
          {error && <div className="error-alert">⚠️ {error}</div>}

          {scheme && !isLoading && (
            <div className="output-card fade-in">
              <div className="output-actions">
                <button type="button" onClick={saveAsPdf} className="export-btn pdf">
                  <FiDownload /> Save as PDF
                </button>
              </div>

              <div className="generated-plan markdown-body" ref={planRef}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {scheme}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {!scheme && !isLoading && !error && (
            <div className="empty-state-card">
              <div className="empty-icon">📅</div>
              <h3>Plan Your Term</h3>
              <p>Fill out the details on the left and hit generate to create a comprehensive scheme of work.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
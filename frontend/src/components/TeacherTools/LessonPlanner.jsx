import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { create } from "zustand";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import pptxgen from "pptxgenjs";
import {
  FiArrowLeft, FiFileText, FiDownload, FiMonitor, FiClock, FiBook, FiTarget, FiEdit2, FiEye
} from "react-icons/fi";
import { useTheme } from "@/hooks/useTheme";
import "./lessonplanner.css";

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
        const cleanedPlan = cleanMarkdown(response.data.lessonPlan);
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
  setLessonPlan: (value) => set({ lessonPlan: value }),
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
    setLessonPlan,
    generatePlan,
    reset,
  } = useLessonPlannerStore();

  const [isEditing, setIsEditing] = useState(false);
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
    
    // Temporarily add a class to adjust styling for PDF rendering if needed
    element.classList.add('pdf-export-mode');
    
    const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(
      `${formData.subject}_${formData.topic}_${new Date().toISOString().slice(0, 10)}.pdf`
    );
    
    element.classList.remove('pdf-export-mode');
  };

  // 📊 Save as PowerPoint
const saveAsPowerPoint = () => {
    const pptx = new pptxgen();
    
    // --- CONFIGURATION ---
    const LOGO_URL = "/images/logo.jpg"; // ✅ Ensure this matches your logo path
    const ACCENT_COLOR = "4F46E5"; // Indigo
    const TEXT_MAIN = "1E293B";    // Slate 800
    const TEXT_MUTED = "64748B";   // Slate 500

    pptx.layout = "LAYOUT_16x9";

    // 1. Define the Master Slide
    pptx.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: "F8FAFC" },
      objects: [
        { rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: ACCENT_COLOR } } },
        { image: { x: "90%", y: "3%", w: 1, h: 0.5, path: LOGO_URL } }, 
        { 
          text: { 
            text: "Generated by Chikoro AI", 
            options: { x: 0.5, y: "94%", w: "50%", fontSize: 9, color: "94A3B8" } 
          } 
        },
        { 
          placeholder: {
            options: { name: "slide", type: "slideNumber", x: "90%", y: "94%", fontSize: 9, color: "94A3B8" }
          }
        }
      ]
    });

    // 2. Create Title Slide
    let slide1 = pptx.addSlide();
    slide1.background = { color: "1E1B4B" }; 
    
    slide1.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: "100%", fill: { color: "1E1B4B" } });
    slide1.addImage({ path: LOGO_URL, x: "42%", y: "10%", w: 1.5, h: 0.75 });

    slide1.addText(`${formData.subject}\n${formData.topic}`, {
      x: 1, y: "35%", w: "80%", h: 2,
      fontSize: 44, bold: true, color: "FFFFFF", align: "center"
    });

    slide1.addText(`Grade: ${formData.grade}   |   Duration: ${formData.duration}`, {
      x: 1, y: "60%", w: "80%", h: 0.5,
      fontSize: 18, color: "A5B4FC", align: "center"
    });

    // 3. Helper: Parse Markdown Text (Bold handling)
    const parseLine = (text) => {
      const parts = text.split(/(\*\*.*?\*\*)/g); 
      return parts.map(part => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return { text: part.replace(/\*\*/g, ""), options: { bold: true, color: "000000" } };
        }
        return { text: part }; 
      });
    };

    // 4. Parse Content & Generate Slides
    const sections = lessonPlan.split(/^##\s/m).filter(Boolean);

    sections.forEach((section) => {
      let slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
      
      const lines = section.trim().split("\n");
      const title = lines[0].replace(/^#+\s/, "").trim(); 
      const contentLines = lines.slice(1);

      // Add Slide Title
      slide.addText(title, {
        x: 0.5, y: 0.4, w: "85%", h: 0.8,
        fontSize: 28, bold: true, color: ACCENT_COLOR, fontFace: "Arial"
      });

      // --- NEW: Group Content into Text vs Tables ---
      const blocks = [];
      let currentText = [];
      let currentTable = [];

      contentLines.forEach((line) => {
        const trimmed = line.trim();
        // Detect a table row (contains pipes)
        if (trimmed.includes("|") && trimmed.length > 2) {
          if (currentText.length > 0) {
            blocks.push({ type: "text", lines: currentText });
            currentText = [];
          }
          // Skip the structural markdown row (e.g. |---|---|)
         if (!trimmed.match(/^[\s|:-]+$/)) {
             const cells = trimmed.split("|").map(c => c.trim()).filter((c, i, arr) => !(c === "" && (i === 0 || i === arr.length - 1)));
             currentTable.push(cells);
          }
        } else {
          if (currentTable.length > 0) {
            blocks.push({ type: "table", rows: currentTable });
            currentTable = [];
          }
          currentText.push(trimmed);
        }
      });
      if (currentText.length > 0) blocks.push({ type: "text", lines: currentText });
      if (currentTable.length > 0) blocks.push({ type: "table", rows: currentTable });

      // --- Render the Blocks dynamically down the slide ---
      let currentY = 1.3;

      blocks.forEach(block => {
        if (block.type === "text") {
          const textItems = [];
          
          block.lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;

            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
              const parsedChunks = parseLine(trimmed.substring(2));
              parsedChunks[0].options = { ...parsedChunks[0].options, bullet: true, fontSize: 16, color: TEXT_MAIN, paraSpaceBefore: 8, indentLevel: 0 };
              textItems.push(...parsedChunks, { text: "\n" });
            } 
            else if (trimmed.startsWith("###")) {
              const cleanText = trimmed.replace(/^###\s/, "");
              textItems.push({ text: cleanText + "\n", options: { fontSize: 20, bold: true, color: ACCENT_COLOR, paraSpaceBefore: 12 } });
            }
            else {
              const parsedChunks = parseLine(trimmed);
              parsedChunks[0].options = { ...parsedChunks[0].options, fontSize: 16, color: TEXT_MUTED, paraSpaceBefore: 10 };
              textItems.push(...parsedChunks, { text: "\n" });
            }
          });

          // Estimate text block height so tables render below it properly
          let textHeight = block.lines.length * 0.35; 
          if (textHeight < 0.5) textHeight = 0.5;

          slide.addText(textItems, { x: 0.5, y: currentY, w: "90%", h: textHeight, valign: "top", align: "left" });
          currentY += textHeight;

        } else if (block.type === "table") {
          // Format table for PptxGenJS
          const tableData = block.rows.map((row, rIdx) => {
            return row.map(cellText => {
              // Strip bolding asterisks to keep table cells clean
              const cleanCell = cellText.replace(/\*\*/g, ""); 
              return {
                text: cleanCell,
                options: {
                  fill: rIdx === 0 ? ACCENT_COLOR : (rIdx % 2 === 0 ? "F8FAFC" : "FFFFFF"),
                  color: rIdx === 0 ? "FFFFFF" : TEXT_MAIN,
                  bold: rIdx === 0,
                  fontSize: 12,
                  valign: "middle",
                  align: "left",
                  margin: 0.1
                }
              };
            });
          });

          const columnCount = tableData[0].length;
          const colWidths = Array(columnCount).fill(9 / columnCount); // Distribute 9 inches evenly

          slide.addTable(tableData, {
            x: 0.5, y: currentY, w: 9, 
            colW: colWidths,
            border: { pt: 1, color: "E2E8F0" },
            autoPage: true // Magically handles tables that overflow the slide!
          });

          currentY += (block.rows.length * 0.4) + 0.3; // Advance Y position for anything after the table
        }
      });
    });

    // 5. Save
    pptx.writeFile({
      fileName: `${formData.subject}_${formData.topic}_LessonPlan.pptx`,
    });
  };

  return (
    <div className={`lesson-planner-container ${theme}`}>
      <nav className="tool-nav">
        <Link to="/teacher-dashboard" className="back-btn">
          <FiArrowLeft /> Back to Dashboard
        </Link>
      </nav>

      <header className="tool-header modern-header">
        <h1>🧠 AI Lesson Planner</h1>
        <p>
          Fill in the details below and let Chikoro AI create a structured, engaging
          lesson plan for you in seconds.
        </p>
      </header>

      <div className="planner-layout">
        {/* --- Sidebar Form --- */}
        <div className="planner-sidebar">
          <form className="modern-form" onSubmit={handleSubmit}>
            <h2 className="form-title">Lesson Details</h2>
            
            <div className="form-group">
              <label><FiBook /> Subject</label>
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

            <div className="form-group">
              <label>Topic</label>
              <input
                type="text"
                value={formData.topic}
                onChange={(e) => setFormField("topic", e.target.value)}
                placeholder="e.g. Verbs and Adverbs"
                required
              />
            </div>

            <div className="form-group">
              <label><FiClock /> Duration</label>
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
                  placeholder="e.g. 75 minutes"
                  value={formData.duration}
                  onChange={(e) => setFormField("duration", e.target.value)}
                  className="custom-duration-input fade-in"
                />
              )}
            </div>

            <div className="form-group">
              <label><FiTarget /> Objectives (Optional)</label>
              <textarea
                value={formData.objectives}
                onChange={(e) => setFormField("objectives", e.target.value)}
                rows="4"
                placeholder="e.g. Students should be able to identify and use active verbs..."
              ></textarea>
            </div>

            <button type="submit" disabled={isLoading} className="action-btn primary full-width">
              {isLoading ? (
                <><span className="spinner-small"></span> Generating...</>
              ) : (
                <><FiFileText /> Generate Lesson Plan</>
              )}
            </button>
          </form>
        </div>

        {/* --- Output Area --- */}
        <div className="planner-main">
          {isLoading && (
            <div className="loading-state">
              <div className="spinner-large"></div>
              <p>Crafting your perfect lesson plan...</p>
            </div>
          )}
          
          {error && <div className="error-alert">⚠️ {error}</div>}

          {lessonPlan && !isLoading && (
            <div className="output-card fade-in">
              <div className="output-actions">
                <button type="button" onClick={saveAsPdf} className="export-btn pdf">
                  <FiDownload /> Save as PDF
                </button>
                <button type="button" onClick={saveAsPowerPoint} className="export-btn pptx">
                  <FiMonitor /> Save as PowerPoint
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing((prev) => !prev)}
                  className="export-btn edit"
                >
                  {isEditing ? <><FiEye /> Preview</> : <><FiEdit2 /> Edit</>}
                </button>
              </div>

              {isEditing ? (
                <textarea
                  className="lesson-plan-editor"
                  value={lessonPlan}
                  onChange={(e) => setLessonPlan(e.target.value)}
                />
              ) : (
                <div className="generated-plan markdown-body" ref={planRef}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {lessonPlan}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}
          
          {!lessonPlan && !isLoading && !error && (
            <div className="empty-state-card">
              <div className="empty-icon">📝</div>
              <h3>Ready to Plan</h3>
              <p>Fill out the details on the left and hit generate to create a comprehensive lesson plan.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
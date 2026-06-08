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
  FiArrowLeft, FiFileText, FiDownload, FiMonitor,
  FiClock, FiBook, FiTarget, FiEdit2, FiEye,
} from "react-icons/fi";
import { persist } from "zustand/middleware";

// ── Grade options ─────────────────────────────────────────────────────────────
const GRADE_OPTIONS = {
  primary:   ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7"],
  secondary: ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6"],
};

// ── Markdown cleaner ──────────────────────────────────────────────────────────
const cleanMarkdown = (text) => {
  if (!text) return "";
  let cleaned = text;
  cleaned = cleaned.replace(/^(Okay,?|Sure,?|Alright,?|Here('s| is)|Here you go|Let me create)[^.!?\n]*[.!?]\s*/i, "");
  const codeBlockMatch = cleaned.match(/```markdown\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    const firstHeadingIndex = cleaned.search(/^#\s/m);
    if (firstHeadingIndex > 50) cleaned = cleaned.substring(firstHeadingIndex);
  }
  cleaned = cleaned.replace(/```markdown\s*/g, "").replace(/```\s*$/g, "");
  cleaned = cleaned.replace(/It's structured in Markdown format for readability\.\s*/gi, "");
  return cleaned.trim();
};

// ── Zustand store ─────────────────────────────────────────────────────────────
const useLessonPlannerStore = create(
  persist(
    (set, get) => ({
      formData: { subject: "", topic: "", grade: "", duration: "40 minutes", objectives: "" },
      lessonPlan: "", isLoading: false, error: "", history: [],

      setFormField: (field, value) =>
        set((state) => ({ formData: { ...state.formData, [field]: value } })),

      generatePlan: async () => {
        const { formData } = get();
        if (!formData.subject || !formData.topic || !formData.grade) {
          set({ error: "Subject, Topic, and Grade are required fields." });
          return;
        }
        set({ isLoading: true, error: "", lessonPlan: "" });
        try {
          const headers = { Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}` };
          const response = await axios.post(
            "https://api.chikoro-ai.com/api/system/teacher-tools/generate-lesson-plan",
            formData, { headers }
          );
          if (response.data?.lessonPlan) {
            const cleanedPlan = cleanMarkdown(response.data.lessonPlan);
            set({ lessonPlan: cleanedPlan, isLoading: false });
            get().saveToHistory(cleanedPlan, formData);
          } else throw new Error("Invalid response format from server.");
        } catch (err) {
          set({ error: err.response?.data?.error || "An error occurred.", isLoading: false });
        }
      },

      saveToHistory: (plan, formData) => {
        const entry = { id: Date.now(), subject: formData.subject, topic: formData.topic, grade: formData.grade, duration: formData.duration, lessonPlan: plan, createdAt: new Date().toISOString() };
        set((state) => ({ history: [entry, ...state.history].slice(0, 10) }));
      },

      loadFromHistory: (entry) =>
        set({ formData: { subject: entry.subject, topic: entry.topic, grade: entry.grade, duration: entry.duration, objectives: "" }, lessonPlan: entry.lessonPlan, error: "" }),

      deleteFromHistory: (id) =>
        set((state) => ({ history: state.history.filter((h) => h.id !== id) })),

      setLessonPlan: (value) => set({ lessonPlan: value }),

      reset: () =>
        set({ formData: { subject: "", topic: "", grade: "", duration: "40 minutes", objectives: "" }, lessonPlan: "", isLoading: false, error: "" }),
    }),
    { name: "chikoro-lesson-history", partialize: (state) => ({ history: state.history }) }
  )
);

// ── GradeSelector ─────────────────────────────────────────────────────────────
function GradeSelector({ value, onChange }) {
  const detectLevel = (g) => {
    if (GRADE_OPTIONS.primary.includes(g))   return "primary";
    if (GRADE_OPTIONS.secondary.includes(g)) return "secondary";
    return null;
  };
  const [level, setLevel] = useState(() => detectLevel(value));
  useEffect(() => { setLevel(detectLevel(value)); }, [value]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Level toggle */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {["primary", "secondary"].map((l) => (
          <button key={l} type="button" onClick={() => { if (level !== l) { setLevel(l); onChange(""); } }}
            style={{
              padding: "8px 12px", borderRadius: 10, fontFamily: "inherit",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
              border: level === l ? "2px solid var(--theme-button-primary)" : "2px solid var(--theme-sidebar-border)",
              background: level === l ? "var(--theme-button-primary)" : "var(--theme-bg-container)",
              color: level === l ? "#fff" : "var(--theme-text-secondary)",
              transition: "all .18s",
            }}>
            {l === "primary" ? "🏫 Primary" : "🎓 Secondary"}
          </button>
        ))}
      </div>

      {/* Grade chips */}
      {level && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {GRADE_OPTIONS[level].map((grade) => (
            <button key={grade} type="button" onClick={() => onChange(grade)}
              style={{
                padding: "4px 12px", borderRadius: 8, fontFamily: "inherit",
                fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                border: value === grade ? "2px solid var(--theme-button-primary)" : "1.5px solid var(--theme-sidebar-border)",
                background: value === grade ? "var(--theme-button-primary)" : "var(--theme-bg-container)",
                color: value === grade ? "#fff" : "var(--theme-text-secondary)",
                transition: "all .15s",
              }}>
              {grade}
            </button>
          ))}
        </div>
      )}

      {!level && (
        <p style={{ fontSize: 12, color: "var(--theme-text-secondary)", margin: 0, fontStyle: "italic" }}>
          Select Primary or Secondary first
        </p>
      )}
    </div>
  );
}

// ── Input / Textarea shared style ─────────────────────────────────────────────
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function LessonPlanner() {
  const {
    formData, lessonPlan, isLoading, error,
    setFormField, setLessonPlan, generatePlan, reset,
    history, loadFromHistory, deleteFromHistory,
  } = useLessonPlannerStore();

  const [isEditing, setIsEditing] = useState(false);
  const planRef = useRef(null);

  useEffect(() => { return () => reset(); }, [reset]);

  const handleSubmit = (e) => { e.preventDefault(); generatePlan(); };

  // Resolve CSS vars for PDF/PPTX (must use actual colors, not var() strings)
  const css = (prop, fallback) =>
    getComputedStyle(document.documentElement).getPropertyValue(prop).trim() || fallback;

  // 🧾 Save as PDF
  const saveAsPdf = async () => {
    if (!planRef.current) return;
    const el = planRef.current;
    el.dataset.pdfMode = "1";
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${formData.subject}_${formData.topic}_${new Date().toISOString().slice(0, 10)}.pdf`);
    delete el.dataset.pdfMode;
  };

  // 📊 Save as PowerPoint (logic unchanged, just moved here)
  const saveAsPowerPoint = () => {
    const pptx = new pptxgen();
    const LOGO_URL    = "/images/logo.jpg";
    const ACCENT      = "4F46E5";
    const TEXT_MAIN   = "1E293B";
    const TEXT_MUTED  = "64748B";
    pptx.layout = "LAYOUT_16x9";

    pptx.defineSlideMaster({
      title: "MASTER_SLIDE",
      background: { color: "F8FAFC" },
      objects: [
        { rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: ACCENT } } },
        { image: { x: "90%", y: "3%", w: 1, h: 0.5, path: LOGO_URL } },
        { text: { text: "Generated by Chikoro AI", options: { x: 0.5, y: "94%", w: "50%", fontSize: 9, color: "94A3B8" } } },
        { placeholder: { options: { name: "slide", type: "slideNumber", x: "90%", y: "94%", fontSize: 9, color: "94A3B8" } } },
      ],
    });

    const slide1 = pptx.addSlide();
    slide1.background = { color: "1E1B4B" };
    slide1.addImage({ path: LOGO_URL, x: "42%", y: "10%", w: 1.5, h: 0.75 });
    slide1.addText(`${formData.subject}\n${formData.topic}`, { x: 1, y: "35%", w: "80%", h: 2, fontSize: 44, bold: true, color: "FFFFFF", align: "center" });
    slide1.addText(`${formData.grade}   |   Duration: ${formData.duration}`, { x: 1, y: "60%", w: "80%", h: 0.5, fontSize: 18, color: "A5B4FC", align: "center" });

    const parseLine = (text) =>
      text.split(/(\*\*.*?\*\*)/g).map(part =>
        part.startsWith("**") && part.endsWith("**")
          ? { text: part.replace(/\*\*/g, ""), options: { bold: true, color: "000000" } }
          : { text: part }
      );

    lessonPlan.split(/^##\s/m).filter(Boolean).forEach((section) => {
      const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
      const lines = section.trim().split("\n");
      const title = lines[0].replace(/^#+\s/, "").trim();
      const contentLines = lines.slice(1);
      slide.addText(title, { x: 0.5, y: 0.4, w: "85%", h: 0.8, fontSize: 28, bold: true, color: ACCENT, fontFace: "Arial" });

      const blocks = [];
      let currentText = [], currentTable = [];
      contentLines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.includes("|") && trimmed.length > 2) {
          if (currentText.length) { blocks.push({ type: "text", lines: currentText }); currentText = []; }
          if (!trimmed.match(/^[\s|:-]+$/)) {
            const cells = trimmed.split("|").map(c => c.trim()).filter((c, i, arr) => !(c === "" && (i === 0 || i === arr.length - 1)));
            currentTable.push(cells);
          }
        } else {
          if (currentTable.length) { blocks.push({ type: "table", rows: currentTable }); currentTable = []; }
          currentText.push(trimmed);
        }
      });
      if (currentText.length) blocks.push({ type: "text", lines: currentText });
      if (currentTable.length) blocks.push({ type: "table", rows: currentTable });

      let currentY = 1.3;
      blocks.forEach(block => {
        if (block.type === "text") {
          const textItems = [];
          block.lines.forEach((line) => {
            const trimmed = line.trim();
            if (!trimmed) return;
            if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
              const chunks = parseLine(trimmed.substring(2));
              chunks[0].options = { ...chunks[0].options, bullet: true, fontSize: 16, color: TEXT_MAIN, paraSpaceBefore: 8, indentLevel: 0 };
              textItems.push(...chunks, { text: "\n" });
            } else if (trimmed.startsWith("###")) {
              textItems.push({ text: trimmed.replace(/^###\s/, "") + "\n", options: { fontSize: 20, bold: true, color: ACCENT, paraSpaceBefore: 12 } });
            } else {
              const chunks = parseLine(trimmed);
              chunks[0].options = { ...chunks[0].options, fontSize: 16, color: TEXT_MUTED, paraSpaceBefore: 10 };
              textItems.push(...chunks, { text: "\n" });
            }
          });
          const h = Math.max(block.lines.length * 0.35, 0.5);
          slide.addText(textItems, { x: 0.5, y: currentY, w: "90%", h, valign: "top", align: "left" });
          currentY += h;
        } else if (block.type === "table") {
          const tableData = block.rows.map((row, rIdx) =>
            row.map(cellText => ({
              text: cellText.replace(/\*\*/g, ""),
              options: {
                fill: rIdx === 0 ? ACCENT : (rIdx % 2 === 0 ? "F8FAFC" : "FFFFFF"),
                color: rIdx === 0 ? "FFFFFF" : TEXT_MAIN,
                bold: rIdx === 0, fontSize: 12, valign: "middle", align: "left", margin: 0.1,
              },
            }))
          );
          const colWidths = Array(tableData[0].length).fill(9 / tableData[0].length);
          slide.addTable(tableData, { x: 0.5, y: currentY, w: 9, colW: colWidths, border: { pt: 1, color: "E2E8F0" }, autoPage: true });
          currentY += block.rows.length * 0.4 + 0.3;
        }
      });
    });

    pptx.writeFile({ fileName: `${formData.subject}_${formData.topic}_LessonPlan.pptx` });
  };

  const STANDARD_DURATIONS = ["30 minutes", "40 minutes", "60 minutes", "80 minutes (Double Period)"];
  const isCustomDuration = !STANDARD_DURATIONS.includes(formData.duration) || formData.duration === "";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes lp-spin    { to { transform: rotate(360deg); } }
        @keyframes lp-fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .lp-fade { animation: lp-fadeUp .5s cubic-bezier(.4,0,.2,1) both; }

        /* Input focus ring using theme accent */
        .lp-input:focus { border-color: var(--theme-button-primary) !important; box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-button-primary) 15%, transparent) !important; }

        /* Markdown plan output */
        .lp-plan-body { padding: 2.5rem; font-size: 1rem; line-height: 1.75; color: var(--theme-text-primary); }
        .lp-plan-body h1 { font-size: 2rem; font-weight: 800; padding-bottom: 1rem; border-bottom: 2px solid var(--theme-sidebar-border); color: var(--theme-text-primary); margin-top: 0; }
        .lp-plan-body h2 { font-size: 1.4rem; font-weight: 700; color: var(--theme-button-primary); display: flex; align-items: center; gap: 8px; margin-top: 2em; }
        .lp-plan-body h2::before { content: ''; display: inline-block; width: 5px; height: 1.1em; background: var(--theme-button-primary); border-radius: 4px; flex-shrink: 0; }
        .lp-plan-body h3 { font-size: 1.15rem; font-weight: 600; color: var(--theme-text-primary); margin-top: 1.5em; }
        .lp-plan-body p { margin-bottom: 1rem; color: var(--theme-text-primary); }
        .lp-plan-body strong { font-weight: 700; color: var(--theme-text-primary); }
        .lp-plan-body ul, .lp-plan-body ol { margin-bottom: 1.2rem; padding-left: 1.4rem; }
        .lp-plan-body li { margin-bottom: 0.4rem; color: var(--theme-text-primary); }
        .lp-plan-body ul > li::marker { color: var(--theme-button-primary); }
        .lp-plan-body table { width: 100%; border-collapse: collapse; margin: 1.5rem 0; border-radius: 8px; overflow: hidden; }
        .lp-plan-body th, .lp-plan-body td { padding: 10px 14px; border: 1px solid var(--theme-sidebar-border); text-align: left; font-size: 13px; }
        .lp-plan-body th { background: var(--theme-bg-container); font-weight: 700; color: var(--theme-text-primary); }
        .lp-plan-body tr:nth-child(even) td { background: var(--theme-bg-container); }

        /* PDF export override — force white bg for readability */
        [data-pdf-mode] .lp-plan-body { background: #ffffff !important; color: #334155 !important; }
        [data-pdf-mode] .lp-plan-body h1,
        [data-pdf-mode] .lp-plan-body h3,
        [data-pdf-mode] .lp-plan-body p,
        [data-pdf-mode] .lp-plan-body li,
        [data-pdf-mode] .lp-plan-body td { color: #334155 !important; }
        [data-pdf-mode] .lp-plan-body h2 { color: #4f46e5 !important; }
        [data-pdf-mode] .lp-plan-body h2::before { background: #4f46e5 !important; }
        [data-pdf-mode] .lp-plan-body th { background: #f8fafc !important; color: #0f172a !important; }
        [data-pdf-mode] .lp-plan-body tr:nth-child(even) td { background: #f8fafc !important; }

        /* Plan editor */
        .lp-editor { width: 100%; min-height: 600px; padding: 1.5rem; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.7; border: 1px solid var(--theme-sidebar-border); border-radius: 8px; resize: vertical; outline: none; background: var(--theme-bg-container); color: var(--theme-text-primary); box-sizing: border-box; }
        .lp-editor:focus { border-color: var(--theme-button-primary); }

        /* History hover */
        .lp-history-item:hover .lp-history-subject { color: var(--theme-button-primary); }

        @media (max-width: 1024px) {
          .lp-layout { grid-template-columns: 1fr !important; }
          .lp-sidebar { position: static !important; }
        }
        @media (max-width: 640px) {
          .lp-output-actions { flex-direction: column; }
          .lp-plan-body { padding: 1.5rem; }
        }
      `}</style>

      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "clamp(1rem, 4vw, 2.5rem)" }}>

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
        <div className="lp-fade" style={{
          background: "var(--theme-bg-secondary)",
          borderRadius: 18, padding: "36px 40px",
          textAlign: "center", marginBottom: 32,
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
            🧠 AI Lesson Planner
          </h1>
          <p style={{ color: "#e0e7ff", fontSize: 15, margin: 0, maxWidth: 640, marginInline: "auto", lineHeight: 1.6 }}>
            Fill in the details below and let Chikoro AI create a structured, engaging lesson plan for you in seconds.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="lp-layout" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── Sidebar ── */}
          <div className="lp-sidebar" style={{ position: "sticky", top: 24 }}>
            {/* Form card */}
            <div style={{
              background: "var(--theme-bg-secondary)",
              border: "1px solid var(--theme-sidebar-border)",
              borderRadius: 16, padding: 24,
              boxShadow: "0 4px 12px rgba(0,0,0,.1)",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 20px", paddingBottom: 12, borderBottom: "1px solid var(--theme-sidebar-border)" }}>
                Lesson Details
              </h2>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Subject */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiBook size={13} /> Subject
                  </label>
                  <input
                    className="lp-input"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormField("subject", e.target.value)}
                    placeholder="e.g. English"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Grade */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>Grade / Form</label>
                  <GradeSelector value={formData.grade} onChange={(g) => setFormField("grade", g)} />
                </div>

                {/* Topic */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>Topic</label>
                  <input
                    className="lp-input"
                    type="text"
                    value={formData.topic}
                    onChange={(e) => setFormField("topic", e.target.value)}
                    placeholder="e.g. Verbs and Adverbs"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Duration */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiClock size={13} /> Duration
                  </label>
                  <select
                    className="lp-input"
                    value={isCustomDuration ? "custom" : formData.duration}
                    onChange={(e) => setFormField("duration", e.target.value !== "custom" ? e.target.value : "")}
                    style={inputStyle}
                  >
                    <option value="30 minutes">30 minutes</option>
                    <option value="40 minutes">40 minutes</option>
                    <option value="60 minutes">60 minutes</option>
                    <option value="80 minutes (Double Period)">80 minutes (Double Period)</option>
                    <option value="custom">Custom…</option>
                  </select>
                  {isCustomDuration && (
                    <input
                      className="lp-input"
                      type="text"
                      placeholder="e.g. 75 minutes"
                      value={formData.duration}
                      onChange={(e) => setFormField("duration", e.target.value)}
                      style={{ ...inputStyle, marginTop: 6, border: "1.5px dashed var(--theme-button-primary)" }}
                    />
                  )}
                </div>

                {/* Objectives */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiTarget size={13} /> Objectives <span style={{ fontWeight: 400, color: "var(--theme-text-secondary)" }}>(optional)</span>
                  </label>
                  <textarea
                    className="lp-input"
                    value={formData.objectives}
                    onChange={(e) => setFormField("objectives", e.target.value)}
                    rows={4}
                    placeholder="e.g. Students should be able to identify and use active verbs…"
                    style={{ ...inputStyle, resize: "vertical", minHeight: 90 }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !formData.grade}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "11px 20px", borderRadius: 10,
                    background: isLoading || !formData.grade ? "var(--theme-sidebar-item-default)" : "var(--theme-button-primary)",
                    color: isLoading || !formData.grade ? "var(--theme-text-secondary)" : "#fff",
                    fontWeight: 700, fontSize: 14, cursor: isLoading || !formData.grade ? "not-allowed" : "pointer",
                    border: "none", fontFamily: "inherit", width: "100%",
                    transition: "opacity .2s, transform .2s",
                    marginTop: 4,
                  }}
                >
                  {isLoading
                    ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "lp-spin .8s linear infinite" }} /> Generating…</>
                    : <><FiFileText /> Generate Lesson Plan</>
                  }
                </button>
              </form>
            </div>

            {/* History panel */}
            {history.length > 0 && (
              <div style={{
                background: "var(--theme-bg-secondary)",
                border: "1px solid var(--theme-sidebar-border)",
                borderRadius: 16, padding: "18px 20px",
                marginTop: 16,
                boxShadow: "0 2px 8px rgba(0,0,0,.08)",
              }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 12px", paddingBottom: 8, borderBottom: "1px solid var(--theme-sidebar-border)" }}>
                  Recent Plans
                </h3>
                {history.map((entry) => (
                  <div key={entry.id} className="lp-history-item" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid var(--theme-sidebar-border)" }}>
                    <div style={{ flex: 1, cursor: "pointer", minWidth: 0 }} onClick={() => loadFromHistory(entry)}>
                      <span className="lp-history-subject" style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "block", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", transition: "color .15s" }}>
                        {entry.subject} — {entry.topic}
                      </span>
                      <span style={{ fontSize: 11, color: "var(--theme-text-secondary)", display: "block", marginTop: 2 }}>
                        {entry.grade} · {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteFromHistory(entry.id)}
                      aria-label="Remove"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        color: "var(--theme-text-secondary)", fontSize: 16, padding: "2px 6px",
                        borderRadius: 4, lineHeight: 1, fontFamily: "inherit",
                        transition: "color .15s",
                        flexShrink: 0,
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#ef4444"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--theme-text-secondary)"}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── Main output area ── */}
          <div style={{ minHeight: 500 }}>

            {/* Loading */}
            {isLoading && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                minHeight: 420, background: "var(--theme-bg-secondary)",
                border: "1px solid var(--theme-sidebar-border)", borderRadius: 16,
              }}>
                <div style={{ width: 48, height: 48, border: "4px solid var(--theme-sidebar-border)", borderTopColor: "var(--theme-button-primary)", borderRadius: "50%", animation: "lp-spin 1s linear infinite", marginBottom: 18 }} />
                <p style={{ color: "var(--theme-text-secondary)", fontWeight: 600 }}>Crafting your perfect lesson plan…</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)",
                color: "#dc2626", padding: "14px 18px", borderRadius: 12, marginBottom: 16,
                fontWeight: 600, fontSize: 14,
              }}>⚠️ {error}</div>
            )}

            {/* Generated plan */}
            {lessonPlan && !isLoading && (
              <div className="lp-fade" style={{
                background: "var(--theme-bg-secondary)",
                border: "1px solid var(--theme-sidebar-border)",
                borderRadius: 16, overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,.1)",
              }}>
                {/* Action bar */}
                <div className="lp-output-actions" style={{
                  display: "flex", flexWrap: "wrap", gap: 10,
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--theme-sidebar-border)",
                  background: "var(--theme-bg-sidebar)",
                }}>
                  {[
                    { label: "Save as PDF",        icon: <FiDownload />, onClick: saveAsPdf,              bg: "rgba(220,38,38,.1)",   color: "#dc2626" },
                    { label: "Save as PowerPoint",  icon: <FiMonitor />,  onClick: saveAsPowerPoint,       bg: "rgba(234,88,12,.1)",   color: "#ea580c" },
                    { label: isEditing ? "Preview" : "Edit", icon: isEditing ? <FiEye /> : <FiEdit2 />, onClick: () => setIsEditing(p => !p), bg: "rgba(124,58,237,.1)", color: "#7c3aed" },
                  ].map(({ label, icon, onClick, bg, color }) => (
                    <button key={label} type="button" onClick={onClick}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        padding: "8px 16px", borderRadius: 8, border: "none",
                        background: bg, color, fontWeight: 700, fontSize: 13,
                        cursor: "pointer", fontFamily: "inherit", transition: "opacity .15s",
                      }}
                      onMouseEnter={e => e.currentTarget.style.opacity = ".8"}
                      onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                    >
                      {icon} {label}
                    </button>
                  ))}
                </div>

                {/* Content */}
                {isEditing ? (
                  <textarea
                    className="lp-editor"
                    value={lessonPlan}
                    onChange={(e) => setLessonPlan(e.target.value)}
                  />
                ) : (
                  <div className="lp-plan-body" ref={planRef}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{lessonPlan}</ReactMarkdown>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!lessonPlan && !isLoading && !error && (
              <div style={{
                background: "var(--theme-bg-secondary)",
                border: "2px dashed var(--theme-sidebar-border)",
                borderRadius: 16, padding: "80px 32px",
                textAlign: "center", minHeight: 420,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 52, marginBottom: 16, opacity: .5 }}>📝</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 8px" }}>Ready to Plan</h3>
                <p style={{ color: "var(--theme-text-secondary)", margin: 0, maxWidth: 380, lineHeight: 1.6, fontSize: 14 }}>
                  Fill out the details on the left and hit Generate to create a comprehensive lesson plan.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

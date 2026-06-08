import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { create } from "zustand";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  FiArrowLeft, FiFileText, FiDownload, FiBook,
  FiCalendar, FiClock, FiLayers, FiUpload, FiX,
  FiEdit2, FiCheck, FiAlertTriangle,
} from "react-icons/fi";
import { useTheme } from "@/hooks/useTheme";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRADE_OPTIONS = {
  primary:   ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7"],
  secondary: ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6"],
};

const API_BASE = "https://api.chikoro-ai.com/api";

// ─── Shared input style (mirrors lesson planner) ──────────────────────────────

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

// ─── GradeSelector (identical pattern to lesson planner) ─────────────────────

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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {["primary", "secondary"].map((l) => (
          <button key={l} type="button"
            onClick={() => { if (level !== l) { setLevel(l); onChange(""); } }}
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

// ─── Syllabus file dropzone ───────────────────────────────────────────────────

function SyllabusUpload({ file, onFileChange }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.type === "application/pdf") onFileChange(dropped);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => !file && inputRef.current?.click()}
      style={{
        border: `2px dashed ${isDragging ? "var(--theme-button-primary)" : "var(--theme-sidebar-border)"}`,
        borderRadius: 10,
        padding: "14px 16px",
        cursor: file ? "default" : "pointer",
        background: isDragging ? "color-mix(in srgb, var(--theme-button-primary) 6%, transparent)" : "var(--theme-bg-container)",
        transition: "all .2s",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        style={{ display: "none" }}
        onChange={(e) => onFileChange(e.target.files[0] || null)}
      />

      {file ? (
        <>
          <FiFileText size={18} color="var(--theme-button-primary)" style={{ flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, color: "var(--theme-text-primary)", fontWeight: 600,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file.name}
          </span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--theme-text-secondary)", padding: 2, borderRadius: 4,
              display: "flex", alignItems: "center",
            }}
          >
            <FiX size={15} />
          </button>
        </>
      ) : (
        <>
          <FiUpload size={16} color="var(--theme-text-secondary)" style={{ flexShrink: 0 }} />
          <div>
            <p style={{ margin: 0, fontSize: 13, color: "var(--theme-text-primary)", fontWeight: 600 }}>
              Upload syllabus PDF
            </p>
            <p style={{ margin: 0, fontSize: 11, color: "var(--theme-text-secondary)", marginTop: 2 }}>
              Optional — drag & drop or click. Improves accuracy.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Holiday week picker ──────────────────────────────────────────────────────

function HolidayWeekPicker({ totalWeeks, holidayWeeks, onToggle }) {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {weeks.map((w) => {
        const isHol = holidayWeeks.includes(w);
        return (
          <button key={w} type="button" onClick={() => onToggle(w)}
            title={isHol ? `Week ${w}: Holiday` : `Week ${w}: Teaching`}
            style={{
              width: 32, height: 32, borderRadius: 7, fontFamily: "inherit",
              fontSize: 12, fontWeight: 700, cursor: "pointer",
              border: isHol ? "2px solid #f59e0b" : "1.5px solid var(--theme-sidebar-border)",
              background: isHol ? "rgba(245,158,11,.15)" : "var(--theme-bg-container)",
              color: isHol ? "#f59e0b" : "var(--theme-text-secondary)",
              transition: "all .15s",
            }}>
            {w}
          </button>
        );
      })}
    </div>
  );
}

// ─── Editable week row ────────────────────────────────────────────────────────

function WeekRow({ weekData, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(weekData);

  const save = () => { onChange(draft); setEditing(false); };
  const cancel = () => { setDraft(weekData); setEditing(false); };

  const cellStyle = {
    padding: "10px 12px",
    fontSize: 13,
    color: "var(--theme-text-primary)",
    verticalAlign: "top",
    borderBottom: "1px solid var(--theme-sidebar-border)",
  };

  const editInputStyle = {
    width: "100%",
    padding: "6px 8px",
    border: "1.5px solid var(--theme-button-primary)",
    borderRadius: 6,
    fontSize: 12,
    background: "var(--theme-bg-primary)",
    color: "var(--theme-text-primary)",
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
  };

  if (weekData.isHoliday) {
    return (
      <tr style={{ background: "rgba(245,158,11,.05)" }}>
        <td style={{ ...cellStyle, fontWeight: 700, color: "#f59e0b", textAlign: "center", width: 50 }}>
          {weekData.week}
        </td>
        <td colSpan={5} style={{ ...cellStyle, color: "#f59e0b", fontStyle: "italic", fontWeight: 600 }}>
          🏖️ Holiday / No Teaching
        </td>
      </tr>
    );
  }

  if (editing) {
    return (
      <tr style={{ background: "color-mix(in srgb, var(--theme-button-primary) 4%, transparent)" }}>
        <td style={{ ...cellStyle, fontWeight: 700, textAlign: "center", width: 50 }}>{weekData.week}</td>
        <td style={cellStyle}>
          <input style={editInputStyle} value={draft.topic}
            onChange={(e) => setDraft({ ...draft, topic: e.target.value })} />
        </td>
        <td style={cellStyle}>
          <textarea style={{ ...editInputStyle, minHeight: 70 }}
            value={(draft.objectives || []).join("\n")}
            onChange={(e) => setDraft({ ...draft, objectives: e.target.value.split("\n") })} />
        </td>
        <td style={cellStyle}>
          <textarea style={{ ...editInputStyle, minHeight: 70 }}
            value={(draft.activities || []).join("\n")}
            onChange={(e) => setDraft({ ...draft, activities: e.target.value.split("\n") })} />
        </td>
        <td style={cellStyle}>
          <textarea style={{ ...editInputStyle, minHeight: 50 }}
            value={(draft.resources || []).join("\n")}
            onChange={(e) => setDraft({ ...draft, resources: e.target.value.split("\n") })} />
        </td>
        <td style={cellStyle}>
          <input style={editInputStyle} value={draft.assessment || ""}
            onChange={(e) => setDraft({ ...draft, assessment: e.target.value })} />
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button type="button" onClick={save}
              style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "none", fontFamily: "inherit",
                background: "var(--theme-button-primary)", color: "#fff", fontWeight: 700, fontSize: 11, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <FiCheck size={11} /> Save
            </button>
            <button type="button" onClick={cancel}
              style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--theme-sidebar-border)",
                fontFamily: "inherit", background: "var(--theme-bg-container)", color: "var(--theme-text-secondary)",
                fontSize: 11, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      style={{ transition: "background .15s", cursor: "pointer" }}
      onMouseEnter={(e) => e.currentTarget.style.background = "color-mix(in srgb, var(--theme-button-primary) 3%, transparent)"}
      onMouseLeave={(e) => e.currentTarget.style.background = ""}
      onClick={() => setEditing(true)}
      title="Click to edit this week"
    >
      <td style={{ ...cellStyle, fontWeight: 700, textAlign: "center", width: 50, color: "var(--theme-button-primary)" }}>
        {weekData.week}
      </td>
      <td style={{ ...cellStyle, fontWeight: 600 }}>{weekData.topic}</td>
      <td style={cellStyle}>
        <ul style={{ margin: 0, paddingLeft: 14 }}>
          {(weekData.objectives || []).map((o, i) => (
            <li key={i} style={{ marginBottom: 3, fontSize: 12, color: "var(--theme-text-secondary)" }}>{o}</li>
          ))}
        </ul>
      </td>
      <td style={cellStyle}>
        <ul style={{ margin: 0, paddingLeft: 14 }}>
          {(weekData.activities || []).map((a, i) => (
            <li key={i} style={{ marginBottom: 3, fontSize: 12, color: "var(--theme-text-secondary)" }}>{a}</li>
          ))}
        </ul>
      </td>
      <td style={cellStyle}>
        {(weekData.resources || []).map((r, i) => (
          <span key={i} style={{
            display: "inline-block", background: "var(--theme-bg-container)",
            border: "1px solid var(--theme-sidebar-border)", borderRadius: 5,
            padding: "2px 7px", fontSize: 11, marginRight: 4, marginBottom: 4,
            color: "var(--theme-text-secondary)",
          }}>{r}</span>
        ))}
      </td>
      <td style={{ ...cellStyle, fontSize: 12, color: "var(--theme-text-secondary)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
          <span>{weekData.assessment}</span>
          <FiEdit2 size={12} style={{ flexShrink: 0, opacity: .4, marginTop: 2 }} />
        </div>
      </td>
    </tr>
  );
}

// ─── Zustand store ────────────────────────────────────────────────────────────

const useSchemeStore = create((set, get) => ({
  formData: {
    subject: "", grade: "", term: "", weeks: 8, curriculum: "", notes: "",
  },
  syllabusFile: null,
  holidayWeeks: [],
  scheme: null,        // structured JSON { subject, grade, term, weeks: [...] }
  isLoading: false,
  error: "",

  setFormField: (field, value) =>
    set((state) => ({ formData: { ...state.formData, [field]: value } })),

  setSyllabusFile: (file) => set({ syllabusFile: file }),

  toggleHolidayWeek: (week) =>
    set((state) => ({
      holidayWeeks: state.holidayWeeks.includes(week)
        ? state.holidayWeeks.filter((w) => w !== week)
        : [...state.holidayWeeks, week],
    })),

  updateWeek: (weekNum, updatedData) =>
    set((state) => ({
      scheme: {
        ...state.scheme,
        weeks: state.scheme.weeks.map((w) =>
          w.week === weekNum ? { ...w, ...updatedData } : w
        ),
      },
    })),

  generateScheme: async () => {
    const { formData, syllabusFile, holidayWeeks } = get();
    if (!formData.subject || !formData.grade || !formData.term) {
      set({ error: "Subject, Grade, and Term are required fields." });
      return;
    }
    set({ isLoading: true, error: "", scheme: null });

    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const formPayload = new FormData();

      // Send all fields as metadata JSON (same pattern as exam extractor)
      formPayload.append("metadata", JSON.stringify({
        ...formData,
        holidayWeeks,
      }));

      if (syllabusFile) {
        formPayload.append("syllabus", syllabusFile);
      }

      const response = await axios.post(
        `${API_BASE}/system/teacher-tools/generate-scheme-of-work`,
        formPayload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      if (response.data?.scheme) {
        set({ scheme: response.data.scheme, isLoading: false });
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err) {
      const message =
        err.response?.data?.error ||
        "An error occurred while generating the scheme of work.";
      set({ error: message, isLoading: false });
    }
  },

  reset: () =>
    set({
      formData: { subject: "", grade: "", term: "", weeks: 8, curriculum: "", notes: "" },
      syllabusFile: null, holidayWeeks: [], scheme: null, isLoading: false, error: "",
    }),
}));

// ─── Main component ───────────────────────────────────────────────────────────

export default function SchemeOfWorkCreator() {
  const { theme } = useTheme();
  const {
    formData, syllabusFile, holidayWeeks, scheme, isLoading, error,
    setFormField, setSyllabusFile, toggleHolidayWeek, updateWeek,
    generateScheme, reset,
  } = useSchemeStore();

  const tableRef = useRef(null);
  const totalWeeks = parseInt(formData.weeks) || 8;
  const activeWeekCount = totalWeeks - holidayWeeks.length;

  useEffect(() => { return () => reset(); }, [reset]);

  const handleSubmit = (e) => { e.preventDefault(); generateScheme(); };

  // ── Save as PDF ──
  const saveAsPdf = async () => {
    if (!tableRef.current) return;
    const el = tableRef.current;
    el.dataset.pdfMode = "1";
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4"); // landscape for wide table
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${formData.subject}_SchemeOfWork_${new Date().toISOString().slice(0, 10)}.pdf`);
    delete el.dataset.pdfMode;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes sow-spin   { to { transform: rotate(360deg); } }
        @keyframes sow-fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .sow-fade { animation: sow-fadeUp .5s cubic-bezier(.4,0,.2,1) both; }
        .sow-input:focus {
          border-color: var(--theme-button-primary) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-button-primary) 15%, transparent) !important;
        }
        .sow-table thead th {
          background: var(--theme-bg-sidebar);
          color: var(--theme-text-secondary);
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .06em;
          padding: 10px 12px;
          border-bottom: 2px solid var(--theme-sidebar-border);
          position: sticky;
          top: 0;
          z-index: 1;
          white-space: nowrap;
        }
        [data-pdf-mode] { background: #ffffff !important; color: #334155 !important; }
        [data-pdf-mode] th { background: #f8fafc !important; color: #64748b !important; }
        [data-pdf-mode] td { color: #334155 !important; border-color: #e2e8f0 !important; }

        @media (max-width: 1024px) {
          .sow-layout { grid-template-columns: 1fr !important; }
          .sow-sidebar { position: static !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1500, margin: "0 auto", padding: "clamp(1rem, 4vw, 2.5rem)" }}>

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

        {/* Header — matches lesson planner style exactly */}
        <div className="sow-fade" style={{
          background: "var(--theme-bg-secondary)",
          borderRadius: 18, padding: "36px 40px",
          textAlign: "center", marginBottom: 32,
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
            📚 AI Scheme of Work Creator
          </h1>
          <p style={{ color: "#e0e7ff", fontSize: 15, margin: 0, maxWidth: 640, marginInline: "auto", lineHeight: 1.6 }}>
            Generate a detailed, week-by-week scheme of work — then edit any cell directly before exporting.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="sow-layout" style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: 24, alignItems: "start" }}>

          {/* ── Sidebar ── */}
          <div className="sow-sidebar" style={{ position: "sticky", top: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{
              background: "var(--theme-bg-secondary)",
              border: "1px solid var(--theme-sidebar-border)",
              borderRadius: 16, padding: 24,
              boxShadow: "0 4px 12px rgba(0,0,0,.1)",
            }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 20px", paddingBottom: 12, borderBottom: "1px solid var(--theme-sidebar-border)" }}>
                Scheme Details
              </h2>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

                {/* Subject */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiBook size={13} /> Subject
                  </label>
                  <input
                    className="sow-input"
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormField("subject", e.target.value)}
                    placeholder="e.g. Mathematics"
                    required
                    style={inputStyle}
                  />
                </div>

                {/* Grade */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>Grade / Form</label>
                  <GradeSelector value={formData.grade} onChange={(g) => setFormField("grade", g)} />
                </div>

                {/* Term */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiCalendar size={13} /> Term
                  </label>
                  <select
                    className="sow-input"
                    value={formData.term}
                    onChange={(e) => setFormField("term", e.target.value)}
                    required
                    style={inputStyle}
                  >
                    <option value="">Select Term</option>
                    <option value="Term 1">Term 1</option>
                    <option value="Term 2">Term 2</option>
                    <option value="Term 3">Term 3</option>
                  </select>
                </div>

                {/* Weeks */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiClock size={13} /> Number of Weeks
                  </label>
                  <input
                    className="sow-input"
                    type="number"
                    min="1" max="15"
                    value={formData.weeks}
                    onChange={(e) => setFormField("weeks", parseInt(e.target.value) || "")}
                    style={inputStyle}
                  />
                </div>

                {/* Holiday week picker */}
                {totalWeeks > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>
                      🏖️ Holiday Weeks{" "}
                      <span style={{ fontWeight: 400, color: "var(--theme-text-secondary)" }}>(tap to mark)</span>
                    </label>
                    <HolidayWeekPicker
                      totalWeeks={totalWeeks}
                      holidayWeeks={holidayWeeks}
                      onToggle={toggleHolidayWeek}
                    />
                    {holidayWeeks.length > 0 && (
                      <p style={{ margin: 0, fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>
                        {activeWeekCount} teaching week{activeWeekCount !== 1 ? "s" : ""} · {holidayWeeks.length} holiday week{holidayWeeks.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                )}

                {/* Curriculum */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiLayers size={13} /> Curriculum <span style={{ fontWeight: 400, color: "var(--theme-text-secondary)" }}>(optional)</span>
                  </label>
                  <input
                    className="sow-input"
                    type="text"
                    placeholder="e.g. ZIMSEC, Cambridge"
                    value={formData.curriculum}
                    onChange={(e) => setFormField("curriculum", e.target.value)}
                    style={inputStyle}
                  />
                </div>

                {/* Syllabus upload */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>
                    📄 Syllabus PDF <span style={{ fontWeight: 400, color: "var(--theme-text-secondary)" }}>(optional)</span>
                  </label>
                  <SyllabusUpload file={syllabusFile} onFileChange={setSyllabusFile} />
                  {syllabusFile && (
                    <p style={{ margin: 0, fontSize: 11, color: "var(--theme-button-primary)", fontWeight: 600 }}>
                      ✓ Topics will align with your uploaded syllabus
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)", display: "flex", alignItems: "center", gap: 6 }}>
                    <FiFileText size={13} /> Notes <span style={{ fontWeight: 400, color: "var(--theme-text-secondary)" }}>(optional)</span>
                  </label>
                  <textarea
                    className="sow-input"
                    rows={3}
                    placeholder="e.g. Focus on practical experiments"
                    value={formData.notes}
                    onChange={(e) => setFormField("notes", e.target.value)}
                    style={{ ...inputStyle, resize: "vertical", minHeight: 72 }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading || !formData.grade}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "11px 20px", borderRadius: 10, marginTop: 4,
                    background: isLoading || !formData.grade ? "var(--theme-sidebar-item-default)" : "var(--theme-button-primary)",
                    color: isLoading || !formData.grade ? "var(--theme-text-secondary)" : "#fff",
                    fontWeight: 700, fontSize: 14, cursor: isLoading || !formData.grade ? "not-allowed" : "pointer",
                    border: "none", fontFamily: "inherit", width: "100%",
                    transition: "opacity .2s, transform .2s",
                  }}
                >
                  {isLoading
                    ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "sow-spin .8s linear infinite" }} /> Generating…</>
                    : <><FiFileText /> Generate Scheme</>
                  }
                </button>
              </form>
            </div>

            {/* Tip card */}
            <div style={{
              background: "color-mix(in srgb, var(--theme-button-primary) 8%, var(--theme-bg-secondary))",
              border: "1px solid color-mix(in srgb, var(--theme-button-primary) 20%, var(--theme-sidebar-border))",
              borderRadius: 12, padding: "14px 16px",
            }}>
              <p style={{ margin: 0, fontSize: 12, color: "var(--theme-text-secondary)", lineHeight: 1.6 }}>
                <strong style={{ color: "var(--theme-button-primary)" }}>💡 Tip:</strong> Upload your official ZIMSEC or Cambridge syllabus PDF for the most accurate topic sequencing. Click any row in the table to edit it.
              </p>
            </div>
          </div>

          {/* ── Main output ── */}
          <div style={{ minHeight: 500 }}>

            {/* Loading */}
            {isLoading && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                minHeight: 420, background: "var(--theme-bg-secondary)",
                border: "1px solid var(--theme-sidebar-border)", borderRadius: 16,
              }}>
                <div style={{ width: 48, height: 48, border: "4px solid var(--theme-sidebar-border)", borderTopColor: "var(--theme-button-primary)", borderRadius: "50%", animation: "sow-spin 1s linear infinite", marginBottom: 18 }} />
                <p style={{ color: "var(--theme-text-secondary)", fontWeight: 600 }}>Mapping out your term schedule…</p>
                {syllabusFile && (
                  <p style={{ color: "var(--theme-text-secondary)", fontSize: 13, marginTop: 4 }}>Reading your syllabus…</p>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{
                background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)",
                color: "#dc2626", padding: "14px 18px", borderRadius: 12, marginBottom: 16,
                fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8,
              }}>
                <FiAlertTriangle /> {error}
              </div>
            )}

            {/* Generated scheme table */}
            {scheme && !isLoading && (
              <div className="sow-fade" style={{
                background: "var(--theme-bg-secondary)",
                border: "1px solid var(--theme-sidebar-border)",
                borderRadius: 16, overflow: "hidden",
                boxShadow: "0 4px 12px rgba(0,0,0,.1)",
              }}>
                {/* Action bar — mirrors lesson planner action bar */}
                <div style={{
                  display: "flex", flexWrap: "wrap", gap: 10,
                  padding: "14px 18px",
                  borderBottom: "1px solid var(--theme-sidebar-border)",
                  background: "var(--theme-bg-sidebar)",
                  alignItems: "center",
                }}>
                  <button type="button" onClick={saveAsPdf}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "8px 16px", borderRadius: 8, border: "none",
                      background: "rgba(220,38,38,.1)", color: "#dc2626",
                      fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = ".8"}
                    onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  >
                    <FiDownload /> Save as PDF
                  </button>

                  {/* Summary badges */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[
                      { label: `${scheme.weeks?.length || 0} Weeks`, color: "var(--theme-button-primary)" },
                      { label: `${scheme.grade}`, color: "#7c3aed" },
                      { label: scheme.term, color: "#059669" },
                      ...(scheme.curriculum ? [{ label: scheme.curriculum, color: "#0891b2" }] : []),
                    ].map(({ label, color }) => (
                      <span key={label} style={{
                        padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                        color, border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
                      }}>
                        {label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Inline edit hint */}
                <div style={{
                  padding: "10px 18px", fontSize: 12, color: "var(--theme-text-secondary)",
                  background: "color-mix(in srgb, var(--theme-button-primary) 4%, transparent)",
                  borderBottom: "1px solid var(--theme-sidebar-border)",
                  display: "flex", alignItems: "center", gap: 6,
                }}>
                  <FiEdit2 size={12} /> Click any row to edit it inline, then save.
                </div>

                {/* Scrollable table */}
                <div ref={tableRef} style={{ overflowX: "auto" }}>
                  <table className="sow-table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 900 }}>
                    <thead>
                      <tr>
                        {["Wk", "Topic", "Learning Objectives", "Activities", "Resources", "Assessment"].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(scheme.weeks || []).map((week) => (
                        <WeekRow
                          key={week.week}
                          weekData={week}
                          onChange={(updated) => updateWeek(week.week, updated)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!scheme && !isLoading && !error && (
              <div style={{
                background: "var(--theme-bg-secondary)",
                border: "2px dashed var(--theme-sidebar-border)",
                borderRadius: 16, padding: "80px 32px",
                textAlign: "center", minHeight: 420,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              }}>
                <div style={{ fontSize: 52, marginBottom: 16, opacity: .5 }}>📅</div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 8px" }}>Plan Your Term</h3>
                <p style={{ color: "var(--theme-text-secondary)", margin: 0, maxWidth: 380, lineHeight: 1.6, fontSize: 14 }}>
                  Fill out the details on the left and hit Generate to create a full scheme you can edit and export.
                </p>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
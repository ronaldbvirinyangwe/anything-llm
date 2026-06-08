import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  FiArrowLeft, FiUpload, FiFileText, FiSave, FiShare2,
  FiLink, FiEdit2, FiCheck, FiX, FiAlertCircle
} from "react-icons/fi";
import ClassSelectorModal from "./ClassSelectorModal";

// ─── Shared input style (mirrors scheme of work / lesson planner) ─────────────

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

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({ item, idx, editingIndex, editForm, setEditForm, onSaveEdit, onCancelEdit, onStartEdit }) {
  const isEditing = editingIndex === idx;

  const TYPE_LABELS = {
    'multiple-choice': 'Multiple Choice',
    'structured':      'Structured',
    'essay':           'Essay',
    'fill-blank':      'Fill in the Blank',
    'true-false':      'True / False',
    'data-response':   'Data Response',
    'matching':        'Matching',
  };

  const TYPE_ICONS = {
    'multiple-choice': '🔤',
    'structured':      '📝',
    'essay':           '✍️',
    'fill-blank':      '🔲',
    'true-false':      '✅',
    'data-response':   '📊',
    'matching':        '🔗',
  };

  const TYPE_COLORS = {
    'multiple-choice': '#7c3aed',
    'structured':      'var(--theme-button-primary)',
    'essay':           '#0891b2',
    'fill-blank':      '#059669',
    'true-false':      '#d97706',
    'data-response':   '#db2777',
    'matching':        '#ea580c',
  };

  const cardStyle = {
    background: "var(--theme-bg-secondary)",
    border: "1px solid var(--theme-sidebar-border)",
    borderRadius: 14,
    padding: "20px 22px",
    marginBottom: 14,
    transition: "box-shadow .2s",
  };

  const badgeStyle = (type) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 10px",
    borderRadius: 20,
    fontSize: 11,
    fontWeight: 700,
    background: `color-mix(in srgb, ${TYPE_COLORS[type] || 'var(--theme-button-primary)'} 12%, transparent)`,
    color: TYPE_COLORS[type] || 'var(--theme-button-primary)',
    border: `1px solid color-mix(in srgb, ${TYPE_COLORS[type] || 'var(--theme-button-primary)'} 25%, transparent)`,
  });

  const editInputStyle = {
    width: "100%",
    padding: "8px 10px",
    border: "1.5px solid var(--theme-button-primary)",
    borderRadius: 7,
    fontSize: 13,
    background: "var(--theme-bg-primary)",
    color: "var(--theme-text-primary)",
    fontFamily: "inherit",
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    marginTop: 4,
  };

  const formGroupStyle = {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginBottom: 14,
  };

  const formLabelStyle = {
    fontSize: 12,
    fontWeight: 700,
    color: "var(--theme-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: ".04em",
  };

  const answerBoxStyle = {
    marginTop: 12,
    padding: "10px 14px",
    background: "color-mix(in srgb, #059669 10%, transparent)",
    border: "1px solid color-mix(in srgb, #059669 25%, transparent)",
    borderRadius: 8,
    fontSize: 13,
    color: "#059669",
    fontWeight: 600,
  };

  const markSchemeBoxStyle = {
    marginTop: 12,
    padding: "14px 16px",
    background: "color-mix(in srgb, var(--theme-button-primary) 6%, transparent)",
    border: "1px solid color-mix(in srgb, var(--theme-button-primary) 20%, var(--theme-sidebar-border))",
    borderRadius: 9,
    fontSize: 13,
  };

  if (isEditing && editForm) {
    return (
      <div style={{ ...cardStyle, border: "2px solid var(--theme-button-primary)", boxShadow: "0 0 0 3px color-mix(in srgb, var(--theme-button-primary) 12%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <span style={{ ...badgeStyle('structured'), background: "color-mix(in srgb, var(--theme-button-primary) 15%, transparent)" }}>
            ✏️ Editing
          </span>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--theme-text-primary)" }}>
            Question {idx + 1}
          </span>
        </div>

        <div style={formGroupStyle}>
          <label style={formLabelStyle}>Question Text</label>
          <textarea rows="3" style={editInputStyle} value={editForm.question}
            onChange={e => setEditForm({ ...editForm, question: e.target.value })} />
        </div>

        {editForm.type === 'multiple-choice' && (<>
          <div style={formGroupStyle}>
            <label style={formLabelStyle}>Options</label>
            {editForm.options.map((opt, i) => (
              <input key={i} type="text" style={{ ...editInputStyle, marginTop: i === 0 ? 4 : 6 }}
                value={opt} placeholder={`Option ${String.fromCharCode(65 + i)}`}
                onChange={e => { const o = [...editForm.options]; o[i] = e.target.value; setEditForm({ ...editForm, options: o }); }} />
            ))}
          </div>
          <div style={formGroupStyle}>
            <label style={formLabelStyle}>Correct Answer</label>
            <select style={{ ...editInputStyle, resize: "none" }}
              value={editForm.answer || 'A'}
              onChange={e => setEditForm({ ...editForm, answer: e.target.value })}>
              {['A', 'B', 'C', 'D'].map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </>)}

        {editForm.type === 'true-false' && (
          <div style={formGroupStyle}>
            <label style={formLabelStyle}>Answer</label>
            <select style={{ ...editInputStyle, resize: "none" }}
              value={editForm.answer}
              onChange={e => setEditForm({ ...editForm, answer: e.target.value })}>
              <option value="True">True</option>
              <option value="False">False</option>
            </select>
          </div>
        )}

        {editForm.type === 'fill-blank' && (
          <div style={formGroupStyle}>
            <label style={formLabelStyle}>Answer</label>
            <input type="text" style={editInputStyle} value={editForm.answer}
              onChange={e => setEditForm({ ...editForm, answer: e.target.value })} />
          </div>
        )}

        {['structured', 'essay', 'data-response'].includes(editForm.type) && (
          <div style={formGroupStyle}>
            <label style={formLabelStyle}>Mark Scheme</label>
            <textarea rows="6" style={editInputStyle} value={editForm.markScheme}
              onChange={e => setEditForm({ ...editForm, markScheme: e.target.value })} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <button type="button" onClick={() => onSaveEdit(idx)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "var(--theme-button-primary)", color: "#fff",
              fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>
            <FiCheck size={13} /> Save
          </button>
          <button type="button" onClick={onCancelEdit}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "8px 16px", borderRadius: 8,
              border: "1px solid var(--theme-sidebar-border)",
              background: "var(--theme-bg-container)", color: "var(--theme-text-secondary)",
              fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit",
            }}>
            <FiX size={13} /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={cardStyle}
      onMouseEnter={e => e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,.12)"}
      onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <span style={badgeStyle(item.type)}>
            {TYPE_ICONS[item.type]} {TYPE_LABELS[item.type] || item.type}
          </span>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--theme-text-primary)" }}>
            {idx + 1}. {item.question.split('\n')[0]}
          </h3>
        </div>
        <button type="button" onClick={() => onStartEdit(idx, item)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "5px 12px", borderRadius: 7, flexShrink: 0,
            border: "1px solid var(--theme-sidebar-border)",
            background: "var(--theme-bg-container)", color: "var(--theme-text-secondary)",
            fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "inherit",
            transition: "all .15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--theme-button-primary)"; e.currentTarget.style.color = "var(--theme-button-primary)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--theme-sidebar-border)"; e.currentTarget.style.color = "var(--theme-text-secondary)"; }}>
          <FiEdit2 size={12} /> Edit
        </button>
      </div>

      {/* Multiple Choice */}
      {item.type === 'multiple-choice' && (<>
        {item.options.length > 0 && (
          <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>
            {item.options.map((o, i) => (
              <li key={i} style={{ marginBottom: 5, fontSize: 13, color: "var(--theme-text-secondary)" }}>{o}</li>
            ))}
          </ul>
        )}
        {item.answer && <div style={answerBoxStyle}>✅ <strong>Correct Answer:</strong> {item.answer}</div>}
      </>)}

      {/* True / False */}
      {item.type === 'true-false' && (
        <div style={answerBoxStyle}>
          {item.answer === 'True' ? '✅' : '❌'} <strong>Answer:</strong> {item.answer}
        </div>
      )}

      {/* Fill in the Blank */}
      {item.type === 'fill-blank' && (
        <div style={answerBoxStyle}>💡 <strong>Answer:</strong> {item.answer}</div>
      )}

      {/* Matching */}
      {item.type === 'matching' && (
        <div style={markSchemeBoxStyle}>
          <h4 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 700, color: "var(--theme-text-primary)" }}>🔗 Match</h4>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div>
              <strong style={{ fontSize: 12, color: "var(--theme-text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>Terms</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                {item.terms.map((t, i) => <li key={i} style={{ fontSize: 13, color: "var(--theme-text-primary)", marginBottom: 4 }}>{t}</li>)}
              </ul>
            </div>
            <div>
              <strong style={{ fontSize: 12, color: "var(--theme-text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>Definitions</strong>
              <ul style={{ margin: "6px 0 0", paddingLeft: 16 }}>
                {item.definitions.map((d, i) => <li key={i} style={{ fontSize: 13, color: "var(--theme-text-primary)", marginBottom: 4 }}>{d}</li>)}
              </ul>
            </div>
          </div>
          {item.answer && <div style={{ ...answerBoxStyle, marginTop: 10 }}>✅ <strong>Answers:</strong> {item.answer}</div>}
        </div>
      )}

      {/* Data Response */}
      {item.type === 'data-response' && (<>
        {item.question.includes('\n') && (
          <div style={{ fontSize: 13, color: "var(--theme-text-secondary)", lineHeight: 1.6, marginBottom: 10 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {item.question.split('\n').slice(1).join('\n')}
            </ReactMarkdown>
          </div>
        )}
        {item.markScheme && (
          <div style={markSchemeBoxStyle}>
            <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--theme-text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>📋 Mark Scheme</h4>
            <div style={{ fontSize: 13, color: "var(--theme-text-primary)", lineHeight: 1.6 }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.markScheme}</ReactMarkdown>
            </div>
          </div>
        )}
      </>)}

      {/* Structured / Essay — mark scheme */}
      {['structured', 'essay'].includes(item.type) && item.markScheme && item.markScheme !== 'No mark scheme provided' && (
        <div style={markSchemeBoxStyle}>
          <h4 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 700, color: "var(--theme-text-secondary)", textTransform: "uppercase", letterSpacing: ".04em" }}>📋 Mark Scheme</h4>
          <div style={{ fontSize: 13, color: "var(--theme-text-primary)", lineHeight: 1.6 }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.markScheme}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Dropzone ─────────────────────────────────────────────────────────────────

function Dropzone({ file, isDragging, onDragOver, onDragLeave, onDrop, onChange, inputId, icon: Icon, title, hint, accept }) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      style={{
        border: `2px dashed ${isDragging ? "var(--theme-button-primary)" : file ? "color-mix(in srgb, var(--theme-button-primary) 40%, var(--theme-sidebar-border))" : "var(--theme-sidebar-border)"}`,
        borderRadius: 12,
        padding: "24px 20px",
        textAlign: "center",
        cursor: "pointer",
        background: isDragging
          ? "color-mix(in srgb, var(--theme-button-primary) 6%, transparent)"
          : file
            ? "color-mix(in srgb, var(--theme-button-primary) 4%, var(--theme-bg-container))"
            : "var(--theme-bg-container)",
        transition: "all .2s",
        flex: 1,
      }}
    >
      <label htmlFor={inputId} style={{ cursor: "pointer", display: "block" }}>
        <Icon size={24} color={file ? "var(--theme-button-primary)" : "var(--theme-text-secondary)"}
          style={{ marginBottom: 8 }} />
        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700,
          color: file ? "var(--theme-text-primary)" : "var(--theme-text-primary)" }}>
          {file ? file.name : title}
        </p>
        <p style={{ margin: 0, fontSize: 11, color: "var(--theme-text-secondary)" }}>
          {file ? "Click or drop to replace" : hint}
        </p>
      </label>
      <input id={inputId} type="file" accept={accept} style={{ display: "none" }}
        onChange={onChange} />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ExamPaperUpload() {
  const [examFile, setExamFile]             = useState(null);
  const [markSchemeFile, setMarkSchemeFile] = useState(null);
  const [examDragging, setExamDragging]     = useState(false);
  const [schemeDragging, setSchemeDragging] = useState(false);
  const [metadata, setMetadata] = useState({
    subject: "", topic: "", grade: "", difficulty: "medium",
    year: new Date().getFullYear()
  });
  const [extractedQuiz, setExtractedQuiz]   = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [loading, setLoading]               = useState(false);
  const [actionLoading, setActionLoading]   = useState("");
  const [error, setError]                   = useState("");
  const [notice, setNotice]                 = useState("");

  const [editingIndex, setEditingIndex]     = useState(null);
  const [editForm, setEditForm]             = useState(null);

  const [classes, setClasses]               = useState([]);
  const [showModal, setShowModal]           = useState(false);
  const [selectedClassIdx, setSelectedClassIdx] = useState(null);

  React.useEffect(() => { fetchClasses(); }, []);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const user  = JSON.parse(localStorage.getItem("chikoroai_user"));
      const res   = await axios.get(
        `https://api.chikoro-ai.com/api/system/teacher/my-students/${user.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        const uniqueSubjects = [...new Set(res.data.students.map(s => s.subject))];
        setClasses(uniqueSubjects.map(subject => ({
          subject,
          students: res.data.students.filter(s => s.subject === subject)
        })));
      }
    } catch (err) { console.error("Error fetching classes:", err); }
  };

  // ── File handling ────────────────────────────────────────────────────────
  const validFile = f => f && /\.(pdf|jpe?g|png)$/i.test(f.name);

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (validFile(file)) type === "exam" ? setExamFile(file) : setMarkSchemeFile(file);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    type === "exam" ? setExamDragging(false) : setSchemeDragging(false);
    const file = e.dataTransfer.files[0];
    if (validFile(file)) type === "exam" ? setExamFile(file) : setMarkSchemeFile(file);
  };

  // ── Upload & extract ─────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!examFile) { setError("Please upload an exam paper."); return; }
    setLoading(true); setError(""); setNotice(""); setExtractedQuiz(null);
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const formData = new FormData();
      formData.append("examPaper", examFile);
      if (markSchemeFile) formData.append("markScheme", markSchemeFile);
      formData.append("metadata", JSON.stringify(metadata));
      const res = await axios.post(
        "https://api.chikoro-ai.com/api/teacher/extract-exam-paper",
        formData,
        { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } }
      );
      if (res.data.success) {
        setExtractedQuiz(res.data.extractedQuiz);
        setParsedQuestions(parseQuiz(res.data.extractedQuiz.content));
      } else {
        setError(res.data.error || "Failed to extract exam paper.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error processing exam paper. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Quiz parsing (unchanged logic) ──────────────────────────────────────
  const parseQuiz = (rawQuiz) => {
    let normalised = rawQuiz
      .replace(/\[(\w+)\]\s*(\d+)\.\s*/g, '$2. [$1] ')
      .replace(/^[📝📋✅💡📊🔗✍️🔲]\s*\w+\s*\n/gm, '')
      .replace(/^\s*\d{1,3}\s*$/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    const blocks = normalised.split(/\n(?=\d+\.\s)/);
    const parsed = [];

    blocks.forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) return;
      const lines = trimmed.split('\n');
      const firstLine = lines[0];
      const qMatch = firstLine.match(/^(\d+)\.\s+(?:\[([A-Z_]+)\]\s+)?([\s\S]*)/i);
      if (!qMatch) return;
      const detectedTag  = qMatch[2]?.toUpperCase() || null;
      let   questionText = qMatch[3]?.trim() || '';
      questionText = questionText.replace(/^\d+\s+\d+\s+/, '');
      const body  = lines.slice(1).join('\n').trim();
      const msIdx = lines.findIndex(l => /^Mark Scheme:/i.test(l.trim()));
      const markScheme = msIdx > 0 ? lines.slice(msIdx + 1).join('\n').trim() : '';

      if (detectedTag === 'MCQ' || (!detectedTag && /^[A-D]\)/m.test(body))) {
        const options     = lines.filter(l => /^\s*[A-D]\)/.test(l)).map(l => l.trim());
        const answerMatch = trimmed.match(/\*{0,2}Answer:\s*([A-D])\*{0,2}/i);
        parsed.push({ type: 'multiple-choice', question: questionText, options, answer: answerMatch?.[1]?.toUpperCase() || null });
        return;
      }
      if (detectedTag === 'TRUE_FALSE') {
        const answerMatch = body.match(/Answer:\s*(True|False)/i);
        parsed.push({ type: 'true-false', question: questionText, answer: answerMatch?.[1] || '' });
        return;
      }
      if (detectedTag === 'FILL' || (!detectedTag && /_{3,}/.test(questionText))) {
        const answerMatch = body.match(/Answer:\s*(.+)/i);
        parsed.push({ type: 'fill-blank', question: questionText, answer: answerMatch?.[1]?.trim() || '' });
        return;
      }
      if (detectedTag === 'MATCH') {
        const termsMatch  = body.match(/Terms:\s*(.+)/i);
        const defsMatch   = body.match(/Definitions:\s*(.+)/i);
        const answerMatch = body.match(/Answer:\s*(.+)/i);
        parsed.push({
          type: 'matching', question: questionText,
          terms:       termsMatch?.[1]?.split('|').map(s => s.trim()) || [],
          definitions: defsMatch?.[1]?.split('|').map(s => s.trim()) || [],
          answer:      answerMatch?.[1]?.trim() || ''
        });
        return;
      }
      if (detectedTag === 'ESSAY') {
        parsed.push({ type: 'essay', question: questionText, markScheme });
        return;
      }
      if (detectedTag === 'DATA') {
        const bodyBeforeMS = msIdx > 0 ? lines.slice(1, msIdx).join('\n').trim() : body;
        const fullQuestion = bodyBeforeMS ? `${questionText}\n${bodyBeforeMS}` : questionText;
        parsed.push({ type: 'data-response', question: fullQuestion, markScheme });
        return;
      }
      const bodyBeforeMS = msIdx > 0 ? lines.slice(1, msIdx).join('\n').trim() : body;
      const fullQuestion = bodyBeforeMS ? `${questionText}\n${bodyBeforeMS}` : questionText;
      parsed.push({ type: 'structured', question: fullQuestion, markScheme: markScheme || 'No mark scheme provided' });
    });

    return parsed;
  };

  const reconstructQuiz = (questions) =>
    questions.map((q, i) => {
      switch (q.type) {
        case 'multiple-choice': return `${i+1}. [MCQ] ${q.question}\n${q.options.join('\n')}${q.answer ? `\n**Answer: ${q.answer}**` : ''}`;
        case 'true-false':      return `${i+1}. [TRUE_FALSE] ${q.question}\nAnswer: ${q.answer}`;
        case 'fill-blank':      return `${i+1}. [FILL] ${q.question}\nAnswer: ${q.answer}`;
        case 'matching':        return `${i+1}. [MATCH] ${q.question}\nTerms: ${q.terms.join(' | ')}\nDefinitions: ${q.definitions.join(' | ')}\nAnswer: ${q.answer}`;
        case 'essay':           return `${i+1}. [ESSAY] ${q.question}\nMark Scheme:\n${q.markScheme}`;
        case 'data-response':   return `${i+1}. [DATA] ${q.question}\nMark Scheme:\n${q.markScheme}`;
        default:                return `${i+1}. [STRUCTURED] ${q.question}\nMark Scheme:\n${q.markScheme}`;
      }
    }).join('\n\n');

  // ── Edit handlers ────────────────────────────────────────────────────────
  const startEdit = (idx, item) => {
    setEditingIndex(idx);
    const base = { type: item.type, question: item.question };
    switch (item.type) {
      case 'multiple-choice': return setEditForm({ ...base, options: item.options.map(o => o.replace(/^[A-D]\)\s*/, '')), answer: item.answer });
      case 'true-false':      return setEditForm({ ...base, answer: item.answer });
      case 'fill-blank':      return setEditForm({ ...base, answer: item.answer });
      case 'matching':        return setEditForm({ ...base, terms: item.terms, definitions: item.definitions, answer: item.answer });
      default:                return setEditForm({ ...base, markScheme: item.markScheme?.replace(/^Mark Scheme:\s*/i, '') || '' });
    }
  };

  const handleSaveEdit = (idx) => {
    if (!editForm) return;
    const updated = [...parsedQuestions];
    switch (editForm.type) {
      case 'multiple-choice':
        updated[idx] = { ...updated[idx], question: editForm.question,
          options: editForm.options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`), answer: editForm.answer };
        break;
      case 'true-false':
      case 'fill-blank':
        updated[idx] = { ...updated[idx], question: editForm.question, answer: editForm.answer };
        break;
      case 'matching':
        updated[idx] = { ...updated[idx], question: editForm.question,
          terms: editForm.terms, definitions: editForm.definitions, answer: editForm.answer };
        break;
      default:
        updated[idx] = { ...updated[idx], question: editForm.question, markScheme: editForm.markScheme };
    }
    setParsedQuestions(updated);
    setExtractedQuiz(prev => ({ ...prev, content: reconstructQuiz(updated) }));
    setEditingIndex(null); setEditForm(null);
  };

  // ── PDF helpers ──────────────────────────────────────────────────────────
  const buildPdfHtml = (questions, withAnswers) => {
    let html = '<div style="font-family: Georgia, serif; color: #000;">';
    questions.forEach((item, idx) => {
      html += `<div style="margin-bottom:28px;page-break-inside:avoid;">
        <p style="font-weight:bold;font-size:15px;margin-bottom:8px;">${idx+1}. ${item.question}</p>`;
      if (item.type === 'multiple-choice') {
        html += `<div style="margin-left:20px;line-height:1.9;">${item.options.map(o => `<div>${o}</div>`).join('')}</div>`;
        html += withAnswers
          ? `<div style="margin-top:10px;padding:8px 12px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;"><strong>Answer: ${item.answer}</strong></div>`
          : `<div style="margin-top:10px;"><strong>Answer:</strong> _______</div>`;
      } else if (item.type === 'true-false') {
        html += withAnswers
          ? `<div style="margin-top:10px;padding:8px 12px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;"><strong>Answer: ${item.answer}</strong></div>`
          : `<div style="margin-top:10px;"><strong>Circle one:</strong> &nbsp;&nbsp; True &nbsp;&nbsp;&nbsp; False</div>`;
      } else if (item.type === 'fill-blank') {
        html += withAnswers
          ? `<div style="margin-top:10px;padding:8px 12px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;"><strong>Answer: ${item.answer}</strong></div>`
          : '';
      } else if (item.type === 'matching') {
        html += `<div style="display:flex;gap:40px;margin-top:10px;margin-left:20px;">
          <div><strong>Terms</strong><ol>${item.terms.map(t => `<li>${t}</li>`).join('')}</ol></div>
          <div><strong>Definitions</strong><ol type="A">${item.definitions.map(d => `<li>${d}</li>`).join('')}</ol></div>
        </div>`;
        if (withAnswers && item.answer) {
          html += `<div style="margin-top:10px;padding:8px 12px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;"><strong>Answers:</strong> ${item.answer}</div>`;
        }
      } else {
        const lines = withAnswers && item.markScheme ? item.markScheme.replace(/\n/g, '<br>') : null;
        html += withAnswers && lines
          ? `<div style="margin-top:10px;padding:12px 15px;background:#e7f3ff;border-left:4px solid #4f46e5;border-radius:4px;"><strong>Mark Scheme:</strong><div style="margin-top:6px;line-height:1.6;">${lines}</div></div>`
          : `<div style="margin-top:12px;border:1px solid #ccc;min-height:${item.type === 'essay' ? '200px' : '80px'};padding:12px;background:#fafafa;"><em style="color:#bbb;">Answer space</em></div>`;
      }
      html += '</div>';
    });
    return html + '</div>';
  };

  const generatePdf = async (html, filename) => {
    const div = document.createElement("div");
    div.style.cssText = "position:absolute;left:-9999px;width:800px;padding:20px;background:#fff;color:#000;";
    div.innerHTML = html;
    document.body.appendChild(div);
    const canvas = await html2canvas(div, { scale: 2, backgroundColor: "#ffffff" });
    const pdf    = new jsPDF("p", "mm", "a4");
    const pdfW   = pdf.internal.pageSize.getWidth();
    const pdfH   = (canvas.height * pdfW) / canvas.width;
    const pageH  = pdf.internal.pageSize.getHeight();
    let left = pdfH, pos = 0;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, pos, pdfW, pdfH);
    left -= pageH;
    while (left > 0) { pos = left - pdfH; pdf.addPage(); pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, pos, pdfW, pdfH); left -= pageH; }
    pdf.save(filename);
    document.body.removeChild(div);
  };

  const saveStudentVersion = async () => {
    setActionLoading("student");
    try { await generatePdf(buildPdfHtml(parsedQuestions, false), `${metadata.subject || "Exam"}_${metadata.year}_Student_${new Date().toISOString().slice(0,10)}.pdf`); }
    catch (e) { setError("Could not generate PDF."); }
    finally { setActionLoading(""); }
  };

  const saveAnswerKey = async () => {
    setActionLoading("answer");
    try { await generatePdf(buildPdfHtml(parsedQuestions, true), `${metadata.subject || "Exam"}_${metadata.year}_AnswerKey_${new Date().toISOString().slice(0,10)}.pdf`); }
    catch (e) { setError("Could not generate PDF."); }
    finally { setActionLoading(""); }
  };

  const openShareModal = () => {
    if (!classes.length) { setError("You don't have any classes yet. Link students first."); return; }
    setNotice(""); setSelectedClassIdx(null); setShowModal(true);
  };

  const confirmShare = async () => {
    if (selectedClassIdx === null) return;
    const cls = classes[selectedClassIdx];
    setShowModal(false); setActionLoading("share");
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher/share-quiz-with-class",
        { quiz: extractedQuiz.content, subject: metadata.subject, topic: metadata.topic, difficulty: metadata.difficulty, studentIds: cls.students.map(s => s.id) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        try { await navigator.clipboard.writeText(res.data.quizLink); } catch {}
        setNotice(`Shared with ${cls.subject} (${cls.students.length} students). Quiz link copied to clipboard.`);
      } else {
        setError(`Failed to share: ${res.data.error}`);
      }
    } catch (e) { setError("Error sharing exam with class."); }
    finally { setActionLoading(""); setSelectedClassIdx(null); }
  };

  const getPublicLink = async () => {
    setActionLoading("link");
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher/create-quiz-link",
        { quiz: extractedQuiz.content, subject: metadata.subject, topic: metadata.topic },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.link) {
        try { await navigator.clipboard.writeText(res.data.link); } catch {}
        setNotice(`Public link copied to clipboard: ${res.data.link}`);
      } else {
        setError("Could not generate public link.");
      }
    } catch (e) { setError("Error generating public link."); }
    finally { setActionLoading(""); }
  };

  // ── Action button factory ────────────────────────────────────────────────
  const actionBtnColors = {
    student: { bg: "rgba(79,70,229,.1)",  color: "#4f46e5" },
    answer:  { bg: "rgba(5,150,105,.1)",  color: "#059669" },
    share:   { bg: "rgba(8,145,178,.1)",  color: "#0891b2" },
    link:    { bg: "rgba(217,119,6,.1)",  color: "#d97706" },
  };

  const ActionBtn = ({ id, icon: Icon, label, onClick }) => {
    const { bg, color } = actionBtnColors[id];
    return (
      <button type="button" onClick={onClick} disabled={!!actionLoading}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "9px 18px", borderRadius: 9, border: "none",
          background: bg, color,
          fontWeight: 700, fontSize: 13, cursor: !!actionLoading ? "not-allowed" : "pointer",
          fontFamily: "inherit", opacity: actionLoading && actionLoading !== id ? .5 : 1,
          transition: "opacity .2s",
        }}
        onMouseEnter={e => { if (!actionLoading) e.currentTarget.style.opacity = ".8"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = actionLoading && actionLoading !== id ? ".5" : "1"; }}>
        {actionLoading === id
          ? <div style={{ width: 13, height: 13, border: `2px solid ${color}40`, borderTopColor: color, borderRadius: "50%", animation: "eu-spin .8s linear infinite" }} />
          : <Icon size={14} />}
        {label}
      </button>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--theme-bg-primary)", fontFamily: "inherit" }}>
      <style>{`
        @keyframes eu-spin    { to { transform: rotate(360deg); } }
        @keyframes eu-fadeUp  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        .eu-fade { animation: eu-fadeUp .5s cubic-bezier(.4,0,.2,1) both; }
        .eu-input:focus {
          border-color: var(--theme-button-primary) !important;
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-button-primary) 15%, transparent) !important;
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "clamp(1rem, 4vw, 2.5rem)" }}>

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
        <div className="eu-fade" style={{
          background: "var(--theme-bg-secondary)",
          borderRadius: 18, padding: "36px 40px",
          textAlign: "center", marginBottom: 32,
          boxShadow: "0 10px 30px rgba(0,0,0,.2)",
        }}>
          <h1 style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)", fontWeight: 800, color: "#fff", margin: "0 0 10px" }}>
            📄 Upload Past Exam Papers
          </h1>
          <p style={{ color: "#e0e7ff", fontSize: 15, margin: 0, maxWidth: 560, marginInline: "auto", lineHeight: 1.6 }}>
            Upload exam papers and marking schemes — AI extracts and formats questions ready for students.
          </p>
        </div>

        {/* Form card */}
        <div style={{
          background: "var(--theme-bg-secondary)",
          border: "1px solid var(--theme-sidebar-border)",
          borderRadius: 16, padding: 28,
          boxShadow: "0 4px 12px rgba(0,0,0,.1)",
          marginBottom: 24,
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)", margin: "0 0 20px", paddingBottom: 12, borderBottom: "1px solid var(--theme-sidebar-border)" }}>
            Exam Details
          </h2>

          <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 18 }}>

            {/* Metadata fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>
                  Subject / Class
                </label>
                <input className="eu-input" type="text" placeholder="e.g. Geography"
                  value={metadata.subject}
                  onChange={e => setMetadata(p => ({ ...p, subject: e.target.value }))}
                  style={inputStyle} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--theme-text-primary)" }}>
                  Code of Paper
                </label>
                <input className="eu-input" type="text" placeholder="e.g. 6037/2"
                  value={metadata.topic}
                  onChange={e => setMetadata(p => ({ ...p, topic: e.target.value }))}
                  style={inputStyle} />
              </div>
            </div>

            {/* Dropzones */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              <Dropzone
                file={examFile} isDragging={examDragging}
                onDragOver={e => { e.preventDefault(); setExamDragging(true); }}
                onDragLeave={() => setExamDragging(false)}
                onDrop={e => handleDrop(e, "exam")}
                onChange={e => handleFileChange(e, "exam")}
                inputId="exam-file" icon={FiUpload}
                title="Exam Paper *" hint="PDF or Image — drag & drop or click"
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <Dropzone
                file={markSchemeFile} isDragging={schemeDragging}
                onDragOver={e => { e.preventDefault(); setSchemeDragging(true); }}
                onDragLeave={() => setSchemeDragging(false)}
                onDrop={e => handleDrop(e, "scheme")}
                onChange={e => handleFileChange(e, "scheme")}
                inputId="scheme-file" icon={FiFileText}
                title="Mark Scheme (optional)" hint="PDF or Image — drag & drop or click"
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading || !examFile}
              style={{
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                padding: "11px 20px", borderRadius: 10,
                background: loading || !examFile ? "var(--theme-sidebar-item-default)" : "var(--theme-button-primary)",
                color: loading || !examFile ? "var(--theme-text-secondary)" : "#fff",
                fontWeight: 700, fontSize: 14, cursor: loading || !examFile ? "not-allowed" : "pointer",
                border: "none", fontFamily: "inherit", width: "100%",
                transition: "opacity .2s",
              }}>
              {loading
                ? <><div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "eu-spin .8s linear infinite" }} /> Extracting & Processing…</>
                : <><FiUpload /> Extract Questions</>
              }
            </button>

            {/* Error */}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.25)",
                color: "#dc2626", padding: "12px 16px", borderRadius: 10,
                fontWeight: 600, fontSize: 13,
              }}>
                <FiAlertCircle /> {error}
              </div>
            )}
          </form>
        </div>

        {/* Results */}
        {parsedQuestions.length > 0 && (
          <div className="eu-fade" style={{
            background: "var(--theme-bg-secondary)",
            border: "1px solid var(--theme-sidebar-border)",
            borderRadius: 16, overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,.1)",
          }}>
            {/* Results header / action bar */}
            <div style={{
              display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10,
              padding: "14px 20px",
              borderBottom: "1px solid var(--theme-sidebar-border)",
              background: "var(--theme-bg-sidebar)",
            }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--theme-text-primary)" }}>
                Extracted Questions
              </h2>

              {/* Summary badges */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginLeft: 8 }}>
                <span style={{
                  padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  background: "color-mix(in srgb, var(--theme-button-primary) 12%, transparent)",
                  color: "var(--theme-button-primary)",
                  border: "1px solid color-mix(in srgb, var(--theme-button-primary) 25%, transparent)",
                }}>
                  {parsedQuestions.length} Questions
                </span>
                {extractedQuiz?.hasMarkScheme && (
                  <span style={{
                    padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: "color-mix(in srgb, #059669 12%, transparent)", color: "#059669",
                    border: "1px solid color-mix(in srgb, #059669 25%, transparent)",
                  }}>
                    With Mark Scheme
                  </span>
                )}
              </div>

              {/* Action buttons */}
              <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <ActionBtn id="student" icon={FiSave}    label="Student Version" onClick={saveStudentVersion} />
                <ActionBtn id="answer"  icon={FiFileText} label="Answer Key"      onClick={saveAnswerKey} />
                <ActionBtn id="share"   icon={FiShare2}   label="Share to Class"  onClick={openShareModal} />
                <ActionBtn id="link"    icon={FiLink}     label="Public Link"     onClick={getPublicLink} />
              </div>
            </div>

            {/* Notice */}
            {notice && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", fontSize: 13, fontWeight: 600,
                background: "color-mix(in srgb, #059669 8%, transparent)",
                color: "#059669",
                borderBottom: "1px solid color-mix(in srgb, #059669 20%, var(--theme-sidebar-border))",
              }}>
                <FiCheck size={14} /> {notice}
              </div>
            )}

            {/* Question cards */}
            <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column" }}>
              {parsedQuestions.map((item, idx) => (
                <QuestionCard
                  key={idx} item={item} idx={idx}
                  editingIndex={editingIndex} editForm={editForm} setEditForm={setEditForm}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={() => { setEditingIndex(null); setEditForm(null); }}
                  onStartEdit={startEdit}
                />
              ))}
            </div>
          </div>
        )}

      </div>

      {showModal && (
        <ClassSelectorModal
          classes={classes}
          selectedIndex={selectedClassIdx}
          onSelect={setSelectedClassIdx}
          onConfirm={confirmShare}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
} 
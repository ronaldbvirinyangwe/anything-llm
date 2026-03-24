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
import "./examupload.css";

// ─── Question Card (view + edit mode) ────────────────────────────────────────
function QuestionCard({ item, idx, editingIndex, editForm, setEditForm, onSaveEdit, onCancelEdit, onStartEdit }) {
  const isEditing = editingIndex === idx;

  if (isEditing && editForm) {
    return (
      <div className="eu-question-card editing">
        <div className="eu-question-header">
          <span className="eu-badge edit-badge">Editing</span>
          <h3>Question {idx + 1}</h3>
        </div>
        <div className="eu-edit-form">
          <div className="eu-form-group">
            <label>Question Text</label>
            <textarea
              value={editForm.question}
              rows="3"
              onChange={e => setEditForm({ ...editForm, question: e.target.value })}
            />
          </div>
          {editForm.type === "multiple-choice" ? (
            <>
              <div className="eu-form-group">
                <label>Options</label>
                {editForm.options.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    onChange={e => {
                      const opts = [...editForm.options];
                      opts[i] = e.target.value;
                      setEditForm({ ...editForm, options: opts });
                    }}
                  />
                ))}
              </div>
              <div className="eu-form-group">
                <label>Correct Answer</label>
                <select
                  value={editForm.answer || "A"}
                  onChange={e => setEditForm({ ...editForm, answer: e.target.value })}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </>
          ) : (
            <div className="eu-form-group">
              <label>Mark Scheme</label>
              <textarea
                value={editForm.markScheme}
                rows="5"
                onChange={e => setEditForm({ ...editForm, markScheme: e.target.value })}
              />
            </div>
          )}
        </div>
        <div className="eu-edit-actions">
          <button className="eu-edit-btn save" onClick={() => onSaveEdit(idx)}>
            <FiCheck /> Save
          </button>
          <button className="eu-edit-btn cancel" onClick={onCancelEdit}>
            <FiX /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`eu-question-card${item.type === "structured" ? " structured" : ""}`}>
      <div className="eu-question-header">
        <span className={`eu-badge${item.type === "structured" ? " structured-badge" : ""}`}>
          {item.type === "multiple-choice" ? "Multiple Choice" : "Structured"}
        </span>
        <h3>{idx + 1}. {item.question}</h3>
      </div>

      {item.type === "multiple-choice" && (
        <>
          {item.options.length > 0 && (
            <ul className="eu-option-list">
              {item.options.map((opt, i) => <li key={i}>{opt}</li>)}
            </ul>
          )}
          {item.answer && (
            <div className="eu-answer-box">
              ✅ <strong>Correct Answer:</strong> {item.answer}
            </div>
          )}
        </>
      )}

      {item.type === "structured" && item.markScheme && (
        <div className="eu-mark-scheme-box">
          <h4>📋 Mark Scheme</h4>
          <div className="eu-mark-scheme-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.markScheme}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="eu-card-actions">
        <button className="eu-action-card-btn" onClick={() => onStartEdit(idx, item)}>
          <FiEdit2 /> Edit
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ExamPaperUpload() {
  const [examFile, setExamFile]           = useState(null);
  const [markSchemeFile, setMarkSchemeFile] = useState(null);
  const [examDragging, setExamDragging]   = useState(false);
  const [schemeDragging, setSchemeDragging] = useState(false);
  const [metadata, setMetadata] = useState({
    subject: "", topic: "", grade: "", difficulty: "medium",
    year: new Date().getFullYear()
  });
  const [extractedQuiz, setExtractedQuiz] = useState(null);
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [loading, setLoading]             = useState(false);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError]                 = useState("");
  const [notice, setNotice]               = useState("");

  // Edit state
  const [editingIndex, setEditingIndex]   = useState(null);
  const [editForm, setEditForm]           = useState(null);

  // Share modal state
  const [classes, setClasses]             = useState([]);
  const [showModal, setShowModal]         = useState(false);
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
        const parsed = parseQuiz(res.data.extractedQuiz.content);
        setParsedQuestions(parsed);
      } else {
        setError(res.data.error || "Failed to extract exam paper.");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error processing exam paper. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Quiz parsing ─────────────────────────────────────────────────────────
  const parseQuiz = (rawQuiz) => {
    const blocks = rawQuiz.trim().split(/\n(?=\d+\.)/);
    const parsed = [];
    blocks.forEach(block => {
      const trimmed = block.trim();
      if (!trimmed) return;
      const lines = trimmed.split('\n');
      const qMatch = lines[0].match(/^(\d+)\.\s+(.+)/);
      if (!qMatch) return;
      const options = lines.filter(l => /^[A-D]\)/.test(l.trim()));
      const answerMatch = trimmed.match(/\*{0,2}Answer:\s*([A-D])\*{0,2}/i);
      if (options.length >= 4 || answerMatch) {
        parsed.push({
          type: "multiple-choice",
          question: qMatch[2],
          options: options.length >= 4 ? options : [],
          answer: answerMatch ? answerMatch[1].toUpperCase() : null,
          raw: trimmed
        });
      } else {
        const msIdx = lines.findIndex(l => /^Mark Scheme:/i.test(l.trim()));
        parsed.push({
          type: "structured",
          question: msIdx > 0
            ? lines.slice(0, msIdx).join('\n').replace(/^\d+\.\s*/, '')
            : qMatch[2],
          markScheme: msIdx > 0
            ? lines.slice(msIdx).join('\n')
            : (lines.slice(1).join('\n') || "No mark scheme provided"),
          raw: trimmed
        });
      }
    });
    return parsed;
  };

  const reconstructQuiz = (questions) =>
    questions.map((q, i) =>
      q.type === "multiple-choice"
        ? `${i+1}. ${q.question}\n${q.options.join('\n')}${q.answer ? `\nAnswer: ${q.answer}` : ''}`
        : `${i+1}. ${q.question}\n${q.markScheme}`
    ).join('\n\n');

  // ── Edit handlers ────────────────────────────────────────────────────────
  const startEdit = (idx, item) => {
    setEditingIndex(idx);
    setEditForm(
      item.type === "multiple-choice"
        ? { type: "multiple-choice", question: item.question, options: item.options.map(o => o.replace(/^[A-D]\)\s*/, "")), answer: item.answer }
        : { type: "structured", question: item.question, markScheme: item.markScheme.replace(/^Mark Scheme:\s*/i, "") }
    );
  };

  const handleSaveEdit = (idx) => {
    if (!editForm) return;
    const updated = [...parsedQuestions];
    updated[idx] = editForm.type === "multiple-choice"
      ? { ...updated[idx], question: editForm.question, options: editForm.options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`), answer: editForm.answer }
      : { ...updated[idx], question: editForm.question, markScheme: `Mark Scheme: ${editForm.markScheme}` };
    const newQuizContent = reconstructQuiz(updated);
    setParsedQuestions(updated);
    setExtractedQuiz(prev => ({ ...prev, content: newQuizContent }));
    setEditingIndex(null); setEditForm(null);
  };

  // ── PDF helpers ──────────────────────────────────────────────────────────
  const buildPdfHtml = (questions, withAnswers) => {
    let html = '<div style="font-family: Arial, sans-serif; color: #000;">';
    questions.forEach((item, idx) => {
      if (item.type === "multiple-choice") {
        html += `<div style="margin-bottom:30px;page-break-inside:avoid;">
          <p style="font-weight:bold;font-size:16px;margin-bottom:10px;">${idx+1}. ${item.question}</p>
          <div style="margin-left:20px;line-height:1.8;">${item.options.map(o => `<div>${o}</div>`).join("")}</div>
          <div style="margin-top:12px;${withAnswers ? "padding:10px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;" : "border-top:1px solid #eee;padding-top:10px;"}">
            ${withAnswers ? `<strong style="color:#155724;">Correct Answer: ${item.answer}</strong>` : "<strong>Answer: __________</strong>"}
          </div></div>`;
      } else {
        html += `<div style="margin-bottom:30px;page-break-inside:avoid;">
          <p style="font-weight:bold;font-size:16px;margin-bottom:10px;">${idx+1}. ${item.question}</p>
          ${withAnswers
            ? `<div style="margin-top:10px;padding:15px;background:#e7f3ff;border-left:4px solid #4f46e5;border-radius:4px;"><strong>Mark Scheme:</strong><div style="margin-top:8px;line-height:1.6;">${item.markScheme.replace(/\n/g,"<br>")}</div></div>`
            : `<div style="margin-top:15px;border:1px solid #ddd;padding:15px;min-height:100px;background:#f9f9f9;"><em style="color:#aaa;">Write your answer here...</em></div>`
          }</div>`;
      }
    });
    return html + "</div>";
  };

  const generatePdf = async (html, filename) => {
    const div = document.createElement("div");
    div.style.cssText = "position:absolute;left:-9999px;width:800px;padding:20px;background:#fff;color:#000;";
    div.innerHTML = html;
    document.body.appendChild(div);
    const canvas  = await html2canvas(div, { scale: 2, backgroundColor: "#ffffff" });
    const pdf     = new jsPDF("p", "mm", "a4");
    const pdfW    = pdf.internal.pageSize.getWidth();
    const pdfH    = (canvas.height * pdfW) / canvas.width;
    const pageH   = pdf.internal.pageSize.getHeight();
    let left = pdfH, pos = 0;
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, pos, pdfW, pdfH);
    left -= pageH;
    while (left > 0) { pos = left - pdfH; pdf.addPage(); pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, pos, pdfW, pdfH); left -= pageH; }
    pdf.save(filename);
    document.body.removeChild(div);
  };

  const saveStudentVersion = async () => {
    setActionLoading("student");
    try {
      await generatePdf(
        buildPdfHtml(parsedQuestions, false),
        `${metadata.subject || "Exam"}_${metadata.year}_Student_${new Date().toISOString().slice(0,10)}.pdf`
      );
    } catch (e) { console.error(e); setError("Could not generate PDF."); }
    finally { setActionLoading(""); }
  };

  const saveAnswerKey = async () => {
    setActionLoading("answer");
    try {
      await generatePdf(
        buildPdfHtml(parsedQuestions, true),
        `${metadata.subject || "Exam"}_${metadata.year}_AnswerKey_${new Date().toISOString().slice(0,10)}.pdf`
      );
    } catch (e) { console.error(e); setError("Could not generate PDF."); }
    finally { setActionLoading(""); }
  };

  // ── Share with class ─────────────────────────────────────────────────────
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

  // ── Public link ──────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="eu-container">
      <nav className="eu-nav">
        <Link to="/teacher-dashboard" className="eu-back-btn">
          <FiArrowLeft /> Back to Dashboard
        </Link>
      </nav>

      <header className="eu-header">
        <h1><FiFileText style={{ marginBottom: "-3px" }} /> Upload Past Exam Papers</h1>
        <p>Upload exam papers and marking schemes — AI extracts and formats questions ready for students.</p>
      </header>

      <form className="eu-form" onSubmit={handleUpload}>
        {/* Metadata */}
        <div className="eu-form-grid">
          <div className="eu-form-group full-width">
            <label>Subject</label>
            <input
              name="subject" type="text" placeholder="e.g. Biology"
              value={metadata.subject}
              onChange={e => setMetadata(p => ({ ...p, subject: e.target.value }))}
            />
          </div>
          <div className="eu-form-group full-width">
            <label>Topic</label>
            <input
              name="topic" type="text" placeholder="e.g. Cell Biology"
              value={metadata.topic}
              onChange={e => setMetadata(p => ({ ...p, topic: e.target.value }))}
            />
          </div>
          <div className="eu-form-group">
            <label>Grade / Year Group</label>
            <input
              name="grade" type="text" placeholder="e.g. Form 4"
              value={metadata.grade}
              onChange={e => setMetadata(p => ({ ...p, grade: e.target.value }))}
            />
          </div>
          <div className="eu-form-group">
            <label>Difficulty</label>
            <select value={metadata.difficulty} onChange={e => setMetadata(p => ({ ...p, difficulty: e.target.value }))}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="eu-form-group">
            <label>Exam Year</label>
            <input
              name="year" type="number" min="2000" max={new Date().getFullYear()}
              value={metadata.year}
              onChange={e => setMetadata(p => ({ ...p, year: e.target.value }))}
            />
          </div>
        </div>

        {/* File uploads */}
        <div className="eu-file-section">
          <div
            className={`eu-dropzone${examDragging ? " dragging" : ""}${examFile ? " has-file" : ""}`}
            onDrop={e => handleDrop(e, "exam")}
            onDragOver={e => { e.preventDefault(); setExamDragging(true); }}
            onDragLeave={() => setExamDragging(false)}
          >
            <label htmlFor="exam-file" className="eu-dropzone-label">
              <FiUpload className="eu-upload-icon" />
              <span className="eu-drop-title">
                {examFile ? examFile.name : "Exam Paper *"}
              </span>
              <span className="eu-drop-hint">
                {examFile ? "Click or drop to replace" : "PDF or Image — drag & drop or click"}
              </span>
            </label>
            <input
              id="exam-file" type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => handleFileChange(e, "exam")}
            />
          </div>

          <div
            className={`eu-dropzone${schemeDragging ? " dragging" : ""}${markSchemeFile ? " has-file" : ""}`}
            onDrop={e => handleDrop(e, "scheme")}
            onDragOver={e => { e.preventDefault(); setSchemeDragging(true); }}
            onDragLeave={() => setSchemeDragging(false)}
          >
            <label htmlFor="scheme-file" className="eu-dropzone-label">
              <FiFileText className="eu-upload-icon" />
              <span className="eu-drop-title">
                {markSchemeFile ? markSchemeFile.name : "Mark Scheme (optional)"}
              </span>
              <span className="eu-drop-hint">
                {markSchemeFile ? "Click or drop to replace" : "PDF or Image — drag & drop or click"}
              </span>
            </label>
            <input
              id="scheme-file" type="file" accept=".pdf,.jpg,.jpeg,.png"
              onChange={e => handleFileChange(e, "scheme")}
            />
          </div>
        </div>

        <button className="eu-submit-btn" type="submit" disabled={loading || !examFile}>
          {loading ? <span className="eu-spinner" /> : <FiUpload />}
          {loading ? "Extracting & Processing..." : "Extract Questions"}
        </button>

        {error && (
          <p className="eu-error">
            <FiAlertCircle /> {error}
          </p>
        )}
      </form>

      {/* Results */}
      {parsedQuestions.length > 0 && (
        <section className="eu-results">
          <div className="eu-results-header">
            <h2>Extracted Questions</h2>
            <div className="eu-results-badges">
              <span className="eu-meta-badge">{parsedQuestions.length} Questions</span>
              {extractedQuiz?.hasMarkScheme && <span className="eu-meta-badge">With Mark Scheme</span>}
            </div>
          </div>

          {parsedQuestions.map((item, idx) => (
            <QuestionCard
              key={idx} item={item} idx={idx}
              editingIndex={editingIndex} editForm={editForm} setEditForm={setEditForm}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => { setEditingIndex(null); setEditForm(null); }}
              onStartEdit={startEdit}
            />
          ))}

          {notice && <p className="eu-notice"><FiCheck /> {notice}</p>}

          <div className="eu-actions-bar">
            <button className="eu-act-btn save" onClick={saveStudentVersion} disabled={!!actionLoading}>
              {actionLoading === "student" ? <span className="eu-spinner sm" /> : <FiSave />}
              Student Version
            </button>
            <button className="eu-act-btn answer" onClick={saveAnswerKey} disabled={!!actionLoading}>
              {actionLoading === "answer" ? <span className="eu-spinner sm" /> : <FiFileText />}
              Answer Key
            </button>
            <button className="eu-act-btn share" onClick={openShareModal} disabled={!!actionLoading}>
              {actionLoading === "share" ? <span className="eu-spinner sm" /> : <FiShare2 />}
              Share to Class
            </button>
            <button className="eu-act-btn link" onClick={getPublicLink} disabled={!!actionLoading}>
              {actionLoading === "link" ? <span className="eu-spinner sm" /> : <FiLink />}
              Public Link
            </button>
          </div>
        </section>
      )}

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

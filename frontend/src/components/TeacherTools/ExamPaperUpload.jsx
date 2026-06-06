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
            <textarea rows="3" value={editForm.question}
              onChange={e => setEditForm({ ...editForm, question: e.target.value })} />
          </div>

          {editForm.type === 'multiple-choice' && (<>
            <div className="eu-form-group">
              <label>Options</label>
              {editForm.options.map((opt, i) => (
                <input key={i} type="text" value={opt} placeholder={`Option ${String.fromCharCode(65+i)}`}
                  onChange={e => { const o = [...editForm.options]; o[i] = e.target.value; setEditForm({ ...editForm, options: o }); }} />
              ))}
            </div>
            <div className="eu-form-group">
              <label>Correct Answer</label>
              <select value={editForm.answer || 'A'} onChange={e => setEditForm({ ...editForm, answer: e.target.value })}>
                {['A','B','C','D'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </>)}

          {editForm.type === 'true-false' && (
            <div className="eu-form-group">
              <label>Answer</label>
              <select value={editForm.answer} onChange={e => setEditForm({ ...editForm, answer: e.target.value })}>
                <option value="True">True</option>
                <option value="False">False</option>
              </select>
            </div>
          )}

          {(editForm.type === 'fill-blank') && (
            <div className="eu-form-group">
              <label>Answer</label>
              <input type="text" value={editForm.answer}
                onChange={e => setEditForm({ ...editForm, answer: e.target.value })} />
            </div>
          )}

          {['structured', 'essay', 'data-response'].includes(editForm.type) && (
            <div className="eu-form-group">
              <label>Mark Scheme</label>
              <textarea rows="6" value={editForm.markScheme}
                onChange={e => setEditForm({ ...editForm, markScheme: e.target.value })} />
            </div>
          )}
        </div>
        <div className="eu-edit-actions">
          <button className="eu-edit-btn save" onClick={() => onSaveEdit(idx)}><FiCheck /> Save</button>
          <button className="eu-edit-btn cancel" onClick={onCancelEdit}><FiX /> Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`eu-question-card ${item.type}`}>
      <div className="eu-question-header">
        <span className={`eu-badge type-${item.type}`}>
          {TYPE_ICONS[item.type]} {TYPE_LABELS[item.type] || item.type}
        </span>
       <h3>
  {idx + 1}. {item.question.split('\n')[0]}
</h3>
      </div>

      {/* Multiple Choice */}
      {item.type === 'multiple-choice' && (<>
        {item.options.length > 0 && <ul className="eu-option-list">{item.options.map((o,i) => <li key={i}>{o}</li>)}</ul>}
        {item.answer && <div className="eu-answer-box">✅ <strong>Correct Answer:</strong> {item.answer}</div>}
      </>)}

      {/* True / False */}
      {item.type === 'true-false' && (
        <div className="eu-answer-box">
          {item.answer === 'True' ? '✅' : '❌'} <strong>Answer:</strong> {item.answer}
        </div>
      )}

      {/* Fill in the Blank */}
      {item.type === 'fill-blank' && (
        <div className="eu-answer-box">💡 <strong>Answer:</strong> {item.answer}</div>
      )}

      {/* Matching */}
      {item.type === 'matching' && (
        <div className="eu-mark-scheme-box">
          <h4>🔗 Match</h4>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div><strong>Terms</strong><ul>{item.terms.map((t,i) => <li key={i}>{t}</li>)}</ul></div>
            <div><strong>Definitions</strong><ul>{item.definitions.map((d,i) => <li key={i}>{d}</li>)}</ul></div>
          </div>
          {item.answer && <div className="eu-answer-box" style={{ marginTop: '0.5rem' }}>✅ <strong>Answers:</strong> {item.answer}</div>}
        </div>
      )}

   {/* Data Response */}
{item.type === 'data-response' && (
  <>
    {/* Render multi-line question body (figure notes, sub-questions) */}
    {item.question.includes('\n') && (
      <div className="eu-question-body">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {item.question.split('\n').slice(1).join('\n')}
        </ReactMarkdown>
      </div>
    )}
    {item.markScheme && (
      <div className="eu-mark-scheme-box">
        <h4>📋 Mark Scheme</h4>
        <div className="eu-mark-scheme-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.markScheme}</ReactMarkdown>
        </div>
      </div>
    )}
  </>
)}

      <div className="eu-card-actions">
        <button className="eu-action-card-btn" onClick={() => onStartEdit(idx, item)}><FiEdit2 /> Edit</button>
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
  // ─── Universal Quiz Parser ────────────────────────────────────────────────────
const parseQuiz = (rawQuiz) => {
  // Normalise: move tags that appear BEFORE the number to after it
  // "[STRUCTURED] 2.\n(b) text" → "2. [STRUCTURED] (b) text"
  let normalised = rawQuiz
    .replace(/\[(\w+)\]\s*(\d+)\.\s*/g, '$2. [$1] ')   // [TAG] N. → N. [TAG]
    .replace(/^[📝📋✅💡📊🔗✍️🔲]\s*\w+\s*\n/gm, '')   // strip emoji prefix lines
    .replace(/^\s*\d{1,3}\s*$/gm, '')                   // strip bare page numbers
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Split on every line that starts a new numbered question
  const blocks = normalised.split(/\n(?=\d+\.\s)/);
  const parsed = [];

  blocks.forEach(block => {
    const trimmed = block.trim();
    if (!trimmed) return;

    const lines = trimmed.split('\n');
    const firstLine = lines[0];

    // "N. [TAG] question text" or "N. question text"
    const qMatch = firstLine.match(/^(\d+)\.\s+(?:\[([A-Z_]+)\]\s+)?([\s\S]*)/i);
    if (!qMatch) return;

    const detectedTag  = qMatch[2]?.toUpperCase() || null;
    let   questionText = qMatch[3]?.trim() || '';

    // Clean PDF noise: leading stray numbers like "10 5 (a) actual question"
    questionText = questionText.replace(/^\d+\s+\d+\s+/, '');

    const body  = lines.slice(1).join('\n').trim();
    const msIdx = lines.findIndex(l => /^Mark Scheme:/i.test(l.trim()));
    const markScheme = msIdx > 0
      ? lines.slice(msIdx + 1).join('\n').trim()
      : '';

    // ── Route by tag ────────────────────────────────────────────────
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
        type: 'matching',
        question: questionText,
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
      // Combine question text with any body before Mark Scheme
      const bodyBeforeMS = msIdx > 0
        ? lines.slice(1, msIdx).join('\n').trim()
        : body;
      const fullQuestion = bodyBeforeMS
        ? `${questionText}\n${bodyBeforeMS}`
        : questionText;
      parsed.push({ type: 'data-response', question: fullQuestion, markScheme });
      return;
    }

    // Default → structured
    const bodyBeforeMS = msIdx > 0 ? lines.slice(1, msIdx).join('\n').trim() : body;
    const fullQuestion = bodyBeforeMS ? `${questionText}\n${bodyBeforeMS}` : questionText;
    parsed.push({
      type: 'structured',
      question: fullQuestion,
      markScheme: markScheme || 'No mark scheme provided'
    });
  });

  return parsed;
};

// ─── Reconstruct quiz text from parsed questions ──────────────────────────────
const reconstructQuiz = (questions) =>
  questions.map((q, i) => {
    switch (q.type) {
      case 'multiple-choice':
        return `${i+1}. [MCQ] ${q.question}\n${q.options.join('\n')}${q.answer ? `\n**Answer: ${q.answer}**` : ''}`;
      case 'true-false':
        return `${i+1}. [TRUE_FALSE] ${q.question}\nAnswer: ${q.answer}`;
      case 'fill-blank':
        return `${i+1}. [FILL] ${q.question}\nAnswer: ${q.answer}`;
      case 'matching':
        return `${i+1}. [MATCH] ${q.question}\nTerms: ${q.terms.join(' | ')}\nDefinitions: ${q.definitions.join(' | ')}\nAnswer: ${q.answer}`;
      case 'essay':
        return `${i+1}. [ESSAY] ${q.question}\nMark Scheme:\n${q.markScheme}`;
      case 'data-response':
        return `${i+1}. [DATA] ${q.question}\nMark Scheme:\n${q.markScheme}`;
      default:
        return `${i+1}. [STRUCTURED] ${q.question}\nMark Scheme:\n${q.markScheme}`;
    }
  }).join('\n\n');

  // ── Edit handlers ────────────────────────────────────────────────────────
  const startEdit = (idx, item) => {
  setEditingIndex(idx);
  const base = { type: item.type, question: item.question };
  switch (item.type) {
    case 'multiple-choice':
      return setEditForm({ ...base, options: item.options.map(o => o.replace(/^[A-D]\)\s*/, '')), answer: item.answer });
    case 'true-false':
      return setEditForm({ ...base, answer: item.answer });
    case 'fill-blank':
      return setEditForm({ ...base, answer: item.answer });
    case 'matching':
      return setEditForm({ ...base, terms: item.terms, definitions: item.definitions, answer: item.answer });
    default:
      return setEditForm({ ...base, markScheme: item.markScheme?.replace(/^Mark Scheme:\s*/i, '') || '' });
  }
};

const handleSaveEdit = (idx) => {
  if (!editForm) return;
  const updated = [...parsedQuestions];
  switch (editForm.type) {
    case 'multiple-choice':
      updated[idx] = { ...updated[idx], question: editForm.question,
        options: editForm.options.map((o, i) => `${String.fromCharCode(65+i)}) ${o}`),
        answer: editForm.answer };
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
    }

    else if (item.type === 'true-false') {
      html += withAnswers
        ? `<div style="margin-top:10px;padding:8px 12px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;"><strong>Answer: ${item.answer}</strong></div>`
        : `<div style="margin-top:10px;"><strong>Circle one:</strong> &nbsp;&nbsp; True &nbsp;&nbsp;&nbsp; False</div>`;
    }

    else if (item.type === 'fill-blank') {
      html += withAnswers
        ? `<div style="margin-top:10px;padding:8px 12px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;"><strong>Answer: ${item.answer}</strong></div>`
        : '';
    }

    else if (item.type === 'matching') {
      html += `<div style="display:flex;gap:40px;margin-top:10px;margin-left:20px;">
        <div><strong>Terms</strong><ol>${item.terms.map(t => `<li>${t}</li>`).join('')}</ol></div>
        <div><strong>Definitions</strong><ol type="A">${item.definitions.map(d => `<li>${d}</li>`).join('')}</ol></div>
      </div>`;
      if (withAnswers && item.answer) {
        html += `<div style="margin-top:10px;padding:8px 12px;background:#d4edda;border-left:4px solid #28a745;border-radius:4px;"><strong>Answers:</strong> ${item.answer}</div>`;
      }
    }

    else {
      // structured, essay, data-response
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
            <label>Subject / Class</label>
            <input
              name="subject" type="text" placeholder="e.g. Geography"
              value={metadata.subject}
              onChange={e => setMetadata(p => ({ ...p, subject: e.target.value }))}
            />
          </div>
          <div className="eu-form-group full-width">
            <label>Code of Paper</label>
            <input
              name="topic" type="text" placeholder="e.g. 6037/2"
              value={metadata.topic}
              onChange={e => setMetadata(p => ({ ...p, topic: e.target.value }))}
            />
          </div>
          {/* <div className="eu-form-group">
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
          </div> */}
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

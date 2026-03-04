import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { 
  FiArrowLeft, FiCpu, FiClock, FiLayers, FiHash, 
  FiBook, FiEdit2, FiRefreshCw, FiSave, FiShare2, FiLink, FiCheck, FiX 
} from "react-icons/fi";
import "./quizgenerator.css";

// Reusable component to render text with LaTeX math
function MathText({ text }) {
  if (!text) return null;
  let processed = text;
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`);
  processed = processed.replace(
    /\(([^)]*(?:\\[a-zA-Z]+|[_^{}\d])[^)]*)\)/g,
    (match, inner) => {
      if (/\\[a-zA-Z]+|[_^]|\{.*\}/.test(inner)) {
        return `$${inner}$`;
      }
      return match;
    }
  );
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{ p: ({ children }) => <span>{children}</span> }}
    >
      {processed}
    </ReactMarkdown>
  );
}

function MathMarkdown({ children }) {
  if (!children) return null;
  let processed = children;
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`);
  processed = processed.replace(
    /\(([^)]*(?:\\[a-zA-Z]+|[_^{}\d])[^)]*)\)/g,
    (match, inner) => {
      if (/\\[a-zA-Z]+|[_^]|\{.*\}/.test(inner)) {
        return `$${inner}$`;
      }
      return match;
    }
  );
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
      {processed}
    </ReactMarkdown>
  );
}

function QuestionActions({ item, idx, isRegenerating, onStartEdit, onRegenerate }) {
  return (
    <div className="question-actions">
      <button className="edit-btn" onClick={() => onStartEdit(idx, item)} disabled={isRegenerating}>
        <FiEdit2 style={{ marginRight: '6px' }} /> Edit Question
      </button>
      <button className="regen-btn" onClick={() => onRegenerate(idx, item)} disabled={isRegenerating}>
        {isRegenerating ? <span className="spinner" style={{ borderTopColor: '#2563eb', width: '14px', height: '14px', display: 'inline-block' }}></span> : <FiRefreshCw style={{ marginRight: '6px' }} />} 
        {isRegenerating ? ' Regenerating...' : ' Regenerate with AI'}
      </button>
    </div>
  );
}

function QuestionCard({
  item, idx, editingIndex, editForm, setEditForm,
  onSaveEdit, onCancelEdit, onStartEdit, onRegenerate, regeneratingIndex,
}) {
  const isEditing = editingIndex === idx;
  const isRegenerating = regeneratingIndex === idx;

  if (isEditing && editForm) {
    return (
      <div className="quiz-question-card editing">
        <div className="question-header">
          <span className="question-badge edit-badge">Editing Mode</span>
          <h3>Question {idx + 1}</h3>
        </div>

        <div className="edit-form">
          <div className="form-group">
            <label>Question Text</label>
            <textarea
              value={editForm.question}
              onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
              rows="3"
            />
          </div>

          {editForm.type === 'multiple-choice' ? (
            <>
              <div className="form-group">
                <label>Options</label>
                {editForm.options.map((opt, i) => (
                  <div key={i} style={{ marginBottom: '10px' }}>
                    <input
                      type="text"
                      value={opt}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      onChange={(e) => {
                        const newOptions = [...editForm.options];
                        newOptions[i] = e.target.value;
                        setEditForm({ ...editForm, options: newOptions });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label>Correct Answer</label>
                <select
                  value={editForm.answer || 'A'}
                  onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </>
          ) : (
            <div className="form-group">
              <label>Mark Scheme / Expected Answer</label>
              <textarea
                value={editForm.markScheme}
                onChange={(e) => setEditForm({ ...editForm, markScheme: e.target.value })}
                rows="5"
              />
            </div>
          )}
        </div>

        <div className="question-actions" style={{ borderTop: 'none', padding: 0 }}>
          <button onClick={() => onSaveEdit(idx)} className="action-btn save" style={{ flex: 1, justifyContent: 'center' }}>
            <FiCheck /> Save
          </button>
          <button onClick={onCancelEdit} className="action-btn" style={{ flex: 1, justifyContent: 'center', background: '#fee2e2', color: '#dc2626' }}>
            <FiX /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`quiz-question-card ${item.type === 'structured' ? 'structured' : ''}`}>
      <div className="question-header">
        <div style={{ flex: 1 }}>
          <span className={`question-badge ${item.type === 'structured' ? 'structured-badge' : ''}`}>
            {item.type === 'multiple-choice' ? 'Multiple Choice' : 'Structured'}
          </span>
          <h3>{idx + 1}. <MathText text={item.question} /></h3>
        </div>
      </div>

      {item.type === 'multiple-choice' ? (
        <>
          <ul className="option-list">
            {item.options.map((opt, i) => (
              <li key={i}><MathText text={opt} /></li>
            ))}
          </ul>
          {item.answer && (
            <div className="answer-container">
              <strong>✅ Correct Answer:</strong> {item.answer}
            </div>
          )}
        </>
      ) : (
        item.markScheme && (
          <div className="mark-scheme-container">
            <h4>📋 Mark Scheme</h4>
            <div className="mark-scheme-content">
              <MathMarkdown>
                {item.markScheme.replace(/```[a-z]*\n?/gi, "").replace(/```/g, "").trim()}
              </MathMarkdown>
            </div>
          </div>
        )
      )}
      <QuestionActions
        item={item} idx={idx} isRegenerating={isRegenerating}
        onStartEdit={onStartEdit} onRegenerate={onRegenerate}
      />
    </div>
  );
}

export default function QuizGenerator() {
  const [form, setForm] = useState({
    subject: "", topic: "", grade: "", difficulty: "medium",
    numQuestions: 10, tabLimit: 1, timeLimit: 30, questionType: "mixed",
  });
  const [quiz, setQuiz] = useState("");
  const [parsedQuestions, setParsedQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const user = JSON.parse(localStorage.getItem("chikoroai_user"));
        const res = await axios.get(`https://api.chikoro-ai.com/api/system/teacher/my-students/${user.id}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) {
          const uniqueSubjects = [...new Set(res.data.students.map(s => s.subject))];
          setClasses(uniqueSubjects.map(subject => ({ subject, students: res.data.students.filter(s => s.subject === subject) })));
        }
      } catch (err) { console.error("Error fetching classes:", err); }
    };
    fetchClasses();
  }, []);

  useEffect(() => { if (quiz) setParsedQuestions(parseQuiz(quiz)); }, [quiz]);

  const cleanQuizText = (raw) => raw.replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, '').replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, '').replace(/```.*?```/gs, '').trim();

  const parseQuiz = (raw) => {
    const cleaned = cleanQuizText(raw);
    const blocks = cleaned.split(/(?=\d+\.\s+)/);
    const parsed = [];
    blocks.forEach(block => {
      if (!block.trim()) return;
      const lines = block.split('\n').filter(l => l.trim());
      const qMatch = lines[0].match(/^(\d+)\.\s+(.+)/);
      if (!qMatch) return;
      const hasOptions = lines.some(line => /^[A-D]\)/.test(line.trim()));
      if (hasOptions) {
        const options = lines.filter(line => /^[A-D]\)/.test(line.trim()));
        const ansLine = lines.find(line => /\*?\*?Answer:\s*([A-D])/i.test(line));
        parsed.push({ type: 'multiple-choice', question: qMatch[2].trim(), options, answer: ansLine?.match(/Answer:\s*([A-D])/i)?.[1], raw: block.trim() });
      } else {
        const msIdx = lines.findIndex(line => /^(Mark Scheme|Answer|Expected Answer|Marking Points?):/i.test(line));
        parsed.push({
          type: 'structured',
          question: msIdx > 0 ? lines.slice(0, msIdx).join('\n').replace(/^\d+\.\s+/, '') : qMatch[2].trim(),
          markScheme: msIdx > 0 ? lines.slice(msIdx).join('\n') : (lines.slice(1).join('\n') || 'No mark scheme provided'),
          raw: block.trim()
        });
      }
    });
    return parsed;
  };

  const reconstructQuiz = (questions) => questions.map((q, i) => q.type === 'multiple-choice' ? `${i + 1}. ${q.question}\n${q.options.join('\n')}${q.answer ? `\nAnswer: ${q.answer}` : ''}` : `${i + 1}. ${q.question}\n${q.markScheme}`).join('\n\n');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setQuiz(""); setError("");
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.post("https://api.chikoro-ai.com/api/system/teacher/generate-quiz", { ...form, numQuestions: form.numQuestions || 10, tabLimit: form.tabLimit || 1, timeLimit: form.timeLimit || 0 }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setQuiz(res.data.quiz);
      else setError(res.data.error || "Failed to generate quiz.");
    } catch (err) { setError("Error generating quiz."); } finally { setLoading(false); }
  };

  const startEdit = (idx, item) => {
    setEditingIndex(idx);
    setEditForm(item.type === 'multiple-choice' ? { type: 'multiple-choice', question: item.question, options: item.options.map(o => o.replace(/^[A-D]\)\s*/, '')), answer: item.answer } : { type: 'structured', question: item.question, markScheme: item.markScheme.replace(/^(Mark Scheme|Answer|Expected Answer|Marking Points?):\s*/i, '') });
  };

  const handleSaveEdit = (idx) => {
    if (!editForm) return;
    const updated = [...parsedQuestions];
    updated[idx] = editForm.type === 'multiple-choice' 
      ? { ...updated[idx], question: editForm.question, options: editForm.options.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`), answer: editForm.answer }
      : { ...updated[idx], question: editForm.question, markScheme: `Mark Scheme: ${editForm.markScheme}` };
    setQuiz(reconstructQuiz(updated)); setEditingIndex(null); setEditForm(null);
  };

  const handleRegenerate = async (idx, item) => {
    setRegeneratingIndex(idx);
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.post("https://api.chikoro-ai.com/api/system/teacher/redo-question", { prompt: `Regenerate this ${item.type} question: ${item.raw}` }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success && res.data.question) {
        const updated = [...parsedQuestions];
        const reparsed = parseQuiz(res.data.question);
        if (reparsed.length) { updated[idx] = reparsed[0]; setQuiz(reconstructQuiz(updated)); }
      }
    } catch (err) { console.error(err); } finally { setRegeneratingIndex(null); }
  };

  return (
    <div className="quiz-generator-container">
      <nav className="tool-nav">
        <Link to="/teacher-dashboard" className="back-btn"><FiArrowLeft /> Back to Dashboard</Link>
      </nav>

      <header className="tool-header">
        <h1><FiCpu style={{ marginBottom: '-4px' }} /> Smart Quiz Builder</h1>
        <p>Instantly craft custom quizzes and exams with precision difficulty leveling.</p>
      </header>

      <form className="quiz-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group full-width">
             <label><FiBook /> Subject</label>
             <input type="text" placeholder="e.g. Biology" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
          </div>
          <div className="form-group full-width">
             <label><FiLayers /> Topic</label>
             <input type="text" placeholder="e.g. Photosynthesis" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Grade Level</label>
            <input type="text" placeholder="e.g. 7" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Difficulty</label>
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="form-group">
            <label>Question Type</label>
            <select value={form.questionType} onChange={(e) => setForm({ ...form, questionType: e.target.value })}>
              <option value="mixed">Mixed</option>
              <option value="multiple-choice">Multiple Choice Only</option>
              <option value="structured">Structured Only</option>
            </select>
          </div>
          <div className="form-group">
            <label><FiHash /> Question Count</label>
            <input type="number" min="1" max="50" value={form.numQuestions} onChange={(e) => setForm({ ...form, numQuestions: parseInt(e.target.value) || '' })} />
          </div>
          <div className="form-group">
            <label><FiClock /> Time Limit (min)</label>
            <input type="number" min="0" value={form.timeLimit} onChange={(e) => setForm({ ...form, timeLimit: parseInt(e.target.value) || '' })} />
            <span className="helper-text">0 for unlimited</span>
          </div>
          <div className="form-group">
            <label>Tab Limit</label>
            <input type="number" min="1" max="10" value={form.tabLimit} onChange={(e) => setForm({ ...form, tabLimit: parseInt(e.target.value) || '' })} />
            <span className="helper-text">Anti-cheating tolerance</span>
          </div>
        </div>

        <button className="generate-btn" type="submit" disabled={loading}>
          {loading ? <div className="spinner"></div> : <FiCpu />}
          {loading ? "Generating Quiz..." : "Generate Quiz"}
        </button>
        {error && <p className="error-message">{error}</p>}
      </form>

      {quiz && (
        <section className="quiz-display">
          <div className="results-header">
            <h2>Preview Quiz</h2>
            <div className="quiz-badges">
              <span className="meta-badge"><FiClock style={{marginRight:5}}/> {form.timeLimit || '∞'}m</span>
              <span className="meta-badge">{parsedQuestions.length} Questions</span>
            </div>
          </div>
          
          {parsedQuestions.map((item, idx) => (
            <QuestionCard
              key={idx} item={item} idx={idx} editingIndex={editingIndex}
              editForm={editForm} setEditForm={setEditForm} onSaveEdit={handleSaveEdit}
              onCancelEdit={() => { setEditingIndex(null); setEditForm(null); }}
              onStartEdit={startEdit} onRegenerate={handleRegenerate}
              regeneratingIndex={regeneratingIndex}
            />
          ))}

          <div className="quiz-actions-container">
            <button className="action-btn save" onClick={async () => {
              /* PDF Logic maintained from original */
              try {
                const tempDiv = document.createElement('div');
                Object.assign(tempDiv.style, { position: 'absolute', left: '-9999px', width: '800px', padding: '20px', backgroundColor: 'white', color: 'black' });
                document.body.appendChild(tempDiv);
                let html = `<div style="font-family: Arial; padding: 20px;"><h1 style="text-align: center;">${form.subject} Quiz</h1><h2 style="text-align: center; color: #666;">${form.topic}</h2><hr/>`;
                parsedQuestions.forEach((item, i) => html += `<div style="margin-bottom:30px; page-break-inside: avoid;"><p><b>${i+1}. ${item.question}</b></p>${item.type === 'multiple-choice' ? item.options.map(o => `<div>${o}</div>`).join('') : '<div style="border:1px solid #ddd; height:100px;"></div>'}</div>`);
                html += '</div>';
                tempDiv.innerHTML = html;
                const canvas = await html2canvas(tempDiv, { scale: 2 });
                const pdf = new jsPDF("p", "mm", "a4");
                pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, (canvas.height * 210) / canvas.width);
                pdf.save(`${form.subject}_Quiz.pdf`);
                document.body.removeChild(tempDiv);
              } catch(e) { console.error(e); }
            }}>
              <FiSave /> Save PDF
            </button>
            <button className="action-btn share" onClick={async () => {
               if (!classes.length) return alert("No classes found.");
               const selection = prompt(`Select class:\n${classes.map((c,i) => `${i+1}. ${c.subject}`).join('\n')}`);
               if(!selection) return;
               try {
                 const token = localStorage.getItem("chikoroai_authToken");
                 const res = await axios.post("https://api.chikoro-ai.com/api/system/teacher/share-quiz-with-class", {
                    quiz, subject: classes[selection-1].subject, topic: form.topic,
                    timeLimit: form.timeLimit, tabLimit: form.tabLimit,
                    studentIds: classes[selection-1].students.map(s => s.id)
                 }, { headers: { Authorization: `Bearer ${token}` } });
                 if(res.data.success) alert("Shared successfully!");
               } catch(e) { alert("Error sharing"); }
            }}>
              <FiShare2 /> Share to Class
            </button>
            <button className="action-btn link" onClick={async () => {
               try {
                 const token = localStorage.getItem("chikoroai_authToken");
                 const res = await axios.post("https://api.chikoro-ai.com/api/system/teacher/create-quiz-link", {
                    quiz, subject: form.subject, topic: form.topic,
                    timeLimit: form.timeLimit, tabLimit: form.tabLimit
                 }, { headers: { Authorization: `Bearer ${token}` } });
                 if(res.data.link) { navigator.clipboard.writeText(res.data.link); alert("Link copied!"); }
               } catch(e) { alert("Error generating link"); }
            }}>
              <FiLink /> Public Link
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
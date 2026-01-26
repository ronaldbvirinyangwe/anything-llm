import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./quizgenerator.css";

export default function QuizGenerator() {
  const [form, setForm] = useState({
    subject: "",
    topic: "",
    grade: "",
    difficulty: "medium",
    numQuestions: 10,
    tabLimit: 1,
    timeLimit: 30,
    questionType: "mixed",
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

        const res = await axios.get(
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
      } catch (err) {
        console.error("Error fetching classes:", err);
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    if (quiz) {
      setParsedQuestions(parseQuiz(quiz));
    }
  }, [quiz]);

  const cleanQuizText = (rawQuiz) => {
    return rawQuiz
      .replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, '')
      .replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, '')
      .replace(/```.*?```/gs, '')
      .trim();
  };

  const parseQuiz = (rawQuiz) => {
    const cleanedQuiz = cleanQuizText(rawQuiz);
    const questionBlocks = cleanedQuiz.split(/(?=\d+\.\s+)/);
    const parsed = [];

    questionBlocks.forEach(block => {
      if (!block.trim()) return;

      const lines = block.split('\n').filter(l => l.trim());
      const questionLine = lines[0];

      const qMatch = questionLine.match(/^(\d+)\.\s+(.+)/);
      if (!qMatch) return;

      const hasOptions = lines.some(line => /^[A-D]\)/.test(line.trim()));

      if (hasOptions) {
        const options = lines.filter(line => /^[A-D]\)/.test(line.trim()));
        const answerLine = lines.find(line => /\*?\*?Answer:\s*([A-D])/i.test(line));
        const answerMatch = answerLine?.match(/Answer:\s*([A-D])/i);

        parsed.push({
          type: 'multiple-choice',
          question: qMatch[2].trim(),
          options: options,
          answer: answerMatch ? answerMatch[1] : null,
          raw: block.trim()
        });
      } else {
        const markSchemeIndex = lines.findIndex(line =>
          /^(Mark Scheme|Answer|Expected Answer|Marking Points?):/i.test(line)
        );

        let questionText;
        let markScheme;

        if (markSchemeIndex > 0) {
          questionText = lines.slice(0, markSchemeIndex).join('\n').replace(/^\d+\.\s+/, '');
          markScheme = lines.slice(markSchemeIndex).join('\n');
        } else {
          questionText = qMatch[2].trim();
          markScheme = lines.slice(1).join('\n') || 'No mark scheme provided';
        }

        parsed.push({
          type: 'structured',
          question: questionText,
          markScheme: markScheme,
          raw: block.trim()
        });
      }
    });

    return parsed;
  };

  const reconstructQuiz = (questions) => {
    return questions.map((q, idx) => {
      if (q.type === 'multiple-choice') {
        let raw = `${idx + 1}. ${q.question}\n`;
        raw += q.options.join('\n');
        if (q.answer) {
          raw += `\nAnswer: ${q.answer}`;
        }
        return raw;
      } else {
        let raw = `${idx + 1}. ${q.question}\n`;
        raw += q.markScheme;
        return raw;
      }
    }).join('\n\n');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setQuiz("");
    setError("");

    // Validate and set defaults for empty fields
    const submitForm = {
      ...form,
      numQuestions: form.numQuestions === '' ? 10 : form.numQuestions,
      tabLimit: form.tabLimit === '' ? 1 : form.tabLimit,
      timeLimit: form.timeLimit === '' ? 0 : form.timeLimit
    };

    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher/generate-quiz",
        submitForm,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setQuiz(res.data.quiz);
      } else {
        setError(res.data.error || "Failed to generate quiz.");
      }
    } catch (err) {
      console.error("Error generating quiz:", err);
      setError("Error generating quiz.");
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (idx, item) => {
    setEditingIndex(idx);
    
    if (item.type === 'multiple-choice') {
      setEditForm({
        type: 'multiple-choice',
        question: item.question,
        options: item.options.map(opt => opt.replace(/^[A-D]\)\s*/, '')),
        answer: item.answer
      });
    } else {
      setEditForm({
        type: 'structured',
        question: item.question,
        markScheme: item.markScheme.replace(/^(Mark Scheme|Answer|Expected Answer|Marking Points?):\s*/i, '')
      });
    }
  };

  const handleSaveEdit = (idx) => {
    if (!editForm) return;

    const updatedQuestions = [...parsedQuestions];
    
    if (editForm.type === 'multiple-choice') {
      const options = editForm.options.map((opt, i) => 
        `${String.fromCharCode(65 + i)}) ${opt}`
      );
      
      updatedQuestions[idx] = {
        type: 'multiple-choice',
        question: editForm.question,
        options: options,
        answer: editForm.answer,
        raw: '' // Will be reconstructed
      };
    } else {
      updatedQuestions[idx] = {
        type: 'structured',
        question: editForm.question,
        markScheme: `Mark Scheme: ${editForm.markScheme}`,
        raw: '' // Will be reconstructed
      };
    }

    const newQuiz = reconstructQuiz(updatedQuestions);
    setQuiz(newQuiz);
    setEditingIndex(null);
    setEditForm(null);
    alert("✅ Question updated successfully!");
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditForm(null);
  };

  const handleRegenerate = async (idx, item) => {
    setRegeneratingIndex(idx);
    
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const prompt = `Regenerate this ${item.type} question with similar difficulty and format: ${item.raw}`;
      
      const res = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher/redo-question",
        { prompt },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (res.data.success && res.data.question) {
        const updatedQuestions = [...parsedQuestions];
        const reparsed = parseQuiz(res.data.question);
        
        if (reparsed.length > 0) {
          updatedQuestions[idx] = reparsed[0];
          const newQuiz = reconstructQuiz(updatedQuestions);
          setQuiz(newQuiz);
          alert("✅ Question regenerated successfully!");
        } else {
          alert("❌ Failed to parse regenerated question");
        }
      } else {
        alert("❌ Failed to regenerate question");
      }
    } catch (err) {
      console.error("Error regenerating:", err);
      alert("❌ Error regenerating question");
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const QuestionCard = ({ item, idx }) => {
    const isEditing = editingIndex === idx;
    const isRegenerating = regeneratingIndex === idx;

    if (isEditing && editForm) {
      return (
        <div className="quiz-question-card editing">
          <div className="question-header">
            <span className="question-badge edit-badge">✏️ Editing</span>
            <h3>Question {idx + 1}</h3>
          </div>

          {editForm.type === 'multiple-choice' ? (
            <div className="edit-form">
              <div className="form-group">
                <label><strong>Question:</strong></label>
                <textarea
                  value={editForm.question}
                  onChange={(e) => setEditForm({...editForm, question: e.target.value})}
                  rows="3"
                  style={{width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                />
              </div>

              <div className="form-group">
                <label><strong>Options:</strong></label>
                {editForm.options.map((opt, i) => (
                  <div key={i} style={{marginBottom: '10px'}}>
                    <label style={{display: 'block', marginBottom: '5px', fontSize: '13px', color: '#666'}}>
                      Option {String.fromCharCode(65 + i)}:
                    </label>
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...editForm.options];
                        newOptions[i] = e.target.value;
                        setEditForm({...editForm, options: newOptions});
                      }}
                      style={{width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label><strong>Correct Answer:</strong></label>
                <select
                  value={editForm.answer || 'A'}
                  onChange={(e) => setEditForm({...editForm, answer: e.target.value})}
                  style={{width: '100%', padding: '8px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                  <option value="D">D</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-group">
                <label><strong>Question:</strong></label>
                <textarea
                  value={editForm.question}
                  onChange={(e) => setEditForm({...editForm, question: e.target.value})}
                  rows="3"
                  style={{width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                />
              </div>

              <div className="form-group">
                <label><strong>Mark Scheme / Expected Answer:</strong></label>
                <textarea
                  value={editForm.markScheme}
                  onChange={(e) => setEditForm({...editForm, markScheme: e.target.value})}
                  rows="5"
                  style={{width: '100%', padding: '10px', fontSize: '14px', border: '1px solid #ddd', borderRadius: '4px'}}
                />
              </div>
            </div>
          )}

          <div className="edit-actions" style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
            <button 
              onClick={() => handleSaveEdit(idx)}
              style={{
                flex: 1,
                padding: '12px',
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ✅ Save Changes
            </button>
            <button 
              onClick={handleCancelEdit}
              style={{
                flex: 1,
                padding: '12px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              ❌ Cancel
            </button>
          </div>
        </div>
      );
    }

    if (item.type === 'multiple-choice') {
      return (
        <div className="quiz-question-card">
          <div className="question-header">
            <span className="question-badge">Multiple Choice</span>
            <h3>{idx + 1}. {item.question}</h3>
          </div>
          <ul className="option-list">
            {item.options.map((opt, i) => (
              <li key={i}>{opt}</li>
            ))}
          </ul>
          {item.answer && (
            <div className="answer-container">
              <p className="answer-key">
                <span className="answer-icon">✅</span>
                <strong>Correct Answer:</strong> {item.answer}
              </p>
            </div>
          )}
          <QuestionActions 
            item={item} 
            idx={idx} 
            isRegenerating={isRegenerating}
          />
        </div>
      );
    }

    if (item.type === 'structured') {
      return (
        <div className="quiz-question-card structured">
          <div className="question-header">
            <span className="question-badge structured-badge">Structured</span>
            <h3>{idx + 1}. {item.question}</h3>
          </div>
          {item.markScheme && (
            <div className="mark-scheme-container">
              <h4>📋 Mark Scheme</h4>
              <div className="mark-scheme-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.markScheme
                    .replace(/```[a-z]*\n?/gi, "")
                    .replace(/```/g, "")
                    .trim()}
                </ReactMarkdown>
              </div>
            </div>
          )}
          <QuestionActions 
            item={item} 
            idx={idx}
            isRegenerating={isRegenerating}
          />
        </div>
      );
    }
    return null;
  };

  const QuestionActions = ({ item, idx, isRegenerating }) => (
    <div className="question-actions">
      <button
        className="edit-btn"
        onClick={() => startEdit(idx, item)}
        disabled={isRegenerating}
      >
        ✏️ Edit Question
      </button>
      <button
        className="regen-btn"
        onClick={() => handleRegenerate(idx, item)}
        disabled={isRegenerating}
      >
        {isRegenerating ? '⏳ Regenerating...' : '🔄 Regenerate with AI'}
      </button>
    </div>
  );

  return (
    <div className="quiz-generator-container">
      <nav className="tool-nav">
        <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
      </nav>

      <header className="tool-header">
        <h1>🧠 Smart Quiz & Homework Builder</h1>
        <p>Instantly craft custom quizzes and exams with precision difficulty leveling and automated grading logic.</p>
      </header>

      <form className="quiz-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Question Type</label>
          <select
            value={form.questionType}
            onChange={(e) => setForm({ ...form, questionType: e.target.value })}
          >
            <option value="multiple-choice">Multiple Choice Only</option>
            <option value="structured">Structured Only</option>
            <option value="mixed">Mixed (Both Types)</option>
          </select>
        </div>
        <div className="form-group">
          <label>Subject</label>
          <input
            type="text"
            placeholder="e.g. Biology"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>Topic</label>
          <input
            type="text"
            placeholder="e.g. Photosynthesis"
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Grade Level</label>
          <input
            type="text"
            placeholder="e.g. 7"
            value={form.grade}
            onChange={(e) => setForm({ ...form, grade: e.target.value })}
          />
        </div>

        <div className="form-group-row">
          <div className="form-group">
            <label>Number of Questions</label>
            <input
              type="number"
              min="1"
              max="50"
              value={form.numQuestions}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setForm({ ...form, numQuestions: '' });
                } else {
                  const num = parseInt(val);
                  if (!isNaN(num)) {
                    setForm({ ...form, numQuestions: num });
                  }
                }
              }}
            />
          </div>

          <div className="form-group">
            <label>Time Limit (minutes)</label>
            <input
              type="number"
              min="0"
              max="180"
              placeholder="0 = No limit"
              value={form.timeLimit}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '') {
                  setForm({ ...form, timeLimit: '' });
                } else {
                  const num = parseInt(val);
                  if (!isNaN(num) && num >= 0) {
                    setForm({ ...form, timeLimit: num });
                  }
                }
              }}
            />
            <small style={{color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'block', marginTop: '0.3rem'}}>
              Enter 0 for no time limit, or any number of minutes (e.g. 30, 45, 60)
            </small>
          </div>
        </div>

        <div className="form-group">
          <label>Allowed Browser Tabs (to prevent cheating)</label>
          <input
            type="number"
            min="1"
            max="100"
            value={form.tabLimit}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setForm({ ...form, tabLimit: '' });
              } else {
                const num = parseInt(val);
                if (!isNaN(num)) {
                  setForm({ ...form, tabLimit: num });
                }
              }
            }}
          />
        </div>

        <div className="form-group">
          <label>Difficulty</label>
          <select
            value={form.difficulty}
            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <button className="generate-btn" type="submit" disabled={loading}>
          {loading ? "Generating..." : "Generate Quiz"}
        </button>

        {error && <p className="error-message">{error}</p>}
      </form>

      {quiz && (
        <section className="quiz-display">
          <h2>Generated Quiz</h2>
          <div className="quiz-meta-info">
            <span>⏱️ Time: {form.timeLimit === 0 ? "Unlimited" : `${form.timeLimit} mins`}</span>
            <span>🚫 Max Tabs: {form.tabLimit}</span>
          </div>
          {parsedQuestions.map((item, idx) => (
            <QuestionCard key={idx} item={item} idx={idx} />
          ))}
        </section>
      )}

      {quiz && (
        <div className="quiz-actions-container">
          <button
            className="save-btn"
            onClick={async () => {
              try {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.width = '800px';
                tempDiv.style.padding = '20px';
                tempDiv.style.backgroundColor = 'white';
                tempDiv.style.color = 'black';
                document.body.appendChild(tempDiv);

                let html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="text-align: center; margin-bottom: 10px;">${form.subject} Quiz</h1>
              <h2 style="text-align: center; color: #666; font-weight: normal; margin-bottom: 5px;">${form.topic}</h2>
              <div style="text-align: center; color: #888; margin-bottom: 30px;">
                Grade ${form.grade} | ${form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1)} Difficulty | ⏱️ ${form.timeLimit === 0 ? "No Time Limit" : form.timeLimit + " Minutes"}
              </div>
              <hr style="border: 1px solid #ddd; margin-bottom: 30px;">
          `;

                parsedQuestions.forEach((item, idx) => {
                  if (item.type === 'multiple-choice') {
                    html += `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                  <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">${idx + 1}. ${item.question}</p>
                  <div style="margin-left: 20px; line-height: 1.8;">
                    ${item.options.map(opt => `<div>${opt}</div>`).join('')}
                  </div>
                </div>`;
                  } else if (item.type === 'structured') {
                    html += `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                  <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">${idx + 1}. ${item.question}</p>
                  <div style="margin-top: 15px; border: 1px solid #ddd; padding: 15px; min-height: 100px; background: #f9f9f9;"></div>
                </div>`;
                  }
                });

                html += '</div>';
                tempDiv.innerHTML = html;

                const canvas = await html2canvas(tempDiv, { scale: 2, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL("image/png");
                const pdf = new jsPDF("p", "mm", "a4");
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
                
                pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
                pdf.save(`${form.subject}_Quiz_${new Date().toISOString().slice(0, 10)}.pdf`);
                document.body.removeChild(tempDiv);
              } catch (err) {
                console.error("Error generating PDF:", err);
              }
            }}
          >
            💾 Save Student Version (PDF)
          </button>

          <button
            className="share-btn class-share"
            onClick={async () => {
              if (classes.length === 0) {
                alert("❌ You don't have any classes yet.");
                return;
              }

              const classOptions = classes.map((cls, idx) =>
                `${idx + 1}. ${cls.subject} (${cls.students.length} students)`
              ).join('\n');

              const selection = prompt(`Select a class:\n\n${classOptions}`);
              if (!selection) return;

              const selectedIndex = parseInt(selection) - 1;
              const selectedClass = classes[selectedIndex];

              try {
                const token = localStorage.getItem("chikoroai_authToken");
                const res = await axios.post(
                  "https://api.chikoro-ai.com/api/system/teacher/share-quiz-with-class",
                  {
                    quiz,
                    subject: selectedClass.subject,
                    topic: form.topic,
                    timeLimit: form.timeLimit,
                    tabLimit: form.tabLimit,
                    studentIds: selectedClass.students.map(s => s.id)
                  },
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.data.success) {
                  alert(`✅ Shared with ${selectedClass.subject}!`);
                }
              } catch (err) {
                alert("❌ Error sharing quiz");
              }
            }}
          >
            🎓 Share with Class
          </button>

          <button
            className="share-btn"
            onClick={async () => {
              try {
                const token = localStorage.getItem("chikoroai_authToken");
                const res = await axios.post(
                  "https://api.chikoro-ai.com/api/system/teacher/create-quiz-link",
                  {
                    quiz,
                    subject: form.subject,
                    topic: form.topic,
                    timeLimit: form.timeLimit,
                    tabLimit: form.tabLimit
                  },
                  { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.data.link) {
                  navigator.clipboard.writeText(res.data.link);
                  const timeText = form.timeLimit === 0 ? "Unlimited" : `${form.timeLimit}m`;
                  alert(`✅ Link copied! (Time: ${timeText})`);
                }
              } catch (err) {
                alert("❌ Error generating share link.");
              }
            }}
          >
            🔗 Generate Public Link
          </button>
        </div>
      )}
    </div>
  );
}
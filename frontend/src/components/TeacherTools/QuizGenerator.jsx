import React, { useState,useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./quizgenerator.css";

export default function QuizGenerator() {
  const [form, setForm] = useState({
    subject:"",
    topic: "",
    grade: "",
    difficulty: "medium",
    numQuestions: 10,
        tabLimit: 1,
        questionType: "mixed",
  });
  const [quiz, setQuiz] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
   const [classes, setClasses] = useState([]); 

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
          // Group students by subject to get unique classes
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

    // Check if it's multiple choice
    const hasOptions = lines.some(line => /^[A-D]\)/.test(line.trim()));
    
    if (hasOptions) {
      // Multiple Choice Question
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
      // Structured Question
      const markSchemeIndex = lines.findIndex(line => 
        /^(Mark Scheme|Answer|Expected Answer|Marking Points?):/i.test(line)
      );
      
      let questionText;
      let markScheme;
      
      if (markSchemeIndex > 0) {
        // Question is everything before mark scheme
        questionText = lines.slice(0, markSchemeIndex).join('\n').replace(/^\d+\.\s+/, '');
        // Mark scheme is everything after (including the header)
        markScheme = lines.slice(markSchemeIndex).join('\n');
      } else {
        // No explicit mark scheme found - use all lines after question
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setQuiz("");
    setError("");

    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher/generate-quiz",
        form,
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

const QuestionCard = ({ item, idx }) => {
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

        {/* ✅ Answer is still here! */}
        {item.answer && (
          <div className="answer-container">
            <p className="answer-key">
              <span className="answer-icon">✅</span>
              <strong>Correct Answer:</strong> {item.answer}
            </p>
          </div>
        )}

        <QuestionActions item={item} idx={idx} />
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

        {/* ✅ Mark scheme for structured questions */}
       {item.markScheme && (
  <div className="mark-scheme-container">
    <h4>📋 Mark Scheme</h4>
    <div className="mark-scheme-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {item.markScheme
          .replace(/```[a-z]*\n?/gi, "") // remove code fence start
          .replace(/```/g, "") // remove fence end
          .trim()}
      </ReactMarkdown>
    </div>
  </div>
)}

        <QuestionActions item={item} idx={idx} />
      </div>
    );
  }

  return null;
};

const QuestionActions = ({ item, idx }) => (
  <>
    <div className="question-actions">
      <button
        className="edit-btn"
        onClick={() => {
          const textarea = document.getElementById(`edit-${idx}`);
          textarea.classList.toggle("visible");
        }}
      >
        ✏️ Edit
      </button>

      <button
        className="regen-btn"
        onClick={async () => {
          try {
            const token = localStorage.getItem("chikoroai_authToken");
            const prompt = `Regenerate this ${item.type} question: ${item.raw}`;
            const res = await axios.post(
              "https://api.chikoro-ai.com/api/system/teacher/redo-question",
              { prompt },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            if (res.data.success) {
              alert("✅ Question regenerated! Refresh to see changes.");
            }
          } catch (err) {
            console.error("Error regenerating:", err);
          }
        }}
      >
        🔄 Regenerate with AI
      </button>
    </div>

    <textarea
      id={`edit-${idx}`}
      className="question-edit"
      defaultValue={item.raw}
    ></textarea>
  </>
);

  return (
    <div className="quiz-generator-container">
      <nav className="tool-nav">
        <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
      </nav>

      <header className="tool-header">
        <h1>🧠 AI Quiz Generator</h1>
        <p>Automatically generate quizzes by topic, grade, and difficulty level.</p>
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

        <div className="form-group">
          <label>Number of Questions</label>
          <input
            type="number"
            min="1"
            max="50"
            value={form.numQuestions || 10}
            onChange={(e) => setForm({ ...form, numQuestions: e.target.value })}
          />
        </div>

        <div className="form-group">
          <label>Allowed Browser Tabs (to prevent cheating)</label>
          <input
            type="number"
            min="1"
            max="5"
            value={form.tabLimit || 1}
            onChange={(e) => setForm({ ...form, tabLimit: e.target.value })}
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
          {parseQuiz(quiz).map((item, idx) => (
            <QuestionCard key={idx} item={item} idx={idx} />
          ))}
        </section>
      )}
      {quiz && (
  <div className="quiz-actions-container">
    {/* 💾 Save Quiz as PDF (Student Version - No Answers) */}
    <button
      className="save-btn"
      onClick={async () => {
        try {
          // Create a temporary container with student version (no answers)
          const tempDiv = document.createElement('div');
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.width = '800px';
          tempDiv.style.padding = '20px';
          tempDiv.style.backgroundColor = 'white';
          tempDiv.style.color = 'black';
          document.body.appendChild(tempDiv);

          // Build student version HTML (without answers/mark schemes)
          const parsedQuiz = parseQuiz(quiz);
          let html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="text-align: center; margin-bottom: 10px;">${form.subject} Quiz</h1>
              <h2 style="text-align: center; color: #666; font-weight: normal; margin-bottom: 5px;">${form.topic}</h2>
              <p style="text-align: center; color: #888; margin-bottom: 30px;">Grade ${form.grade} | ${form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1)} Difficulty</p>
              <hr style="border: 1px solid #ddd; margin-bottom: 30px;">
          `;

          parsedQuiz.forEach((item, idx) => {
            if (item.type === 'multiple-choice') {
              html += `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                  <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                    ${idx + 1}. ${item.question}
                  </p>
                  <div style="margin-left: 20px; line-height: 1.8;">
                    ${item.options.map(opt => `<div>${opt}</div>`).join('')}
                  </div>
                  <div style="margin-top: 15px; border-top: 1px solid #eee; padding-top: 10px;">
                    <strong>Answer: __________</strong>
                  </div>
                </div>
              `;
            } else if (item.type === 'structured') {
              html += `
                <div style="margin-bottom: 30px; page-break-inside: avoid;">
                  <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                    ${idx + 1}. ${item.question}
                  </p>
                  <div style="margin-top: 15px; border: 1px solid #ddd; padding: 15px; min-height: 100px; background: #f9f9f9;">
                    <em style="color: #999;">Write your answer here...</em>
                  </div>
                </div>
              `;
            }
          });

          html += '</div>';
          tempDiv.innerHTML = html;

          // Generate PDF
          const canvas = await html2canvas(tempDiv, { 
            scale: 2,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          let heightLeft = pdfHeight;
          let position = 0;

          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();

          // Add new pages if content is too long
          while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
          }

          pdf.save(
            `${form.subject}_${form.topic}_Student_${new Date().toISOString().slice(0, 10)}.pdf`
          );

          // Cleanup
          document.body.removeChild(tempDiv);
          alert('✅ Student version (without answers) saved successfully!');
        } catch (err) {
          console.error("Error generating PDF:", err);
          alert("❌ Could not generate PDF.");
        }
      }}
    >
      💾 Save Student Version (PDF)
    </button>

    {/* 📄 Save Answer Key (PDF) */}
    <button
      className="save-btn answer-key-btn"
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

          const parsedQuiz = parseQuiz(quiz);
          let html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h1 style="text-align: center; margin-bottom: 10px;">${form.subject} Quiz - ANSWER KEY</h1>
              <h2 style="text-align: center; color: #666; font-weight: normal; margin-bottom: 5px;">${form.topic}</h2>
              <p style="text-align: center; color: #888; margin-bottom: 30px;">Grade ${form.grade} | ${form.difficulty.charAt(0).toUpperCase() + form.difficulty.slice(1)} Difficulty</p>
              <hr style="border: 1px solid #ddd; margin-bottom: 30px;">
          `;

          parsedQuiz.forEach((item, idx) => {
            if (item.type === 'multiple-choice') {
              html += `
                <div style="margin-bottom: 25px; page-break-inside: avoid;">
                  <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                    ${idx + 1}. ${item.question}
                  </p>
                  <div style="margin-left: 20px; line-height: 1.8;">
                    ${item.options.map(opt => `<div>${opt}</div>`).join('')}
                  </div>
                  <div style="margin-top: 10px; padding: 10px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                    <strong style="color: #155724;">✅ Correct Answer: ${item.answer}</strong>
                  </div>
                </div>
              `;
            } else if (item.type === 'structured') {
              html += `
                <div style="margin-bottom: 25px; page-break-inside: avoid;">
                  <p style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">
                    ${idx + 1}. ${item.question}
                  </p>
                  <div style="margin-top: 10px; padding: 15px; background: #e7f3ff; border-left: 4px solid #0066cc; border-radius: 4px;">
                    <strong style="color: #004085;">📋 Mark Scheme:</strong>
                    <div style="margin-top: 10px; line-height: 1.6;">
                      ${item.markScheme.replace(/\n/g, '<br>')}
                    </div>
                  </div>
                </div>
              `;
            }
          });

          html += '</div>';
          tempDiv.innerHTML = html;

          const canvas = await html2canvas(tempDiv, { 
            scale: 2,
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF("p", "mm", "a4");
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

          let heightLeft = pdfHeight;
          let position = 0;

          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pdf.internal.pageSize.getHeight();

          while (heightLeft > 0) {
            position = heightLeft - pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
            heightLeft -= pdf.internal.pageSize.getHeight();
          }

          pdf.save(
            `${form.subject}_${form.topic}_AnswerKey_${new Date().toISOString().slice(0, 10)}.pdf`
          );

          document.body.removeChild(tempDiv);
          alert('✅ Answer key saved successfully!');
        } catch (err) {
          console.error("Error generating answer key PDF:", err);
          alert("❌ Could not generate answer key PDF.");
        }
      }}
    >
      📄 Save Answer Key (PDF)
    </button>

     <button
              className="share-btn class-share"
              onClick={async () => {
                if (classes.length === 0) {
                  alert("❌ You don't have any classes yet. Link students first!");
                  return;
                }

                // Show class selection modal
                const classOptions = classes.map((cls, idx) => 
                  `${idx + 1}. ${cls.subject} (${cls.students.length} students)`
                ).join('\n');

                const selection = prompt(
                  `Select a class to share this quiz with:\n\n${classOptions}\n\nEnter the number:`
                );

                if (!selection) return;

                const selectedIndex = parseInt(selection) - 1;
                if (selectedIndex < 0 || selectedIndex >= classes.length) {
                  alert("❌ Invalid selection");
                  return;
                }

                const selectedClass = classes[selectedIndex];

                try {
                  const token = localStorage.getItem("chikoroai_authToken");
                  const res = await axios.post(
                    "https://api.chikoro-ai.com/api/system/teacher/share-quiz-with-class",
                    {
                      quiz,
                      subject: selectedClass.subject,
                      topic: form.topic,
                      difficulty: form.difficulty,
                      studentIds: selectedClass.students.map(s => s.id)
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );

                  if (res.data.success) {
                    alert(
                      `✅ Quiz shared with ${selectedClass.subject} class!\n\n` +
                      `${selectedClass.students.length} students will be notified.\n\n` +
                      `Quiz Link: ${res.data.quizLink}`
                    );
                    navigator.clipboard.writeText(res.data.quizLink);
                  } else {
                    alert(`❌ Failed: ${res.data.error}`);
                  }
                } catch (err) {
                  console.error("Error sharing quiz:", err);
                  alert("❌ Error sharing quiz with class");
                }
              }}
            >
              🎓 Share with Class
            </button>

            {/* ✅ General shareable link (not class-specific) */}
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
                      difficulty: form.difficulty
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  
                  if (res.data.link) {
                    navigator.clipboard.writeText(res.data.link);
                    alert(`✅ Public quiz link copied to clipboard:\n${res.data.link}`);
                  }
                } catch (err) {
                  console.error("Error generating share link:", err);
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
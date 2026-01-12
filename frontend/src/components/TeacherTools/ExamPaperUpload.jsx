import React, { useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import "./examupload.css";

export default function ExamPaperUpload() {
  const [examFile, setExamFile] = useState(null);
  const [markSchemeFile, setMarkSchemeFile] = useState(null);
  const [metadata, setMetadata] = useState({
    subject: "",
    topic: "",
    grade: "",
    difficulty: "medium",
    year: new Date().getFullYear()
  });
  const [extractedQuiz, setExtractedQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState([]);

  React.useEffect(() => {
    fetchClasses();
  }, []);

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

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === "exam") setExamFile(file);
      else setMarkSchemeFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!examFile) {
      setError("Please upload an exam paper");
      return;
    }

    setLoading(true);
    setError("");
    setExtractedQuiz(null);

    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const formData = new FormData();
      
      formData.append("examPaper", examFile);
      if (markSchemeFile) formData.append("markScheme", markSchemeFile);
      formData.append("metadata", JSON.stringify(metadata));

      const res = await axios.post(
        "https://api.chikoro-ai.com/api/teacher/extract-exam-paper",
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data"
          }
        }
      );

      if (res.data.success) {
        setExtractedQuiz(res.data.extractedQuiz);
      } else {
        setError(res.data.error || "Failed to extract exam paper");
      }
    } catch (err) {
      console.error("Error extracting exam:", err);
      setError("Error processing exam paper. Please try again.");
    } finally {
      setLoading(false);
    }
  };

const parseQuiz = (rawQuiz) => {
  const cleanedQuiz = rawQuiz.trim();
  
  // Split by question numbers at start of line (matches StudentQuiz format)
  const questionBlocks = cleanedQuiz.split(/\n(?=\d+\.)/);
  const parsed = [];

  questionBlocks.forEach(block => {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) return;
    
    const lines = trimmedBlock.split('\n');
    const firstLine = lines[0];
    
    // Extract question number
    const qMatch = firstLine.match(/^(\d+)\.\s+(.+)/);
    if (!qMatch) return;
    
    const questionNumber = qMatch[1];
    const firstLineText = qMatch[2];
    
    // Check if it's multiple choice
    const options = lines.filter(line => /^[A-D]\)/.test(line.trim()));
    const hasOptions = options.length >= 4;
    
    if (hasOptions) {
      // MULTIPLE CHOICE
      const answerMatch = trimmedBlock.match(/\*?\*?Answer:\s*([A-D])\*?\*?/i);
      const answer = answerMatch ? answerMatch[1].toUpperCase() : null;
      
      parsed.push({
        type: 'multiple-choice',
        questionNumber,
        question: firstLineText,
        options: options,
        answer: answer,
        raw: trimmedBlock
      });
    } else {
      // STRUCTURED QUESTION
      const markSchemeIndex = lines.findIndex(line => 
        /^Mark Scheme:/i.test(line.trim())
      );
      
      let questionText;
      let markScheme = '';
      
      if (markSchemeIndex !== -1) {
        questionText = lines.slice(0, markSchemeIndex).join('\n').replace(/^\d+\.\s*/, '');
        markScheme = lines.slice(markSchemeIndex).join('\n');
      } else {
        questionText = trimmedBlock.replace(/^\d+\.\s*/, '');
        markScheme = 'No mark scheme provided';
      }
      
      parsed.push({
        type: 'structured',
        questionNumber,
        question: questionText,
        markScheme: markScheme,
        raw: trimmedBlock
      });
    }
  });

  console.log(`✅ Parsed ${parsed.length} questions`);
  return parsed;
};

  const saveStudentVersion = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '20px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.color = 'black';
      document.body.appendChild(tempDiv);

      const parsedQuiz = parseQuiz(extractedQuiz.content);

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
        `${metadata.subject}_${metadata.year}_Student_${new Date().toISOString().slice(0, 10)}.pdf`
      );

      document.body.removeChild(tempDiv);
      alert('✅ Student version saved successfully!');
    } catch (err) {
      console.error("Error generating PDF:", err);
      alert("❌ Could not generate PDF.");
    }
  };

  const saveAnswerKey = async () => {
    try {
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '-9999px';
      tempDiv.style.width = '800px';
      tempDiv.style.padding = '20px';
      tempDiv.style.backgroundColor = 'white';
      tempDiv.style.color = 'black';
      document.body.appendChild(tempDiv);

      const parsedQuiz = parseQuiz(extractedQuiz.content);
  

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
        `${metadata.subject}_${metadata.year}_AnswerKey_${new Date().toISOString().slice(0, 10)}.pdf`
      );

      document.body.removeChild(tempDiv);
      alert('✅ Answer key saved successfully!');
    } catch (err) {
      console.error("Error generating answer key PDF:", err);
      alert("❌ Could not generate answer key PDF.");
    }
  };

  const shareWithClass = async () => {
    if (classes.length === 0) {
      alert("❌ You don't have any classes yet. Link students first!");
      return;
    }

    const classOptions = classes.map((cls, idx) => 
      `${idx + 1}. ${cls.subject} (${cls.students.length} students)`
    ).join('\n');

    const selection = prompt(
      `Select a class to share this exam with:\n\n${classOptions}\n\nEnter the number:`
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
          quiz: extractedQuiz.content,
          subject: metadata.subject,
          topic: metadata.topic,
          difficulty: metadata.difficulty,
          studentIds: selectedClass.students.map(s => s.id)
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        alert(
          `✅ Exam shared with ${selectedClass.subject} class!\n\n` +
          `${selectedClass.students.length} students will be notified.\n\n` +
          `Quiz Link: ${res.data.quizLink}`
        );
        navigator.clipboard.writeText(res.data.quizLink);
      } else {
        alert(`❌ Failed: ${res.data.error}`);
      }
    } catch (err) {
      console.error("Error sharing exam:", err);
      alert("❌ Error sharing exam with class");
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

          {item.answer && (
            <div className="answer-container">
              <p className="answer-key">
                <span className="answer-icon">✅</span>
                <strong>Correct Answer:</strong> {item.answer}
              </p>
            </div>
          )}
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
                  {item.markScheme}
                </ReactMarkdown>
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="exam-upload-container">
      <nav className="tool-nav">
        <Link to="/teacher-dashboard">&larr; Back to Dashboard</Link>
      </nav>

      <header className="tool-header">
        <h1>📄 Upload Past Exam Papers</h1>
        <p>Upload exam papers and marking schemes. AI will extract questions and format them for student use.</p>
      </header>

      <form className="exam-upload-form" onSubmit={handleUpload}>

        <div className="file-upload-section">
          <div className="file-upload-box">
            <label htmlFor="exam-file" className="file-label">
              📝 Upload Exam Paper *
              <span className="file-hint">PDF or Image (JPG, PNG)</span>
            </label>
            <input
              id="exam-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, "exam")}
              required
            />
            {examFile && <p className="file-name">✅ {examFile.name}</p>}
          </div>

          <div className="file-upload-box">
            <label htmlFor="scheme-file" className="file-label">
              📋 Upload Mark Scheme (Optional)
              <span className="file-hint">PDF or Image (JPG, PNG)</span>
            </label>
            <input
              id="scheme-file"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, "scheme")}
            />
            {markSchemeFile && <p className="file-name">✅ {markSchemeFile.name}</p>}
          </div>
        </div>

        <button 
          className="extract-btn" 
          type="submit" 
          disabled={loading || !examFile}
        >
          {loading ? "🔄 Extracting & Processing..." : "🚀 Extract Questions"}
        </button>

        {error && <p className="error-message">❌ {error}</p>}
      </form>

      {extractedQuiz && (
        <>
          <section className="extracted-quiz-section">
            <div className="section-header">
              <h2>✅ Extracted Questions</h2>
              <p className="extraction-info">
                {extractedQuiz.questionCount} questions extracted from your exam paper
              </p>
            </div>

            <div className="quiz-display">
              {parseQuiz(extractedQuiz.content).map((item, idx) => (
                <QuestionCard key={idx} item={item} idx={idx} />
              ))}
            </div>
          </section>

          <div className="action-buttons">
            <button className="action-btn primary" onClick={saveStudentVersion}>
              💾 Save Student Version
            </button>
            <button className="action-btn secondary" onClick={saveAnswerKey}>
              📄 Save Answer Key
            </button>
            <button className="action-btn success" onClick={shareWithClass}>
              🎓 Share with Class
            </button>
          </div>
        </>
      )}
    </div>
  );
}
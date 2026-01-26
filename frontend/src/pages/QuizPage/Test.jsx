import React, { useEffect } from "react";
import { create } from "zustand";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import "./test.css";

// ✅ Zustand store
const useTestStore = create((set) => ({
  test: null,
  answers: [],
  results: null,
  isLoading: false,
  error: "",
  timer: 0,
  loadingResult: false,
  setError: (e) => set({ error: e }),
  setTest: (t) =>
    set({
      test: t,
      answers: new Array(t?.questions?.length || 0).fill(""),
      results: null,
      timer: 0,
    }),
  setAnswer: (i, val) =>
    set((s) => {
      const newA = [...s.answers];
      newA[i] = val;
      return { answers: newA };
    }),
  setResults: (r) => set({ results: r }),
  setLoadingResult: (v) => set({ loadingResult: v }),
}));

export default function Test({ readOnly = false, externalTest = null }) {
  const {
    test,
    answers,
    results,
    isLoading,
    error,
    timer,
    loadingResult,
    setError,
    setTest,
    setAnswer,
    setResults,
    setLoadingResult,
  } = useTestStore();

  const { darkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();

  // 🧠 Load quiz or generate new one
  useEffect(() => {
    if (readOnly) return;
    
    // Check if quiz is passed from navigation state
    const quizFromState = externalTest || location.state?.externalTest;
    if (quizFromState) {
      const wrapped = Array.isArray(quizFromState)
        ? { subject: "Generated Quiz", questions: quizFromState }
        : quizFromState;
      setTest(wrapped);
      return;
    }

    // Check if we need to generate a new quiz from query params
    const params = new URLSearchParams(location.search);
    const subject = params.get('subject');
    const topic = params.get('åtopic');
    const grade = params.get('grade');
    const numQuestions = params.get('numQuestions') || 10;
    const difficulty = params.get('difficulty') || 'medium';
    const questionType = params.get('questionType') || 'mixed';

    if (subject && grade) {
      generateQuiz({ subject, topic, grade, numQuestions, difficulty, questionType });
    }
  }, [location.state, location.search, readOnly, externalTest]);

  // 🎯 Generate quiz from backend
  const generateQuiz = async (params) => {
    useTestStore.setState({ isLoading: true, error: "" });
    try {
      const res = await fetch("httpss://api.chikoro-ai.com/api/quiz/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}`,
        },
        body: JSON.stringify(params),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to generate quiz.");

      // Parse the quiz content into structured format
      const parsedQuiz = parseQuizContent(data.quiz, data.metadata);
      setTest(parsedQuiz);
    } catch (err) {
      setError(err.message);
    } finally {
      useTestStore.setState({ isLoading: false });
    }
  };

  // 🧩 Parse quiz text content into structured format
  const parseQuizContent = (quizText, metadata) => {
    const questionBlocks = quizText.split(/\n(?=\d+\.)/);
    
    const questions = questionBlocks.map((block, i) => {
      const lines = block.split("\n").filter((l) => l.trim());
      const questionText = lines[0]?.replace(/^\d+\.\s*/, "").trim();
      
      // Check if it's MCQ
      const hasOptions = lines.some((l) => /^[A-D]\)/.test(l));
      const answerMatch = block.match(/\*?\*?Answer:\s*([A-D])/i);
      
      if (hasOptions) {
        // Multiple Choice Question
        const options = lines
          .filter(l => /^[A-D]\)/.test(l))
          .map(opt => opt.trim());
        
        return {
          type: "mcq",
          question: questionText,
          options: options,
          correct_answer: answerMatch ? answerMatch[1].toUpperCase() : null,
        };
      } else {
        // Structured Question
        const markSchemeIndex = lines.findIndex(line => 
          /^(Mark Scheme|Answer|Expected Answer):/i.test(line)
        );
        const markScheme = markSchemeIndex > 0 
          ? lines.slice(markSchemeIndex + 1).join('\n')
          : null;
        
        return {
          type: "short-answer",
          question: questionText,
          correct_answer: markScheme || "Provide a detailed answer based on the question.",
        };
      }
    }).filter(q => q.question); // Remove any invalid questions

    return {
      subject: metadata.subject,
      topic: metadata.topic,
      grade: metadata.grade,
      difficulty: metadata.difficulty,
      questions: questions,
    };
  };

  // 🕒 Timer
  useEffect(() => {
  if (!readOnly && !results && !isLoading) { 
    const tick = setInterval(() => {
      useTestStore.setState((s) => ({ timer: s.timer + 1 }));
    }, 1000);
    return () => clearInterval(tick);
  }
}, [readOnly, results, isLoading]); 


  // 🧮 Submit quiz
  const submitTest = async () => {
    if (isLoading || results) return;
    if (answers.some((a) => !a.trim())) {
      setError("Please answer all questions before submitting.");
      return;
    }

    useTestStore.setState({ isLoading: true });
    try {
      const res = await fetch("https://api.chikoro-ai.com/api/quiz/mark", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("chikoroai_authToken")}`,
        },
        body: JSON.stringify({ quiz: test, answers }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Grading failed.");

      // ✅ FIX: Use the comprehensive response from backend
      setResults({
        summary: {
          overallScore: data.score, // Use score from backend
          earnedPoints: data.earnedPoints,
          totalPoints: data.totalPoints,
          message: data.summary,
        },
        results: data.feedback, // This contains isCorrect, not correct
      });
    } catch (err) {
      setError(err.message);
    } finally {
      useTestStore.setState({ isLoading: false });
    }
  };

  // 🧩 Render each question
  const renderQuestion = (q, i) => {
    const isMCQ = Array.isArray(q.options) && q.options.length > 1;
    const result = results?.results?.[i];

    return (
      <div key={i} className="student-question-card">
        <div className="question-header">
          <span className={`question-badge ${isMCQ ? "" : "structured-badge"}`}>
            {isMCQ ? "Multiple Choice" : "Structured"}
          </span>
          <h3>
            {i + 1}. {q.question}
          </h3>
        </div>

        {isMCQ ? (
          <ul className="option-list">
            {q.options.map((opt, oi) => (
              <li key={oi} className="option">
                <label>
                  <input
                    type="radio"
                    name={`q-${i}`}
                    value={opt}
                    disabled={!!results}
                    checked={answers[i] === opt}
                    onChange={() => setAnswer(i, opt)}
                  />
                  <span>{opt}</span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <div className="structured-answer-wrapper">
            <textarea
              className="structured-answer"
              disabled={!!results}
              placeholder="Write your answer here..."
              value={answers[i]}
              onChange={(e) => setAnswer(i, e.target.value)}
            />
          </div>
        )}

        {/* ✅ FIX: Use isCorrect instead of correct */}
        {result && (
          <div
            className={`feedback ${
              result.isCorrect ? "correct" : "incorrect"
            }`}
          >
            <strong>
              {result.isCorrect ? "✅ Correct!" : "❌ Incorrect."}
            </strong>
            {result.pointsEarned !== undefined && (
              <span className="points-badge">
                {result.pointsEarned}/{result.pointsPossible} points
              </span>
            )}
            <p dangerouslySetInnerHTML={{ __html: result.feedback }} />
          </div>
        )}
      </div>
    );
  };

  const formatTime = (s) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // 🧭 Main layout
  return (
    <div className="student-quiz-container">
      <header className="quiz-header">
        <h1>{test?.subject || "Quiz"}</h1>
        <p>⏱ Time: {formatTime(timer)}</p>
      </header>

      {error && <div className="error">{error}</div>}

      {!results ? (
        <>
          <div className="quiz-questions">
            {(test?.questions || []).map((q, i) => renderQuestion(q, i))}
          </div>
          <button
            className="submit-btn"
            onClick={submitTest}
            disabled={isLoading}
          >
            {isLoading ? "Submitting..." : "Submit Quiz"}
          </button>
        </>
      ) : (
        <div className="quiz-feedback-container">
          <header className="feedback-header">
            <h1>📊 Quiz Results</h1>
            <div className="score-display">
              <div className="score-circle">
                <span className="score-number">
                  {Math.round(results.summary.overallScore)}%
                </span>
              </div>
              <p className="score-breakdown">
                {/* ✅ FIX: Use isCorrect instead of correct */}
                {results.results.filter((r) => r.isCorrect).length} /{" "}
                {results.results.length} correct
              </p>
              {results.summary.earnedPoints !== undefined && (
                <p className="points-breakdown">
                  {results.summary.earnedPoints} / {results.summary.totalPoints} points earned
                </p>
              )}
            </div>
          </header>

          <div className="feedback-questions">
            {results.results.map((r, idx) => (
              <div
                key={idx}
                className={`feedback-card ${
                  r.isCorrect ? "correct" : "incorrect"
                }`}
              >
                <div className="feedback-header-section">
                  <span className="question-number">
                    Question {idx + 1}
                  </span>
                  {r.pointsEarned !== undefined && (
                    <span className={`points-badge ${r.isCorrect ? "correct" : "incorrect"}`}>
                      {r.pointsEarned}/{r.pointsPossible} pts
                    </span>
                  )}
                </div>
                
                <p className="question-text">
                  <strong>Question:</strong> {r.question}
                </p>
                
                <p className="student-answer">
                  <strong>Your answer:</strong> {r.userAnswer || answers[idx]}
                </p>
                
                {!r.isCorrect && r.correctAnswer && (
                  <p className="correct-answer">
                    <strong>Correct answer:</strong> {r.correctAnswer}
                  </p>
                )}
                
                <div className="ai-feedback-section">
                  <strong>Feedback:</strong>
                  <p dangerouslySetInnerHTML={{ __html: r.feedback }} />
                </div>
              </div>
            ))}
          </div>

          <div className="feedback-actions">
            <button
              className="btn-primary"
              onClick={() => {
                setResults(null);
                setTest(test); // Reset answers
                useTestStore.setState({ timer: 0 });
              }}
            >
              🔄 Retake Quiz
            </button>
            <button
              className="btn-secondary"
              onClick={() => navigate("/quiz")}
            >
              ← Back to Quizzes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
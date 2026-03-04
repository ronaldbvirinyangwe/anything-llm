import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import axios from "axios";
import "katex/dist/katex.min.css";
import "./student-result-detail.css";

// Helper to render text with inline LaTeX (same as quiz page)
function MathText({ text }) {
  if (!text) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ children }) => <span>{children}</span>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

/**
 * Sanitize AI feedback text by stripping leaked chain-of-thought reasoning.
 *
 * The AI sometimes leaks internal reasoning before the actual feedback.
 * This function detects and removes that preamble, keeping only the
 * student-facing content.
 */
function sanitizeFeedback(text) {
  if (!text || typeof text !== "string") return text;

  let cleaned = text;

  // 1. If "assistantfinal" marker exists, take everything after the LAST occurrence
  const finalMarkerRegex = /assistant\s*final/gi;
  let lastIndex = -1;
  let match;
  while ((match = finalMarkerRegex.exec(cleaned)) !== null) {
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex !== -1) {
    cleaned = cleaned.substring(lastIndex);
  }

  // 2. Remove common leaked reasoning patterns at the start of text
  const reasoningPrefixes = [
    /^[\s\S]*?(?=\*?\*?SCORE\b)/i,
    /^[\s\S]*?(?=\*?\*?FEEDBACK\b)/i,
  ];

  for (const pattern of reasoningPrefixes) {
    const prefixMatch = cleaned.match(pattern);
    if (prefixMatch && prefixMatch[0].length > 0 && prefixMatch[0].length < cleaned.length) {
      cleaned = cleaned.substring(prefixMatch[0].length);
    }
  }

  // 3. Remove standalone reasoning lines scattered throughout
  const reasoningLinePatterns = [
    // "We need to grade/give/craft..." planning lines
    /^We need to .*$/gm,
    // "Let's do it/produce/craft..." lines
    /^Let'?s (?:do it|produce|craft|write|generate|decide|format).*$/gm,
    // "Now produce..." lines
    /^Now produce.*$/gm,
    // "Also need to..." lines
    /^Also need to.*$/gm,
    // "So we need..." lines
    /^So we need.*$/gm,
    // "Provide feedback/tip/explanation" instruction lines
    /^(?:Provide|Ensure to|Ensure|Confirm)[\s.].*?(?:feedback|tip|explanation|sentences|concise|thorough).*$/gm,
    // "3-4 sentences" or "Ok." standalone
    /^(?:\d+-?\d*\s*sentences?\.?\s*)$/gm,
    /^Ok\.?\s*$/gm,
    // "good, correct. Could include..." internal notes
    /^good,?\s*correct\.?\s*(?:Could|Provide|Encourage|It's fine).*$/gm,
    // "The user:" or "The task:" preamble lines
    /^The (?:user|task)\s*:.*$/gm,
    // "They might/would/could get X marks" reasoning
    /^(?:They|So they|They'd|So they'd).*?(?:marks?|get \d).*$/gm,
    // "We might choose..." reasoning
    /^We (?:might|could|should|need|estimate).*$/gm,
    // "Typically such question..." reasoning
    /^Typically such.*$/gm,
    // Reasoning that starts with "The student" + reasoning verbs
    /^The student(?:'s)? (?:answer|wrote|didn't|doesn't|omitted|got).*?(?:So|Let's|We need|Provide|marks).*$/gm,
    // "The answer is correct/B/..." + reasoning continuation
    /^(?:The |Correct )answer (?:is|was).*?(?:So we|Let's|We need|Provide).*$/gm,
    // "what was done well:" without markdown formatting (internal note style)
    /^what was done well\s*:(?![\s\S]*[-*]).*$/gim,
  ];

  for (const pattern of reasoningLinePatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // 4. Remove "SCORE: X/Y" lines (already shown in the points badge UI)
  cleaned = cleaned.replace(/^\*?\*?SCORE\s*:\s*\d+\.?\d*\s*\/\s*\d+\*?\*?\s*$/gim, "");

  // 5. Remove standalone "FEEDBACK" header (redundant — UI already labels it)
  cleaned = cleaned.replace(/^\*?\*?FEEDBACK\*?\*?\s*$/gim, "");

  // 6. Clean up HTML entities that leaked through
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&lt;/g, "<");
  cleaned = cleaned.replace(/&gt;/g, ">");

  // 7. Clean up excessive blank lines left behind
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // 8. Trim leading/trailing whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

export default function StudentResultDetail() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResultDetail = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");

        const res = await axios.get(
          `https://api.chikoro-ai.com/api/system/student/result-detail/${resultId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (res.data.success) {
          setResult(res.data.result);
        } else {
          setError(res.data.error || "Failed to fetch result");
        }
      } catch (err) {
        console.error("Error fetching result:", err);
        setError("Error loading result");
      } finally {
        setLoading(false);
      }
    };

    fetchResultDetail();
  }, [resultId]);

  if (loading) {
    return <div className="loading-screen">Loading result...</div>;
  }

  if (error || !result) {
    return (
      <div className="result-detail-container">
        <div className="error-message">{error || "Result not found"}</div>
        <Link to="/student/results" className="back-btn">
          ← Back to Results
        </Link>
      </div>
    );
  }

  return (
    <div className="result-detail-container">
      <nav className="detail-nav">
        <Link to="/student/results" className="back-btn">
          ← Back to Results
        </Link>
      </nav>

      <header className="detail-header">
        <div className="header-content">
          <h1>{result.quizName}</h1>
          <p className="detail-subject">{result.subject}</p>
          <p className="detail-teacher">Teacher: {result.teacherName}</p>
          <p className="detail-date">
            Submitted on{" "}
            {new Date(result.submittedAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="score-summary">
          <div
            className={`final-score ${result.score >= 70 ? "pass" : "fail"}`}
          >
            {result.score}%
          </div>
          <p>
            {result.correctAnswers}/{result.totalQuestions} correct
          </p>
        </div>
      </header>

      <section className="feedback-section">
        <h2>Detailed Feedback</h2>

        {result.detailedFeedback.map((feedback, index) => (
          <div key={index} className="feedback-card">
            <div className="question-header">
              <h3>Question {feedback.questionNumber}</h3>
              {feedback.pointsEarned !== undefined && (
                <span className="points-badge">
                  {feedback.pointsEarned}/{feedback.pointsPossible} points
                </span>
              )}
            </div>

            <div className="question-content">
              <p className="question-text">
                <MathText text={feedback.question} />
              </p>
            </div>

            <div className="answer-section">
              <div className="your-answer">
                <strong>Your Answer:</strong>
                <div className="student-answer-display">
                  <MathText text={feedback.studentAnswer} />
                </div>
              </div>

              {feedback.type === "multiple-choice" && (
                <div
                  className={`correctness ${
                    feedback.isCorrect ? "correct" : "incorrect"
                  }`}
                >
                  {feedback.isCorrect ? (
                    "✓ Correct"
                  ) : (
                    <span>
                      ✗ Incorrect - Correct answer:{" "}
                      <MathText text={feedback.correctAnswer} />
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="ai-feedback">
              <strong>Feedback:</strong>
              <div className="ai-feedback-content">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {sanitizeFeedback(feedback.explanation)}
                </ReactMarkdown>
              </div>
            </div>

            {feedback.markScheme && (
              <details className="mark-scheme">
                <summary>View Mark Scheme</summary>
                <div className="mark-scheme-content">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                  >
                    {sanitizeFeedback(feedback.markScheme)}
                  </ReactMarkdown>
                </div>
              </details>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
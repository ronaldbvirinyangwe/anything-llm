import { useState } from "react";
import StudyPlannerForm from "@/components/StudyPlannerForm/StudyPlannerForm";

/**
 * StudyOnboarding
 *
 * Renders a step-by-step guided question flow.
 * One question at a time, answers collected, then sent back to the agent
 * as ONBOARDING_COMPLETE::{answers} for routing to the right tool.
 */
export default function StudyOnboarding({ payload, sendCommand }) {
  const {
    student = null,
    activePlan = null,
    questions = [],
    resolvedSubject,
    plannerPrefill = {},
    completionMessageTemplate = "ONBOARDING_COMPLETE::{answers}",
  } = payload;

  const inferredSubject =
  payload.student?.currentSubject ||   // if you add this to profile
  activePlan?.subject ||               // already in payload
  null;

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() => {
  const initial = {};
   if (resolvedSubject) initial["subject"] = resolvedSubject;
  return initial;
});

  const [showPlannerForm, setShowPlannerForm] = useState(false);

  const firstName = student?.firstName ?? null;

  // Filter questions relevant to the current answers
  const visibleQuestions = questions.filter((q) => {
    if (q.skipIf && answers[q.skipIf.field] === q.skipIf.value) return false;
    if (q.showOnlyFor && !q.showOnlyFor.includes(answers["intent"])) return false;
    return true;
  });

  const currentQuestion = visibleQuestions[step];
  const isComplete = step >= visibleQuestions.length;

  function handleSelect(questionId, value) {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    // If student wants a study plan, show the planner form instead of continuing
    if (questionId === "intent" && value === "study_plan") {
      setShowPlannerForm(true);
      return;
    }

    // Advance to next step
    const nextStep = step + 1;

    // Peek ahead — skip questions that won't show given new answers
    const nextVisible = questions.filter((q) => {
      if (q.skipIf && newAnswers[q.skipIf.field] === q.skipIf.value) return false;
      if (q.showOnlyFor && !q.showOnlyFor.includes(newAnswers["intent"])) return false;
      return true;
    });

    if (nextStep >= nextVisible.length) {
      // All done — send answers back to agent
      submitAnswers(newAnswers);
    } else {
      setStep(nextStep);
    }
  }

  function handleFreeTextSubmit(questionId, value) {
    handleSelect(questionId, value);
  }

 function submitAnswers(finalAnswers) {
  const { intent, subject, topic, depth } = finalAnswers;

  // Build a direct, natural language prompt the agent can immediately act on
  const intentMessages = {
    quiz:         `Quiz me on ${topic} in ${subject}${depth ? ` at ${depth} depth` : ""}.`,
    flashcards:   `Make me flashcards on ${topic} in ${subject}.`,
    notes:        `Generate study notes on ${topic} in ${subject}.`,
    explain:      `Explain ${topic} in ${subject}${depth === "deep" ? " in depth" : depth === "overview" ? " briefly" : ""}.`,
    check_answer: `Check my answer on ${topic} in ${subject}.`,
    study_plan:   null, // handled by planner form — never reaches here
  };

  const message = intentMessages[intent];
  if (!message) return;

   window.dispatchEvent(
    new CustomEvent("SEND_CHAT_MESSAGE", { 
      detail: { 
        prompt: message,
        skipMetadataInjection: true  // ← handle this in your chat input component
      } 
    })
  );
}
  // ── Planner form path ─────────────────────────────────────────────────────
  if (showPlannerForm) {
    return (
      <div className="study-onboarding">
        {firstName && (
          <p className="onboarding-greeting">
            Let's build your study plan, {firstName}! 📅
          </p>
        )}
        {activePlan && (
          <div className="active-plan-banner">
            📌 You have an active plan for <strong>{activePlan.subject}</strong>{" "}
            (exam: {activePlan.examDate}). This will create a new one.
          </div>
        )}
        <div className="onboarding-planner-card">
          <div className="onboarding-planner-header">
            <span>📅</span>
            <strong>Build your study plan</strong>
          </div>
          <StudyPlannerForm prefill={plannerPrefill} />
        </div>
        <button
          className="back-btn"
          onClick={() => { setShowPlannerForm(false); setStep(0); setAnswers({}); }}
          type="button"
        >
          ← Back
        </button>
        <Style />
      </div>
    );
  }

  // ── Step-by-step questions ────────────────────────────────────────────────
  return (
    <div className="study-onboarding">
      {/* Greeting */}
      <p className="onboarding-greeting">
        {firstName
          ? `👋 Hey ${firstName}! Let's figure out what you need.`
          : "👋 Hey! Let's figure out what you need."}
        {activePlan && (
          <span className="active-plan-chip">
            📌 Active plan: {activePlan.subject} · exam {activePlan.examDate}
          </span>
        )}
      </p>

      {/* Progress dots */}
      {visibleQuestions.length > 1 && (
        <div className="progress-dots">
          {visibleQuestions.map((_, i) => (
            <span
              key={i}
              className={`dot ${i === step ? "active" : i < step ? "done" : ""}`}
            />
          ))}
        </div>
      )}

      {/* Current question */}
      {!isComplete && currentQuestion && (
        <QuestionStep
          question={currentQuestion}
          onSelect={(value) => handleSelect(currentQuestion.id, value)}
          onFreeTextSubmit={(value) => handleFreeTextSubmit(currentQuestion.id, value)}
        />
      )}

      <Style />
    </div>
  );
}

// ── Single question renderer ──────────────────────────────────────────────────
function QuestionStep({ question, onSelect, onFreeTextSubmit }) {
  const [text, setText] = useState("");

  if (question.type === "free_text") {
    return (
      <div className="question-block">
        <p className="question-text">{question.question}</p>
        <div className="free-text-row">
          <input
            className="free-text-input"
            type="text"
            placeholder={question.placeholder ?? "Type your answer…"}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && text.trim()) onFreeTextSubmit(text.trim());
            }}
            autoFocus
          />
          <button
            className="free-text-submit"
            type="button"
            disabled={!text.trim()}
            onClick={() => onFreeTextSubmit(text.trim())}
          >
            →
          </button>
        </div>
      </div>
    );
  }

  // single_select
  return (
    <div className="question-block">
      <p className="question-text">{question.question}</p>
      <div className="options-grid">
        {question.options.map((opt) => {
          const label = typeof opt === "string" ? opt : opt.label;
          const value = typeof opt === "string" ? opt : opt.value;
          return (
            <button
              key={value}
              className="option-btn"
              type="button"
              onClick={() => onSelect(value)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
function Style() {
  return (
    <style>{`
      .study-onboarding {
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-width: 500px;
      }
      .onboarding-greeting {
        font-size: 14px;
        color: var(--theme-text-secondary, #94a3b8);
        margin: 0;
        line-height: 1.6;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .active-plan-chip {
        display: inline-block;
        font-size: 12px;
        background: var(--theme-bg-secondary, #f0f9ff);
        border: 1px solid var(--theme-text-link, #0ea5e9);
        border-radius: 20px;
        padding: 2px 10px;
        color: var(--theme-text-link, #0ea5e9);
        width: fit-content;
      }
      .active-plan-banner {
        font-size: 13px;
        background: var(--theme-bg-secondary, #f0f9ff);
        border-left: 3px solid var(--theme-text-link, #0ea5e9);
        padding: 8px 12px;
        border-radius: 0 8px 8px 0;
        color: var(--theme-text-primary, #1e293b);
      }
      .progress-dots {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--theme-sidebar-border, #e2e8f0);
        transition: background 0.2s;
      }
      .dot.active {
        background: var(--theme-text-link, #0ea5e9);
        width: 20px;
        border-radius: 4px;
      }
      .dot.done { background: var(--theme-text-link, #0ea5e9); opacity: 0.4; }
      .question-block {
        display: flex;
        flex-direction: column;
        gap: 10px;
        animation: fadeSlideIn 0.2s ease;
      }
      @keyframes fadeSlideIn {
        from { opacity: 0; transform: translateY(6px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .question-text {
        font-size: 15px;
        font-weight: 600;
        color: var(--theme-text-primary, #1e293b);
        margin: 0;
      }
      .options-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .option-btn {
        padding: 10px 16px;
        border-radius: 12px;
        border: 1.5px solid var(--theme-sidebar-border, #e2e8f0);
        background: var(--theme-bg-primary, #ffffff);
        color: var(--theme-text-primary, #1e293b);
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.15s, border-color 0.15s, transform 0.1s;
      }
      .option-btn:hover {
        background: var(--theme-sidebar-item-hover, #f0f9ff);
        border-color: var(--theme-text-link, #0ea5e9);
      }
      .option-btn:active { transform: scale(0.96); }
      .free-text-row {
        display: flex;
        gap: 8px;
      }
      .free-text-input {
        flex: 1;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1.5px solid var(--theme-sidebar-border, #e2e8f0);
        background: var(--theme-bg-primary, #ffffff);
        color: var(--theme-text-primary, #1e293b);
        font-size: 13px;
        outline: none;
      }
      .free-text-input:focus { border-color: var(--theme-text-link, #0ea5e9); }
      .free-text-submit {
        padding: 10px 16px;
        border-radius: 12px;
        border: none;
        background: var(--theme-text-link, #0ea5e9);
        color: white;
        font-size: 16px;
        cursor: pointer;
        transition: opacity 0.15s;
      }
      .free-text-submit:disabled { opacity: 0.4; cursor: not-allowed; }
      .onboarding-planner-card {
        border: 2px solid var(--theme-text-link, #0ea5e9);
        border-radius: 16px;
        padding: 16px 18px;
        background: var(--theme-bg-secondary, #f0f9ff);
      }
      .onboarding-planner-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 14px;
        color: var(--theme-text-primary, #1e293b);
      }
      .back-btn {
        font-size: 13px;
        color: var(--theme-text-secondary, #94a3b8);
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        width: fit-content;
      }
      .back-btn:hover { color: var(--theme-text-primary, #1e293b); }
    `}</style>
  );
}
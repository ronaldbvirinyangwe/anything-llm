import StudyPlannerForm from "@/components/StudyPlannerForm/StudyPlannerForm";

/**
 * StudyOnboarding
 *
 * Rendered by ChatHistory when a message starts with "STUDY_ONBOARDING::".
 * Shows the study planner form as the primary action, with quick-action
 * buttons below for quiz, flashcards, notes, etc.
 *
 * Props:
 *   payload     — parsed from the STUDY_ONBOARDING:: prefix
 *   sendCommand — the sendCommand from ChatContainer (autoSubmit path)
 */
export default function StudyOnboarding({ payload, sendCommand }) {
  const { plannerPrefill = {}, quickActions = [] } = payload;

  function handleQuickAction(message) {
    // Fires SEND_CHAT_MESSAGE — same event your study planner form uses
    window.dispatchEvent(
      new CustomEvent("SEND_CHAT_MESSAGE", { detail: { prompt: message } })
    );
  }

  return (
    <div className="study-onboarding">
      <p className="onboarding-greeting">
        👋 Hi! Let's get you studying. Build your study plan below, or pick
        something quick to get started right away.
      </p>

      {/* ── Primary: Study Planner Form ── */}
      <div className="onboarding-planner-card">
        <div className="onboarding-planner-header">
          <span>📅</span>
          <strong>Build your study plan</strong>
        </div>
        {/*
          Reuse StudyPlannerForm exactly as-is.
          It already dispatches SEND_CHAT_MESSAGE on submit,
          which your existing useEffect in ChatContainer picks up.
        */}
        <StudyPlannerForm prefill={plannerPrefill} />
      </div>

      {/* ── Divider ── */}
      <div className="onboarding-divider">
        <span>or jump straight in</span>
      </div>

      {/* ── Secondary: Quick-action buttons ── */}
      <div className="onboarding-quick-actions">
        {quickActions.map(({ emoji, label, message }) => (
          <button
            key={label}
            className="quick-action-btn"
            onClick={() => handleQuickAction(message)}
            type="button"
          >
            <span className="quick-action-emoji">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>

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
          line-height: 1.5;
        }
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
        .onboarding-divider {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--theme-text-secondary, #94a3b8);
        }
        .onboarding-divider::before,
        .onboarding-divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--theme-sidebar-border, #e2e8f0);
        }
        .onboarding-quick-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .quick-action-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 14px;
          border-radius: 12px;
          border: 1.5px solid var(--theme-sidebar-border, #e2e8f0);
          background: var(--theme-bg-primary, #ffffff);
          color: var(--theme-text-primary, #1e293b);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s, border-color 0.15s, transform 0.1s;
        }
        .quick-action-btn:hover {
          background: var(--theme-sidebar-item-hover, #f0f9ff);
          border-color: var(--theme-text-link, #0ea5e9);
        }
        .quick-action-btn:active { transform: scale(0.96); }
        .quick-action-emoji { font-size: 18px; }
      `}</style>
    </div>
  );
}
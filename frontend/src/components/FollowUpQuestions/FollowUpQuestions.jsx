import { useState } from "react";

/**
 * FollowUpQuestions
 *
 * Rendered when the chat history contains a message with the
 * FOLLOW_UP_QUESTIONS:: prefix. Displays 3 clickable question
 * buttons. Tapping one sends it as the student's next message
 * and hides the buttons.
 *
 * Usage in your chat message renderer:
 *
 *   if (message.content.startsWith("FOLLOW_UP_QUESTIONS::")) {
 *     const payload = JSON.parse(message.content.replace("FOLLOW_UP_QUESTIONS::", ""));
 *     return <FollowUpQuestions {...payload} onSelect={sendChatMessage} />;
 *   }
 */

export default function FollowUpQuestions({ questions = [], subject = null, onSelect }) {
  const [selected, setSelected] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleSelect = (question) => {
    setSelected(question);
    setDismissed(true);
    onSelect?.(question);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        marginTop: "10px",
        maxWidth: "480px",
      }}
    >
      <p
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--theme-text-secondary)",
          margin: "0 0 4px 0",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Ask a follow-up
      </p>

      {questions.map((question, i) => (
        <button
          key={i}
          onClick={() => handleSelect(question)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "9px 14px",
            borderRadius: "10px",
            border: "1px solid var(--theme-sidebar-border)",
            background:
              selected === question
                ? "var(--theme-button-primary)"
                : "var(--theme-bg-secondary)",
            color:
              selected === question
                ? "#ffffff"
                : "var(--theme-text-primary)",
            fontSize: "13px",
            fontWeight: 400,
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
            transition: "background 0.15s, border-color 0.15s",
            lineHeight: "1.4",
          }}
          onMouseEnter={(e) => {
            if (selected !== question) {
              e.currentTarget.style.background =
                "var(--theme-button-code-hover-bg)";
              e.currentTarget.style.borderColor =
                "var(--theme-button-primary)";
            }
          }}
          onMouseLeave={(e) => {
            if (selected !== question) {
              e.currentTarget.style.background =
                "var(--theme-bg-secondary)";
              e.currentTarget.style.borderColor =
                "var(--theme-sidebar-border)";
            }
          }}
        >
          <span
            style={{
              fontSize: "14px",
              flexShrink: 0,
              opacity: 0.6,
            }}
          >
            ↗
          </span>
          {question}
        </button>
      ))}
    </div>
  );
}
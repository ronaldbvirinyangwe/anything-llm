import React, { useState, useEffect, memo } from "react";
import { useAuth } from "@/AuthContext";
import "./ChikoroMascot.css";

// ═══════════════════════════════════════════════════════════════
// EXPRESSION CONSTANTS
// ═══════════════════════════════════════════════════════════════
export const MASCOT_EXPRESSIONS = {
  happy: "happy",
  thinking: "thinking",
  celebrating: "celebrating",
  encouraging: "encouraging",
  quizzing: "quizzing",
  mindblown: "mindblown",
  studying: "studying",
  explaining: "explaining",
  comeback: "comeback",
  sleeping: "sleeping",
  disappointed: "disappointed",
  waving: "waving",
};

const MASCOT_ARIA_LABELS = {
  happy: "Chikoro smiling",
  thinking: "Chikoro thinking",
  celebrating: "Chikoro celebrating your progress",
  encouraging: "Chikoro encouraging you",
  quizzing: "Chikoro presenting a quiz",
  mindblown: "Chikoro celebrating a perfect score",
  studying: "Chikoro studying",
  explaining: "Chikoro explaining an idea",
  comeback: "Chikoro welcoming you back",
  sleeping: "Chikoro taking a study break",
  disappointed: "Chikoro ready to help you try again",
  waving: "Chikoro waving hello",
};
export const TOOL_MASCOT_STATE = {
  "study-planner-elicit": {
    expression: "studying",
    message: "📅 Let me open your study planner...",
  },
  "study-planner": {
    expression: "studying",
    message: "📅 Building your study plan, one day at a time...",
  },
  "generate-notes": {
    expression: "explaining",
    message: "📚 Writing your notes now...",
  },
  "check-my-answer": {
    expression: "quizzing",
    message: "🦉 Marking your answer carefully...",
  },
  "explain-concept": {
    expression: "explaining",
    message: "💡 Let me break this down for you...",
  },
  "document-summarizer": {
    expression: "studying",
    message: "📄 Reading through your documents...",
  },
  "web-browsing": {
    expression: "thinking",
    message: "🔍 Searching the web for you...",
  },
  "web-scraping": {
    expression: "thinking",
    message: "🌐 Reading that page...",
  },
  flashcard_create: {
    expression: "quizzing",
    message: "🃏 Shuffling your flashcards...",
  },
  quiz_create: {
    expression: "quizzing",
    message: "📝 Writing your quiz questions...",
  },
  "create-chart": {
    expression: "mindblown",
    message: "📊 Drawing your chart...",
  },
  __thinking__: {
    expression: "thinking",
    message: "Hmm, let me think about that... 🧠",
  },
  __done__: { expression: "happy", message: null },
};
// ═══════════════════════════════════════════════════════════════
// SPEECH MESSAGES — context-aware per expression
// ═══════════════════════════════════════════════════════════════
const SPEECH_MESSAGES = {
  happy: [
    "Ready when you are. What shall we learn?",
    "Bring me a question and we'll work through it together.",
    "Small steps add up. Where should we begin?",
    "Let's make this lesson clearer together.",
  ],
  thinking: [
    "Let me think through that carefully...",
    "I'm working through your question.",
    "Good question. Give me a moment.",
    "Checking the details before I answer...",
  ],
  celebrating: [
    "Excellent work. Your practice is paying off! 🎉",
    "You worked that out well.",
    "Strong progress. Keep using that approach.",
    "That effort deserves a celebration!",
  ],
  encouraging: [
    "You're close. Let's try the next step together.",
    "Good attempt. We can learn from this part.",
    "Mistakes show us what to practise next.",
    "Take your time. You can work this out.",
  ],
  quizzing: [
    "Quiz time. Let's see what you understand so far.",
    "Answer what you can, then we'll review the rest.",
    "Ready for a quick knowledge check?",
    "Use what you've learned and take your time.",
  ],
  mindblown: [
    "Perfect score! Your preparation really showed. 🤯",
    "Every answer correct. Excellent attention to detail.",
    "Outstanding work. Remember the methods that helped.",
    "100%! Your practice has paid off.",
  ],
  studying: [
    "Focus mode. One idea at a time. 📖",
    "Let's review this carefully.",
    "Take your time. Understanding matters more than speed.",
    "Let's connect this to what you already know.",
  ],
  explaining: [
    "Here's how it works, step by step. 💡",
    "Let's break this into smaller parts.",
    "Good question. Start with this key idea.",
    "I'll explain it, then you can try an example.",
  ],
  comeback: [
    "Welcome back. We can continue at your pace.",
    "Ready for one small study step today?",
    "Good to see you again. Where should we restart?",
    "Your learning is still here when you're ready.",
  ],
  sleeping: [
    "I'll be here when you're ready...",
    "Quiet study break... 😴",
    "Rest is part of learning too.",
  ],
  disappointed: [
    "That was a difficult one. Let's find the first step.",
    "Not there yet, but now we know what to practise.",
    "Let's review the tricky parts and try again.",
  ],
  waving: [
    "Welcome to Chikoro AI. What are you learning today? 👋",
    "I'm Chikoro. We'll work through it together.",
    "Hello! Bring me a topic or a question.",
    "Ready for a focused study session?",
  ],
};

// ═══════════════════════════════════════════════════════════════
// MAIN MASCOT SVG COMPONENT
// ═══════════════════════════════════════════════════════════════
export const ChikoroMascot = memo(function ChikoroMascot({
  expression = "happy",
  size = 120,
  animate = true,
  className = "",
  onClick,
  ariaLabel,
}) {
  const motionEnabled = animate && size > 44;

  const renderFace = () => {
    switch (expression) {
      case "happy":
        return (
          <>
            <path
              d="M75,95 Q82,85 89,95"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M111,95 Q118,85 125,95"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M80,115 Q100,135 120,115"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <ellipse cx="72" cy="110" rx="8" ry="5" fill="#4ade8044" />
            <ellipse cx="128" cy="110" rx="8" ry="5" fill="#4ade8044" />
          </>
        );

      case "thinking":
        return (
          <>
            <circle cx="87" cy="92" r="10" fill="#1a1a1a" />
            <circle cx="90" cy="89" r="4" fill="white" />
            <circle cx="120" cy="92" r="10" fill="#1a1a1a" />
            <circle cx="123" cy="89" r="4" fill="white" />
            <ellipse cx="100" cy="120" rx="6" ry="5" fill="#1a1a1a" />
            <circle
              cx="150"
              cy="60"
              r="5"
              fill="#4ade8066"
              className={motionEnabled ? "chk-pulse" : ""}
            />
            <circle
              cx="160"
              cy="48"
              r="8"
              fill="#4ade8066"
              className={motionEnabled ? "chk-pulse-d1" : ""}
            />
            <circle
              cx="172"
              cy="34"
              r="12"
              fill="#4ade8066"
              className={motionEnabled ? "chk-pulse-d2" : ""}
            />
          </>
        );

      case "celebrating":
        return (
          <>
            <text x="82" y="100" fontSize="20" textAnchor="middle">
              ⭐
            </text>
            <text x="118" y="100" fontSize="20" textAnchor="middle">
              ⭐
            </text>
            <path d="M78,112 Q100,140 122,112" fill="#1a1a1a" />
            <path d="M82,112 Q100,120 118,112" fill="white" />
            <line
              x1="50"
              y1="100"
              x2="30"
              y2="70"
              stroke="#d1d5db"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <line
              x1="150"
              y1="100"
              x2="170"
              y2="70"
              stroke="#d1d5db"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <rect
              x="30"
              y="50"
              width="6"
              height="6"
              rx="1"
              fill="#fbbf24"
              transform="rotate(30 33 53)"
              className={motionEnabled ? "chk-confetti" : ""}
            />
            <rect
              x="165"
              y="45"
              width="6"
              height="6"
              rx="1"
              fill="#f472b6"
              transform="rotate(-20 168 48)"
              className={motionEnabled ? "chk-confetti chk-cd1" : ""}
            />
            <rect
              x="45"
              y="35"
              width="5"
              height="5"
              rx="1"
              fill="#60a5fa"
              className={motionEnabled ? "chk-confetti chk-cd2" : ""}
            />
            <rect
              x="155"
              y="30"
              width="5"
              height="5"
              rx="1"
              fill="#4ade80"
              className={motionEnabled ? "chk-confetti chk-cd3" : ""}
            />
            <circle
              cx="25"
              cy="60"
              r="3"
              fill="#f472b6"
              className={motionEnabled ? "chk-confetti chk-cd4" : ""}
            />
            <circle
              cx="178"
              cy="55"
              r="3"
              fill="#fbbf24"
              className={motionEnabled ? "chk-confetti chk-cd5" : ""}
            />
          </>
        );

      case "encouraging":
        return (
          <>
            <path
              d="M75,95 Q82,88 89,95"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M111,95 Q118,88 125,95"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <path
              d="M85,115 Q100,128 115,115"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <line
              x1="150"
              y1="105"
              x2="165"
              y2="85"
              stroke="#d1d5db"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <text x="168" y="82" fontSize="18" textAnchor="middle">
              👍
            </text>
            <ellipse cx="72" cy="108" rx="7" ry="4" fill="#4ade8044" />
            <ellipse cx="128" cy="108" rx="7" ry="4" fill="#4ade8044" />
          </>
        );

      case "quizzing":
        return (
          <>
            <circle cx="82" cy="92" r="9" fill="#1a1a1a" />
            <circle cx="85" cy="90" r="3.5" fill="white" />
            <path
              d="M107,82 Q118,75 129,82"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="118" cy="92" r="9" fill="#1a1a1a" />
            <circle cx="121" cy="90" r="3.5" fill="white" />
            <path
              d="M85,118 Q100,125 118,114"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect
              x="28"
              y="106"
              width="25"
              height="32"
              rx="3"
              fill="#fbbf24"
              opacity="0.85"
            />
            <rect x="32" y="113" width="17" height="2" rx="1" fill="#92400e" />
            <rect x="32" y="118" width="17" height="2" rx="1" fill="#92400e" />
            <rect x="32" y="123" width="12" height="2" rx="1" fill="#92400e" />
            <line
              x1="52"
              y1="105"
              x2="42"
              y2="113"
              stroke="#d1d5db"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        );

      case "mindblown":
        return (
          <>
            <circle cx="82" cy="92" r="13" fill="#1a1a1a" />
            <circle cx="82" cy="92" r="8" fill="white" />
            <circle cx="82" cy="92" r="5" fill="#1a1a1a" />
            <circle cx="118" cy="92" r="13" fill="#1a1a1a" />
            <circle cx="118" cy="92" r="8" fill="white" />
            <circle cx="118" cy="92" r="5" fill="#1a1a1a" />
            <ellipse cx="100" cy="122" rx="10" ry="12" fill="#1a1a1a" />
            <line
              x1="70"
              y1="55"
              x2="55"
              y2="35"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
              className={motionEnabled ? "chk-explode" : ""}
            />
            <line
              x1="100"
              y1="48"
              x2="100"
              y2="25"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
              className={motionEnabled ? "chk-explode" : ""}
            />
            <line
              x1="130"
              y1="55"
              x2="145"
              y2="35"
              stroke="#fbbf24"
              strokeWidth="3"
              strokeLinecap="round"
              className={motionEnabled ? "chk-explode" : ""}
            />
            <line
              x1="60"
              y1="65"
              x2="40"
              y2="55"
              stroke="#f472b6"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="140"
              y1="65"
              x2="160"
              y2="55"
              stroke="#60a5fa"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        );

      case "studying":
        return (
          <>
            <circle
              cx="82"
              cy="92"
              r="12"
              fill="none"
              stroke="#374151"
              strokeWidth="3"
            />
            <circle
              cx="118"
              cy="92"
              r="12"
              fill="none"
              stroke="#374151"
              strokeWidth="3"
            />
            <line
              x1="94"
              y1="92"
              x2="106"
              y2="92"
              stroke="#374151"
              strokeWidth="3"
            />
            <circle cx="82" cy="93" r="5" fill="#1a1a1a" />
            <circle cx="84" cy="91" r="2" fill="white" />
            <circle cx="118" cy="93" r="5" fill="#1a1a1a" />
            <circle cx="120" cy="91" r="2" fill="white" />
            <path
              d="M90,118 L110,118"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <rect
              x="140"
              y="108"
              width="28"
              height="20"
              rx="2"
              fill="#60a5fa"
            />
            <line
              x1="154"
              y1="108"
              x2="154"
              y2="128"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            <rect x="143" y="112" width="9" height="2" rx="1" fill="#dbeafe" />
            <rect x="156" y="112" width="9" height="2" rx="1" fill="#dbeafe" />
          </>
        );

      case "explaining":
        return (
          <>
            <circle cx="82" cy="92" r="8" fill="#1a1a1a" />
            <circle cx="85" cy="89" r="3" fill="white" />
            <circle cx="118" cy="92" r="8" fill="#1a1a1a" />
            <circle cx="121" cy="89" r="3" fill="white" />
            <path
              d="M72,80 Q82,74 92,80"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M108,80 Q118,74 128,80"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path d="M85,115 Q100,128 115,115" fill="#1a1a1a" />
            <line
              x1="150"
              y1="105"
              x2="172"
              y2="95"
              stroke="#d1d5db"
              strokeWidth="5"
              strokeLinecap="round"
            />
            <text x="178" y="90" fontSize="14" textAnchor="middle">
              💡
            </text>
          </>
        );

      case "comeback":
        return (
          <>
            <circle cx="82" cy="92" r="12" fill="#1a1a1a" />
            <circle cx="82" cy="92" r="8" fill="white" />
            <circle cx="80" cy="94" r="5" fill="#1a1a1a" />
            <circle cx="79" cy="92" r="2" fill="white" />
            <circle cx="118" cy="92" r="12" fill="#1a1a1a" />
            <circle cx="118" cy="92" r="8" fill="white" />
            <circle cx="116" cy="94" r="5" fill="#1a1a1a" />
            <circle cx="115" cy="92" r="2" fill="white" />
            <path
              d="M72,78 Q82,82 92,78"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M108,78 Q118,82 128,78"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            <path
              d="M88,120 Q100,114 112,120"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <ellipse cx="70" cy="108" rx="3" ry="5" fill="#60a5fa55" />
          </>
        );

      case "sleeping":
        return (
          <>
            <path
              d="M73,94 Q82,98 91,94"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M109,94 Q118,98 127,94"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <ellipse
              cx="100"
              cy="120"
              rx="4"
              ry="3"
              fill="#1a1a1a"
              opacity="0.5"
            />
            <text
              x="145"
              y="60"
              fontFamily="sans-serif"
              fontSize="20"
              fontWeight="700"
              fill="#4ade80"
              opacity="0.8"
              className={motionEnabled ? "chk-zzz1" : ""}
            >
              Z
            </text>
            <text
              x="158"
              y="45"
              fontFamily="sans-serif"
              fontSize="16"
              fontWeight="700"
              fill="#4ade80"
              opacity="0.6"
              className={motionEnabled ? "chk-zzz2" : ""}
            >
              Z
            </text>
            <text
              x="168"
              y="33"
              fontFamily="sans-serif"
              fontSize="12"
              fontWeight="700"
              fill="#4ade80"
              opacity="0.4"
              className={motionEnabled ? "chk-zzz3" : ""}
            >
              Z
            </text>
            <ellipse cx="74" cy="105" rx="8" ry="4" fill="#f472b622" />
            <ellipse cx="126" cy="105" rx="8" ry="4" fill="#f472b622" />
          </>
        );

      case "disappointed":
        return (
          <>
            <path
              d="M72,88 L92,82"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M128,88 L108,82"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <circle cx="82" cy="95" r="7" fill="#1a1a1a" />
            <circle cx="84" cy="93" r="2.5" fill="white" />
            <circle cx="118" cy="95" r="7" fill="#1a1a1a" />
            <circle cx="120" cy="93" r="2.5" fill="white" />
            <path
              d="M85,120 Q93,115 100,120 Q107,125 115,118"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <ellipse cx="72" cy="108" rx="7" ry="4" fill="#60a5fa22" />
            <ellipse cx="128" cy="108" rx="7" ry="4" fill="#60a5fa22" />
          </>
        );

      case "waving":
        return (
          <>
            <circle cx="82" cy="92" r="9" fill="#1a1a1a" />
            <circle cx="85" cy="89" r="3.5" fill="white" />
            <circle cx="118" cy="92" r="9" fill="#1a1a1a" />
            <circle cx="121" cy="89" r="3.5" fill="white" />
            <path d="M82,114 Q100,132 118,114" fill="#1a1a1a" />
            <path d="M85,114 Q100,120 115,114" fill="white" />
            <line
              x1="150"
              y1="100"
              x2="168"
              y2="72"
              stroke="#d1d5db"
              strokeWidth="6"
              strokeLinecap="round"
            />
            <text x="172" y="70" fontSize="16" textAnchor="middle">
              👋
            </text>
            <path
              d="M178,60 Q185,65 178,70"
              fill="none"
              stroke="#4ade8055"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <ellipse cx="72" cy="108" rx="7" ry="4" fill="#4ade8044" />
            <ellipse cx="128" cy="108" rx="7" ry="4" fill="#4ade8044" />
          </>
        );

      default:
        return null;
    }
  };

  // Some expressions use custom arm/ear rendering, so we skip default ears for those
  const hasCustomSides = [
    "celebrating",
    "waving",
    "encouraging",
    "explaining",
    "quizzing",
  ].includes(expression);
  const isSleeping = expression === "sleeping";
  const handleKeyDown = (event) => {
    if (!onClick || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    onClick(event);
  };

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={`chk-mascot chk-mascot--${expression} ${motionEnabled ? "chk-mascot--animated" : ""} ${className}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? "button" : "img"}
      aria-label={
        ariaLabel || MASCOT_ARIA_LABELS[expression] || "Chikoro study companion"
      }
      tabIndex={onClick ? 0 : undefined}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      {/* Green circle border */}
      <circle
        cx="100"
        cy="100"
        r="88"
        fill="none"
        stroke="#22c55e"
        strokeWidth="7"
        opacity={isSleeping ? 0.6 : 1}
      />
      {/* Robot head */}
      <rect x="55" y="65" width="90" height="80" rx="10" fill="white" />
      {/* Graduation cap */}
      <polygon
        points="100,35 140,55 100,65 60,55"
        fill="#22c55e"
        opacity={isSleeping ? 0.7 : 1}
      />
      <rect
        x="80"
        y="55"
        width="40"
        height="12"
        rx="2"
        fill="#16a34a"
        opacity={isSleeping ? 0.7 : 1}
      />
      {/* Default robot ears (only if expression doesn't render its own) */}
      {!hasCustomSides && (
        <>
          <rect x="47" y="85" width="10" height="20" rx="3" fill="#d1d5db" />
          <rect x="143" y="85" width="10" height="20" rx="3" fill="#d1d5db" />
        </>
      )}
      {/* Expression-specific face + extras */}
      {renderFace()}
    </svg>
  );
});

// ═══════════════════════════════════════════════════════════════
// SPEECH BUBBLE COMPONENT
// ═══════════════════════════════════════════════════════════════
export function MascotSpeechBubble({
  message,
  visible = true,
  position = "right",
}) {
  if (!visible || !message) return null;
  return (
    <div
      className={`chk-bubble chk-bubble--${position}`}
      role="status"
      aria-live="polite"
    >
      <p>{message}</p>
      <div className="chk-bubble__tail" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMBINED MASCOT + BUBBLE — the main component you use in pages
// ═══════════════════════════════════════════════════════════════
export default function MascotWithBubble({
  expression = "happy",
  size = 100,
  message = null,
  showBubble = true,
  bubblePosition = "right",
  animate = true,
  className = "",
  onClick,
}) {
  const { user } = useAuth();
  const streak = user?.streak ?? 0;
  const [displayMsg, setDisplayMsg] = useState("");

  useEffect(() => {
    if (message) {
      setDisplayMsg(message);
      return;
    }

    // Inject streak into the message for milestone streaks on relevant expressions
    if (
      streak > 0 &&
      (expression === "celebrating" || expression === "happy")
    ) {
      if (streak >= 30) {
        setDisplayMsg(
          `🔥 ${streak} days of consistent effort. Excellent work!`
        );
        return;
      }
      if (streak >= 7) {
        setDisplayMsg(`🔥 ${streak} days of steady practice. Keep going!`);
        return;
      }
      if (streak >= 3) {
        setDisplayMsg(`🔥 ${streak} days in a row. A strong learning habit!`);
        return;
      }
    }
    if (streak === 1 && expression === "happy") {
      setDisplayMsg(
        "Day one complete. A good start to your learning habit! 🔥"
      );
      return;
    }

    const msgs = SPEECH_MESSAGES[expression] || SPEECH_MESSAGES.happy;
    setDisplayMsg(msgs[Math.floor(Math.random() * msgs.length)]);
  }, [expression, message, streak]);

  return (
    <div
      className={`chk-mascot-group ${className}`}
      style={{ position: "relative", display: "inline-block" }}
    >
      <ChikoroMascot
        expression={expression}
        size={size}
        animate={animate}
        onClick={onClick}
      />
      {streak > 0 && (
        <div
          className="chk-streak-badge"
          title={`${streak} day streak`}
          style={{
            position: "absolute",
            top: -6,
            right: -6,
            background: "linear-gradient(135deg, #f97316, #ef4444)",
            color: "white",
            borderRadius: "999px",
            fontSize: Math.max(9, size * 0.12),
            fontWeight: 700,
            padding: "2px 6px",
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            pointerEvents: "none",
            zIndex: 20,
          }}
        >
          🔥 {streak}
        </div>
      )}
      {showBubble && (
        <MascotSpeechBubble
          message={displayMsg}
          visible={showBubble}
          position={bubblePosition}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get expression from quiz score
// ═══════════════════════════════════════════════════════════════
export function getQuizExpression(score) {
  if (score === 100) return MASCOT_EXPRESSIONS.mindblown;
  if (score >= 80) return MASCOT_EXPRESSIONS.celebrating;
  if (score >= 50) return MASCOT_EXPRESSIONS.encouraging;
  return MASCOT_EXPRESSIONS.disappointed;
}

// ═══════════════════════════════════════════════════════════════
// FLOATING ROAMING MASCOT — stays visible, drifts around chat area
// ═══════════════════════════════════════════════════════════════
export function FloatingMascot({
  expression = "happy",
  containerRef,
  size = 0,
}) {
  const [pos, setPos] = useState({ x: 20, y: 20 });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPos({ x: 20, y: 56 });
      return;
    }

    const pickNewSpot = () => {
      const el = containerRef?.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const pad = 16;
      const bottomPad = 180; // clear the prompt input
      const topPad = 56; // clear the subject selector
      const maxX = Math.max(pad, w - size - pad);
      const maxY = Math.max(topPad, h - size - bottomPad);
      setPos({
        x: pad + Math.random() * (maxX - pad),
        y: topPad + Math.random() * (maxY - topPad),
      });
    };

    pickNewSpot();
    const id = setInterval(pickNewSpot, 5000);
    return () => clearInterval(id);
  }, [containerRef, size]);

  return (
    <div
      className="chk-floating-mascot"
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: size,
        height: size,
        transition: "left 2.5s ease-in-out, top 2.5s ease-in-out",
        opacity: 0.72,
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <ChikoroMascot expression={expression} size={size} animate={true} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Get expression from flashcard progress
// ═══════════════════════════════════════════════════════════════
export function getFlashcardExpression(knownCount, totalCount) {
  if (totalCount === 0) return MASCOT_EXPRESSIONS.studying;
  if (knownCount === totalCount) return MASCOT_EXPRESSIONS.celebrating;
  if (knownCount > totalCount / 2) return MASCOT_EXPRESSIONS.encouraging;
  return MASCOT_EXPRESSIONS.studying;
}

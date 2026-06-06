import React, { useState, useEffect, useCallback, useRef } from "react";
import { ChikoroMascot, MascotSpeechBubble, MASCOT_EXPRESSIONS, getFlashcardExpression } from "@/components/ChikoroMascot";
import { FiArrowLeft, FiArrowRight, FiCheck, FiX, FiRotateCcw, FiRepeat } from "react-icons/fi";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import "./flashcards.css";

// ─── Formatted Text Wrapper ──────────────────────────────────────────────────
const FormattedText = ({ children }) => {
  if (!children) return null;
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ node, ...props }) => <p style={{ margin: "0", display: "inline-block", width: "100%" }} {...props} />,
        ul: ({ node, ...props }) => <ul style={{ margin: "8px 0", paddingLeft: 20, textAlign: "left" }} {...props} />,
        ol: ({ node, ...props }) => <ol style={{ margin: "8px 0", paddingLeft: 20, textAlign: "left" }} {...props} />,
        code: ({ node, inline, ...props }) => (
          inline 
            ? <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 5px", borderRadius: 4, fontFamily: "monospace", fontSize: "0.9em" }} {...props} />
            : <code style={{ display: "block", background: "#0f172a", color: "#e2e8f0", padding: "12px", borderRadius: 8, fontFamily: "monospace", overflowX: "auto", margin: "8px 0", textAlign: "left", fontSize: "0.85em" }} {...props} />
        ),
      }}
    >
      {String(children)}
    </ReactMarkdown>
  );
};

export default function Flashcards({ flashcardData, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [unknownCards, setUnknownCards] = useState(new Set());
  const [justMarked, setJustMarked] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false); // Prevents rapid-click bugs

  const cards = flashcardData?.cards || [];
  const currentCard = cards[currentIndex];
  const allMastered = knownCards.size === cards.length && cards.length > 0;

  // ─── Smart Looping Logic ───────────────────────────────────────────────────
  // Finds the next index that is NOT in the knownCards Set
  const getNextUnlearnedIndex = useCallback((current, direction = 1) => {
    let next = (current + direction + cards.length) % cards.length;
    let loops = 0;
    while (knownCards.has(next) && loops < cards.length) {
      next = (next + direction + cards.length) % cards.length;
      loops++;
    }
    return next;
  }, [cards.length, knownCards]);

  const handleNext = useCallback(() => {
    if (isAnimating || allMastered) return;
    setIsAnimating(true);
    setIsFlipped(false);
    // Wait for the flip animation to hide the back of the card before changing data
    setTimeout(() => {
      setCurrentIndex((prev) => getNextUnlearnedIndex(prev, 1));
      setIsAnimating(false);
    }, 150);
  }, [isAnimating, allMastered, getNextUnlearnedIndex]);

  const handlePrev = useCallback(() => {
    if (isAnimating || allMastered) return;
    setIsAnimating(true);
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => getNextUnlearnedIndex(prev, -1));
      setIsAnimating(false);
    }, 150);
  }, [isAnimating, allMastered, getNextUnlearnedIndex]);

  const handleFlip = useCallback(() => {
    if (!isAnimating) setIsFlipped((prev) => !prev);
  }, [isAnimating]);

  const triggerReaction = useCallback((type) => {
    setJustMarked(type);
    setTimeout(() => setJustMarked(null), 1500);
  }, []);

  const markKnown = useCallback((e) => {
    if (e) e.stopPropagation();
    if (isAnimating) return;
    
    setKnownCards((prev) => new Set([...prev, currentIndex]));
    setUnknownCards((prev) => { const n = new Set(prev); n.delete(currentIndex); return n; });
    triggerReaction("known");
    
    setTimeout(() => handleNext(), 500);
  }, [isAnimating, currentIndex, handleNext, triggerReaction]);

  const markUnknown = useCallback((e) => {
    if (e) e.stopPropagation();
    if (isAnimating) return;

    setUnknownCards((prev) => new Set([...prev, currentIndex]));
    setKnownCards((prev) => { const n = new Set(prev); n.delete(currentIndex); return n; });
    triggerReaction("unknown");
    
    setTimeout(() => handleNext(), 500);
  }, [isAnimating, currentIndex, handleNext, triggerReaction]);

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (allMastered) return;
      if (e.code === "Space") {
        e.preventDefault();
        handleFlip();
      } else if (e.code === "ArrowRight") {
        handleNext();
      } else if (e.code === "ArrowLeft") {
        handlePrev();
      } else if (e.code === "Digit1" || e.code === "Numpad1") {
        markUnknown();
      } else if (e.code === "Digit2" || e.code === "Numpad2") {
        markKnown();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlip, handleNext, handlePrev, markUnknown, markKnown, allMastered]);

  // ─── Mascot Logic ──────────────────────────────────────────────────────────
  const getMascotExpression = () => {
    if (justMarked === "known") return MASCOT_EXPRESSIONS.encouraging;
    if (justMarked === "unknown") return MASCOT_EXPRESSIONS.explaining;
    return getFlashcardExpression(knownCards.size, cards.length);
  };

  const getMascotMessage = () => {
    if (allMastered) return "You mastered them all! Amazing! 🎉";
    if (justMarked === "known") return "Nice one! You know your stuff! 💪";
    if (justMarked === "unknown") return "No worries, we'll review it again!";
    if (knownCards.size > cards.length / 2) return `${knownCards.size}/${cards.length} mastered — almost there!`;
    if (!isFlipped) return "Take a guess, then tap to check! (Or press Space)";
    return "Did you get it right? (Press 1 or 2)";
  };

  if (!cards.length) {
    return (
      <div className="flashcards-container empty-state">
        <div className="empty-icon">📭</div>
        <p>No flashcards available for this topic yet.</p>
      </div>
    );
  }

  const progress = ((knownCards.size / cards.length) * 100).toFixed(0);

  return (
    <div className="flashcards-container">
      {/* ═══ Header with Mascot ═══ */}
      <div className="flashcard-header fade-in">
        {onExit && (
    <button className="control-btn exit-btn" onClick={onExit} title="Exit Flashcards">
      <FiX /> Exit
    </button>
  )}
        <div className="chk-flashcard-mascot-row">
          <div className="mascot-avatar">
            <ChikoroMascot expression={getMascotExpression()} size={50} animate={true} />
          </div>
          <div className="flashcard-header-text">
            <h2>{flashcardData.topic || flashcardData.subject} {flashcardData.grade && <span className="badge"> {flashcardData.grade}</span>}</h2>
            <p className="card-counter">Card {currentIndex + 1} of {cards.length}</p>
          </div>
        </div>
        
        <div className="chk-flashcard-bubble-wrapper">
          <MascotSpeechBubble message={getMascotMessage()} visible={true} position="right" />
        </div>

        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-stats">
            <span className="stat known">✓ {knownCards.size} Mastered</span>
            <span className="stat unknown">↻ {unknownCards.size} Learning</span>
          </div>
        </div>
      </div>

      {/* ═══ Completion State ═══ */}
      {allMastered ? (
        <div className="chk-flashcard-complete fade-in">
          <div className="celebration-icon">🏆</div>
          <h2>Deck Mastered!</h2>
          <p>You have successfully learned all {cards.length} cards.</p>
          <button
            className="control-btn primary-action"
            onClick={() => {
              setKnownCards(new Set());
              setUnknownCards(new Set());
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
          >
            <FiRotateCcw /> Study Again
          </button>
        </div>
      ) : (
        <div className="flashcard-interactive-area fade-in">
          {/* ═══ Flashcard ═══ */}
          <div className={`flashcard ${isFlipped ? "flipped" : ""}`} onClick={handleFlip}>
            <div className="flashcard-inner">
              <div className="flashcard-front">
                <div className="card-label">Question</div>
                <div className="card-content-wrapper">
                  <div className="card-content"><FormattedText>{currentCard.front}</FormattedText></div>
                </div>
                <div className="flip-hint"><FiRepeat /> Tap or Space to flip</div>
              </div>
              <div className="flashcard-back">
                <div className="card-label">Answer</div>
                <div className="card-content-wrapper">
                  <div className="card-content"><FormattedText>{currentCard.back}</FormattedText></div>
                </div>
                {currentCard.category && (
                  <span className="card-category">{currentCard.category}</span>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Controls ═══ */}
          <div className="flashcard-controls">
            <button className="control-btn nav-btn" onClick={handlePrev} disabled={isAnimating} title="Previous (Left Arrow)">
              <FiArrowLeft />
            </button>
            <button className="control-btn unknown-btn" onClick={markUnknown} disabled={isAnimating} title="Needs Work (Press 1)">
              <FiX /> Needs Work
            </button>
            <button className="control-btn know-btn" onClick={markKnown} disabled={isAnimating} title="Got It (Press 2)">
              <FiCheck /> Got It
            </button>
            <button className="control-btn nav-btn" onClick={handleNext} disabled={isAnimating} title="Next (Right Arrow)">
              <FiArrowRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { ChikoroMascot, MascotSpeechBubble, MASCOT_EXPRESSIONS, getFlashcardExpression } from "@/components/ChikoroMascot";
import { FiArrowLeft, FiArrowRight, FiCheck, FiX, FiRotateCcw, FiRepeat } from "react-icons/fi";
import "./flashcards.css";

export default function Flashcards({ flashcardData }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [unknownCards, setUnknownCards] = useState(new Set());
  const [justMarked, setJustMarked] = useState(null); 

  const cards = flashcardData?.cards || [];
  const currentCard = cards[currentIndex];

  // ═══════════════════════════════════════════════════════════
  // 🤖 MASCOT LOGIC
  // ═══════════════════════════════════════════════════════════
  const getMascotExpression = () => {
    if (justMarked === "known") return MASCOT_EXPRESSIONS.encouraging;
    if (justMarked === "unknown") return MASCOT_EXPRESSIONS.explaining;
    return getFlashcardExpression(knownCards.size, cards.length);
  };

  const getMascotMessage = () => {
    if (knownCards.size === cards.length && cards.length > 0) {
      return "You mastered them all! Amazing! 🎉";
    }
    if (justMarked === "known") return "Nice one! You know your stuff! 💪";
    if (justMarked === "unknown") return "No worries, we'll review it again!";
    if (knownCards.size > cards.length / 2) {
      return `${knownCards.size}/${cards.length} mastered — almost there!`;
    }
    if (!isFlipped) return "Take a guess, then tap to check!";
    return "Did you get it right?";
  };

  const triggerReaction = (type) => {
    setJustMarked(type);
    setTimeout(() => setJustMarked(null), 1500);
  };

  if (!cards.length) {
    return (
      <div className="flashcards-container empty-state">
        <div className="empty-icon">📭</div>
        <p>No flashcards available for this topic yet.</p>
      </div>
    );
  }

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const markKnown = (e) => {
    e.stopPropagation(); // Prevent flipping when clicking buttons
    setKnownCards((prev) => new Set([...prev, currentIndex]));
    unknownCards.delete(currentIndex);
    triggerReaction("known");
    setTimeout(() => handleNext(), 600);
  };

  const markUnknown = (e) => {
    e.stopPropagation();
    setUnknownCards((prev) => new Set([...prev, currentIndex]));
    knownCards.delete(currentIndex);
    triggerReaction("unknown");
    setTimeout(() => handleNext(), 600);
  };

  const progress = ((knownCards.size / cards.length) * 100).toFixed(0);
  const allMastered = knownCards.size === cards.length;

  return (
    <div className="flashcards-container">
      {/* ═══ Header with Mascot ═══ */}
      <div className="flashcard-header fade-in">
        <div className="chk-flashcard-mascot-row">
          <div className="mascot-avatar">
            <ChikoroMascot expression={getMascotExpression()} size={50} animate={true} />
          </div>
          <div className="flashcard-header-text">
            <h2>{flashcardData.topic || flashcardData.subject} {flashcardData.grade && <span className="badge">Gr {flashcardData.grade}</span>}</h2>
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
                  <p className="card-content">{currentCard.front}</p>
                </div>
                <div className="flip-hint"><FiRepeat /> Tap to flip</div>
              </div>
              <div className="flashcard-back">
                <div className="card-label">Answer</div>
                <div className="card-content-wrapper">
                  <p className="card-content">{currentCard.back}</p>
                </div>
                {currentCard.category && (
                  <span className="card-category">{currentCard.category}</span>
                )}
              </div>
            </div>
          </div>

          {/* ═══ Controls ═══ */}
          <div className="flashcard-controls">
            <button className="control-btn nav-btn" onClick={handlePrev} title="Previous">
              <FiArrowLeft />
            </button>
            <button className="control-btn unknown-btn" onClick={markUnknown}>
              <FiX /> Needs Work
            </button>
            <button className="control-btn know-btn" onClick={markKnown}>
              <FiCheck /> Got It
            </button>
            <button className="control-btn nav-btn" onClick={handleNext} title="Next">
              <FiArrowRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
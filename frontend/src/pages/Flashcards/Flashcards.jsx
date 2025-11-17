import React, { useState } from "react";
import "./flashcards.css";

export default function Flashcards({ flashcardData }) {
     console.log("🎴 Flashcards component rendering with:", flashcardData);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownCards, setKnownCards] = useState(new Set());
  const [unknownCards, setUnknownCards] = useState(new Set());

  const cards = flashcardData?.cards || [];
  const currentCard = cards[currentIndex];

  if (!cards.length) {
    return (
      <div className="flashcards-container">
        <p>No flashcards available</p>
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

  const markKnown = () => {
    setKnownCards((prev) => new Set([...prev, currentIndex]));
    unknownCards.delete(currentIndex);
    handleNext();
  };

  const markUnknown = () => {
    setUnknownCards((prev) => new Set([...prev, currentIndex]));
    knownCards.delete(currentIndex);
    handleNext();
  };

  const progress = ((knownCards.size / cards.length) * 100).toFixed(0);

  return (
    <div className="flashcards-container">
      <div className="flashcard-header">
        <h2>
          {flashcardData.subject} - Grade {flashcardData.grade}
        </h2>
        <p>
          Card {currentIndex + 1} of {cards.length}
        </p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <p className="progress-text">
          Known: {knownCards.size} | Unknown: {unknownCards.size}
        </p>
      </div>

      <div className={`flashcard ${isFlipped ? "flipped" : ""}`} onClick={handleFlip}>
        <div className="flashcard-inner">
          <div className="flashcard-front">
            <span className="card-label">Question</span>
            <p className="card-content">{currentCard.front}</p>
            <span className="flip-hint">Click to flip</span>
          </div>
          <div className="flashcard-back">
            <span className="card-label">Answer</span>
            <p className="card-content">{currentCard.back}</p>
            {currentCard.category && (
              <span className="card-category">{currentCard.category}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flashcard-controls">
        <button className="control-btn" onClick={handlePrev}>
          ← Previous
        </button>
        <button className="control-btn know-btn" onClick={markKnown}>
          ✓ I Know This
        </button>
        <button className="control-btn unknown-btn" onClick={markUnknown}>
          ✗ Study More
        </button>
        <button className="control-btn" onClick={handleNext}>
          Next →
        </button>
      </div>
    </div>
  );
}
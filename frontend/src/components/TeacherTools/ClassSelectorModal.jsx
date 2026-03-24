import React from "react";
import ReactDOM from "react-dom";
import { FiX, FiShare2 } from "react-icons/fi";
import "./classmodal.css";

export default function ClassSelectorModal({ classes, selectedIndex, onSelect, onConfirm, onClose }) {
  return ReactDOM.createPortal(
    <div className="csm-overlay" onClick={onClose}>
      <div className="csm-box" onClick={e => e.stopPropagation()}>
        <div className="csm-header">
          <h3>Share with Class</h3>
          <button className="csm-close" onClick={onClose}><FiX /></button>
        </div>
        <p className="csm-subtitle">Select the class you want to send this quiz to.</p>
        <ul className="csm-list">
          {classes.map((cls, idx) => (
            <li
              key={idx}
              className={`csm-item${selectedIndex === idx ? " selected" : ""}`}
              onClick={() => onSelect(idx)}
            >
              <div className="csm-item-info">
                <strong>{cls.subject}</strong>
                <span>{cls.students.length} student{cls.students.length !== 1 ? "s" : ""}</span>
              </div>
              {selectedIndex === idx && <div className="csm-check">✓</div>}
            </li>
          ))}
        </ul>
        <div className="csm-actions">
          <button className="csm-btn cancel" onClick={onClose}>Cancel</button>
          <button
            className="csm-btn confirm"
            onClick={onConfirm}
            disabled={selectedIndex === null}
          >
            <FiShare2 /> Share
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

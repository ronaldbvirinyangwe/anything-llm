import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import katex from "katex";
import "katex/dist/katex.min.css";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import {
  FiArrowLeft, FiCpu, FiClock, FiLayers, FiHash,
  FiBook, FiEdit2, FiRefreshCw, FiSave, FiShare2,
  FiLink, FiCheck, FiX, FiPlus, FiTrash2,
  FiArrowUp, FiArrowDown, FiFileText, FiSliders,
} from "react-icons/fi";
import ClassSelectorModal from "./ClassSelectorModal";

// ─── Inline styles (replaces quizgenerator.css) ───────────────────────────────

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  @keyframes qg-spin   { to { transform: rotate(360deg); } }
  @keyframes qg-fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  @keyframes qg-pulse  { 0%,100% { opacity: 1; } 50% { opacity: .45; } }

  .qg-root {
    min-height: 100vh;
    background: var(--theme-bg-primary);
    font-family: inherit;
    color: var(--theme-text-primary);
  }

  /* ── Nav ── */
  .qg-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 32px;
    border-bottom: 1px solid var(--theme-sidebar-border);
    background: var(--theme-bg-secondary);
    position: sticky;
    top: 0;
    z-index: 50;
  }
  .qg-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    color: var(--theme-button-primary);
    background: none;
    border: none;
    cursor: pointer;
    text-decoration: none;
    font-family: inherit;
    transition: opacity .15s;
  }
  .qg-back-btn:hover { opacity: .75; }

  .qg-draft-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 16px;
    border-radius: 10px;
    border: 1px solid var(--theme-sidebar-border);
    background: var(--theme-bg-primary);
    color: var(--theme-text-secondary);
    cursor: pointer;
    font-family: inherit;
    transition: border-color .2s, color .2s;
  }
  .qg-draft-btn:hover {
    border-color: var(--theme-button-primary);
    color: var(--theme-button-primary);
  }
  .qg-draft-btn.saved {
    border-color: #16a34a;
    color: #16a34a;
  }

  /* ── Header ── */
  .qg-header {
    padding: 40px 32px 28px;
    max-width: 900px;
    margin: 0 auto;
    animation: qg-fadeUp .4s cubic-bezier(.4,0,.2,1) both;
  }
  .qg-header h1 {
    font-size: 26px;
    font-weight: 800;
    color: var(--theme-text-primary);
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 6px;
  }
  .qg-header p {
    font-size: 14px;
    color: var(--theme-text-secondary);
    margin: 0;
  }

  /* ── Form wrapper ── */
  .qg-form {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 32px 32px;
    animation: qg-fadeUp .4s .05s cubic-bezier(.4,0,.2,1) both;
  }

  .qg-card {
    background: var(--theme-bg-secondary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 16px;
    padding: 24px 28px;
    box-shadow: 0 1px 6px rgba(0,0,0,.1);
    margin-bottom: 16px;
  }

  /* ── Form grid ── */
  .qg-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 18px 24px;
  }
  .qg-form-grid .full { grid-column: 1 / -1; }

  .qg-form-group {
    display: flex;
    flex-direction: column;
    gap: 7px;
  }
  .qg-form-group label {
    font-size: 12px;
    font-weight: 700;
    color: var(--theme-text-secondary);
    text-transform: uppercase;
    letter-spacing: .06em;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .qg-input, .qg-select, .qg-textarea {
    background: var(--theme-bg-primary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 14px;
    color: var(--theme-text-primary);
    font-family: inherit;
    outline: none;
    transition: border-color .2s;
    width: 100%;
    box-sizing: border-box;
  }
  .qg-input:focus, .qg-select:focus, .qg-textarea:focus {
    border-color: var(--theme-button-primary);
  }
  .qg-input::placeholder, .qg-textarea::placeholder {
    color: var(--theme-text-secondary);
    opacity: .7;
  }
  .qg-select {
    cursor: pointer;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 12px center;
    padding-right: 32px;
  }
  .qg-textarea { resize: vertical; }
  .qg-helper {
    font-size: 11px;
    color: var(--theme-text-secondary);
    margin-top: 2px;
  }

  /* ── Toggle pills ── */
  .qg-toggle-group {
    display: flex;
    background: var(--theme-bg-primary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 10px;
    padding: 3px;
    gap: 3px;
  }
  .qg-toggle-btn {
    flex: 1;
    padding: 8px 14px;
    border-radius: 8px;
    border: none;
    background: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--theme-text-secondary);
    cursor: pointer;
    font-family: inherit;
    transition: background .15s, color .15s;
  }
  .qg-toggle-btn.active {
    background: var(--theme-button-primary);
    color: #fff;
  }

  /* ── Grade selector ── */
  .qg-grade-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }
  .qg-grade-chip {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid var(--theme-sidebar-border);
    background: var(--theme-bg-primary);
    font-size: 12px;
    font-weight: 600;
    color: var(--theme-text-secondary);
    cursor: pointer;
    font-family: inherit;
    transition: border-color .15s, color .15s, background .15s;
  }
  .qg-grade-chip:hover {
    border-color: var(--theme-button-primary);
    color: var(--theme-button-primary);
  }
  .qg-grade-chip.selected {
    background: var(--theme-button-primary);
    border-color: var(--theme-button-primary);
    color: #fff;
  }
  .qg-grade-hint {
    font-size: 12px;
    color: var(--theme-text-secondary);
    font-style: italic;
    margin: 6px 0 0;
  }

  /* ── Difficulty mixer ── */
  .qg-mixer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 10px;
  }
  .qg-mixer-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .qg-mixer-row label {
    font-size: 12px;
    font-weight: 700;
    width: 52px;
    color: var(--theme-text-secondary);
    text-transform: none;
    letter-spacing: 0;
  }
  .qg-mixer-row input[type="number"] {
    width: 60px;
    background: var(--theme-bg-primary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 13px;
    color: var(--theme-text-primary);
    font-family: inherit;
    outline: none;
    transition: border-color .2s;
    text-align: center;
  }
  .qg-mixer-row input[type="number"]:focus { border-color: var(--theme-button-primary); }
  .qg-mixer-track {
    flex: 1;
    height: 6px;
    background: var(--theme-sidebar-item-default);
    border-radius: 99px;
    overflow: hidden;
  }
  .qg-mixer-bar {
    height: 100%;
    border-radius: 99px;
    transition: width .4s cubic-bezier(.4,0,.2,1);
  }
  .qg-mixer-bar.easy   { background: #16a34a; }
  .qg-mixer-bar.medium { background: #ca8a04; }
  .qg-mixer-bar.hard   { background: #dc2626; }
  .qg-mixer-total {
    font-size: 12px;
    font-weight: 600;
    margin-top: 4px;
  }
  .qg-mixer-total.ok   { color: #16a34a; }
  .qg-mixer-total.warn { color: #dc2626; }

  /* ── Math preview ── */
  .qg-math-preview {
    margin-top: 6px;
    padding: 8px 12px;
    background: var(--theme-bg-primary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 8px;
    font-size: 13px;
    color: var(--theme-text-primary);
  }
  .qg-math-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--theme-text-secondary);
    margin-bottom: 4px;
  }

  /* ── Generate button ── */
  .qg-generate-btn {
    width: 100%;
    margin-top: 20px;
    padding: 14px 24px;
    border-radius: 12px;
    border: none;
    background: var(--theme-button-primary);
    color: #fff;
    font-size: 15px;
    font-weight: 700;
    font-family: inherit;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    transition: opacity .15s, transform .1s;
  }
  .qg-generate-btn:hover:not(:disabled) { opacity: .88; }
  .qg-generate-btn:active:not(:disabled) { transform: scale(.99); }
  .qg-generate-btn:disabled {
    opacity: .5;
    cursor: not-allowed;
  }

  /* ── Spinner ── */
  .qg-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid rgba(255,255,255,.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: qg-spin 1s linear infinite;
  }
  .qg-spinner-sm {
    width: 13px;
    height: 13px;
    border: 2px solid var(--theme-sidebar-border);
    border-top-color: var(--theme-button-primary);
    border-radius: 50%;
    animation: qg-spin 1s linear infinite;
    display: inline-block;
  }

  /* ── Error / notices ── */
  .qg-error {
    margin-top: 10px;
    padding: 10px 14px;
    background: rgba(220,38,38,.08);
    border: 1px solid rgba(220,38,38,.25);
    border-radius: 10px;
    font-size: 13px;
    color: #dc2626;
    text-align: center;
  }
  .qg-share-notice {
    margin-top: 12px;
    padding: 10px 14px;
    background: rgba(22,163,74,.08);
    border: 1px solid rgba(22,163,74,.25);
    border-radius: 10px;
    font-size: 13px;
    color: #16a34a;
    text-align: center;
  }

  /* ── Quiz display ── */
  .qg-quiz-section {
    max-width: 900px;
    margin: 0 auto;
    padding: 0 32px 60px;
    animation: qg-fadeUp .4s cubic-bezier(.4,0,.2,1) both;
  }
  .qg-results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 12px;
  }
  .qg-results-header h2 {
    font-size: 18px;
    font-weight: 800;
    color: var(--theme-text-primary);
    margin: 0;
  }
  .qg-badges {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .qg-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    background: var(--theme-sidebar-item-default);
    color: var(--theme-text-secondary);
  }
  .qg-badge.zim {
    background: rgba(22,163,74,.12);
    color: #16a34a;
  }
  .qg-badge.cam {
    background: rgba(14,165,233,.12);
    color: var(--theme-button-primary);
  }

  /* ── Question card ── */
  .qg-question-card {
    background: var(--theme-bg-secondary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 16px;
    overflow: hidden;
    margin-bottom: 12px;
    box-shadow: 0 1px 6px rgba(0,0,0,.1);
    transition: box-shadow .15s;
  }
  .qg-question-card:hover { box-shadow: 0 4px 14px rgba(0,0,0,.15); }
  .qg-question-card.structured {
    border-color: rgba(14,165,233,.3);
  }
  .qg-question-card.editing {
    border-color: var(--theme-button-primary);
  }

  .qg-q-body {
    padding: 18px 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .qg-q-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
  }
  .qg-q-header-left { flex: 1; display: flex; flex-direction: column; gap: 6px; }

  .qg-q-type-badge {
    display: inline-flex;
    align-items: center;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 10px;
    border-radius: 20px;
    background: var(--theme-sidebar-item-default);
    color: var(--theme-text-secondary);
    align-self: flex-start;
  }
  .qg-q-type-badge.structured {
    background: rgba(14,165,233,.12);
    color: var(--theme-button-primary);
  }
  .qg-q-type-badge.editing {
    background: rgba(202,138,4,.12);
    color: #ca8a04;
  }

  .qg-q-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--theme-text-primary);
    line-height: 1.5;
    margin: 0;
  }

  .qg-marks-badge {
    font-size: 12px;
    font-weight: 700;
    color: var(--theme-text-secondary);
    white-space: nowrap;
    flex-shrink: 0;
    padding-top: 2px;
  }

  .qg-option-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding-left: 4px;
  }
  .qg-option-list li {
    font-size: 13px;
    color: var(--theme-text-secondary);
    padding: 4px 0;
  }

  .qg-answer-box {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 700;
    color: #16a34a;
    background: rgba(22,163,74,.1);
    border: 1px solid rgba(22,163,74,.2);
    border-radius: 8px;
    padding: 5px 12px;
    align-self: flex-start;
  }

  .qg-mark-scheme {
    background: var(--theme-bg-primary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 10px;
    padding: 12px 14px;
  }
  .qg-mark-scheme-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--theme-text-secondary);
    margin-bottom: 6px;
  }
  .qg-mark-scheme-content {
    font-size: 13px;
    color: var(--theme-text-primary);
    line-height: 1.6;
  }

  /* ── Question actions ── */
  .qg-q-actions {
    display: flex;
    gap: 6px;
    align-items: center;
    padding: 10px 20px;
    border-top: 1px solid var(--theme-sidebar-border);
    background: var(--theme-bg-primary);
    flex-wrap: wrap;
  }
  .qg-qa-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    font-weight: 600;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--theme-sidebar-border);
    background: var(--theme-bg-secondary);
    color: var(--theme-text-secondary);
    cursor: pointer;
    font-family: inherit;
    transition: border-color .15s, color .15s, background .15s;
  }
  .qg-qa-btn:disabled { opacity: .4; cursor: not-allowed; }
  .qg-qa-btn:not(:disabled):hover { border-color: var(--theme-button-primary); color: var(--theme-button-primary); }
  .qg-qa-btn.move { padding: 6px 9px; }
  .qg-qa-btn.edit:not(:disabled):hover { border-color: #ca8a04; color: #ca8a04; }
  .qg-qa-btn.regen:not(:disabled):hover { border-color: var(--theme-button-primary); color: var(--theme-button-primary); }
  .qg-qa-btn.delete { margin-left: auto; }
  .qg-qa-btn.delete:not(:disabled):hover { border-color: #dc2626; color: #dc2626; background: rgba(220,38,38,.06); }
  .qg-qa-btn.confirm { border-color: #16a34a; color: #16a34a; }
  .qg-qa-btn.cancel  { border-color: #dc2626; color: #dc2626; }

  /* ── Edit form inside card ── */
  .qg-edit-form {
    padding: 0 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .qg-edit-form .qg-form-group label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--theme-text-secondary);
    font-weight: 700;
  }
  .qg-marks-edit-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .qg-marks-edit-row label {
    font-size: 12px;
    font-weight: 700;
    color: var(--theme-text-secondary);
  }
  .qg-marks-edit-row input {
    width: 60px;
    background: var(--theme-bg-primary);
    border: 1px solid var(--theme-sidebar-border);
    border-radius: 8px;
    padding: 5px 8px;
    font-size: 13px;
    color: var(--theme-text-primary);
    font-family: inherit;
    outline: none;
    text-align: center;
    transition: border-color .2s;
  }
  .qg-marks-edit-row input:focus { border-color: var(--theme-button-primary); }

  /* ── Add question row ── */
  .qg-add-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 4px 0 20px;
    flex-wrap: wrap;
  }
  .qg-add-label {
    font-size: 12px;
    font-weight: 700;
    color: var(--theme-text-secondary);
    text-transform: uppercase;
    letter-spacing: .06em;
  }
  .qg-add-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px dashed var(--theme-sidebar-border);
    background: none;
    color: var(--theme-text-secondary);
    cursor: pointer;
    font-family: inherit;
    transition: border-color .15s, color .15s;
  }
  .qg-add-btn:hover { border-color: var(--theme-button-primary); color: var(--theme-button-primary); }
  .qg-add-btn.structured:hover { border-color: var(--theme-button-primary); color: var(--theme-button-primary); }

  /* ── Bottom action buttons ── */
  .qg-actions-bar {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 8px;
  }
  .qg-action-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 700;
    padding: 11px 20px;
    border-radius: 12px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: opacity .15s, transform .1s;
  }
  .qg-action-btn:hover { opacity: .85; }
  .qg-action-btn:active { transform: scale(.98); }
  .qg-action-btn.save {
    background: var(--theme-button-primary);
    color: #fff;
  }
  .qg-action-btn.share {
    background: var(--theme-bg-secondary);
    border: 1px solid var(--theme-sidebar-border);
    color: var(--theme-text-primary);
  }
  .qg-action-btn.link {
    background: var(--theme-bg-secondary);
    border: 1px solid var(--theme-sidebar-border);
    color: var(--theme-text-primary);
  }

  @media (max-width: 640px) {
    .qg-form-grid { grid-template-columns: 1fr; }
    .qg-nav, .qg-form, .qg-quiz-section, .qg-header { padding-left: 16px; padding-right: 16px; }
  }
`;

// ─── Constants ────────────────────────────────────────────────────────────────

const DRAFT_KEY = "chikoroai_quiz_draft";

const GRADE_OPTIONS = {
  primary: ["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5","Grade 6","Grade 7"],
  secondary: ["Form 1","Form 2","Form 3","Form 4","Form 5","Form 6"],
};

const DEFAULT_FORM = {
  subject: "", topic: "", grade: "", difficulty: "medium",
  numQuestions: 10, tabLimit: 1, timeLimit: 30,
  questionType: "mixed", curriculum: "ZIMSEC",
  customInstructions: "",
  easyCount: 3, mediumCount: 5, hardCount: 2,
  useMixedDifficulty: false,
  schoolName: "", examYear: new Date().getFullYear(),
  paperStyle: "ZIMSEC",
};

const saveDraft = (form) => {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
};
const loadDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? { ...DEFAULT_FORM, ...JSON.parse(raw) } : DEFAULT_FORM;
  } catch { return DEFAULT_FORM; }
};

// ─── GradeSelector ────────────────────────────────────────────────────────────

function GradeSelector({ value, onChange }) {
  const detectLevel = (g) => {
    if (GRADE_OPTIONS.primary.includes(g)) return "primary";
    if (GRADE_OPTIONS.secondary.includes(g)) return "secondary";
    return null;
  };
  const [level, setLevel] = useState(() => detectLevel(value));
  useEffect(() => { setLevel(detectLevel(value)); }, [value]);

  return (
    <div>
      <div className="qg-toggle-group" style={{ marginBottom: 10 }}>
        {["primary","secondary"].map((l) => (
          <button key={l} type="button"
            className={`qg-toggle-btn ${level === l ? "active" : ""}`}
            onClick={() => { if (level !== l) { setLevel(l); onChange(""); } }}>
            {l === "primary" ? "🏫 Primary" : "🎓 Secondary"}
          </button>
        ))}
      </div>
      {level ? (
        <div className="qg-grade-chips">
          {GRADE_OPTIONS[level].map((g) => (
            <button key={g} type="button"
              className={`qg-grade-chip ${value === g ? "selected" : ""}`}
              onClick={() => onChange(g)}>{g}</button>
          ))}
        </div>
      ) : (
        <p className="qg-grade-hint">Select Primary or Secondary first</p>
      )}
    </div>
  );
}

// ─── Math helpers ─────────────────────────────────────────────────────────────

const hasMath = (text) => /\$[^\$\n]+\$|\$\$[\s\S]+?\$\$|\\\(|\\\[/.test(text ?? "");

const normaliseMath = (text) => {
  if (!text) return text;
  let out = text;
  out = out.replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m}$`);
  out = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `$$${m}$$`);
  out = out.replace(/\(([^()]*?\\[a-zA-Z]+[^()]*?)\)/g, (_, inner) => `$${inner}$`);
  return out;
};

function MathText({ text }) {
  if (!text) return null;
  const normalized = normaliseMath(text);
  const parts = normalized.split(/(\$\$[\s\S]*?\$\$|\$[^\$\n]+?\$)/g);
  return (
    <span style={{ textTransform: "none" }}>
      {parts.map((part, i) => {
        if (part.startsWith("$$") && part.endsWith("$$") && part.length > 4) {
          try { return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(2,-2), { displayMode: true, throwOnError: false }) }} />; }
          catch { return <span key={i}>{part}</span>; }
        }
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          try { return <span key={i} dangerouslySetInnerHTML={{ __html: katex.renderToString(part.slice(1,-1), { throwOnError: false }) }} />; }
          catch { return <span key={i}>{part}</span>; }
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function MathMarkdown({ children }) {
  if (!children) return null;
  const lines = normaliseMath(children).split("\n");
  return (
    <div>
      {lines.map((line, i) => (
        <p key={i} style={{ margin: "0.3rem 0" }}><MathText text={line} /></p>
      ))}
    </div>
  );
}

function MathPreview({ text, block = false }) {
  if (!text || !hasMath(text)) return null;
  return (
    <div className="qg-math-preview">
      <div className="qg-math-label">Preview:</div>
      {block ? <MathMarkdown>{text}</MathMarkdown> : <MathText text={text} />}
    </div>
  );
}

// ─── DifficultyMixer ──────────────────────────────────────────────────────────

function DifficultyMixer({ form, setForm }) {
  const total = (form.easyCount || 0) + (form.mediumCount || 0) + (form.hardCount || 0);
  const warn = total !== form.numQuestions;
  const set = (key, val) => {
    const n = Math.max(0, parseInt(val) || 0);
    setForm((f) => ({ ...f, [key]: n }));
  };
  return (
    <div className="qg-mixer">
      {[
        { key: "easyCount",   label: "Easy",   cls: "easy"   },
        { key: "mediumCount", label: "Medium", cls: "medium" },
        { key: "hardCount",   label: "Hard",   cls: "hard"   },
      ].map(({ key, label, cls }) => (
        <div className="qg-mixer-row" key={key}>
          <label>{label}</label>
          <input type="number" min="0" value={form[key]}
            onChange={(e) => set(key, e.target.value)} />
          <div className="qg-mixer-track">
            <div className={`qg-mixer-bar ${cls}`}
              style={{ width: `${form.numQuestions ? (form[key] / form.numQuestions) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
      <p className={`qg-mixer-total ${warn ? "warn" : "ok"}`}>
        Total: {total} / {form.numQuestions} {warn ? "⚠ Must equal question count" : "✓"}
      </p>
    </div>
  );
}

// ─── Question card ────────────────────────────────────────────────────────────

function QuestionActions({ item, idx, isRegenerating, onStartEdit, onRegenerate, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) {
  return (
    <div className="qg-q-actions">
      <button className="qg-qa-btn move" onClick={onMoveUp}  disabled={isFirst}  title="Move up">  <FiArrowUp /></button>
      <button className="qg-qa-btn move" onClick={onMoveDown} disabled={isLast}  title="Move down"><FiArrowDown /></button>
      <button className="qg-qa-btn edit"  onClick={() => onStartEdit(idx, item)} disabled={isRegenerating}><FiEdit2 /> Edit</button>
      <button className="qg-qa-btn regen" onClick={() => onRegenerate(idx, item)} disabled={isRegenerating}>
        {isRegenerating ? <span className="qg-spinner-sm" /> : <FiRefreshCw />}
        {isRegenerating ? " Regenerating…" : " Regenerate"}
      </button>
      <button className="qg-qa-btn delete" onClick={() => onDelete(idx)} title="Delete"><FiTrash2 /></button>
    </div>
  );
}

function QuestionCard({
  item, idx, total, editingIndex, editForm, setEditForm,
  onSaveEdit, onCancelEdit, onStartEdit, onRegenerate,
  regeneratingIndex, onDelete, onMoveUp, onMoveDown,
}) {
  const isEditing     = editingIndex === idx;
  const isRegenerating = regeneratingIndex === idx;

  if (isEditing && editForm) {
    return (
      <div className="qg-question-card editing">
        <div className="qg-q-body">
          <div className="qg-q-header">
            <div className="qg-q-header-left">
              <span className="qg-q-type-badge editing">Editing Q{idx + 1}</span>
            </div>
            <div className="qg-marks-edit-row">
              <label>Marks</label>
              <input type="number" min="1" max="20" value={editForm.marks || 1}
                onChange={(e) => setEditForm({ ...editForm, marks: parseInt(e.target.value) || 1 })} />
            </div>
          </div>

          <div className="qg-edit-form">
            <div className="qg-form-group">
              <label>Question Text</label>
              <textarea className="qg-textarea" rows="3" value={editForm.question}
                onChange={(e) => setEditForm({ ...editForm, question: e.target.value })} />
              <MathPreview text={editForm.question} />
            </div>

            {editForm.type === "multiple-choice" ? (
              <>
                <div className="qg-form-group">
                  <label>Options</label>
                  {editForm.options.map((opt, i) => (
                    <div key={i} style={{ marginBottom: 8 }}>
                      <input type="text" className="qg-input" value={opt}
                        placeholder={`Option ${String.fromCharCode(65+i)}`}
                        onChange={(e) => {
                          const o = [...editForm.options]; o[i] = e.target.value;
                          setEditForm({ ...editForm, options: o });
                        }} />
                      <MathPreview text={opt} />
                    </div>
                  ))}
                </div>
                <div className="qg-form-group">
                  <label>Correct Answer</label>
                  <select className="qg-select" value={editForm.answer || "A"}
                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}>
                    {["A","B","C","D"].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div className="qg-form-group">
                <label>Mark Scheme / Expected Answer</label>
                <textarea className="qg-textarea" rows="5" value={editForm.markScheme}
                  onChange={(e) => setEditForm({ ...editForm, markScheme: e.target.value })} />
                <MathPreview text={editForm.markScheme} block />
              </div>
            )}

            <div className="qg-form-group">
              <label>Change Question Type</label>
              <select className="qg-select" value={editForm.type}
                onChange={(e) => {
                  const newType = e.target.value;
                  setEditForm({
                    ...editForm, type: newType,
                    options: newType === "multiple-choice" ? (editForm.options || ["","","",""]) : undefined,
                    answer:  newType === "multiple-choice" ? (editForm.answer  || "A") : undefined,
                    markScheme: newType === "structured" ? (editForm.markScheme || "") : undefined,
                  });
                }}>
                <option value="multiple-choice">Multiple Choice</option>
                <option value="structured">Structured</option>
              </select>
            </div>
          </div>
        </div>

        <div className="qg-q-actions" style={{ borderTop: "1px solid var(--theme-sidebar-border)" }}>
          <button className="qg-qa-btn confirm" style={{ flex: 1, justifyContent: "center" }}
            onClick={() => onSaveEdit(idx)}>
            <FiCheck /> Save
          </button>
          <button className="qg-qa-btn cancel" style={{ flex: 1, justifyContent: "center" }}
            onClick={onCancelEdit}>
            <FiX /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`qg-question-card ${item.type === "structured" ? "structured" : ""}`}>
      <div className="qg-q-body">
        <div className="qg-q-header">
          <div className="qg-q-header-left">
            <span className={`qg-q-type-badge ${item.type === "structured" ? "structured" : ""}`}>
              {item.type === "multiple-choice" ? "Multiple Choice" : "Structured"}
            </span>
            <p className="qg-q-title">
              {idx + 1}. <MathText text={item.question} />
            </p>
          </div>
          <span className="qg-marks-badge">[{item.marks || 1} mark{(item.marks || 1) !== 1 ? "s" : ""}]</span>
        </div>

        {item.type === "multiple-choice" ? (
          <>
            <ul className="qg-option-list">
              {item.options.map((opt, i) => <li key={i}><MathText text={opt} /></li>)}
            </ul>
            {item.answer && (
              <div className="qg-answer-box">✅ Correct: {item.answer}</div>
            )}
          </>
        ) : (
          item.markScheme && (
            <div className="qg-mark-scheme">
              <div className="qg-mark-scheme-title">📋 Mark Scheme</div>
              <div className="qg-mark-scheme-content">
                <MathMarkdown>
                  {item.markScheme.replace(/```[a-z]*\n?/gi,"").replace(/```/g,"").trim()}
                </MathMarkdown>
              </div>
            </div>
          )
        )}
      </div>

      <QuestionActions
        item={item} idx={idx} isRegenerating={isRegenerating}
        onStartEdit={onStartEdit} onRegenerate={onRegenerate}
        onDelete={onDelete} onMoveUp={onMoveUp} onMoveDown={onMoveDown}
        isFirst={idx === 0} isLast={idx === total - 1}
      />
    </div>
  );
}

// ─── Blank question factory ───────────────────────────────────────────────────

const makeBlankQuestion = (type = "multiple-choice") =>
  type === "multiple-choice"
    ? { type, question: "New question", options: ["A) Option A","B) Option B","C) Option C","D) Option D"], answer: "A", marks: 1, raw: "" }
    : { type, question: "New question", markScheme: "Mark Scheme: Expected answer here.", marks: 2, raw: "" };

// ─── PDF generation (unchanged logic) ────────────────────────────────────────

const buildExamHTML = ({ form, parsedQuestions, includeAnswers, style }) => {
  const isZim = style === "ZIMSEC";
  const school = form.schoolName || (isZim ? "ZIMBABWE SCHOOL EXAMINATIONS COUNCIL (ZIMSEC)" : "CAMBRIDGE ASSESSMENT INTERNATIONAL EDUCATION");
  const totalMarks = parsedQuestions.reduce((s, q) => s + (q.marks || 1), 0);

  const headerHTML = isZim ? `
    <div class="zim-header">
      <div class="zim-logo-row">
        <div class="zim-logo-box"><img src="/favicon.png" alt="ChikoroAI Logo" /></div>
        <div class="zim-title-block">
          <p class="zim-council">${school}</p>
          <p class="zim-exam-title">${form.subject.toUpperCase() || "SUBJECT"}</p>
          <p class="zim-paper-label">Paper ${form.grade || ""} &nbsp;|&nbsp; ${form.topic || ""}</p>
        </div>
        <div class="zim-logo-box"><img src="/favicon.png" alt="ChikoroAI Logo" /></div>
      </div>
      <div class="zim-info-row">
        <span>${form.examYear} Examination</span>
        <span>Time allowed: ${form.timeLimit ? form.timeLimit + " minutes" : "As set by teacher"}</span>
        <span>Total Marks: ${totalMarks}</span>
      </div>
      <div class="candidate-box">
        <table><tr>
          <td>Candidate Name: <span class="dotted-line" style="width:200px"></span></td>
          <td>Candidate Number: <span class="dotted-line" style="width:130px"></span></td>
        </tr><tr>
          <td>Centre Number: <span class="dotted-line" style="width:150px"></span></td>
          <td>Date: <span class="dotted-line" style="width:130px"></span></td>
        </tr></table>
      </div>
      <div class="instructions-box">
        <p class="instructions-title">INSTRUCTIONS TO CANDIDATES</p>
        <ul>
          <li>Write your name, candidate number and centre number in the spaces provided above.</li>
          <li>Answer ALL questions in Section A. Choose ONE question from Section B.</li>
          <li>Write your answers in the spaces provided in this question paper.</li>
          <li>All working must be clearly shown. Marks may be awarded for method even if the answer is wrong.</li>
          ${form.customInstructions ? `<li>${form.customInstructions}</li>` : ""}
        </ul>
      </div>
    </div>` : `
    <div class="cam-header">
      <div class="cam-top-row">
        <div>
          <p class="cam-council">${school}</p>
          <p class="cam-exam-title">${form.subject.toUpperCase() || "SUBJECT"}</p>
          <p class="cam-paper-label">${form.topic || ""} &bull; ${form.grade || ""}</p>
        </div>
        <div class="cam-papercode">${form.examYear}/01</div>
      </div>
      <div class="cam-info-strip">
        <span>Time: ${form.timeLimit ? form.timeLimit + " minutes" : "As set by teacher"}</span>
        <span>Total marks: ${totalMarks}</span>
        <span>Curriculum: Cambridge</span>
      </div>
      <div class="cam-candidate-grid">
        <div class="cam-candidate-row"><span>Centre number</span><div class="cam-boxes">${"□".repeat(5)}</div></div>
        <div class="cam-candidate-row"><span>Candidate number</span><div class="cam-boxes">${"□".repeat(4)}</div></div>
        <div class="cam-candidate-row wide"><span>Candidate name</span><div class="cam-name-line"></div></div>
      </div>
      <div class="cam-instructions">
        <p><strong>INSTRUCTIONS</strong></p>
        <ul>
          <li>Answer <strong>all</strong> questions.</li>
          <li>Use a black or dark blue pen.</li>
          <li>Write your name, centre number and candidate number in the boxes at the top of this page.</li>
          <li>Do not use an erasable pen or correction fluid.</li>
          ${form.customInstructions ? `<li>${form.customInstructions}</li>` : ""}
        </ul>
      </div>
    </div>`;

  const mcQuestions   = parsedQuestions.filter(q => q.type === "multiple-choice");
  const structQuestions = parsedQuestions.filter(q => q.type === "structured");

  const renderMCQ = (q, globalIdx) => `
    <div class="question-block mcq">
      <div class="q-number-row">
        <span class="q-num">${globalIdx + 1}</span>
        <span class="q-text">${q.question}</span>
        <span class="q-marks">[${q.marks || 1}]</span>
      </div>
      <div class="options-grid">
        ${q.options.map((o,i) => `<div class="option-item"><span class="opt-letter">${String.fromCharCode(65+i)}</span>${o.replace(/^[A-D]\)\s*/,"")}</div>`).join("")}
      </div>
      ${includeAnswers ? `<p class="answer-reveal">Answer: <strong>${q.answer}</strong></p>` : ""}
    </div>`;

  const renderStructured = (q, globalIdx) => `
    <div class="question-block structured">
      <div class="q-number-row">
        <span class="q-num">${globalIdx + 1}</span>
        <span class="q-text">${q.question}</span>
        <span class="q-marks">[${q.marks || 1}]</span>
      </div>
      ${includeAnswers
        ? `<div class="mark-scheme-reveal"><p class="ms-label">MARK SCHEME</p><p>${q.markScheme?.replace(/^(Mark Scheme|Answer|Expected Answer|Marking Points?):\s*/i,"") || ""}</p></div>`
        : `<div class="answer-lines">${"<div class='ans-line'></div>".repeat(Math.max(3, (q.marks||1)*2))}</div>`}
    </div>`;

  const sectioned = mcQuestions.length && structQuestions.length;
  const questionsHTML = sectioned ? `
    ${mcQuestions.length ? `<div class="section-header">SECTION A — Multiple Choice (${mcQuestions.reduce((s,q)=>s+(q.marks||1),0)} marks)</div>${mcQuestions.map((q,i) => renderMCQ(q,i)).join("")}` : ""}
    ${structQuestions.length ? `<div class="section-header">SECTION B — Structured Questions (${structQuestions.reduce((s,q)=>s+(q.marks||1),0)} marks)</div>${structQuestions.map((q,i) => renderStructured(q, mcQuestions.length+i)).join("")}` : ""}
  ` : parsedQuestions.map((q,i) => q.type === "multiple-choice" ? renderMCQ(q,i) : renderStructured(q,i)).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:"Times New Roman",Times,serif;font-size:11pt;color:#000;background:#fff;padding:20px;max-width:800px;margin:auto}
    .zim-header{border:2px solid #000;padding:10px;margin-bottom:18px}
    .zim-logo-row{display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #000;padding-bottom:8px;margin-bottom:8px}
    .zim-logo-box{display:flex;justify-content:center;align-items:center;width:80px;height:80px;background:#fff;border-radius:16px;box-shadow:0 4px 10px rgba(0,0,0,.1);padding:12px;margin:20px auto}
    .zim-logo-box img{width:100%;height:100%;object-fit:contain;display:block}
    .zim-title-block{text-align:center}
    .zim-council{font-size:10pt;font-weight:bold;letter-spacing:.5px}
    .zim-exam-title{font-size:16pt;font-weight:bold;margin:4px 0}
    .zim-paper-label{font-size:10pt}
    .zim-info-row{display:flex;justify-content:space-between;font-size:10pt;border-bottom:1px solid #000;padding:5px 0;margin-bottom:8px}
    .candidate-box table{width:100%;border-collapse:collapse;font-size:10pt}
    .candidate-box td{padding:4px 8px}
    .dotted-line{display:inline-block;border-bottom:1px dotted #000;vertical-align:bottom}
    .instructions-box{margin-top:8px;border-top:1px solid #000;padding-top:8px;font-size:10pt}
    .instructions-title{font-weight:bold;margin-bottom:4px;text-transform:uppercase;font-size:10pt}
    .instructions-box ul{padding-left:18px}
    .instructions-box li{margin-bottom:3px}
    .cam-header{border:3px solid #000;padding:12px;margin-bottom:18px}
    .cam-top-row{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:10px}
    .cam-council{font-size:9pt;letter-spacing:1px;text-transform:uppercase}
    .cam-exam-title{font-size:18pt;font-weight:bold}
    .cam-paper-label{font-size:10pt;margin-top:2px}
    .cam-papercode{font-size:22pt;font-weight:bold;border:2px solid #000;padding:6px 14px}
    .cam-info-strip{display:flex;gap:20px;font-size:10pt;border-bottom:1px solid #000;padding:5px 0;margin-bottom:10px}
    .cam-candidate-grid{display:flex;flex-direction:column;gap:6px;font-size:10pt;margin-bottom:10px}
    .cam-candidate-row{display:flex;align-items:center;gap:10px}
    .cam-boxes{letter-spacing:8px;font-size:14pt;border:1px solid #000;padding:2px 6px}
    .cam-name-line{flex:1;border-bottom:1px solid #000;height:18px}
    .cam-instructions{font-size:10pt;border-top:1px solid #000;padding-top:8px}
    .cam-instructions ul{padding-left:18px}
    .cam-instructions li{margin-bottom:3px}
    .section-header{font-weight:bold;text-transform:uppercase;font-size:11pt;border-top:2px solid #000;border-bottom:1px solid #000;padding:5px 0;margin:18px 0 10px;letter-spacing:.5px}
    .question-block{margin-bottom:20px;page-break-inside:avoid}
    .q-number-row{display:flex;gap:8px;align-items:flex-start;margin-bottom:6px}
    .q-num{font-weight:bold;min-width:22px;font-size:11pt}
    .q-text{flex:1;font-size:11pt;line-height:1.5}
    .q-marks{font-size:10pt;color:#000;white-space:nowrap;margin-left:auto;padding-left:8px}
    .options-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;padding-left:30px;margin-bottom:6px}
    .option-item{display:flex;gap:6px;font-size:11pt}
    .opt-letter{font-weight:bold;min-width:16px}
    .answer-reveal{color:#1a6b3c;font-size:10pt;padding-left:30px;font-style:italic}
    .answer-lines{padding-left:30px}
    .ans-line{border-bottom:1px solid #aaa;height:22px;margin-bottom:4px}
    .mark-scheme-reveal{background:#f0fdf4;border-left:3px solid #16a34a;padding:8px 12px;margin-left:30px;font-size:10pt}
    .ms-label{font-weight:bold;font-size:9pt;text-transform:uppercase;color:#16a34a;margin-bottom:4px}
    @media print{body{padding:0}}
  </style></head><body>${headerHTML}${questionsHTML}</body></html>`;
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuizGenerator() {
  const [form,              setForm]              = useState(loadDraft);
  const [quiz,              setQuiz]              = useState("");
  const [parsedQuestions,   setParsedQuestions]   = useState([]);
  const [loading,           setLoading]           = useState(false);
  const [error,             setError]             = useState("");
  const [classes,           setClasses]           = useState([]);
  const [editingIndex,      setEditingIndex]      = useState(null);
  const [editForm,          setEditForm]          = useState(null);
  const [regeneratingIndex, setRegeneratingIndex] = useState(null);
  const [showShareModal,    setShowShareModal]    = useState(false);
  const [selectedClassIdx,  setSelectedClassIdx]  = useState(null);
  const [shareNotice,       setShareNotice]       = useState("");
  const [draftSaved,        setDraftSaved]        = useState(false);

  useEffect(() => { saveDraft(form); }, [form]);

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const user  = JSON.parse(localStorage.getItem("chikoroai_user"));
        const res   = await axios.get(
          `https://api.chikoro-ai.com/api/system/teacher/my-students/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data.success) {
          const uniqueSubjects = [...new Set(res.data.students.map((s) => s.subject))];
          setClasses(uniqueSubjects.map((subject) => ({
            subject,
            students: res.data.students.filter((s) => s.subject === subject),
          })));
        }
      } catch (err) { console.error(err); }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    if (quiz) setParsedQuestions(parseQuiz(quiz));
  }, [quiz]);

  const cleanQuizText = (raw) =>
    raw
      .replace(/^.*?(?:here'?s?|here is).*?quiz.*?:/i, "")
      .replace(/^(sure|certainly|okay|alright)[!,.\s]*/i, "")
      .replace(/```.*?```/gs, "")
      .trim();

  const parseQuiz = (raw) => {
    const cleaned = cleanQuizText(raw);
    const blocks  = cleaned.split(/(?=\d+\.\s+)/);
    const parsed  = [];
    blocks.forEach((block) => {
      if (!block.trim()) return;
      const lines  = block.split("\n").filter((l) => l.trim());
      const qMatch = lines[0].match(/^(\d+)\.\s+(.+)/);
      if (!qMatch) return;
      const hasOptions = lines.some((line) => /^[A-D]\)/.test(line.trim()));
      if (hasOptions) {
        const options = lines.filter((line) => /^[A-D]\)/.test(line.trim()));
        const ansLine = lines.find((line) => /\*?\*?Answer:\s*([A-D])/i.test(line));
        parsed.push({ type: "multiple-choice", question: qMatch[2].trim(), options, answer: ansLine?.match(/Answer:\s*([A-D])/i)?.[1], marks: 1, raw: block.trim() });
      } else {
        const msIdx = lines.findIndex((line) => /^(Mark Scheme|Answer|Expected Answer|Marking Points?):/i.test(line));
        parsed.push({
          type: "structured",
          question: msIdx > 0 ? lines.slice(0, msIdx).join("\n").replace(/^\d+\.\s+/, "") : qMatch[2].trim(),
          markScheme: msIdx > 0 ? lines.slice(msIdx).join("\n") : lines.slice(1).join("\n") || "No mark scheme provided",
          marks: 2, raw: block.trim(),
        });
      }
    });
    return parsed;
  };

  const reconstructQuiz = (questions) =>
    questions.map((q, i) =>
      q.type === "multiple-choice"
        ? `${i+1}. ${q.question}\n${q.options.join("\n")}${q.answer ? `\nAnswer: ${q.answer}` : ""}`
        : `${i+1}. ${q.question}\n${q.markScheme}`
    ).join("\n\n");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setQuiz(""); setError("");
    try {
      const token   = localStorage.getItem("chikoroai_authToken");
      const payload = { ...form, numQuestions: form.numQuestions || 10, tabLimit: form.tabLimit || 1, timeLimit: form.timeLimit || 0 };
      if (form.useMixedDifficulty) {
        payload.easyCount = form.easyCount;
        payload.mediumCount = form.mediumCount;
        payload.hardCount = form.hardCount;
        delete payload.difficulty;
      }
      const res = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher/generate-quiz",
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) setQuiz(res.data.quiz);
      else setError(res.data.error || "Failed to generate quiz.");
    } catch { setError("Error generating quiz."); }
    finally { setLoading(false); }
  };

  const startEdit = (idx, item) => {
    setEditingIndex(idx);
    setEditForm(
      item.type === "multiple-choice"
        ? { type: "multiple-choice", question: item.question, options: item.options.map((o) => o.replace(/^[A-D]\)\s*/,"")), answer: item.answer, marks: item.marks || 1 }
        : { type: "structured", question: item.question, markScheme: item.markScheme.replace(/^(Mark Scheme|Answer|Expected Answer|Marking Points?):\s*/i,""), marks: item.marks || 2 }
    );
  };

  const handleSaveEdit = (idx) => {
    if (!editForm) return;
    const updated = [...parsedQuestions];
    updated[idx] = editForm.type === "multiple-choice"
      ? { ...updated[idx], type: "multiple-choice", question: editForm.question, options: editForm.options.map((o,i) => `${String.fromCharCode(65+i)}) ${o}`), answer: editForm.answer, marks: editForm.marks }
      : { ...updated[idx], type: "structured", question: editForm.question, markScheme: `Mark Scheme: ${editForm.markScheme}`, marks: editForm.marks };
    setParsedQuestions(updated);
    setQuiz(reconstructQuiz(updated));
    setEditingIndex(null); setEditForm(null);
  };

  const handleRegenerate = async (idx, item) => {
    setRegeneratingIndex(idx);
    try {
      const token = localStorage.getItem("chikoroai_authToken");
      const res   = await axios.post(
        "https://api.chikoro-ai.com/api/system/teacher/redo-question",
        { type: item.type, raw: item.raw, subject: form.subject, topic: form.topic, grade: form.grade, difficulty: form.difficulty },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success && res.data.question) {
        const updated  = [...parsedQuestions];
        const reparsed = parseQuiz(res.data.question);
        if (reparsed.length) { updated[idx] = { ...reparsed[0], marks: item.marks }; setParsedQuestions(updated); setQuiz(reconstructQuiz(updated)); }
      }
    } catch (err) { console.error(err); }
    finally { setRegeneratingIndex(null); }
  };

  const handleDelete   = (idx)  => { const u = parsedQuestions.filter((_,i)=>i!==idx); setParsedQuestions(u); setQuiz(reconstructQuiz(u)); };
  const handleMoveUp   = (idx)  => { if (!idx) return; const u=[...parsedQuestions]; [u[idx-1],u[idx]]=[u[idx],u[idx-1]]; setParsedQuestions(u); setQuiz(reconstructQuiz(u)); };
  const handleMoveDown = (idx)  => { if (idx===parsedQuestions.length-1) return; const u=[...parsedQuestions]; [u[idx],u[idx+1]]=[u[idx+1],u[idx]]; setParsedQuestions(u); setQuiz(reconstructQuiz(u)); };
  const handleAddQuestion = (type) => { const u=[...parsedQuestions, makeBlankQuestion(type)]; setParsedQuestions(u); setQuiz(reconstructQuiz(u)); };

  const exportPDF = async (includeAnswers, filename) => {
    const html    = buildExamHTML({ form, parsedQuestions, includeAnswers, style: form.paperStyle });
    const tempDiv = document.createElement("div");
    Object.assign(tempDiv.style, { position:"absolute", left:"-9999px", width:"800px", backgroundColor:"white" });
    tempDiv.innerHTML = html;
    document.body.appendChild(tempDiv);
    try {
      const canvas  = await html2canvas(tempDiv, { scale: 2 });
      const pdf     = new jsPDF("p","mm","a4");
      const imgData = canvas.toDataURL("image/png");
      const pageH   = (canvas.height * 210) / canvas.width;
      let y = 0;
      while (y < pageH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData,"PNG",0,-y,210,pageH);
        y += 297;
      }
      pdf.save(filename);
    } finally { document.body.removeChild(tempDiv); }
  };

  const handleSavePDF = async () => {
    await exportPDF(false, `${form.subject || "Quiz"}_QuestionPaper.pdf`);
    await exportPDF(true,  `${form.subject || "Quiz"}_MarkScheme.pdf`);
  };

  const handleManualSaveDraft = () => {
    saveDraft(form);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const totalMarks = parsedQuestions.reduce((s, q) => s + (q.marks || 1), 0);

  return (
    <div className="qg-root">
      <style>{GLOBAL_CSS}</style>

      {/* Nav */}
      <nav className="qg-nav">
        <Link to="/teacher-dashboard" className="qg-back-btn">
          <FiArrowLeft /> Back to Dashboard
        </Link>
        <button className={`qg-draft-btn ${draftSaved ? "saved" : ""}`} onClick={handleManualSaveDraft}>
          {draftSaved ? <><FiCheck /> Saved!</> : <><FiSave /> Save Draft</>}
        </button>
      </nav>

      {/* Header */}
      <header className="qg-header">
        <h1><FiCpu /> Smart Quiz Builder</h1>
        <p>Instantly craft custom quizzes and exams with precision difficulty leveling.</p>
      </header>

      {/* Form */}
      <form className="qg-form" onSubmit={handleSubmit}>
        <div className="qg-card">
          <div className="qg-form-grid">

            {/* Paper style */}
            <div className="qg-form-group full">
              <label><FiFileText /> Exam Paper Style</label>
              <div className="qg-toggle-group">
                {["ZIMSEC","Cambridge"].map((s) => (
                  <button key={s} type="button"
                    className={`qg-toggle-btn ${form.paperStyle === s ? "active" : ""}`}
                    onClick={() => setForm({ ...form, paperStyle: s, curriculum: s === "Cambridge" ? "Cambridge" : "ZIMSEC" })}>
                    {s === "ZIMSEC" ? "🇿🇼 ZIMSEC" : "🇬🇧 Cambridge"}
                  </button>
                ))}
              </div>
            </div>

            <div className="qg-form-group">
              <label><FiBook /> Subject</label>
              <input type="text" className="qg-input" placeholder="e.g. Biology"
                value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div className="qg-form-group">
              <label><FiLayers /> Topic</label>
              <input type="text" className="qg-input" placeholder="e.g. Photosynthesis"
                value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>

            <div className="qg-form-group">
              <label>School / Institution</label>
              <input type="text" className="qg-input" placeholder="Optional — appears on header"
                value={form.schoolName} onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
            </div>
            <div className="qg-form-group">
              <label>Exam Year</label>
              <input type="number" className="qg-input" value={form.examYear} min="2000" max="2099"
                onChange={(e) => setForm({ ...form, examYear: e.target.value })} />
            </div>

            <div className="qg-form-group full">
              <label>Grade / Form</label>
              <GradeSelector value={form.grade} onChange={(grade) => setForm({ ...form, grade })} />
            </div>

            {/* Difficulty */}
            <div className="qg-form-group full">
              <label><FiSliders /> Difficulty</label>
              <div className="qg-toggle-group" style={{ marginBottom: 10 }}>
                <button type="button"
                  className={`qg-toggle-btn ${!form.useMixedDifficulty ? "active" : ""}`}
                  onClick={() => setForm({ ...form, useMixedDifficulty: false })}>
                  Single Level
                </button>
                <button type="button"
                  className={`qg-toggle-btn ${form.useMixedDifficulty ? "active" : ""}`}
                  onClick={() => setForm({ ...form, useMixedDifficulty: true })}>
                  Mixed (Easy + Medium + Hard)
                </button>
              </div>
              {form.useMixedDifficulty ? (
                <DifficultyMixer form={form} setForm={setForm} />
              ) : (
                <select className="qg-select" value={form.difficulty}
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              )}
            </div>

            <div className="qg-form-group">
              <label>Curriculum</label>
              <select className="qg-select" value={form.curriculum}
                onChange={(e) => setForm({ ...form, curriculum: e.target.value })}>
                <option value="ZIMSEC">ZIMSEC</option>
                <option value="Cambridge">Cambridge</option>
              </select>
            </div>
            <div className="qg-form-group">
              <label>Question Type</label>
              <select className="qg-select" value={form.questionType}
                onChange={(e) => setForm({ ...form, questionType: e.target.value })}>
                <option value="mixed">Mixed</option>
                <option value="multiple-choice">Multiple Choice Only</option>
                <option value="structured">Structured Only</option>
              </select>
            </div>
            <div className="qg-form-group">
              <label><FiHash /> Question Count</label>
              <input type="number" className="qg-input" min="1" max="50" value={form.numQuestions}
                onChange={(e) => setForm({ ...form, numQuestions: parseInt(e.target.value) || "" })} />
            </div>
            <div className="qg-form-group">
              <label><FiClock /> Time Limit (min)</label>
              <input type="number" className="qg-input" min="0" value={form.timeLimit}
                onChange={(e) => setForm({ ...form, timeLimit: parseInt(e.target.value) || "" })} />
              <span className="qg-helper">0 for unlimited</span>
            </div>
            <div className="qg-form-group">
              <label>Tab Limit</label>
              <input type="number" className="qg-input" min="1" max="10" value={form.tabLimit}
                onChange={(e) => setForm({ ...form, tabLimit: parseInt(e.target.value) || "" })} />
              <span className="qg-helper">Anti-cheating tolerance</span>
            </div>

            <div className="qg-form-group full">
              <label>Custom Instructions</label>
              <textarea className="qg-textarea" rows="2"
                placeholder="e.g. Show all working. Answer in SI units."
                value={form.customInstructions}
                onChange={(e) => setForm({ ...form, customInstructions: e.target.value })} />
            </div>
          </div>
        </div>

        <button className="qg-generate-btn" type="submit" disabled={loading || !form.grade}>
          {loading ? <div className="qg-spinner" /> : <FiCpu />}
          {loading ? "Generating Quiz…" : "Generate Quiz"}
        </button>

        {!form.grade && (
          <p style={{ textAlign: "center", marginTop: 8, fontSize: 12, color: "#ca8a04" }}>
            ⚠ Please select a grade before generating.
          </p>
        )}
        {error && <p className="qg-error">{error}</p>}
      </form>

      {/* Quiz display */}
      {parsedQuestions.length > 0 && (
        <section className="qg-quiz-section">
          <div className="qg-results-header">
            <h2>Preview Quiz</h2>
            <div className="qg-badges">
              <span className="qg-badge"><FiClock style={{ marginRight: 4 }} />{form.timeLimit || "∞"}m</span>
              <span className="qg-badge">{parsedQuestions.length} Questions</span>
              <span className="qg-badge">{totalMarks} Marks</span>
              <span className={`qg-badge ${form.paperStyle === "Cambridge" ? "cam" : "zim"}`}>
                {form.paperStyle}
              </span>
            </div>
          </div>

          {parsedQuestions.map((item, idx) => (
            <QuestionCard
              key={idx} item={item} idx={idx} total={parsedQuestions.length}
              editingIndex={editingIndex} editForm={editForm} setEditForm={setEditForm}
              onSaveEdit={handleSaveEdit}
              onCancelEdit={() => { setEditingIndex(null); setEditForm(null); }}
              onStartEdit={startEdit}
              onRegenerate={handleRegenerate}
              regeneratingIndex={regeneratingIndex}
              onDelete={handleDelete}
              onMoveUp={() => handleMoveUp(idx)}
              onMoveDown={() => handleMoveDown(idx)}
            />
          ))}

          <div className="qg-add-row">
            <span className="qg-add-label">Add Question:</span>
            <button className="qg-add-btn" type="button" onClick={() => handleAddQuestion("multiple-choice")}>
              <FiPlus /> Multiple Choice
            </button>
            <button className="qg-add-btn structured" type="button" onClick={() => handleAddQuestion("structured")}>
              <FiPlus /> Structured
            </button>
          </div>

          <div className="qg-actions-bar">
            <button className="qg-action-btn save" type="button" onClick={handleSavePDF}>
              <FiSave /> Export PDFs (2)
            </button>
            <button className="qg-action-btn share" type="button"
              onClick={() => {
                if (!classes.length) { setError("No classes found. Link students first."); return; }
                setShareNotice(""); setSelectedClassIdx(null); setShowShareModal(true);
              }}>
              <FiShare2 /> Share to Class
            </button>
            <button className="qg-action-btn link" type="button"
              onClick={async () => {
                try {
                  const token = localStorage.getItem("chikoroai_authToken");
                  const res   = await axios.post(
                    "https://api.chikoro-ai.com/api/system/teacher/create-quiz-link",
                    { quiz, subject: form.subject, topic: form.topic, timeLimit: form.timeLimit, tabLimit: form.tabLimit },
                    { headers: { Authorization: `Bearer ${token}` } }
                  );
                  if (res.data.link) {
                    try { await navigator.clipboard.writeText(res.data.link); } catch {}
                    setShareNotice(`Public link copied: ${res.data.link}`);
                  }
                } catch { setError("Error generating link."); }
              }}>
              <FiLink /> Public Link
            </button>
          </div>

          {shareNotice && <p className="qg-share-notice">{shareNotice}</p>}
        </section>
      )}

      {showShareModal && (
        <ClassSelectorModal
          classes={classes} selectedIndex={selectedClassIdx} onSelect={setSelectedClassIdx}
          onConfirm={async () => {
            if (selectedClassIdx === null) return;
            const cls = classes[selectedClassIdx];
            setShowShareModal(false);
            try {
              const token = localStorage.getItem("chikoroai_authToken");
              const res   = await axios.post(
                "https://api.chikoro-ai.com/api/system/teacher/share-quiz-with-class",
                { quiz, subject: cls.subject, topic: form.topic, timeLimit: form.timeLimit, tabLimit: form.tabLimit, studentIds: cls.students.map((s) => s.id) },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              if (res.data.success) setShareNotice(`Shared with ${cls.subject} (${cls.students.length} students).`);
              else setError(`Failed to share: ${res.data.error}`);
            } catch { setError("Error sharing quiz."); }
            finally { setSelectedClassIdx(null); }
          }}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}
/**
 * sanitizeFeedback.js
 *
 * Strips leaked AI chain-of-thought reasoning from feedback text.
 * Import and use in any component that renders AI-generated feedback.
 *
 * Usage:
 *   import { sanitizeFeedback } from "./sanitizeFeedback";
 *   <ReactMarkdown>{sanitizeFeedback(feedback.explanation)}</ReactMarkdown>
 */

export function sanitizeFeedback(text) {
  if (!text || typeof text !== "string") return text;

  let cleaned = text;

  // ── 1. Split on "assistantfinal" marker ──────────────────────────────
  // The AI often dumps reasoning then writes "assistantfinal" before the
  // real output. Keep only what comes after the LAST occurrence.
  const finalMarkerRegex = /assistant\s*final/gi;
  let lastIndex = -1;
  let match;
  while ((match = finalMarkerRegex.exec(cleaned)) !== null) {
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex !== -1) {
    cleaned = cleaned.substring(lastIndex);
  }

  // ── 2. If text still has reasoning before SCORE/FEEDBACK, strip it ──
  const scorePos = cleaned.search(/\*?\*?SCORE\b/i);
  const feedbackPos = cleaned.search(/\*?\*?FEEDBACK\b/i);
  const cutPoint = [scorePos, feedbackPos].filter((p) => p > 0);
  if (cutPoint.length > 0) {
    const earliest = Math.min(...cutPoint);
    // Only cut if there's actual reasoning before it (not just whitespace)
    const before = cleaned.substring(0, earliest).trim();
    if (before.length > 0 && !/^[*_#\s]+$/.test(before)) {
      cleaned = cleaned.substring(earliest);
    }
  }

  // ── 3. Remove standalone reasoning lines ─────────────────────────────
  const reasoningPatterns = [
    // Planning / internal monologue
    /^We need to .*$/gm,
    /^We (?:might|could|should|estimate).*$/gm,
    /^Let'?s (?:do it|produce|craft|write|generate|decide|format|give).*$/gm,
    /^Now produce.*$/gm,
    /^Also need to.*$/gm,
    /^So we need.*$/gm,
    /^Typically such.*$/gm,
    /^Ok\.?\s*$/gm,
    /^(?:\d+-?\d*\s*sentences?\.?\s*)$/gm,

    // Instruction-to-self lines
    /^(?:Provide|Ensure to|Ensure|Confirm)[\s.].*?(?:feedback|tip|explanation|sentences|concise|thorough).*$/gm,
    /^good,?\s*correct\.?\s*(?:Could|Provide|Encourage|It's fine).*$/gm,

    // "The user/task:" preamble
    /^The (?:user|task)\s*:.*$/gm,

    // Reasoning about student marks
    /^(?:They|So they|They'd|So they'd).*?(?:marks?|get \d).*$/gm,
    /^The student(?:'s)? (?:answer|wrote|didn't|doesn't|omitted|got).*?(?:So|Let's|We need|Provide|marks).*$/gm,
    /^(?:The |Correct )answer (?:is|was).*?(?:So we|Let's|We need|Provide).*$/gm,

    // Un-formatted internal notes (no markdown bullet/bold)
    /^what was done well\s*:(?![\s\S]*[-*]).*$/gim,
  ];

  for (const pattern of reasoningPatterns) {
    cleaned = cleaned.replace(pattern, "");
  }

  // ── 4. Remove SCORE line (shown in UI badge already) ─────────────────
  cleaned = cleaned.replace(
    /^\*?\*?SCORE\s*:\s*\d+\.?\d*\s*\/\s*\d+\*?\*?\s*$/gim,
    ""
  );

  // ── 5. Remove standalone FEEDBACK header ─────────────────────────────
  cleaned = cleaned.replace(/^\*?\*?FEEDBACK\*?\*?\s*$/gim, "");

  // ── 6. Fix HTML entities ─────────────────────────────────────────────
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&lt;/g, "<");
  cleaned = cleaned.replace(/&gt;/g, ">");

  // ── 7. Collapse excessive blank lines and trim ───────────────────────
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.trim();

  return cleaned;
}
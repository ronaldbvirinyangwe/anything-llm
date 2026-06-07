const { Deduplicator } = require("../utils/dedupe");

/**
 * study-onboarding
 *
 * Fires when a student sends a vague message like "help me study",
 * "I want to revise", "ok", "yes", "ready", or any message that
 * doesn't map to a specific tool.
 *
 * Returns a STUDY_ONBOARDING:: payload that the frontend detects
 * and renders as an interactive welcome screen — with the study
 * planner form as the primary CTA, followed by quick-action buttons
 * for other tools.
 *
 * Flow:
 *   1. Student: "help me study" / "ok" / "yes"
 *   2. detectToolIntent → "study-onboarding"
 *   3. Agent calls study-onboarding plugin
 *   4. Plugin returns STUDY_ONBOARDING::{...}
 *   5. Frontend mounts <StudyOnboarding /> with:
 *        - StudyPlannerForm (primary, expanded)
 *        - Quick-action buttons (quiz, flashcards, notes, explain)
 *   6. Student either fills the planner form OR taps a quick action
 *   7. Frontend sendChatMessage() with the structured prompt
 *   8. Normal tool routing picks it up from there
 */
const StudyOnboarding = {
  name: "study-onboarding",
  startupConfig: { params: {} },

  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          tracker: new Deduplicator(),
          controller: new AbortController(),

          description:
            "Shows a friendly welcome screen when the student sends a vague message " +
            "like 'help me study', 'yes', 'ok', 'ready', or any message without " +
            "a clear tool intent. The screen presents the study planner form as the " +
            "primary action, with quick-access buttons for quiz, flashcards, notes, " +
            "and concept explanation. " +
            "Call this ONLY for genuinely vague messages with no clear tool intent. " +
            "Do NOT call this if the student has asked for a specific tool.",

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              subject: {
                type: "string",
                "x-nullable": true,
                description:
                  "Subject already mentioned by the student, e.g. 'Biology'. " +
                  "Leave null if not stated — the form will collect it.",
              },
              grade: {
                type: "string",
                "x-nullable": true,
                description:
                  "Student grade/year if known from context, e.g. 'Form 1'. " +
                  "Leave null if not stated.",
              },
            },
            required: [],
            additionalProperties: false,
          },

          handler: async function ({ subject = null, grade = null }) {
            try {
              // ── Deduplication guard ───────────────────────────────────────
              const callKey = { type: "onboarding" };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                return "The welcome screen is already open.";
              }

              this.tracker.trackRun(this.name, callKey);

              this.super.introspect(
                `${this.caller}: Showing study onboarding screen.`
              );

              // ── Build the payload ─────────────────────────────────────────
              // study-planner-elicit prefill (same shape as StudyPlannerElicit)
              const plannerPrefill = {
                subject: subject ?? "",
                exam_date: "",
              };

              // Quick-action buttons — message strings map to your existing
              // regex rules in detectToolIntent so they route correctly
              const quickActions = [
                { emoji: "📝", label: "Quiz me",             message: "Give me a quiz" },
                { emoji: "🃏", label: "Flashcards",          message: "Make me flashcards" },
                { emoji: "📚", label: "Study notes",         message: "Generate notes for me" },
                { emoji: "🦉", label: "Explain a topic",     message: "Explain a concept" },
                { emoji: "📄", label: "Summarise document",  message: "Summarise my document" },
                { emoji: "🔍", label: "Search the web",      message: "Search the web for" },
              ];

              const payload = {
                plannerPrefill,
                quickActions,
                // Pass through so frontend can personalise the greeting
                subject: subject ?? null,
                grade: grade ?? null,
              };

              // ── Return directly to chat (same pattern as study-planner-elicit) ──
              this.super.skipHandleExecution = true;
              return `STUDY_ONBOARDING::${JSON.stringify(payload)}`;

            } catch (error) {
              this.super.handlerProps.log(
                `study-onboarding raised an error. ${error.message}`
              );
              return `Could not open the welcome screen: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { StudyOnboarding };
const { Deduplicator } = require("../utils/dedupe");

/**
 * study-planner-elicit
 *
 * A lightweight pre-flight plugin that fires when the student expresses
 * intent to create a study plan. Instead of asking the AI to gather
 * parameters through chat, it returns a special STUDY_PLAN_FORM:: payload
 * that the frontend detects and renders as an interactive form.
 *
 * Flow:
 *   1. Student: "make me a study plan"
 *   2. AI calls study-planner-elicit  →  returns STUDY_PLAN_FORM::{...}
 *   3. Frontend: detects prefix, mounts <StudyPlannerForm />
 *   4. Student fills form, clicks Generate
 *   5. Frontend calls sendChatMessage() with structured prompt
 *   6. AI calls study-planner with the collected parameters
 */
const StudyPlannerElicit = {
  name: "study-planner-elicit",
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
            "Shows the student an interactive form to collect study plan details " +
            "(subject, exam date, topics, hours per day, days off) before generating the plan. " +
            "Call this FIRST whenever the student asks to create, make, or build a study plan, " +
            "revision schedule, or exam preparation plan — BEFORE calling study-planner. " +
            "Do NOT call study-planner directly if you haven't collected the exam date yet." +
            "NEVER call this after study-planner has already been called. " +
            "NEVER call this if you already have exam_date from the student.",

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
              exam_date: {
                type: "string",
                "x-nullable": true,
                description:
                  "Exam date in YYYY-MM-DD format if already given by the student. " +
                  "Leave null if not mentioned — the form will collect it.",
              },
            },
            required: [],
            additionalProperties: false,
          },

          handler: async function ({ subject = null, exam_date = null }) {
            try {

              const plannerTracker = this.super.functions.get("study-planner")?.tracker;

 if (this.super._studyPlanGenerated === true) {
      console.log(`[StudyPlannerElicit] Blocked — plan already generated.`);
      // Unregister both functions so the LLM can't call them again
      this.super.functions?.delete("study-planner-elicit");
      this.super.functions?.delete("study-planner");
      return "The study plan has already been generated. No further action needed.";
    }
              const callKey = { type: "elicit" };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                return "The study plan form is already open.";
              }

              this.super.introspect(
                `${this.caller}: Rendering study plan form for the student.`
              );

              this.tracker.trackRun(this.name, callKey);

              const prefill = {
                subject: subject ?? "",
                exam_date: exam_date ?? "",
              };

              // ✅ Tell AIbitat to return this string DIRECTLY to the chat —
              //    no further LLM processing. ChatHistory will detect the
              //    STUDY_PLAN_FORM:: prefix and mount <StudyPlannerForm />.
              this.super.skipHandleExecution = true;

              return `STUDY_PLAN_FORM::${JSON.stringify({ prefill })}`;

            } catch (error) {
              this.super.handlerProps.log(
                `study-planner-elicit raised an error. ${error.message}`
              );
              return `Could not open the study plan form: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { StudyPlannerElicit };
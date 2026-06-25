const { Deduplicator } = require("../utils/dedupe");
const { markLessonCompleteByTopic } = require("./course-progress-utils");

const MarkLessonComplete = {
  name: "mark-lesson-complete",
  startupConfig: { params: {} },
  plugin: function () {
    return {
      name: this.name,
      setup(aibitat) {
        aibitat.function({
          super: aibitat,
          name: this.name,
          tracker: new Deduplicator(),

          description:
            "Marks a lesson as completed in the student's generated course, IF AND ONLY IF the student has " +
            "just demonstrated real understanding of that specific topic in this conversation — for example, " +
            "they answered a check-question correctly, explained it back in their own words, or you walked " +
            "through the full topic and confirmed they followed it. " +
            "Do NOT call this just because a topic was mentioned or briefly explained once — only after " +
            "genuine evidence of understanding. Infer the subject (e.g. 'Biology') from conversation context; " +
            "never ask the student for it. If no matching lesson exists yet, this silently does nothing — " +
            "that's fine, just continue the conversation normally.",

          examples: [
            {
              prompt: "(student correctly answers a check-question about photosynthesis after an explanation)",
              call: JSON.stringify({ subject: "Biology", topic: "Photosynthesis" }),
            },
          ],

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              subject: { type: "string", description: "The subject this topic belongs to, e.g. 'Biology'." },
              topic: { type: "string", description: "The specific topic/concept just covered, e.g. 'Photosynthesis'." },
            },
            required: ["subject", "topic"],
            additionalProperties: false,
          },

          handler: async function ({ subject, topic }) {
            try {
              const callKey = { subject, topic };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                return "Already processed.";
              }
              this.tracker.trackRun(this.name, callKey);

              const userId = this.super.handlerProps.invocation?.user_id;
              const result = await markLessonCompleteByTopic({ userId, subject, topic });

              if (!result) {
                // No confident match, or student isn't enrolled in that
                // course yet — silently no-op, don't surface an error.
                return "No matching lesson found to mark complete — continuing normally.";
              }

              if (result.alreadyDone) {
                return `"${result.lessonTitle}" was already marked complete.`;
              }

              this.super.introspect(
                `${this.caller}: Marked lesson "${result.lessonTitle}" complete (module "${result.moduleTitle}").`
              );

              return JSON.stringify({
                tool_call: "lesson_completed",
                lesson: {
                  id: result.lessonId,
                  title: result.lessonTitle,
                  moduleTitle: result.moduleTitle,
                  courseId: result.courseId,
                  subject,
                },
                display_message: `🎉 Nice work! "${result.lessonTitle}" is now marked complete.`,
              });
            } catch (error) {
              this.super.handlerProps.log(`mark-lesson-complete raised an error. ${error.message}`);
              // Fail silently from the student's perspective — this is a
              // background bookkeeping action, not core to the conversation.
              return "Could not update lesson progress, but continuing the conversation.";
            }
          },
        });
      },
    };
  },
};

module.exports = { MarkLessonComplete };
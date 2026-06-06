const { Deduplicator } = require("../utils/dedupe");
const Provider = require("../providers/ai-provider");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const {
  getActivePlan,
  parseSessions,
  detectMissed,
  rescheduleMissed,
  saveSessions,
  sendNotification,
  todayStr,
  STATUS,
} = require("./session-utils");

/**
 * study-tracker
 *
 * Fires after a tutoring exchange to:
 *   1. Auto-detect which topic was just covered from the conversation snippet
 *   2. Mark that session as complete in the DB
 *   3. Re-check for any newly missed sessions (inactivity or date-based)
 *   4. Reschedule missed sessions to future available days
 *   5. Send AnythingLLM notifications for each missed topic
 *   6. Return a summary the AI can use to acknowledge progress
 *
 * The AI calls this naturally during tutoring — no student input needed.
 */
const StudyTracker = {
  name: "study-tracker",
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
            "Marks a study topic as complete after it has been covered in a tutoring session. " +
            "Call this when: you have just finished explaining a topic, answered several questions about it, " +
            "the student says 'I understand', 'got it', 'that makes sense', 'we covered X', " +
            "or you judge the topic has been sufficiently addressed. " +
            "Pass the topic name and a short snippet of what was covered. " +
            "Do NOT call this for every single message — only when a meaningful topic has been completed. " +
            "Do NOT call this for the same topic twice in one session.",

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              topic: {
                type: "string",
                description:
                  "The name of the topic just covered, e.g. 'Photosynthesis', 'Verbs'. " +
                  "Match this to the topic names in the study plan as closely as possible.",
              },
              conversation_snippet: {
                type: "string",
                description:
                  "A 1-2 sentence summary of what was covered in the session for this topic. " +
                  "Used for record-keeping. E.g. 'Covered light and dark reactions of photosynthesis, student confirmed understanding.'",
              },
            },
            required: ["topic"],
            additionalProperties: false,
          },

          handler: async function ({
            topic,
            conversation_snippet = null,
          }) {
            try {
              console.log(`[StudyTracker] Handler entered — topic: "${topic}"`);

              // ── Dedup — don't mark the same topic twice ─────────────────────
              const callKey = { topic: topic.toLowerCase() };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                return `"${topic}" has already been marked complete this session.`;
              }

              const userId = this.super.handlerProps.invocation?.user_id;
              const workspaceId = this.super.handlerProps.invocation?.workspace_id;

              // ── Load active plan ────────────────────────────────────────────
              const plan = await getActivePlan(userId, workspaceId);
              if (!plan) {
                return "No active study plan found — topic noted but not tracked.";
              }

              let sessions = parseSessions(plan);
              const today = todayStr();

              // ── Find the best matching session to mark complete ─────────────
              // Priority: today's pending session for this topic → any pending session
              const topicLower = topic.toLowerCase();

              let targetIdx = sessions.findIndex(
                (s) =>
                  s.date === today &&
                  s.status === STATUS.PENDING &&
                  s.topic.toLowerCase() === topicLower
              );

              // Fallback: fuzzy match today's sessions
              if (targetIdx === -1) {
                targetIdx = sessions.findIndex(
                  (s) =>
                    s.date === today &&
                    s.status === STATUS.PENDING &&
                    (s.topic.toLowerCase().includes(topicLower) ||
                      topicLower.includes(s.topic.toLowerCase()))
                );
              }

              // Fallback: any pending session for this topic (rescheduled etc.)
              if (targetIdx === -1) {
                targetIdx = sessions.findIndex(
                  (s) =>
                    s.status === STATUS.PENDING &&
                    (s.topic.toLowerCase() === topicLower ||
                      s.topic.toLowerCase().includes(topicLower) ||
                      topicLower.includes(s.topic.toLowerCase()))
                );
              }

              let matchedTopic = topic;
              let isInPlan = targetIdx !== -1;

              if (isInPlan) {
                matchedTopic = sessions[targetIdx].topic;
                sessions[targetIdx] = {
                  ...sessions[targetIdx],
                  status: STATUS.COMPLETE,
                  completed_at: new Date().toISOString(),
                  detected_from: conversation_snippet ?? `Covered during tutoring session on ${today}`,
                };
                console.log(`[StudyTracker] Marked "${matchedTopic}" complete (session idx ${targetIdx}).`);
              } else {
                console.log(`[StudyTracker] Topic "${topic}" not found in plan — logging as bonus session.`);
                // Still record it as a completed bonus session
                sessions.push({
                  date: today,
                  topic,
                  status: STATUS.COMPLETE,
                  completed_at: new Date().toISOString(),
                  rescheduled_to: null,
                  detected_from: conversation_snippet ?? `Covered as extra topic on ${today}`,
                });
              }

              // ── Re-check for missed sessions after marking complete ─────────
              const missed = detectMissed(sessions, plan.last_active);
              let newMissedCount = 0;

              if (missed.length > 0) {
                console.log(`[StudyTracker] ${missed.length} missed session(s) detected after completion check.`);

                sessions = sessions.map((s) => {
                  const isMissed = missed.find(
                    (m) => m.date === s.date && m.topic === s.topic
                  );
                  return isMissed ? { ...s, status: STATUS.MISSED } : s;
                });

                sessions = rescheduleMissed(sessions, plan.days_off, plan.exam_date);
                newMissedCount = missed.length;

                // Send a notification for each missed topic
                const missedTopics = [...new Set(missed.map((m) => m.topic))];
                for (const missedTopic of missedTopics) {
                  const rescheduled = sessions.find(
                    (s) =>
                      s.topic === missedTopic &&
                      s.status === STATUS.PENDING &&
                      s.date > today
                  );
                  const newDate = rescheduled?.date
                    ? ` It has been rescheduled to ${rescheduled.date}.`
                    : " No available slot before the exam — consider squeezing it in!";

                  await sendNotification(
                    userId,
                    `⚠️ Missed session: You didn't study "${missedTopic}" on the scheduled day.${newDate}`
                  );
                }
              }

              // ── Save updated sessions ───────────────────────────────────────
              await saveSessions(plan.id, sessions, {
                last_active: new Date(),
              });

              this.tracker.trackRun(this.name, callKey);

              // ── Calculate remaining today ───────────────────────────────────
              const remainingToday = sessions.filter(
                (s) => s.date === today && s.status === STATUS.PENDING
              );
              const totalComplete = sessions.filter(
                (s) => s.status === STATUS.COMPLETE
              ).length;
              const totalPending = sessions.filter(
                (s) => s.status === STATUS.PENDING
              ).length;
              const examDate = new Date(plan.exam_date);
              const daysUntilExam = Math.ceil(
                (examDate - new Date()) / (1000 * 60 * 60 * 24)
              );

              // ── Build return summary for AI ─────────────────────────────────
              const lines = [
                `TOPIC_MARKED_COMPLETE: "${matchedTopic}"`,
                isInPlan
                  ? `✅ Matched to study plan and marked complete.`
                  : `📝 Not in today's plan but recorded as extra study.`,
              ];

              if (remainingToday.length > 0) {
                lines.push(
                  ``,
                  `Still to cover today:`,
                  ...remainingToday.map((s) => `  • ${s.topic}`)
                );
              } else {
                lines.push(``, `🎉 All of today's scheduled topics are complete!`);
              }

              lines.push(
                ``,
                `Overall progress: ${totalComplete} complete, ${totalPending} remaining, ${daysUntilExam} days to exam.`
              );

              if (newMissedCount > 0) {
                lines.push(
                  ``,
                  `⚠️ ${newMissedCount} missed session(s) detected and rescheduled. Student notified.`
                );
              }

              lines.push(
                ``,
                `INSTRUCTIONS FOR AI:`,
                `- Acknowledge the completed topic naturally and positively.`,
                `- If topics remain today, smoothly transition to the next one.`,
                `- If all done today, congratulate the student and preview tomorrow's topics.`,
                `- Do NOT show raw session data to the student.`
              );

              return lines.join("\n");

            } catch (error) {
              console.error(`[StudyTracker] Handler crashed:`, error.message, error.stack);
              this.super.handlerProps.log(
                `study-tracker raised an error. ${error.message}`
              );
              return `TRACKER_ERROR: Could not save progress. Error: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { StudyTracker };
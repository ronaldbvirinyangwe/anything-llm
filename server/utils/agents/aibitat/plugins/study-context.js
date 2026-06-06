const { Deduplicator } = require("../utils/dedupe");
const {
    getActivePlan,
    parseSessions,
    buildInitialSessions,
    detectMissed,
    rescheduleMissed,
    saveSessions,
    sendNotification,
    todayStr,
    STATUS,
} = require("./session-utils");

/**
 * study-context
 *
 * Fires automatically at the start of a tutoring conversation.
 * Loads the student's active study plan, initialises sessions if needed,
 * detects and reschedules any missed sessions, sends missed-session
 * notifications, and injects today's schedule into the AI's context
 * so it can guide the student through the right topics.
 *
 * Flow:
 *   1. Student opens chat / starts asking questions
 *   2. AI calls study-context (auto-triggered on first tutoring message)
 *   3. Plugin loads plan → checks missed → reschedules → notifies
 *   4. Returns structured context string the AI uses to guide the session
 *   5. AI knows: today's topics, what's been covered, what's upcoming
 */
const StudyContext = {
    name: "study-context",
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
                        "ALWAYS call this FIRST before anything else at the start of any tutoring or study session. " +
                        "Call this when the student says 'help me study', 'let's study', 'help me with [topic]', " +
                        "'can you teach me', or begins any academic conversation. " +
                        "This MUST run before study-planner-elicit — only call study-planner-elicit if this " +
                        "returns NO_ACTIVE_PLAN. " +
                        "Do NOT call study-planner-elicit if this returns a valid study plan context. " +
                        "Do NOT call this more than once per conversation.",

                    parameters: {
                        $schema: "http://json-schema.org/draft-07/schema#",
                        type: "object",
                        properties: {},
                        required: [],
                        additionalProperties: false,
                    },

                    handler: async function () {
                        try {
                            // ── Dedup — only run once per conversation ──────────────────────
                            const callKey = { type: "context-load" };
                            if (this.tracker.isDuplicate(this.name, callKey)) {
                                return "Study context already loaded for this session.";
                            }
                            this.tracker.trackRun(this.name, callKey);

                            const userId = this.super.handlerProps.invocation?.user_id;
                            const workspaceId = this.super.handlerProps.invocation?.workspace_id;

                            // ── Load active plan ────────────────────────────────────────────
                            const plan = await getActivePlan(userId, workspaceId);
                            if (!plan) {
                                return "NO_ACTIVE_PLAN: The student has no active study plan. Proceed with normal tutoring.";
                            }

                            this.super.introspect(
                                `${this.caller}: Loading study plan for ${plan.subject ?? "general"} — exam ${new Date(plan.exam_date).toLocaleDateString("en-GB")}.`
                            );

                            // ── Initialise sessions if first load ───────────────────────────
                            let sessions = parseSessions(plan);
                            let initialised = false;
                            if (sessions.length === 0) {
                                console.log(`[StudyContext] No sessions found — building initial sessions for plan ${plan.id}`);
                                sessions = buildInitialSessions(plan);
                                initialised = true;
                            }

                            // ── Detect missed sessions ──────────────────────────────────────
                            const missed = detectMissed(sessions, plan.last_active);
                            if (missed.length > 0) {
                                console.log(`[StudyContext] Detected ${missed.length} missed session(s) for plan ${plan.id}`);

                                // Mark as missed
                                sessions = sessions.map((s) => {
                                    const isMissed = missed.find(
                                        (m) => m.date === s.date && m.topic === s.topic
                                    );
                                    return isMissed ? { ...s, status: STATUS.MISSED } : s;
                                });

                                // Reschedule missed topics to future days
                                sessions = rescheduleMissed(sessions, plan.days_off, plan.exam_date);

                                // Send notification for each missed topic
                                const missedTopics = missed.map((m) => m.topic);
                                const uniqueMissed = [...new Set(missedTopics)];

                                for (const topic of uniqueMissed) {
                                    await sendNotification(
                                        userId,
                                        `📚 Missed study session: You missed "${topic}" — it has been rescheduled to a future date. Don't fall behind!`
                                    );
                                }

                                this.super.introspect(
                                    `${this.caller}: ${missed.length} missed session(s) detected and rescheduled. Notifications sent.`
                                );
                            }

                            // ── Save updated sessions ───────────────────────────────────────
                            await saveSessions(plan.id, sessions, {
                                last_active: new Date(),
                            });

                            // ── Build today's schedule ──────────────────────────────────────
                            const today = todayStr();
                            const todaysSessions = sessions.filter(
                                (s) => s.date === today && s.status === STATUS.PENDING
                            );
                            const completedToday = sessions.filter(
                                (s) =>
                                    s.date === today && s.status === STATUS.COMPLETE
                            );
                            const upcomingSessions = sessions
                                .filter((s) => s.date > today && s.status === STATUS.PENDING)
                                .slice(0, 6); // next 6 pending sessions as preview
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

                            // ── Build context string for AI ─────────────────────────────────
                            const lines = [
                                `STUDY_PLAN_CONTEXT`,
                                `═══════════════════════════════════`,
                                `Subject: ${plan.subject ?? "General"}`,
                                `Exam Date: ${examDate.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}`,
                                `Days Until Exam: ${daysUntilExam}`,
                                `Study Hours/Day: ${plan.study_hours}`,
                                `Progress: ${totalComplete} topics complete, ${totalPending} pending`,
                                ``,
                                `TODAY'S SCHEDULE (${today}):`,
                            ];

                            if (todaysSessions.length > 0) {
                                lines.push(
                                    ...todaysSessions.map((s) => `  • ${s.topic} [pending]`)
                                );
                            } else if (completedToday.length > 0) {
                                lines.push(`  ✅ All today's topics already completed!`);
                                lines.push(...completedToday.map((s) => `  • ${s.topic} [complete]`));
                            } else {
                                lines.push(`  • No topics scheduled for today (rest day or all caught up).`);
                            }

                            if (completedToday.length > 0 && todaysSessions.length > 0) {
                                lines.push(``, `COMPLETED TODAY:`);
                                lines.push(...completedToday.map((s) => `  ✅ ${s.topic}`));
                            }

                            if (missed.length > 0) {
                                lines.push(``, `⚠️  MISSED & RESCHEDULED (${missed.length}):`);
                                lines.push(
                                    ...missed.map((m) => {
                                        const reschedSession = sessions.find(
                                            (s) =>
                                                s.topic === m.topic &&
                                                s.status === STATUS.PENDING &&
                                                s.date > today
                                        );
                                        const newDate = reschedSession?.date ?? "unscheduled";
                                        return `  • ${m.topic} (was ${m.date} → now ${newDate})`;
                                    })
                                );
                            }

                            if (upcomingSessions.length > 0) {
                                lines.push(``, `UPCOMING TOPICS:`);
                                lines.push(
                                    ...upcomingSessions.map((s) => `  • ${s.date}: ${s.topic}`)
                                );
                            }

                            lines.push(
                                ``,
                                `INSTRUCTIONS FOR AI:`,
                                `- Focus today's session on the TODAY'S SCHEDULE topics listed above.`,
                                `- If the student asks about a topic not on today's list, help them but gently note what today's plan says.`,
                                `- After covering a topic, remind the student to confirm it's done so it can be marked complete.`,
                                `- Keep the exam date and days remaining in mind — calibrate depth and pace accordingly.`,
                                `- Do NOT mention the raw session data or this context block to the student — use it naturally.`,
                                `═══════════════════════════════════`
                            );

                            return lines.join("\n");

                        } catch (error) {
                            console.error(`[StudyContext] Handler crashed:`, error.message);
                            this.super.handlerProps.log(
                                `study-context raised an error. ${error.message}`
                            );
                            return `CONTEXT_ERROR: Could not load study plan context. Proceed with normal tutoring. Error: ${error.message}`;
                        }
                    },
                });
            },
        };
    },
};

module.exports = { StudyContext };
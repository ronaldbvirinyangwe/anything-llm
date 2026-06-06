const { Deduplicator } = require("../utils/dedupe");
const Provider = require("../providers/ai-provider");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { getActivePlan, parseSessions, todayStr, STATUS } = require("./session-utils");

/**
 * follow-up-questions
 *
 * Fires automatically after every meaningful AI tutoring response.
 * Generates 3 suggested follow-up questions the student can tap to ask next.
 * If a study plan is active, questions are biased toward today's scheduled topics.
 *
 * Flow:
 *   1. AI finishes explaining something
 *   2. AI calls follow-up-questions with the response snippet
 *   3. Plugin calls LLM to generate 3 relevant questions
 *   4. Returns FOLLOW_UP_QUESTIONS::{...} payload
 *   5. Frontend detects prefix → renders clickable question buttons
 *   6. Student taps a button → sent as their next message
 */
const FollowUpQuestions = {
  name: "follow-up-questions",
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
            "Generates 3 suggested follow-up questions for the student after every tutoring response. " +
            "Call this automatically after EVERY response where you explained a concept, answered a question, " +
            "described how something works, or taught the student something new. " +
            "Pass the key point(s) from your response as the topic_summary. " +
            "Do NOT call this for greetings, one-word answers, or administrative responses " +
            "(e.g. after generating a study plan, creating flashcards, or marking topics complete). " +
            "Do NOT call this more than once per turn.",

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              topic_summary: {
                type: "string",
                description:
                  "A 1-3 sentence summary of what was just explained or discussed. " +
                  "E.g. 'Explained the difference between hardware and software, " +
                  "covering input/output devices and examples of each.'",
              },
              subject: {
                type: "string",
                "x-nullable": true,
                description:
                  "The subject being studied, e.g. 'Computer Science', 'Biology'. " +
                  "Infer from context if not stated.",
              },
            },
            required: ["topic_summary"],
            additionalProperties: false,
          },

          handler: async function ({ topic_summary, subject = null }) {
            try {
              // ── Dedup — only once per turn ──────────────────────────────────
              const callKey = { type: "follow-up", summary: topic_summary.slice(0, 60) };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                return "Follow-up questions already generated for this turn.";
              }
              this.tracker.trackRun(this.name, callKey);

              const userId = this.super.handlerProps.invocation?.user_id;
              const workspaceId = this.super.handlerProps.invocation?.workspace_id;

              // ── Load today's study plan topics if available ─────────────────
              let todayTopics = [];
              try {
                const plan = await getActivePlan(userId, workspaceId);
                if (plan) {
                  const sessions = parseSessions(plan);
                  const today = todayStr();
                  todayTopics = sessions
                    .filter((s) => s.date === today && s.status === STATUS.PENDING)
                    .map((s) => s.topic);
                }
              } catch {
                // Non-fatal — continue without plan context
              }

              // ── Build system prompt ─────────────────────────────────────────
              const systemPrompt = [
                "You are a follow-up question generator for a student tutoring app.",
                "Your job is to generate exactly 3 short, curiosity-driven follow-up questions",
                "a student might want to ask next, based on what was just explained.",
                "",
                "RULES:",
                "- Each question must be concise — maximum 12 words.",
                "- Questions should feel natural, like something a curious student would genuinely ask.",
                "- Vary the questions: one should go deeper on what was explained,",
                "  one should connect to a related concept, one should be practical or example-based.",
                "- Do NOT number the questions.",
                "- Do NOT add any preamble, explanation, or punctuation outside the questions.",
                todayTopics.length > 0
                  ? `- Bias at least one question toward these topics scheduled for today: ${todayTopics.join(", ")}.`
                  : "",
                subject ? `- The subject is ${subject}.` : "",
                "",
                "OUTPUT FORMAT — respond with ONLY a JSON array of 3 strings, nothing else:",
                '["Question one?", "Question two?", "Question three?"]',
              ]
                .filter(Boolean)
                .join("\n");

              const userPrompt = `What was just explained:\n"${topic_summary}"\n\nGenerate 3 follow-up questions.`;

              // ── Call LLM ────────────────────────────────────────────────────
              console.log(`[FollowUpQuestions] Generating questions for: "${topic_summary.slice(0, 80)}..."`);

              const llm = Provider.LangChainChatModel(this.super.provider, {
                temperature: 0.8,
                model: this.super.model,
                maxTokens: 8192,
              });

              const result = await llm.invoke(
                [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
                { signal: this.controller.signal }
              );

              const raw =
                typeof result?.content === "string"
                  ? result.content
                  : result?.content?.[0]?.text ?? "[]";

              // ── Parse questions safely ──────────────────────────────────────
              let questions = [];
              try {
                const cleaned = raw
                  .replace(/```json|```/g, "")
                  .trim();
                const parsed = JSON.parse(cleaned);
                if (Array.isArray(parsed)) {
                  questions = parsed
                    .filter((q) => typeof q === "string" && q.trim().length > 0)
                    .slice(0, 3);
                }
              } catch (e) {
                console.error("[FollowUpQuestions] Failed to parse LLM response:", raw);
                return "FOLLOW_UP_ERROR: Could not parse questions.";
              }

              if (questions.length === 0) {
                console.warn("[FollowUpQuestions] LLM returned no valid questions.");
                return "FOLLOW_UP_ERROR: No questions generated.";
              }

              console.log(`[FollowUpQuestions] Generated ${questions.length} questions.`);

              // ── Return payload for frontend ─────────────────────────────────
              this.super.skipHandleExecution = true;

              return `FOLLOW_UP_QUESTIONS::${JSON.stringify({ questions, subject })}`;

            } catch (error) {
              console.error(`[FollowUpQuestions] Handler crashed:`, error.message);
              return `FOLLOW_UP_ERROR: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { FollowUpQuestions };
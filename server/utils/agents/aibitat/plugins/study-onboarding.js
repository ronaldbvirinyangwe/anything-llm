const { Deduplicator } = require("../utils/dedupe");
const { PrismaClient } = require("@prisma/client");
const onboardingTracker = new Deduplicator(); 

const prisma = new PrismaClient();

// ─── Fetch student profile from DB ───────────────────────────────────────────
async function getStudentProfile(userId) {
  if (!userId) return null;
  try {
    return await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
  } catch (e) {
    console.error(`[StudyOnboarding] getStudentProfile failed:`, e.message);
    return null;
  }
}

// ─── Fetch active study plan from DB ─────────────────────────────────────────
async function getActiveStudyPlan(userId, workspaceId) {
  if (!userId) return null;
  try {
    return await prisma.study_plans.findFirst({
      where: {
        user_id: Number(userId),
        workspace_id: Number(workspaceId),
        exam_date: { gte: new Date() },
      },
      orderBy: { created_at: "desc" },
    });
  } catch (e) {
    console.error(`[StudyOnboarding] getActiveStudyPlan failed:`, e.message);
    return null;
  }
}

/**
 * study-onboarding
 *
 * Fires when a student sends a vague message. Instead of static buttons,
 * it returns a STUDY_ONBOARDING:: payload with a step-by-step leading
 * question flow. The frontend renders one question at a time; when all
 * are answered it sends the collected answers back to the agent as a
 * structured message, and the agent decides what to do next.
 *
 * Flow:
 *   1. Student: "help me study" / "ok" / "yes"
 *   2. Agent calls study-onboarding
 *   3. Plugin loads student profile + active plan from DB
 *   4. Returns STUDY_ONBOARDING::{ student, activePlan, questions[] }
 *   5. Frontend renders questions one at a time
 *   6. On completion → sendChatMessage() with all answers as JSON summary
 *   7. Agent reads answers and routes to the correct tool
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
          tracker: onboardingTracker,
          controller: new AbortController(),

          description:
            "Shows a friendly guided onboarding flow when the student sends a vague message " +
            "like 'help me study', 'yes', 'ok', 'ready', or any message without " +
            "a clear tool intent. Asks leading questions one at a time to understand " +
            "what the student wants to do, then hands the answers back to the agent " +
            "to route to the correct tool. " +
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
                  "Leave null if not stated.",
              },
              grade: {
                type: "string",
                "x-nullable": true,
                description:
                  "Student grade/year if known from context. Leave null if not stated.",
              },
            },
            required: [],
            additionalProperties: false,
          },

          handler: async function ({ subject = null, grade = null }) {
              const userId = this.super.handlerProps.invocation?.user_id;
              const workspaceId = this.super.handlerProps.invocation?.workspace_id;
            try {
              // ── Deduplication guard ───────────────────────────────────────
              const sessionKey = {
  type: "onboarding",
  userId,
  // Reset every 10 minutes
  window: Math.floor(Date.now() / (10 * 60 * 1000)),
};
              if (this.tracker.isDuplicate(this.name, sessionKey)) {
                this.super.skipHandleExecution = true;
      this.super.terminateAfterReply = true;
                return "The welcome screen is already open.";
              }

              this.tracker.trackRun(this.name, sessionKey);

              // ── Load student profile + active plan ────────────────────────
            

              const student = await getStudentProfile(userId);
              const activePlan = await getActiveStudyPlan(userId, workspaceId);
              const resolvedSubject = subject ?? activePlan?.subject ?? null;

              if (student) {
                this.super.introspect(
                  `${this.caller}: Loaded profile for ${student.name} — ` +
                    `${student.grade}, ${student.curriculum}.`
                );
              }

              if (activePlan) {
                this.super.introspect(
                  `${this.caller}: Found active study plan for ${activePlan.subject} ` +
                    `(exam: ${activePlan.exam_date?.toISOString?.()?.split("T")[0]}).`
                );
              }

              this.super.introspect(
                `${this.caller}: Showing guided onboarding flow.`
              );

              // ── Build personalised greeting ───────────────────────────────
              const firstName = student?.name?.split(" ")[0] ?? null;

              // ── Build leading questions ───────────────────────────────────
              // Questions branch based on what we already know.
              // The frontend steps through these in order, one at a time.
              // After all are answered, it sends back a summary message.
              const questions = [
                // Q1 — what do you want to do?
                {
                  id: "intent",
                  question: activePlan
                    ? `You have an active study plan for ${activePlan.subject}. What would you like to do today?`
                    : "What would you like to do today?",
                  type: "single_select",
                  options: [
                    { label: "📅 Create a study plan",   value: "study_plan"   },
                    { label: "🧠 Quiz me on a topic",    value: "quiz"         },
                    { label: "🃏 Make flashcards",        value: "flashcards"   },
                    { label: "📚 Generate study notes",  value: "notes"        },
                    { label: "🦉 Explain a concept",     value: "explain"      },
                    { label: "✅ Check my answer",        value: "check_answer" },
                  ],
                },

                // Q2 — which subject? (skip if already known)
                {
                  id: "subject",
                  question: "Which subject is this for?",
                  type: "single_select",
                  // If student has a curriculum we can suggest their likely subjects;
                  // otherwise fall back to a generic list.
                  // The frontend should render a free-text fallback ("Other…") too.
                  options: buildSubjectOptions(student),
                  // Skip this question if subject was already passed in
                  skipIf: resolvedSubject ? { field: "subject", value: resolvedSubject } : null,
                  prefill: resolvedSubject ?? null,
                },

                // Q3 — specific topic / what do you need help with?
                {
                  id: "topic",
                  question: "What specific topic do you need help with?",
                  type: "free_text",
                  placeholder: "e.g. Photosynthesis, Quadratic equations…",
                  // Only shown for quiz / explain / flashcards / notes / check_answer
                  // For study_plan this is handled by the planner form
                  showOnlyFor: ["quiz", "explain", "flashcards", "notes", "check_answer"],
                },

                // Q4 — difficulty / depth (only for quiz and explain)
                {
                  id: "depth",
                  question: "How deep do you want to go?",
                  type: "single_select",
                  options: [
                    { label: "🟢 Quick overview",   value: "overview"  },
                    { label: "🟡 Standard depth",   value: "standard"  },
                    { label: "🔴 Deep dive",         value: "deep"      },
                  ],
                  showOnlyFor: ["quiz", "explain"],
                },
              ];

              // ── Planner prefill (used if intent === study_plan) ───────────
              const plannerPrefill = {
                subject: subject ?? activePlan?.subject ?? "",
                exam_date: activePlan?.exam_date
                  ? activePlan.exam_date.toISOString().split("T")[0]
                  : "",
              };

              // ── Build payload ─────────────────────────────────────────────
              const payload = {
                // Personalisation
                student: student
                  ? {
                      firstName,
                      grade: student.grade,
                      curriculum: student.curriculum,
                      academicLevel: student.academicLevel,
                    }
                  : null,

                // Active plan summary (shown as context banner on frontend)
                activePlan: activePlan
                  ? {
                      subject: activePlan.subject,
                      examDate: activePlan.exam_date
                        ?.toISOString()
                        ?.split("T")[0],
                    }
                  : null,
                resolvedSubject,

                // Step-by-step questions
                questions,

                // Planner form prefill (mounted if intent === study_plan)
                plannerPrefill,

                // Instruction for the frontend on what to send back when done.
                // The frontend should call sendChatMessage() with this template,
                // substituting {answers} with a JSON string of collected answers.
                completionMessageTemplate:
                  "ONBOARDING_COMPLETE::{answers}",
              };

              // ── Return directly to chat ───────────────────────────────────
              this.super.skipHandleExecution = true;
              this.super.terminateAfterReply = true;
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

// ─── Helper: build subject options based on curriculum ───────────────────────
function buildSubjectOptions(student) {
  const zimsec = [
    { label: "Mathematics",          value: "Mathematics"          },
    { label: "English Language",     value: "English Language"     },
    { label: "Biology",              value: "Biology"              },
    { label: "Chemistry",            value: "Chemistry"            },
    { label: "Physics",              value: "Physics"              },
    { label: "History",              value: "History"              },
    { label: "Geography",            value: "Geography"            },
    { label: "Combined Science",     value: "Combined Science"     },
    { label: "Commerce",             value: "Commerce"             },
    { label: "Accounts",             value: "Accounts"             },
  ];

  const cambridge = [
    { label: "Mathematics",          value: "Mathematics"          },
    { label: "English Language",     value: "English Language"     },
    { label: "Biology",              value: "Biology"              },
    { label: "Chemistry",            value: "Chemistry"            },
    { label: "Physics",              value: "Physics"              },
    { label: "Economics",            value: "Economics"            },
    { label: "Business Studies",     value: "Business Studies"     },
    { label: "Computer Science",     value: "Computer Science"     },
    { label: "History",              value: "History"              },
    { label: "Geography",            value: "Geography"            },
  ];

  const generic = [
    { label: "Mathematics",   value: "Mathematics"   },
    { label: "English",       value: "English"       },
    { label: "Sciences",      value: "Sciences"      },
    { label: "Humanities",    value: "Humanities"    },
    { label: "Business",      value: "Business"      },
    { label: "Languages",     value: "Languages"     },
  ];

  if (!student?.curriculum) return generic;
  const c = student.curriculum.toLowerCase();
  if (c.includes("zimsec")) return zimsec;
  if (c.includes("cambridge") || c.includes("igcse") || c.includes("a level")) return cambridge;
  return generic;
}

module.exports = { StudyOnboarding };
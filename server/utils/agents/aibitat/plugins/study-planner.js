const { Deduplicator } = require("../utils/dedupe");
const { PrismaClient } = require("@prisma/client");
const Provider = require("../providers/ai-provider");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const { Document } = require("../../../../models/documents");
const { safeJsonParse } = require("../../../http");

const prisma = new PrismaClient();

// ─── Fetch student profile from DB ────────────────────────────────────────────
async function getStudentProfile(userId) {
  if (!userId) return null;
  try {
    return await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
  } catch (e) {
    console.error(`[StudyPlanner] getStudentProfile failed:`, {
      message: e.message,
      code: e.code,
      meta: e.meta,
    });
    return null;
  }
}

// ─── Pull topic titles from workspace documents ────────────────────────────────
async function getTopicsFromDocuments(workspaceId) {
  try {
    const documents = await Document.where({ workspaceId });
    if (!documents.length) return [];
    return documents.map((doc) => {
      const metadata = safeJsonParse(doc.metadata, {});
      return metadata?.title ?? doc.docId;
    });
  } catch (e) {
    console.error(`[StudyPlanner] getTopicsFromDocuments failed:`, {
      message: e.message,
      code: e.code,
      meta: e.meta,
    });
    return [];
  }
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function parseDate(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function daysBetween(start, end) {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt({ subject, student, totalDays, studyHoursPerDay, examDate, daysOff }) {
  const audienceLines = student
    ? [
        `The student's name is ${student.name}.`,
        `Age: ${student.age}.`,
        `Academic level: ${student.academicLevel}.`,
        `Curriculum: ${student.curriculum}.`,
        `Grade/Year: ${student.grade}.`,
        `Tailor the study plan to the ${student.curriculum} curriculum expectations for ${student.grade}.`,
        `Keep the daily workload realistic for a ${student.age}-year-old.`,
      ]
    : ["Assume a general secondary school student."];

  const daysOffNote =
    daysOff && daysOff.length > 0
      ? `The student has requested days off on: ${daysOff.join(", ")}. Do NOT schedule study on these days.`
      : "No days off have been requested.";

  return [
    `You are an expert academic coach and study planner specialising in ${subject || "general academics"}.`,
    `Your task: create a personalised, realistic revision plan for the student.`,
    "",
    "STUDENT PROFILE:",
    ...audienceLines,
    "",
    "PLAN PARAMETERS:",
    `- Total days available for revision: ${totalDays} days.`,
    `- Study hours per day: ${studyHoursPerDay} hour${studyHoursPerDay !== 1 ? "s" : ""}.`,
    `- Exam date: ${examDate}.`,
    daysOffNote,
    "",
    "PLANNING PRINCIPLES:",
    "- Distribute topics evenly but give more time to harder or broader topics.",
    "- Include regular short review sessions (revisiting previously covered topics).",
    "- Schedule lighter revision in the final 1-2 days before the exam (review only, no new content).",
    "- Include at least one rest day per week if the plan is longer than 7 days.",
    "- Keep daily tasks specific and actionable — not just 'study topic X' but what to do with it.",
    "- Suggest a mix of activities: reading notes, practice questions, flashcards, past papers.",
    "",
    "OUTPUT FORMAT (follow this exactly):",
    "",
    "Start with a '## 📅 Study Plan Overview' section containing:",
    "- Exam date",
    "- Total study days",
    "- Total topics to cover",
    "- Daily study commitment",
    "- A brief strategy note (1-2 sentences on how topics are distributed)",
    "",
    "Then for each week, write a '## Week N — [date range]' heading followed by:",
    "- A short '### Weekly Focus' note (which topics/themes dominate this week)",
    "- Then each study day as '#### 📖 [Day Name], [Date]' with:",
    "  - **Topics:** what to cover",
    "  - **Activities:** specific tasks (e.g. 'Read notes on X', 'Do 10 practice questions on Y')",
    "  - **Duration:** how long each task should take",
    "  - **Goal:** what the student should be able to do by end of day",
    "",
    "For rest days or days off write: '#### 🛌 [Day Name], [Date] — Rest Day'",
    "",
    "End with a '## ✅ Final Week Tips' section with 4-6 bullet points of exam preparation advice.",
    "",
    "RULES:",
    "- Do NOT use tables under any circumstances.",
    "- Use bullet points and markdown headings only.",
    "- Be specific — name the actual topics in each day's plan.",
    "- Keep a positive, motivating tone throughout.",
    "- Do not add any preamble before the ## 📅 Study Plan Overview heading.",
  ]
    .filter((l) => l !== undefined && l !== null)
    .join("\n");
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
const StudyPlanner = {
  name: "study-planner",
  startupConfig: {
    params: {},
  },
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
            "Creates a personalised day-by-day study/revision plan for the student. " +
            "The plan includes a weekly summary, daily tasks with specific activities, " +
            "rest days, and final exam tips. " +
            "Topics can come from the student typing them, from documents already in the workspace, or both. " +
            "Automatically uses the student's curriculum, grade, and academic level — never ask for those. " +
            "Use this when the student says 'make me a study plan', 'create a revision schedule', " +
            "'help me plan for my exam', 'how should I revise', or similar.",

          examples: [
            {
              prompt: "Make me a study plan for my Biology exam on 15 June. Topics: cells, photosynthesis, respiration, genetics, ecology.",
              call: JSON.stringify({
                subject: "Biology",
                topics: ["Cells", "Photosynthesis", "Respiration", "Genetics", "Ecology"],
                exam_date: "2026-06-15",
                start_date: null,
                study_hours_per_day: 2,
                days_off: [],
                source: "typed",
              }),
            },
            {
              prompt: "Create a revision plan using my uploaded notes. Exam is on 20 June.",
              call: JSON.stringify({
                subject: null,
                topics: null,
                exam_date: "2026-06-20",
                start_date: null,
                study_hours_per_day: 2,
                days_off: [],
                source: "documents",
              }),
            },
            {
              prompt: "Plan my revision for Economics. I have notes uploaded and also want to add exchange rates. Exam 10 June, I can't study on weekends.",
              call: JSON.stringify({
                subject: "Economics",
                topics: ["Exchange Rates"],
                exam_date: "2026-06-10",
                start_date: null,
                study_hours_per_day: 2,
                days_off: ["Saturday", "Sunday"],
                source: "both",
              }),
            },
          ],

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              subject: {
                type: "string",
                "x-nullable": true,
                description:
                  "The subject the plan is for, e.g. 'Biology', 'Economics'. " +
                  "Infer from context if not stated.",
              },
              topics: {
                type: "array",
                items: { type: "string" },
                "x-nullable": true,
                description:
                  "List of topics to revise, e.g. ['Photosynthesis', 'Genetics']. " +
                  "Set to null if source is 'documents' — topics will be pulled from the workspace automatically. " +
                  "If source is 'both', include only the extra topics the student mentioned; " +
                  "document topics will be merged in automatically.",
              },
              exam_date: {
                type: "string",
                description:
                  "The exam date in YYYY-MM-DD format, e.g. '2026-06-15'. " +
                  "Parse natural language dates like 'June 15th' into this format.",
              },
              start_date: {
                type: "string",
                "x-nullable": true,
                description:
                  "When to start the plan in YYYY-MM-DD format. Defaults to today if not specified.",
              },
              study_hours_per_day: {
                type: "number",
                description:
                  "How many hours per day the student can study. Default to 2 if not mentioned.",
              },
              days_off: {
                type: "array",
                items: { type: "string" },
                description:
                  "Days the student cannot study, e.g. ['Saturday', 'Sunday'] or specific dates. " +
                  "Empty array if no days off requested.",
              },
              source: {
                type: "string",
                enum: ["typed", "documents", "both"],
                description:
                  "'typed' = topics come entirely from what the student typed. " +
                  "'documents' = topics are pulled automatically from uploaded documents in the workspace. " +
                  "'both' = merge document topics with any extra topics the student typed.",
              },
            },
            required: ["exam_date", "source"],
            additionalProperties: false,
          },

          handler: async function ({
            subject = null,
            topics = null,
            exam_date,
            start_date = null,
            study_hours_per_day = 2,
            days_off = [],
            source = "typed",
          }) {
            try {
              console.log(`[StudyPlanner] Handler entered — subject: ${subject}, exam_date: ${exam_date}, source: ${source}`);

              // ── Deduplication guard ─────────────────────────────────────────
              const callKey = { exam_date, source, subject };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                this.super.handlerProps.log(
                  `${this.name} exited early — duplicate call.`
                );
                return "A study plan has already been generated for this session.";
              }

              // ── Validate exam date ──────────────────────────────────────────
              const examDateObj = parseDate(exam_date);
              if (!examDateObj) {
                return "I couldn't parse the exam date. Please provide it in a clear format like '15 June 2026' or '2026-06-15'.";
              }

              const startDateObj = parseDate(start_date) ?? new Date();
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const effectiveStart = startDateObj < today ? today : startDateObj;

              if (examDateObj <= effectiveStart) {
                return "The exam date must be in the future. Please check the date and try again.";
              }

              const totalDays = daysBetween(effectiveStart, examDateObj);
              console.log(`[StudyPlanner] Dates resolved — start: ${effectiveStart.toISOString()}, exam: ${examDateObj.toISOString()}, totalDays: ${totalDays}`);

              // ── Auto-load student profile ───────────────────────────────────
              const userId = this.super.handlerProps.invocation?.user_id;
              const workspaceId = this.super.handlerProps.invocation?.workspace_id;
              console.log(`[StudyPlanner] Resolved userId: ${userId}, workspaceId: ${workspaceId}`);

              const student = await getStudentProfile(userId);

              if (student) {
                console.log(`[StudyPlanner] Student profile loaded — name: ${student.name}, grade: ${student.grade}, curriculum: ${student.curriculum}`);
                this.super.introspect(
                  `${this.caller}: Loaded profile for ${student.name} — ` +
                    `${student.grade}, ${student.curriculum}, ${student.academicLevel}.`
                );
              } else {
                console.log(`[StudyPlanner] No student profile found for userId: ${userId}`);
                this.super.introspect(
                  `${this.caller}: No student profile found — building general plan.`
                );
              }

              // ── Resolve topics ──────────────────────────────────────────────
              let finalTopics = Array.isArray(topics) ? [...topics] : [];
              console.log(`[StudyPlanner] Initial typed topics (${finalTopics.length}): ${JSON.stringify(finalTopics)}`);

              if (source === "documents" || source === "both") {
                this.super.introspect(
                  `${this.caller}: Pulling topics from workspace documents...`
                );
                const docTopics = await getTopicsFromDocuments(workspaceId);
                console.log(`[StudyPlanner] Document topics fetched (${docTopics.length}): ${JSON.stringify(docTopics)}`);

                if (docTopics.length > 0) {
                  this.super.introspect(
                    `${this.caller}: Found ${docTopics.length} document(s) in workspace.`
                  );
                  const existing = new Set(finalTopics.map((t) => t.toLowerCase()));
                  for (const dt of docTopics) {
                    if (!existing.has(dt.toLowerCase())) {
                      finalTopics.push(dt);
                      existing.add(dt.toLowerCase());
                    }
                  }
                } else {
                  this.super.introspect(
                    `${this.caller}: No documents found in workspace — using typed topics only.`
                  );
                }
              }

              console.log(`[StudyPlanner] Final topics (${finalTopics.length}): ${JSON.stringify(finalTopics)}`);

              if (finalTopics.length === 0) {
                return (
                  "I couldn't find any topics to plan around. " +
                  "Please list the topics you need to revise, or upload your notes to the workspace first."
                );
              }

              this.super.introspect(
                `${this.caller}: Building ${totalDays}-day plan for ${finalTopics.length} topic(s) — ` +
                  `exam on ${formatDate(examDateObj)}.`
              );

              // ── Build prompts ───────────────────────────────────────────────
              const systemPrompt = buildSystemPrompt({
                subject,
                student,
                totalDays,
                studyHoursPerDay: study_hours_per_day,
                examDate: formatDate(examDateObj),
                daysOff: days_off,
              });

              const userPromptParts = [
                `Please create a study plan with the following details:`,
                `- **Subject:** ${subject || "General revision"}`,
                `- **Topics to cover:** ${finalTopics.join(", ")}`,
                `- **Start date:** ${formatDate(effectiveStart)}`,
                `- **Exam date:** ${formatDate(examDateObj)}`,
                `- **Days available:** ${totalDays}`,
                `- **Study hours per day:** ${study_hours_per_day}`,
                days_off.length > 0
                  ? `- **Days off:** ${days_off.join(", ")}`
                  : "- **Days off:** None",
              ];

              if (student) {
                userPromptParts.push(
                  `- **Student:** ${student.name}, ${student.grade}, ${student.curriculum}, aged ${student.age}.`
                );
              }

              userPromptParts.push(
                "\nPlease build a detailed day-by-day plan with a weekly summary for each week, following your formatting instructions exactly."
              );

              const userPrompt = userPromptParts.join("\n");

              // ── Abort handler ───────────────────────────────────────────────
              this.super.onAbort(() => {
                this.super.handlerProps.log(
                  "Abort triggered — exiting study planner early."
                );
                this.controller.abort();
              });

              // ── Call LLM ────────────────────────────────────────────────────
              console.log(`[StudyPlanner] Calling LLM — provider: ${this.super.provider}, model: ${this.super.model}`);

              const llm = Provider.LangChainChatModel(this.super.provider, {
                temperature: 0.5,
                model: this.super.model,
                 maxTokens: 8194,
              });

              const result = await llm.invoke(
                [
                  new SystemMessage(systemPrompt),
                  new HumanMessage(userPrompt),
                ],
                { signal: this.controller.signal }
              );

              console.log(`[StudyPlanner] LLM responded — content type: ${typeof result?.content}`);

              const plan =
                typeof result?.content === "string"
                  ? result.content
                  : result?.content?.[0]?.text ?? null;

              if (!plan || plan.trim().length === 0) {
                console.error(`[StudyPlanner] LLM returned empty plan. Raw result:`, JSON.stringify(result));
                return "The study plan could not be generated. Please try again.";
              }

              console.log(`[StudyPlanner] Plan generated — length: ${plan.length} characters`);
              this.super.introspect(
                `${this.caller}: Study plan generated (${plan.length} characters).`
              );

              this.tracker.trackRun(this.name, callKey);
              this.super._studyPlanGenerated = true;

              this.super.functions?.delete("study-planner-elicit");
this.super.functions?.delete("study-planner");

              // ── Save to DB ──────────────────────────────────────────────────
              console.log(`[StudyPlanner] Attempting DB save — userId: ${userId}, workspaceId: ${workspaceId}`);

              try {
                const saved = await prisma.study_plans.create({
                  data: {
                    user_id: Number(userId),
                    workspace_id: Number(workspaceId),
                    subject: subject ?? null,
                    exam_date: examDateObj,
                    topics: finalTopics,
                    study_hours: study_hours_per_day,
                    days_off: days_off,
                    plan_content: plan,
                  },
                });
                console.log(`[StudyPlanner] DB save successful — record id: ${saved.id}`);
              } catch (dbError) {
                console.error(`[StudyPlanner] DB save failed:`, {
                  message: dbError.message,
                  code: dbError.code,       // Prisma error code e.g. P2002, P2003
                  meta: dbError.meta,       // Prisma error detail e.g. which field/constraint
                  stack: dbError.stack,     // exact line that threw
                });
                // Still return the plan — don't punish the student for a save failure
              }

              return plan;

            } catch (error) {
              console.error(`[StudyPlanner] Handler crashed:`, {
                message: error.message,
                code: error.code,
                meta: error.meta,
                stack: error.stack,
              });
              this.super.handlerProps.log(
                `study-planner raised an error. ${error.message}`
              );
              return `Let the user know this action was not successful. An error occurred while building the study plan: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { StudyPlanner };
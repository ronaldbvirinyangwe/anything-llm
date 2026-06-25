const { Deduplicator } = require("../utils/dedupe");
const { PrismaClient } = require("@prisma/client");
const Provider = require("../providers/ai-provider");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");

const prisma = new PrismaClient();

// ─── Fetch student profile from DB ────────────────────────────────────────────
async function getStudentProfile(userId) {
  if (!userId) return null;
  try {
    return await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
  } catch (e) {
    return null;
  }
}

// ─── Style presets ────────────────────────────────────────────────────────────
// Controls how the explanation is framed based on what the student needs.
const STYLE_PROMPTS = {
  simple:
    "Explain this as simply as possible, as if talking to someone who has never heard of it before. " +
    "Use everyday language, relatable analogies, and short sentences. Avoid jargon entirely.",
  standard:
    "Give a clear, well-structured explanation suitable for the student's academic level. " +
    "Define key terms, use one or two concrete examples, and keep it focused.",
  deep:
    "Give a thorough explanation that goes beyond the surface. " +
    "Cover the why and how, address common misconceptions, and include real-world applications. " +
    "Still keep the language appropriate for the student's level.",
};

// ─── Grade-banded calibration guidance ────────────────────────────────────────
// Mirrors the exam-level banding used in the default chat prompt, trimmed
// down to what matters for a single concept explanation.
function getCalibrationGuidance(grade, academicLevel) {
  const gradeNum = parseInt(grade) || 0;
  const level = (academicLevel || "").toLowerCase();

  if (level.includes("primary") || gradeNum <= 7) {
    return (
      "Use very simple, concrete language. Short sentences. No abstract definitions — " +
      "ground everything in something physical or visual the student can picture. " +
      "Avoid technical terms unless you immediately explain them in plain words."
    );
  }

  if (level.includes("a-level") || level.includes("alevel") || gradeNum >= 12) {
    return (
      "Use precise academic vocabulary confidently. The student can handle abstraction, " +
      "nuance, and multi-step reasoning. Don't over-simplify — that would be patronising at this level."
    );
  }

  return (
    "Use clear secondary-level vocabulary. Define technical terms when first introduced, " +
    "but don't avoid them. Balance concrete examples with some abstraction."
  );
}

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt({ concept, subject, style, student, extraContext }) {
  // Defaults so calibration is always concrete, even with no profile loaded.
  const grade = student?.grade || "9";
  const age = student?.age || "14";
  const curriculum = student?.curriculum || "general";
  const academicLevel = student?.academicLevel || "Secondary";
  const name = student?.name || null;

  const calibration = getCalibrationGuidance(grade, academicLevel);
  const styleGuide = STYLE_PROMPTS[style] ?? STYLE_PROMPTS.standard;
  const calibratedStyleGuide =
    `${styleGuide} This must land specifically for a ${age}-year-old in Grade ${grade} — ` +
    `adjust vocabulary and complexity accordingly, not just tone.`;

  const audienceLines = [
    name ? `The student's name is ${name}.` : null,
    `Age: ${age}. Grade/Year: ${grade}. Curriculum: ${curriculum}. Academic level: ${academicLevel}.`,
    "",
    `MANDATORY CALIBRATION: Every part of this explanation — vocabulary, sentence length, ` +
      `depth, and examples — must fit a ${age}-year-old in Grade ${grade} (${academicLevel}, ${curriculum}). ` +
      calibration,
    `Use examples and analogies drawn from things a Grade ${grade} student actually encounters day to day ` +
      `— school subjects at that level, age-appropriate hobbies, everyday local context (e.g. kombis, ` +
      `tuckshops, EcoCash, ZESA, markets) rather than generic Western references.`,
    `Do not default to a generic teen/adult register. If unsure, simplify rather than risk going over their head.`,
  ].filter(Boolean);

  return [
    `You are a patient, encouraging tutor specialising in ${subject || "general academics"}.`,
    `Your task: explain the concept "${concept}" clearly and engagingly to your student.`,
    "",
    "STUDENT PROFILE:",
    ...audienceLines,
    "",
    `EXPLANATION STYLE: ${calibratedStyleGuide}`,
    "",
    "FORMAT RULES (mandatory):",
    "- Write in a warm, conversational tone — like a tutor sitting next to the student.",
    "- Use markdown for structure: ## for section headings if needed, **bold** for key terms.",
    "- Use bullet points or numbered lists only when listing steps or multiple distinct points.",
    "- Use > blockquotes for the core definition of the concept.",
    "- Use analogies and real-life examples to make abstract ideas concrete.",
    "- Do NOT use tables under any circumstances.",
    "- End with a short '## In a Nutshell' section — one or two sentences that capture the essence.",
    "- Do NOT include preamble like 'Sure!' or 'Great question!'. Start directly with the explanation.",
    extraContext
      ? `\nADDITIONAL CONTEXT FROM STUDENT: ${extraContext}`
      : "",
  ]
    .filter((l) => l !== undefined && l !== null)
    .join("\n");
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
const explainConcept = {
  name: "explain-concept",
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
            "Explains a concept, term, or idea to the student in simple, age-appropriate language. " +
            "Automatically uses the student's grade, curriculum, and academic level — never ask for those. " +
            "Use this when the student asks 'what is X', 'explain X', 'I don't understand X', " +
            "'what does X mean', 'can you simplify X', or any variation of wanting something explained.",

          examples: [
            {
              prompt: "What is opportunity cost?",
              call: JSON.stringify({
                concept: "opportunity cost",
                subject: "Economics",
                style: "standard",
                extra_context: null,
              }),
            },
            {
              prompt: "I don't understand osmosis, can you explain it simply?",
              call: JSON.stringify({
                concept: "osmosis",
                subject: "Biology",
                style: "simple",
                extra_context: "The student finds it confusing.",
              }),
            },
            {
              prompt: "Explain the difference between speed and velocity in depth",
              call: JSON.stringify({
                concept: "speed vs velocity",
                subject: "Physics",
                style: "deep",
                extra_context: "Focus on the difference between scalar and vector quantities.",
              }),
            },
            {
              prompt: "What does amortisation mean?",
              call: JSON.stringify({
                concept: "amortisation",
                subject: "Accounting",
                style: "standard",
                extra_context: null,
              }),
            },
          ],

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              concept: {
                type: "string",
                description:
                  "The concept, term, or idea the student wants explained. " +
                  "e.g. 'photosynthesis', 'opportunity cost', 'the French Revolution'.",
              },
              subject: {
                type: "string",
                "x-nullable": true,
                description:
                  "The subject this concept belongs to, e.g. 'Biology', 'Economics'. " +
                  "Infer from context if not explicitly stated. Can be null if truly general.",
              },
              style: {
                type: "string",
                enum: ["simple", "standard", "deep"],
                description:
                  "'simple' = ELI5, plain language, no jargon. " +
                  "'standard' = clear and structured, appropriate for their level (default). " +
                  "'deep' = thorough, covers the why and how, addresses misconceptions.",
              },
              extra_context: {
                type: "string",
                "x-nullable": true,
                description:
                  "Any extra context from the student's message that should shape the explanation, " +
                  "e.g. 'they said they find it confusing' or 'they want it compared to X'.",
              },
            },
            required: ["concept"],
            additionalProperties: false,
          },

          handler: async function ({
            concept,
            subject = null,
            style = "standard",
            extra_context = null,
          }) {
            try {
              // ── Deduplication guard ─────────────────────────────────────────
              const callKey = { concept, subject, style };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                this.super.handlerProps.log(
                  `${this.name} exited early — duplicate call.`
                );
                return "This concept has already been explained in this session.";
              }

              // ── Auto-load student profile ───────────────────────────────────
              const userId = this.super.handlerProps.invocation?.user_id;
              const student = await getStudentProfile(userId);

              if (student) {
                this.super.introspect(
                  `${this.caller}: Loaded profile for ${student.name} — Grade ${student.grade}, ` +
                    `age ${student.age}, ${student.curriculum}, ${student.academicLevel}.`
                );
              } else {
                this.super.introspect(
                  `${this.caller}: No student profile found — using default calibration (Grade 9, age 14).`
                );
              }

              this.super.introspect(
                `${this.caller}: Explaining "${concept}"${subject ? ` (${subject})` : ""} using ${style} style.`
              );

              // ── Build prompts ───────────────────────────────────────────────
              const systemPrompt = buildSystemPrompt({
                concept,
                subject,
                style,
                student,
                extraContext: extra_context,
              });

              const userPrompt =
                `Please explain the concept: "${concept}"` +
                (subject ? ` in the context of ${subject}` : "") +
                (student
                  ? ` to a ${student.grade} ${student.curriculum} student aged ${student.age}.`
                  : ".");

              // ── Abort handler ───────────────────────────────────────────────
              this.super.onAbort(() => {
                this.super.handlerProps.log(
                  "Abort triggered — exiting concept explanation early."
                );
                this.controller.abort();
              });

              // ── Call LLM ────────────────────────────────────────────────────
              const llm = Provider.LangChainChatModel(this.super.provider, {
                temperature: 0.7,
                model: this.super.model,
              });

              const result = await llm.invoke(
                [
                  new SystemMessage(systemPrompt),
                  new HumanMessage(userPrompt),
                ],
                { signal: this.controller.signal }
              );

              const explanation =
                typeof result?.content === "string"
                  ? result.content
                  : result?.content?.[0]?.text ?? null;

              if (!explanation || explanation.trim().length === 0) {
                return "The explanation could not be generated. Please try again.";
              }

              this.super.introspect(
                `${this.caller}: Explanation generated (${explanation.length} characters).`
              );

              this.tracker.trackRun(this.name, callKey);

              const topicSummary =
                `Explained "${concept}"` +
                (subject ? ` in the context of ${subject}` : "") +
                (student
                  ? ` to a ${student.grade} ${student.curriculum} student aged ${student.age}.`
                  : ".") +
                ` Style: ${style}.` +
                (extra_context ? ` Additional context: ${extra_context}` : "");

              return JSON.stringify({
                explanation,
                _meta: {
                  request_followup: true,
                  topic_summary: topicSummary,
                  subject: subject ?? null,
                },
              });
            } catch (error) {
              this.super.handlerProps.log(
                `explain-concept raised an error. ${error.message}`
              );
              return `Let the user know this action was not successful. An error occurred while explaining the concept: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { explainConcept };
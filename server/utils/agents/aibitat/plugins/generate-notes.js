const { Deduplicator } = require("../utils/dedupe");
const { PrismaClient } = require("@prisma/client");
const Provider = require("../providers/ai-provider");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");

const prisma = new PrismaClient();

// ─── Depth presets ─────────────────────────────────────────────────────────────
const DEPTH_PROMPTS = {
  brief:
    "Provide a concise overview with key points only. Keep it short and scannable.",
  standard:
    "Provide well-structured notes covering definitions, key concepts, examples, and a short summary.",
  detailed:
    "Provide comprehensive notes with definitions, in-depth explanations, worked examples, common misconceptions, and a detailed summary.",
};

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

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt({ subject, topic, depth, student, extraInstructions }) {
  const depthGuide = DEPTH_PROMPTS[depth] ?? DEPTH_PROMPTS.standard;

  const audienceLines = student
    ? [
        `The student's name is ${student.name}.`,
        `Age: ${student.age}.`,
        `Academic level: ${student.academicLevel}.`,
        `Curriculum: ${student.curriculum}.`,
        `Grade/Year: ${student.grade}.`,
        `Tailor the vocabulary, depth, and examples exactly to this profile.`,
        `Align all content with the ${student.curriculum} curriculum standards for ${student.grade}.`,
      ]
    : ["Assume a general academic audience."];

  return [
    `You are an expert educator and note-writer specialising in ${subject}.`,
    `Your task: generate high-quality study notes on the topic "${topic}" within the subject "${subject}".`,
    "",
    "STUDENT PROFILE:",
    ...audienceLines,
    "",
    `DEPTH: ${depthGuide}`,
    "",
    "FORMAT RULES (mandatory):",
    "- Use markdown: # for the main title, ## for sections, ### for sub-sections.",
    "- Use **bold** for key terms the first time they appear.",
    "- Use bullet lists (- item) for lists of facts or steps.",
    "- Use numbered lists (1. item) for sequential processes.",
    "- Use > blockquotes for important definitions.",
    "- Use `inline code` for formulas, symbols, or technical notation.",
    "- Include a '## Key Takeaways' section at the end with 3–7 bullet points.",
    "- Include a '## Quick Revision Questions' section with 3–5 questions (no answers — for self-testing).",
    "- Do NOT use tables under any circumstances. Present all information as bullet points, numbered lists, or prose instead.",
    "- Do NOT include any preamble like 'Sure, here are your notes'. Start directly with the # title.",
    extraInstructions
      ? `\nADDITIONAL INSTRUCTIONS FROM STUDENT: ${extraInstructions}`
      : "",
  ]
    .filter((l) => l !== undefined && l !== null)
    .join("\n");
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
const generateNotes = {
  name: "generate-notes",
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
            "Generates structured, markdown-formatted study notes on a specific subject and topic. " +
            "Automatically uses the student's enrolled grade, curriculum, and academic level — " +
            "never ask the student for those details. " +
            "Can optionally save the notes as a .md, .pdf, or .docx file. " +
            "Use this when the user asks to 'generate notes', 'make notes on', 'create study notes', or similar.",

          examples: [
            {
              prompt: "Generate notes on photosynthesis",
              call: JSON.stringify({
                subject: "Biology",
                topic: "Photosynthesis",
                depth: "standard",
                save_as_file: false,
                filename: null,
                extra_instructions: null,
              }),
            },
            {
              prompt: "Make detailed notes on organic reaction mechanisms and save as a PDF",
              call: JSON.stringify({
                subject: "Chemistry",
                topic: "Organic Reaction Mechanisms",
                depth: "detailed",
                save_as_file: true,
                filename: "organic-reaction-mechanisms.pdf",
                extra_instructions: null,
              }),
            },
            {
              prompt: "Brief notes on the causes of World War 1, focus on the MAIN acronym",
              call: JSON.stringify({
                subject: "History",
                topic: "Causes of World War 1",
                depth: "brief",
                save_as_file: false,
                filename: null,
                extra_instructions:
                  "Focus on the MAIN acronym: Militarism, Alliances, Imperialism, Nationalism.",
              }),
            },
          ],

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              subject: {
                type: "string",
                description:
                  "The academic subject the notes belong to, e.g. 'Biology', 'Mathematics', 'History'.",
              },
              topic: {
                type: "string",
                description:
                  "The specific topic within the subject, e.g. 'Photosynthesis', 'Quadratic Equations'.",
              },
              depth: {
                type: "string",
                enum: ["brief", "standard", "detailed"],
                description:
                  "'brief' = key points only. " +
                  "'standard' = balanced notes with examples (default). " +
                  "'detailed' = comprehensive in-depth coverage.",
              },
              save_as_file: {
                type: "boolean",
                description:
                  "If true, the notes will be sent as a downloadable file. Requires 'filename' to be set.",
              },
              filename: {
                type: "string",
                "x-nullable": true,
                description:
                  "File name with extension when save_as_file is true. Supported: .md, .txt, .pdf, .docx",
              },
              extra_instructions: {
                type: "string",
                "x-nullable": true,
                description:
                  "Any extra focus or formatting instructions from the student, " +
                  "e.g. 'focus on exam technique' or 'include worked examples'.",
              },
            },
            required: ["subject", "topic"],
            additionalProperties: false,
          },

          handler: async function ({
            subject,
            topic,
            depth = "standard",
            save_as_file = false,
            filename = null,
            extra_instructions = null,
          }) {
            try {
              // ── Deduplication guard ─────────────────────────────────────────
              const callKey = { subject, topic, depth };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                this.super.handlerProps.log(
                  `${this.name} exited early — duplicate call.`
                );
                return "Notes have already been generated for this request.";
              }

              // ── Auto-load student profile ───────────────────────────────────
              const userId = this.super.handlerProps.invocation?.user_id;
              const student = await getStudentProfile(userId);

              if (student) {
                this.super.introspect(
                  `${this.caller}: Loaded profile for ${student.name} — ` +
                    `${student.grade}, ${student.curriculum}, ${student.academicLevel}.`
                );
              } else {
                this.super.introspect(
                  `${this.caller}: No student profile found for user ${userId} — generating general notes.`
                );
              }

              this.super.introspect(
                `${this.caller}: Generating ${depth} notes on "${topic}" (${subject}).`
              );

              // ── Build prompts ───────────────────────────────────────────────
              const systemPrompt = buildSystemPrompt({
                subject,
                topic,
                depth,
                student,
                extraInstructions: extra_instructions,
              });

              const userPrompt =
                `Generate ${depth} study notes on the topic: "${topic}" for the subject: "${subject}".` +
                (student
                  ? ` Tailor them specifically for a ${student.grade} ${student.curriculum} student aged ${student.age}.`
                  : "");

              // ── Abort handler ───────────────────────────────────────────────
              this.super.onAbort(() => {
                this.super.handlerProps.log(
                  "Abort triggered — exiting notes generation early."
                );
                this.controller.abort();
              });

              // ── Call LLM via Provider.LangChainChatModel ────────────────────
              // This is the same method used by summarize.js internally and
              // correctly handles all providers including generic-openai.
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

              const notes =
                typeof result?.content === "string"
                  ? result.content
                  : result?.content?.[0]?.text ?? null;

              if (!notes || notes.trim().length === 0) {
                return "The notes could not be generated. Please try again.";
              }

              this.super.introspect(
                `${this.caller}: Notes generated (${notes.length} characters).`
              );

              this.tracker.trackRun(this.name, callKey);

              // ── Optionally save as file ─────────────────────────────────────
              if (save_as_file && filename) {
                const ext = filename.split(".").pop().toLowerCase();
                const supported = ["md", "txt", "pdf", "docx"];

                if (!supported.includes(ext)) {
                  this.super.introspect(
                    `${this.caller}: Unsupported extension ".${ext}" — skipping file save.`
                  );
                } else {
                  this.super.introspect(
                    `${this.caller}: Saving notes as "${filename}"...`
                  );

                  const savePlugin =
                    this.super.pluginRegistry?.get("save-file-to-browser");

                  if (savePlugin) {
                    await savePlugin.handler({
                      file_content: notes,
                      filename,
                    });
                  } else {
                    this.super.socket.send("notesFileReady", {
                      filename,
                      content: notes,
                    });
                    this.super.handlerProps.log(
                      `${this.name}: save-file-to-browser not loaded — sent raw notesFileReady socket event instead.`
                    );
                  }
                }
              }

              // ── Return notes into the conversation ──────────────────────────
              return notes;
            } catch (error) {
              this.super.handlerProps.log(
                `generate-notes raised an error. ${error.message}`
              );
              return `Let the user know this action was not successful. An error occurred while generating notes: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { generateNotes };
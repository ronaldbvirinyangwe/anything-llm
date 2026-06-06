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

// ─── System prompt builder ────────────────────────────────────────────────────
function buildSystemPrompt({ subject, student, maxMarks, source }) {
  const audienceLines = student
    ? [
        `The student's name is ${student.name}.`,
        `Age: ${student.age}.`,
        `Academic level: ${student.academicLevel}.`,
        `Curriculum: ${student.curriculum}.`,
        `Grade/Year: ${student.grade}.`,
        `Mark the answer according to ${student.curriculum} curriculum standards for ${student.grade}.`,
        `Use encouraging language appropriate for a ${student.age}-year-old.`,
      ]
    : ["Apply general secondary school marking standards."];

  const marksGuide = maxMarks
    ? `The question is worth ${maxMarks} mark${maxMarks > 1 ? "s" : ""}. Award marks accordingly.`
    : "Infer the appropriate marks available from the complexity of the question.";

  // When content comes from the vision pipeline, the raw OCR dump contains
  // both questions and answers mixed together — instruct the LLM to untangle them.
  const documentGuide =
    source === "document"
      ? [
          "",
          "DOCUMENT SOURCE INSTRUCTIONS:",
          "The content below was extracted by an OCR vision model from a photo of the student's answer paper.",
          "The raw text may contain: question numbers, question text, the student's handwritten answers, and possibly instructions.",
          "Your job is to:",
          "1. Identify and separate each question from its corresponding student answer.",
          "2. Mark each question-answer pair individually.",
          "3. If multiple questions are present, mark each one and provide an overall total at the end.",
          "4. If the question text is unclear from the OCR, make a reasonable inference and state your assumption.",
          "5. Ignore any printed instructions or irrelevant text not part of the student's answers.",
        ]
      : [];

  return [
    `You are an experienced, encouraging examiner and tutor specialising in ${subject || "general academics"}.`,
    `Your task: mark the student's answer fairly and give constructive, curriculum-aligned feedback.`,
    "",
    "STUDENT PROFILE:",
    ...audienceLines,
    "",
    `MARKING GUIDANCE: ${marksGuide}`,
    ...documentGuide,
    "",
    "FEEDBACK STRUCTURE (follow this exactly, in this order):",
    "",
    "## ✅ Verdict",
    "- State clearly whether the answer is correct, partially correct, or incorrect.",
    "- Award marks in bold: e.g. **3 / 5 marks**",
    "- If multiple questions, give a per-question breakdown then an overall total.",
    "",
    "## 📋 What Was Good",
    "- List specifically what the student got right. Be encouraging and precise.",
    "- If nothing was correct, acknowledge the attempt kindly.",
    "",
    "## ⚠️ What Was Missing or Wrong",
    "- List specific points that were missing, incorrect, or poorly explained.",
    "- Reference the marking criteria or curriculum expectations where relevant.",
    "",
    "## 💡 How to Improve",
    "- Give clear, actionable advice on how to write a better answer.",
    "- Mention key terms, concepts, or structure the student should have included.",
    "",
    "## 📝 Model Answer",
    "- Write a concise model answer that would achieve full marks.",
    "- Match the style and length expected at the student's curriculum level.",
    "- If multiple questions, provide a model answer for each.",
    "",
    "RULES:",
    "- Do NOT use tables under any circumstances.",
    "- Use bullet points for lists within each section.",
    "- Be honest but kind — this is a student, not an exam board.",
    "- Do not add any preamble before the ## ✅ Verdict heading.",
  ]
    .filter((l) => l !== undefined && l !== null)
    .join("\n");
}

// ─── Plugin ───────────────────────────────────────────────────────────────────
const checkMyAnswer = {
  name: "check-my-answer",
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
            "Marks a student's answer to a question and gives structured exam-style feedback. " +
            "Feedback includes: verdict (correct/incorrect), marks awarded, what was good, " +
            "what was missing or wrong, how to improve, and a model answer. " +
            "Automatically uses the student's curriculum and grade for marking standards — never ask for those. " +
            "Works in three ways: " +
            "(1) Student types the question and answer directly. " +
            "(2) Question and answer come from earlier in the conversation e.g. from a quiz. " +
            "(3) Student uploads a photo of their answer paper — the vision model extracts the text " +
            "and passes it here for marking. In this case the raw OCR text may contain multiple " +
            "questions and answers mixed together — handle and mark each one individually. " +
            "Use this when the student says 'check my answer', 'mark this', 'is this correct', " +
            "'how did I do', submits an answer to a question, or uploads a photo of their work.",

          examples: [
            {
              prompt: "Check my answer: Question: What is opportunity cost? My answer: It is the cost of something.",
              call: JSON.stringify({
                question: "What is opportunity cost?",
                student_answer: "It is the cost of something.",
                subject: "Economics",
                max_marks: 2,
                source: "typed",
              }),
            },
            {
              prompt: "Is this right? The mitochondria produces energy for the cell through respiration.",
              call: JSON.stringify({
                question: null,
                student_answer: "The mitochondria produces energy for the cell through respiration.",
                subject: "Biology",
                max_marks: null,
                source: "typed",
              }),
            },
            {
              prompt: "Mark my answer to the quiz question about supply and demand.",
              call: JSON.stringify({
                question: "[question from earlier in the conversation]",
                student_answer: "[student answer from earlier in the conversation]",
                subject: "Economics",
                max_marks: null,
                source: "chat",
              }),
            },
            {
              prompt: "[Student uploads photo of answer paper — vision model returns OCR text]",
              call: JSON.stringify({
                question: null,
                student_answer: "[full OCR text extracted from the image by the vision model — may contain multiple questions and answers]",
                subject: "Biology",
                max_marks: null,
                source: "document",
              }),
            },
          ],

          parameters: {
            $schema: "http://json-schema.org/draft-07/schema#",
            type: "object",
            properties: {
              question: {
                type: "string",
                "x-nullable": true,
                description:
                  "The question the student is answering. " +
                  "Set to null when source is 'document' — the question text will be parsed " +
                  "from the OCR content automatically. " +
                  "Also null if the question is unclear or embedded in the student's message.",
              },
              student_answer: {
                type: "string",
                description:
                  "The student's answer to be marked. " +
                  "When source is 'document', pass the full extractedText from the vision model here — " +
                  "it may contain both question text and answer text mixed together, which is expected. " +
                  "When source is 'chat', extract the answer from the conversation history. " +
                  "When source is 'typed', this is what the student wrote directly.",
              },
              subject: {
                type: "string",
                "x-nullable": true,
                description:
                  "The subject the question belongs to, e.g. 'Biology', 'Economics'. " +
                  "Infer from context if not explicitly stated.",
              },
              max_marks: {
                type: "number",
                "x-nullable": true,
                description:
                  "The total marks available. " +
                  "For document source, leave null — marks will be inferred per question. " +
                  "For typed/chat source, include if the student mentioned it.",
              },
              source: {
                type: "string",
                enum: ["typed", "chat", "document"],
                description:
                  "'typed' = student typed the question and answer in their message. " +
                  "'chat' = question or answer comes from earlier in the conversation. " +
                  "'document' = raw OCR text extracted from an uploaded photo or file by the vision model. " +
                  "The OCR text may contain multiple questions and answers — mark each individually.",
              },
            },
            required: ["student_answer", "source"],
            additionalProperties: false,
          },

          handler: async function ({
            question = null,
            student_answer,
            subject = null,
            max_marks = null,
            source = "typed",
          }) {
            try {
              // ── Deduplication guard ─────────────────────────────────────────
              const callKey = {
                question,
                student_answer: student_answer.slice(0, 120),
                source,
              };
              if (this.tracker.isDuplicate(this.name, callKey)) {
                this.super.handlerProps.log(
                  `${this.name} exited early — duplicate call.`
                );
                return "This answer has already been marked in this session.";
              }

              // ── Validate ────────────────────────────────────────────────────
              if (!student_answer || student_answer.trim().length === 0) {
                return "No answer was provided to mark. Please share your answer and I will check it for you.";
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
                  `${this.caller}: No student profile found — marking at general level.`
                );
              }

              // ── Source-aware introspect message ─────────────────────────────
              const sourceLabel = {
                document: "uploaded image/document (OCR text)",
                chat: "conversation history",
                typed: "typed input",
              }[source] ?? "typed input";

              this.super.introspect(
                `${this.caller}: Marking answer from ${sourceLabel}` +
                  `${subject ? ` — ${subject}` : ""}` +
                  `${max_marks ? ` (${max_marks} marks)` : ""}.`
              );

              if (source === "document") {
                this.super.introspect(
                  `${this.caller}: OCR content received (${student_answer.length} chars) — will parse questions and answers from raw text.`
                );
              }

              // ── Build prompts ───────────────────────────────────────────────
              const systemPrompt = buildSystemPrompt({
                subject,
                student,
                maxMarks: max_marks,
                source,
              });

              const userPromptParts = [];

              if (source === "document") {
                userPromptParts.push(
                  "The following text was extracted by an OCR vision model from a photo of the student's answer paper. " +
                  "It contains the raw text of the paper including question numbers, question text, and the student's handwritten answers. " +
                  "Parse out each question and its corresponding answer, then mark each one individually."
                );
                userPromptParts.push(`**Raw OCR Text from Answer Paper:**\n${student_answer}`);
              } else if (source === "chat") {
                userPromptParts.push(
                  "The following question and answer are from earlier in the conversation."
                );
                if (question) userPromptParts.push(`**Question:** ${question}`);
                userPromptParts.push(`**Student's Answer:** ${student_answer}`);
              } else {
                // typed
                if (question) {
                  userPromptParts.push(`**Question:** ${question}`);
                } else {
                  userPromptParts.push(
                    "No explicit question was provided — infer the likely question from the answer and mark accordingly."
                  );
                }
                userPromptParts.push(`**Student's Answer:** ${student_answer}`);
              }

              if (max_marks && source !== "document") {
                userPromptParts.push(`**Marks available:** ${max_marks}`);
              }

              if (student) {
                userPromptParts.push(
                  `**Student:** ${student.name}, ${student.grade}, ${student.curriculum}, aged ${student.age}.`
                );
              }

              userPromptParts.push(
                "Please mark this answer and provide structured feedback following the format in your instructions."
              );

              const userPrompt = userPromptParts.join("\n\n");

              // ── Abort handler ───────────────────────────────────────────────
              this.super.onAbort(() => {
                this.super.handlerProps.log(
                  "Abort triggered — exiting answer marking early."
                );
                this.controller.abort();
              });

              // ── Call LLM ────────────────────────────────────────────────────
              // Lower temperature for consistent, repeatable marking.
              const llm = Provider.LangChainChatModel(this.super.provider, {
                temperature: 0.3,
                model: this.super.model,
              });

              const result = await llm.invoke(
                [
                  new SystemMessage(systemPrompt),
                  new HumanMessage(userPrompt),
                ],
                { signal: this.controller.signal }
              );

              const feedback =
                typeof result?.content === "string"
                  ? result.content
                  : result?.content?.[0]?.text ?? null;

              if (!feedback || feedback.trim().length === 0) {
                return "The feedback could not be generated. Please try again.";
              }

              this.super.introspect(
                `${this.caller}: Feedback generated (${feedback.length} characters).`
              );

              this.tracker.trackRun(this.name, callKey);

              return feedback;
            } catch (error) {
              this.super.handlerProps.log(
                `check-my-answer raised an error. ${error.message}`
              );
              return `Let the user know this action was not successful. An error occurred while marking the answer: ${error.message}`;
            }
          },
        });
      },
    };
  },
};

module.exports = { checkMyAnswer };
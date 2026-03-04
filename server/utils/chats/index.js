const { v4: uuidv4 } = require("uuid");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { resetMemory } = require("./commands/reset");
const { convertToPromptHistory } = require("../helpers/chat/responses");
const { SlashCommandPresets } = require("../../models/slashCommandsPresets");
const { SystemPromptVariables } = require("../../models/systemPromptVariables");
const prisma = require("../prisma");

const VALID_COMMANDS = {
  "/reset": resetMemory,
};

async function grepCommand(message, user = null) {
  const userPresets = await SlashCommandPresets.getUserPresets(user?.id);
  const availableCommands = Object.keys(VALID_COMMANDS);

  // Check if the message starts with any built-in command
  for (let i = 0; i < availableCommands.length; i++) {
    const cmd = availableCommands[i];
    const re = new RegExp(`^(${cmd})`, "i");
    if (re.test(message)) {
      return cmd;
    }
  }

  // Replace all preset commands with their corresponding prompts
  // Allows multiple commands in one message
  let updatedMessage = message;
  for (const preset of userPresets) {
    const regex = new RegExp(
      `(?:\\b\\s|^)(${preset.command})(?:\\b\\s|$)`,
      "g"
    );
    updatedMessage = updatedMessage.replace(regex, preset.prompt);
  }

  return updatedMessage;
}

/**
 * @description This function will do recursive replacement of all slash commands with their corresponding prompts.
 * @notice This function is used for API calls and is not user-scoped. THIS FUNCTION DOES NOT SUPPORT PRESET COMMANDS.
 * @returns {Promise<string>}
 */
async function grepAllSlashCommands(message) {
  const allPresets = await SlashCommandPresets.where({});

  // Replace all preset commands with their corresponding prompts
  // Allows multiple commands in one message
  let updatedMessage = message;
  for (const preset of allPresets) {
    const regex = new RegExp(
      `(?:\\b\\s|^)(${preset.command})(?:\\b\\s|$)`,
      "g"
    );
    updatedMessage = updatedMessage.replace(regex, preset.prompt);
  }

  return updatedMessage;
}

async function recentChatHistory({
  user = null,
  workspace,
  thread = null,
  messageLimit = 20,
  apiSessionId = null,
}) {
  const rawHistory = (
    await WorkspaceChats.where(
      {
        workspaceId: workspace.id,
        user_id: user?.id || null,
        thread_id: thread?.id || null,
        api_session_id: apiSessionId || null,
        include: true,
      },
      messageLimit,
      { id: "desc" }
    )
  ).reverse();
  return { rawHistory, chatHistory: convertToPromptHistory(rawHistory) };
}

/**
 * Returns exam-level specific teaching guidance based on the student's academic level.
 */
function getExamLevelGuidance(academicLevel, grade, curriculum) {
  const level = (academicLevel || "").toLowerCase();
  const gradeNum = parseInt(grade) || 0;

  if (level.includes("primary") || gradeNum <= 7) {
    return `### Exam Level Context: Primary (Grade ${grade})
This student is at primary school level${gradeNum === 7 ? ", preparing for the ZIMSEC Grade 7 National Examination" : ""}.
- Use simple, clear language with short sentences.
- Focus on core concepts — avoid unnecessary technical jargon.
- Reinforce basic numeracy and literacy skills where relevant.
- Questions and explanations should be concrete, not abstract.
${gradeNum === 7 ? "- The Grade 7 national exam tests: English, Mathematics, General Paper, and Integrated Science. Prioritise exam technique: reading carefully, showing working in Maths, and writing full sentences in English." : ""}`;
  }

  if (level.includes("a-level") || level.includes("alevel") || gradeNum >= 12) {
    return `### Exam Level Context: A-Level (${curriculum})
This student is at A-Level, preparing for advanced ${curriculum} examinations.
- Use precise academic language and subject-specific terminology confidently.
- Explanations must be thorough and analytical — surface-level answers are not sufficient at this level.
- For essays and extended responses: guide the student on structure (introduction, argument, evidence, conclusion).
- Practise higher-order thinking: analysis, evaluation, and synthesis — not just recall.
- Marking at A-Level is strict — help the student understand mark scheme language and what examiners are looking for.
- Where relevant, reference A-Level syllabus topics and past paper question styles.`;
  }

  // Default: O-Level / Junior Secondary (Forms 1–4, Grades 8–11)
  const isExamYear = gradeNum === 10 || gradeNum === 11 || level.includes("o-level");
  return `### Exam Level Context: O-Level / Secondary (${curriculum})
This student is at secondary school level${isExamYear ? ", in an O-Level examination year" : ""}.
- Use clear explanations with appropriate secondary-level vocabulary.
- Teach students to recognise and respond to command words: *define*, *explain*, *describe*, *calculate*, *compare*, *evaluate*.
- For structured questions, model well-organised answers that would earn full marks on a mark scheme.
- Show working clearly in all Maths and Science calculations — method marks matter.
${isExamYear ? `- This student is likely sitting ${curriculum} O-Level examinations. Emphasise exam technique: time management, reading questions carefully, and answering what is actually asked.\n- Refer to ${curriculum} O-Level syllabus content and past paper patterns where helpful.` : ""}`;
}

/**
 * Returns the base prompt for the chat. This method will also do variable
 * substitution on the prompt if there are any defined variables in the prompt.
 * @param {Object|null} workspace - the workspace object
 * @param {Object|null} user - the user object
 * @returns {Promise<string>} - the base prompt
 */
async function chatPrompt(workspace, user = null) {
  // Fetch the student profile linked to this user so we can personalise the prompt
  let studentProfile = null;
  if (user?.id) {
    try {
      studentProfile = await prisma.students.findFirst({
        where: { user_id: Number(user.id) },
        select: { name: true, grade: true, age: true, curriculum: true, academicLevel: true },
      });
    } catch (_) {}
  }

  const name = studentProfile?.name || user?.username || "learner";
  const grade = studentProfile?.grade || "7";
  const age = studentProfile?.age || "13";
  const curriculum = studentProfile?.curriculum || "ZIMSEC";
  const academicLevel = studentProfile?.academicLevel || "Secondary";

  // Build exam-level specific guidance based on the student's actual level
  const examLevelGuidance = getExamLevelGuidance(academicLevel, grade, curriculum);

  const basePrompt =
    workspace?.openAiPrompt ??
`You are **Chikoro AI**, an intelligent, culturally-aware personalised tutor designed for Zimbabwean learners.

### Student Profile
- Name: ${name}
- Curriculum: ${curriculum}
- Academic Level: ${academicLevel}
- Grade: ${grade}
- Age: ${age} years

### Core Role
Your role is to teach clearly, patiently, and interactively — like a supportive Zimbabwean teacher helping a learner after school. Always keep the student's grade and age in mind: your vocabulary, depth of explanation, and examples must be appropriate for a Grade ${grade} student (${age} years old).

${examLevelGuidance}

### Teaching Guidelines
1. Explain concepts **step-by-step**, starting from simple ideas and building up gradually.
2. Encourage **reasoning and understanding**, not memorisation. Ask guiding questions when helpful.
3. Use **local Zimbabwean examples** where possible (kombis, maize farming, tuckshops, markets like Mbare or Sakubva, daily routines).
4. On the very first message of a session, open with a **short warm greeting in Shona or Ndebele**. Do not repeat greetings in follow-up messages.
5. Use vocabulary and sentence complexity appropriate for Grade ${grade} (${age} years old). Do not use university-level language for primary students or oversimplify for A-Level students.
6. Adapt dynamically based on learner responses:
   - If they struggle, simplify and try a different example.
   - If they clearly understand, gently increase depth.
7. If the learner asks something off-topic from schoolwork entirely (not just across subjects), politely acknowledge and guide them back.
8. Provide **positive reinforcement** — build confidence, especially after mistakes.
9. Only suggest practice questions when the student requests them or has just finished a full topic.
10. Keep responses **concise and mobile-friendly** — avoid walls of text.

### Safety & Accuracy
- No harmful, inappropriate, or age-inappropriate content.
- State facts confidently; if uncertain about current data, say so and offer to search.

### Tool Usage
- When you need to create a quiz, generate flashcards, search the web, or get the date/time — use the available tools directly.
- **Never** output raw JSON or tool call objects in your response text.
- Respond naturally in conversation; the system handles tool execution automatically.

### Using Quiz History
When the student's past quiz results are provided in context:
- Use them silently to calibrate your explanations — don't recite the data back.
- Be extra thorough on topics where they scored below 60%.
- Acknowledge improvement where scores have gone up.
`;

  return await SystemPromptVariables.expandSystemPromptVariables(
    basePrompt,
    user?.id,
    workspace?.id
  );
}

// We use this util function to deduplicate sources from similarity searching
// if the document is already pinned.
// Eg: You pin a csv, if we RAG + full-text that you will get the same data
// points both in the full-text and possibly from RAG - result in bad results
// even if the LLM was not even going to hallucinate.
function sourceIdentifier(sourceDocument) {
  if (!sourceDocument?.title || !sourceDocument?.published) return uuidv4();
  return `title:${sourceDocument.title}-timestamp:${sourceDocument.published}`;
}

module.exports = {
  sourceIdentifier,
  recentChatHistory,
  chatPrompt,
  grepCommand,
  grepAllSlashCommands,
  VALID_COMMANDS,
};

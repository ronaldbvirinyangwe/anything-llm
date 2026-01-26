const { v4: uuidv4 } = require("uuid");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { resetMemory } = require("./commands/reset");
const { convertToPromptHistory } = require("../helpers/chat/responses");
const { SlashCommandPresets } = require("../../models/slashCommandsPresets");
const { SystemPromptVariables } = require("../../models/systemPromptVariables");

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
 * Returns the base prompt for the chat. This method will also do variable
 * substitution on the prompt if there are any defined variables in the prompt.
 * @param {Object|null} workspace - the workspace object
 * @param {Object|null} user - the user object
 * @returns {Promise<string>} - the base prompt
 */
async function chatPrompt(workspace, user = null) {
  const basePrompt =
    workspace?.openAiPrompt ??
`
You are **Chikoro AI**, an intelligent, culturally-aware personalised tutor designed for Zimbabwean learners.

### Teaching Context
- Curriculum: \${curriculum}
- Subject: \${subject}
- Grade Level: \${grade}
- Student Age: \${age} years

### Core Role
Your role is to teach the current topic clearly, patiently, and interactively, just like a supportive Zimbabwean teacher helping a learner after school.

### Teaching Guidelines
1. Explain concepts **step-by-step**, starting from simple ideas and building up gradually.
2. Encourage **reasoning and understanding**, not memorisation. Ask guiding questions when helpful.
3. Use **local Zimbabwean examples** where possible:
   - kombis, maize farming, tuckshops, markets (Mbare, Sakubva), schools, households, daily routines.
4. Begin each response with a **short warm greeting** mixing **Shona and English**  
5. Use **age-appropriate language** and explanations suitable for the given grade level.
6. Adapt your explanations based on learner responses:
   - If the learner struggles, simplify and give another example.
   - If the learner performs well, gently increase difficulty.
7. If the learner asks an **off-topic question**, respond politely and guide them back to the subject.
8. Provide **positive reinforcement** and encouragement to build learner confidence.
9. Suggest **additional practice questions** or activities at the end of explanations to reinforce learning.
10. Maintain a **warm, patient, and respectful tone** throughout the interaction.


### Safety & Accuracy
- Do not provide harmful, inappropriate, or age-inappropriate content.
- When stating facts, formulas, or definitions, **cite trusted sources** (e.g. ZIMSEC syllabus, textbooks, or reputable educational websites).
- If unsure about an answer, say so and explain carefully.

### Tone & Style
- Warm, patient, encouraging, and respectful.
- Sound like a real local teacher, not a robot.
- Avoid overly complex language unless required by the grade level.


🧠 **Important: Tool Instructions**
If the user asks to generate a quiz, test,exam  or flashcards — DO NOT create it directly.
Instead, respond **only** with a JSON tool call like this:


\`\`\`json
{
  "tool_call": "quiz_create",
  "parameters": {
    "subject": "<subject>",
    "grade": "<grade>",
    "userMessage": "<userMessage>",
    "numQuestions": 5,
    "difficulty": "medium"
  }
}
{
  "tool_call": "flashcard_create",
  "parameters": {
    "subject": "<subject>",
    "userMessage": "<userMessage>",
    "grade": "<grade>",
    "numCards": 5,
    "difficulty": "medium"
  }
}
 {
  "tool_call": "web_search_tool",
  "parameters": {
      "query": "",  
    "provider": "duckduckgo",
    "numResults": 10 
  }
}
\`\`\`

Otherwise, answer normally in your bilingual teaching style.
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

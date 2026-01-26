// Helpers that convert workspace chats to some supported format
// for external use by the user.

const { WorkspaceChats } = require("../../../models/workspaceChats");
const { EmbedChats } = require("../../../models/embedChats");
const { safeJsonParse } = require("../../http");

async function convertToCSV(preparedData) {
  const headers = new Set(["id", "workspace", "prompt", "response", "sent_at"]);
  preparedData.forEach((item) =>
    Object.keys(item).forEach((key) => headers.add(key))
  );

  const rows = [Array.from(headers).join(",")];

  for (const item of preparedData) {
    const record = Array.from(headers)
      .map((header) => {
        const value = item[header] ?? "";
        return escapeCsv(String(value));
      })
      .join(",");
    rows.push(record);
  }
  return rows.join("\n");
}

async function convertToJSON(preparedData) {
  return JSON.stringify(preparedData, null, 4);
}

// ref: https://raw.githubusercontent.com/gururise/AlpacaDataCleaned/main/alpaca_data.json
async function convertToJSONAlpaca(preparedData) {
  return JSON.stringify(preparedData, null, 4);
}

// You can validate JSONL outputs on https://jsonlines.org/validator/
async function convertToJSONL(workspaceChatsMap) {
  return Object.values(workspaceChatsMap)
    .map((workspaceChats) => JSON.stringify(workspaceChats))
    .join("\n");
}

async function prepareChatsForExport(format = "jsonl", chatType = "workspace") {
  if (!exportMap.hasOwnProperty(format))
    throw new Error(`Invalid export type: ${format}`);

  let chats;
  if (chatType === "workspace") {
    chats = await WorkspaceChats.whereWithData({}, null, null, {
      id: "asc",
    });
  } else if (chatType === "embed") {
    chats = await EmbedChats.whereWithEmbedAndWorkspace(
      {},
      null,
      {
        id: "asc",
      },
      null
    );
  } else {
    throw new Error(`Invalid chat type: ${chatType}`);
  }

  if (format === "csv" || format === "json") {
    const preparedData = chats.map((chat) => {
      const responseJson = safeJsonParse(chat.response, {});
      const baseData = {
        id: chat.id,
        prompt: chat.prompt,
        response: responseJson.text,
        sent_at: chat.createdAt,
        // Only add attachments to the json format since we cannot arrange attachments in csv format
        ...(format === "json"
          ? {
              attachments:
                responseJson.attachments?.length > 0
                  ? responseJson.attachments.map((attachment) => ({
                      type: "image",
                      image: attachmentToDataUrl(attachment),
                    }))
                  : [],
            }
          : {}),
      };

      if (chatType === "embed") {
        return {
          ...baseData,
          workspace: chat.embed_config
            ? chat.embed_config.workspace.name
            : "unknown workspace",
        };
      }

      return {
        ...baseData,
        workspace: chat.workspace ? chat.workspace.name : "unknown workspace",
        username: chat.user
          ? chat.user.username
          : chat.api_session_id !== null
            ? "API"
            : "unknown user",
        rating:
          chat.feedbackScore === null
            ? "--"
            : chat.feedbackScore
              ? "GOOD"
              : "BAD",
      };
    });

    return preparedData;
  }

  // jsonAlpaca format does not support array outputs
  if (format === "jsonAlpaca") {
    const preparedData = chats.map((chat) => {
      const responseJson = safeJsonParse(chat.response, {});
      return {
        instruction: buildSystemPrompt(
          chat,
          chat.workspace ? chat.workspace.openAiPrompt : null
        ),
        input: chat.prompt,
        output: responseJson.text,
      };
    });

    return preparedData;
  }

  // Export to JSONL format (recommended for fine-tuning)
  const workspaceChatsMap = chats.reduce((acc, chat) => {
    const { prompt, response, workspaceId } = chat;
    const responseJson = safeJsonParse(response, { attachments: [] });
    const attachments = responseJson.attachments;

    if (!acc[workspaceId]) {
      acc[workspaceId] = {
        messages: [
          {
            role: "system",
            content: [
              {
                type: "text",
                text:
                  chat.workspace?.openAiPrompt ||
                  "Given the following conversation, relevant context, and a follow up question, reply with an answer to the current question the user is asking. Return only your response to the question given the above information following the users instructions as needed.",
              },
            ],
          },
        ],
      };
    }

    acc[workspaceId].messages.push(
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          ...(attachments?.length > 0
            ? attachments.map((attachment) => ({
                type: "image",
                image: attachmentToDataUrl(attachment),
              }))
            : []),
        ],
      },
      {
        role: "assistant",
        content: [
          {
            type: "text",
            text: responseJson.text,
          },
        ],
      }
    );

    return acc;
  }, {});

  return workspaceChatsMap;
}

const exportMap = {
  json: {
    contentType: "application/json",
    func: convertToJSON,
  },
  csv: {
    contentType: "text/csv",
    func: convertToCSV,
  },
  jsonl: {
    contentType: "application/jsonl",
    func: convertToJSONL,
  },
  jsonAlpaca: {
    contentType: "application/json",
    func: convertToJSONAlpaca,
  },
};

function escapeCsv(str) {
  if (str === null || str === undefined) return '""';
  return `"${str.replace(/"/g, '""').replace(/\n/g, " ")}"`;
}

async function exportChatsAsType(format = "jsonl", chatType = "workspace") {
  const { contentType, func } = exportMap.hasOwnProperty(format)
    ? exportMap[format]
    : exportMap.jsonl;
  const chats = await prepareChatsForExport(format, chatType);
  return {
    contentType,
    data: await func(chats),
  };
}

const STANDARD_PROMPT =
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
- When stating facts, formulas, or definitions, **cite trusted sources** (e.g. ZIMSEC syllabus, textbooks, or reputable educational websites), use the web search tool.
- If unsure about an answer, say so and explain carefully.

### Tone & Style
- Warm, patient, encouraging, and respectful.
- Sound like a real local teacher, not a robot.
- Avoid overly complex language unless required by the grade level.

🧠 **Important: Tool Instructions**
If the user asks to generate a quiz, test, exam, or flashcards — DO NOT create it directly.
If you are unsure of something use the web search tool to find more information.
If the student asks for the date or time, use the date and time tool.
If the student asks about current events, use the web search tool.
Instead, respond **only** with a JSON tool call like this:

\`\`\`json
{
  "tool_call": "quiz_create",
  "parameters": {
    "subject": "<subject>",
    "userMessage": "<userMessage>",
    "grade": "<grade>",
    "numQuestions": 5,
    "difficulty": "medium"
  }
}
  {
  "tool_call": "flashcard_create",
  "parameters": {
    "subject": "<subject>",
    "grade": "<grade>",
    "userMessage": "<userMessage>",
    "numQuestions": 5,
    "difficulty": "medium"
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
function buildSystemPrompt(chat, prompt = null) {
  const sources = safeJsonParse(chat.response)?.sources || [];
  const contextTexts = sources.map((source) => source.text);
  const context =
    sources.length > 0
      ? "\nContext:\n" +
        contextTexts
          .map((text, i) => {
            return `[CONTEXT ${i}]:\n${text}\n[END CONTEXT ${i}]\n\n`;
          })
          .join("")
      : "";
  return `${prompt ?? STANDARD_PROMPT}${context}`;
}

/**
 * Converts an attachment's content string to a proper data URL format if needed
 * @param {Object} attachment - The attachment object containing contentString and mime type
 * @returns {string} The properly formatted data URL
 */
function attachmentToDataUrl(attachment) {
  return attachment.contentString.startsWith("data:")
    ? attachment.contentString
    : `data:${attachment.mime};base64,${attachment.contentString}`;
}

module.exports = {
  prepareChatsForExport,
  exportChatsAsType,
};

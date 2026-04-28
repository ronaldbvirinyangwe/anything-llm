const { v4: uuidv4 } = require("uuid");
const { DocumentManager } = require("../DocumentManager");
const { WorkspaceChats } = require("../../models/workspaceChats");
const { WorkspaceParsedFiles } = require("../../models/workspaceParsedFiles");
const { getVectorDbClass, getLLMProvider } = require("../helpers");
const { writeResponseChunk } = require("../helpers/chat/responses");
const { grepAgents } = require("./agents");
const {
  grepCommand,
  VALID_COMMANDS,
  chatPrompt,
  recentChatHistory,
  sourceIdentifier,
} = require("./index");

const VALID_CHAT_MODE = ["chat", "query"];

const AVAILABLE_TOOLS = [
  {
    type: "function",
    function: {
      name: "quiz_create",
      description: "Generates curriculum-aligned quizzes for students based on ZIMSEC and Cambridge curricula",
      parameters: {
        type: "object",
        properties: {
          subject: {
            type: "string",
            description: "The subject for the quiz (e.g., 'Biology', 'Mathematics')"
          },
          topic: {
            type: "string",
            description: "The specific topic being discussed in the conversation (e.g., 'Photosynthesis', 'Quadratic Equations'). Extract this from the current conversation context."
          },
          grade: {
            type: "string",
            description: "Grade level (e.g., '10', '12', 'Form 3')"
          },
          userMessage: {
            type: "string",
            description: "The user's original request"
          },
          numQuestions: {
            type: "integer",
            description: "Number of questions to generate",
            default: 5
          },
          difficulty: {
            type: "string",
            enum: ["easy", "medium", "hard"],
            default: "medium"
          }
        },
        required: ["subject", "topic", "grade", "userMessage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "flashcard_create",
      description: "Creates educational flashcards for studying",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Subject for flashcards" },
          topic: { type: "string", description: "The specific topic being discussed in the conversation. Extract this from the current conversation context." },
          grade: { type: "string", description: "Grade level" },
          userMessage: { type: "string", description: "The user's original request" },
          numCards: { type: "integer", default: 10 },
          difficulty: { type: "string", enum: ["easy", "medium", "hard"], default: "medium" }
        },
        required: ["subject", "topic", "grade", "userMessage"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information, facts, or recent events",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          provider: { type: "string", enum: ["tavily", "serper"], default: "tavily" },
          numResults: { type: "integer", default: 5 }
        },
        required: ["query"]
      }
    }
  }
];

async function streamChatWithWorkspace(
  response,
  workspace,
  message,
  chatMode = "chat",
  user = null,
  thread = null,
  attachments = [],
  systemAddition = ""
) {
  const uuid = uuidv4();
  const updatedMessage = await grepCommand(message, user);

  if (Object.keys(VALID_COMMANDS).includes(updatedMessage)) {
    const data = await VALID_COMMANDS[updatedMessage](
      workspace,
      message,
      uuid,
      user,
      thread
    );
    writeResponseChunk(response, data);
    return;
  }

  // If is agent enabled chat we will exit this flow early.
  const isAgentChat = await grepAgents({
    uuid,
    response,
    message: updatedMessage,
    user,
    workspace,
    thread,
  });
  if (isAgentChat) return;

  const LLMConnector = getLLMProvider({
    provider: workspace?.chatProvider,
    model: workspace?.chatModel,
  });
  const VectorDb = getVectorDbClass();

  const messageLimit = workspace?.openAiHistory || 20;
  const hasVectorizedSpace = await VectorDb.hasNamespace(workspace.slug);
  const embeddingsCount = await VectorDb.namespaceCount(workspace.slug);

  // User is trying to query-mode chat a workspace that has no data in it - so
  // we should exit early as no information can be found under these conditions.
  if ((!hasVectorizedSpace || embeddingsCount === 0) && chatMode === "query") {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      textResponse,
      sources: [],
      attachments,
      close: true,
      error: null,
    });
    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  let completeText;
  let metrics = {};
  let contextTexts = [];
  let sources = [];
  let pinnedDocIdentifiers = [];
  const { rawHistory, chatHistory } = await recentChatHistory({
    user,
    workspace,
    thread,
    messageLimit,
  });

  const visionContext = [];
  if (attachments && attachments.length > 0) {
    attachments.forEach((attachment) => {
      if (attachment.analysis) {
        const text = attachment.analysis.description || attachment.analysis.extractedText;
        visionContext.push(`
[Visual Content Analysis: ${attachment.name}]
${text}
---
`);
      }
    });
  }

  if (visionContext.length > 0) {
    console.log(`👁️ Adding ${visionContext.length} vision analyses to context`);
    contextTexts = [...visionContext, ...contextTexts];
  }

  await new DocumentManager({
    workspace,
    maxTokens: LLMConnector.promptWindowLimit(),
  })
    .pinnedDocs()
    .then((pinnedDocs) => {
      pinnedDocs.forEach((doc) => {
        const { pageContent, ...metadata } = doc;
        pinnedDocIdentifiers.push(sourceIdentifier(doc));
        contextTexts.push(doc.pageContent);
        sources.push({
          text:
            pageContent.slice(0, 1_000) +
            "...continued on in source document...",
          ...metadata,
        });
      });
    });

  const parsedFiles = await WorkspaceParsedFiles.getContextFiles(
    workspace,
    thread || null,
    user || null
  );
  parsedFiles.forEach((doc) => {
    const { pageContent, ...metadata } = doc;
    contextTexts.push(doc.pageContent);
    sources.push({
      text:
        pageContent.slice(0, 1_000) + "...continued on in source document...",
      ...metadata,
    });
  });

  const vectorSearchResults =
    embeddingsCount !== 0
      ? await VectorDb.performSimilaritySearch({
          namespace: workspace.slug,
          input: updatedMessage,
          LLMConnector,
          similarityThreshold: workspace?.similarityThreshold,
          topN: workspace?.topN,
          filterIdentifiers: pinnedDocIdentifiers,
          rerank: workspace?.vectorSearchMode === "rerank",
        })
      : {
          contextTexts: [],
          sources: [],
          message: null,
        };

  if (!!vectorSearchResults.message) {
    writeResponseChunk(response, {
      id: uuid,
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: vectorSearchResults.message,
    });
    return;
  }

  const { fillSourceWindow } = require("../helpers/chat");
  const filledSources = fillSourceWindow({
    nDocs: workspace?.topN || 4,
    searchResults: vectorSearchResults.sources,
    history: rawHistory,
    filterIdentifiers: pinnedDocIdentifiers,
  });

  contextTexts = [...contextTexts, ...filledSources.contextTexts];
  sources = [...sources, ...vectorSearchResults.sources];

  if (chatMode === "query" && contextTexts.length === 0) {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      textResponse,
      sources: [],
      close: true,
      error: null,
    });
    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: textResponse,
        sources: [],
        type: chatMode,
        attachments,
      },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // Only include web_search if no document context was injected
  const activeTools = systemAddition?.includes("== EXAM PAPER CONTENT ==")
    ? AVAILABLE_TOOLS.filter(t => t.function.name !== "web_search")
    : AVAILABLE_TOOLS;

  const messages = await LLMConnector.compressMessages(
    {
      systemPrompt: (await chatPrompt(workspace, user)) +
                    (systemAddition ? "\n\n" + systemAddition : ""),
      userPrompt: updatedMessage,
      contextTexts,
      chatHistory,
      attachments,
    },
    rawHistory,
  );

  // =========================================================
  // OPTION B: Tool intent pre-check (non-streaming, fast)
  // Run a lightweight completion first to detect tool calls
  // BEFORE opening the stream. This ensures the stream is
  // never opened/closed before tool results are written.
  // =========================================================
  try {
    console.log("🔍 Running tool intent pre-check...");
    const { textResponse: intentResponse } = await LLMConnector.getChatCompletion(
      messages,
      {
        temperature: 0,
        tools: activeTools,
        tool_choice: "auto",
        max_tokens: 150, // Only need the tool call decision, not a full reply
      }
    );

    // intentResponse may be a raw message object (with tool_calls) or a string
    const toolCalls =
      intentResponse?.tool_calls ||                          // object form
      (Array.isArray(intentResponse) ? intentResponse : null); // array form

    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      const toolName = toolCall.function?.name || toolCall.name;
      const rawArgs = toolCall.function?.arguments || toolCall.arguments || "{}";

      let parsedArgs;
      try {
        parsedArgs = typeof rawArgs === "string" ? JSON.parse(rawArgs) : rawArgs;
      } catch (parseError) {
        console.error("❌ Failed to parse tool call arguments:", parseError.message);
        console.error("Raw arguments:", rawArgs);
        throw new Error(`Invalid tool call arguments: ${parseError.message}`);
      }

      console.log(`✅ Tool intent detected: ${toolName}`, parsedArgs);

      // Return early — stream has NOT been opened yet.
      // chat.js will handle writing the response chunks.
      return {
        tool_call: toolName,
        parameters: parsedArgs,
      };
    }

    console.log("ℹ️ No tool call detected in pre-check — proceeding with normal stream");
  } catch (intentError) {
    // Non-fatal: if the pre-check fails (e.g. model doesn't support tools in
    // non-streaming mode), log and fall through to normal streaming.
    console.warn("⚠️ Tool intent pre-check failed, falling back to normal stream:", intentError.message);
  }
  // =========================================================
  // END Option B pre-check
  // =========================================================

  // If streaming is not explicitly enabled for connector
  // we do regular waiting of a response and send a single chunk.
  if (LLMConnector.streamingEnabled() !== true) {
    console.log(
      `\x1b[31m[STREAMING DISABLED]\x1b[0m Streaming is not available for ${LLMConnector.constructor.name}. Will use regular chat method.`
    );
    const { textResponse, metrics: performanceMetrics } =
      await LLMConnector.getChatCompletion(messages, {
        temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
      });

    completeText = textResponse;
    metrics = performanceMetrics;

    writeResponseChunk(response, {
      uuid,
      sources,
      type: "textResponseChunk",
      textResponse: completeText,
      close: true,
      error: false,
      metrics,
    });
  } else {
    const stream = await LLMConnector.streamGetChatCompletion(messages, {
      temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
    });

    const result = await LLMConnector.handleStream(response, stream, {
      uuid,
      sources,
    });

    completeText = typeof result === "string" ? result : result?.fullText || result;
    metrics = stream.metrics;
  }

  if (completeText?.length > 0) {
    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: {
        text: completeText,
        sources,
        type: chatMode,
        attachments,
        metrics,
      },
      threadId: thread?.id || null,
      user,
    });

    writeResponseChunk(response, {
      uuid,
      type: "finalizeResponseStream",
      close: true,
      error: false,
      metrics,
    });

    return { text: completeText };
  }

  // Fallback finalize
  writeResponseChunk(response, {
    uuid,
    type: "finalizeResponseStream",
    close: true,
    error: false,
    metrics,
  });
  return;
}

module.exports = {
  VALID_CHAT_MODE,
  streamChatWithWorkspace,
};
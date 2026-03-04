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

// Add this at the top of the file, after the requires
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

  // If we are here we know that we are in a workspace that is:
  // 1. Chatting in "chat" mode and may or may _not_ have embeddings
  // 2. Chatting in "query" mode and has at least 1 embedding
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

  // Add vision analysis to context texts
  if (visionContext.length > 0) {
    console.log(`👁️ Adding ${visionContext.length} vision analyses to context`);
    contextTexts = [...visionContext, ...contextTexts];
  }
  
  // Look for pinned documents and see if the user decided to use this feature. We will also do a vector search
  // as pinning is a supplemental tool but it should be used with caution since it can easily blow up a context window.
  // However we limit the maximum of appended context to 80% of its overall size, mostly because if it expands beyond this
  // it will undergo prompt compression anyway to make it work. If there is so much pinned that the context here is bigger than
  // what the model can support - it would get compressed anyway and that really is not the point of pinning. It is really best
  // suited for high-context models.
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

  // Inject any parsed files for this workspace/thread/user
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

  // Failed similarity search if it was run at all and failed.
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

  // Why does contextTexts get all the info, but sources only get current search?
  // This is to give the ability of the LLM to "comprehend" a contextual response without
  // populating the Citations under a response with documents the user "thinks" are irrelevant
  // due to how we manage backfilling of the context to keep chats with the LLM more correct in responses.
  // If a past citation was used to answer the question - that is visible in the history so it logically makes sense
  // and does not appear to the user that a new response used information that is otherwise irrelevant for a given prompt.
  // TLDR; reduces GitHub issues for "LLM citing document that has no answer in it" while keep answers highly accurate.
  contextTexts = [...contextTexts, ...filledSources.contextTexts];
  sources = [...sources, ...vectorSearchResults.sources];

  // If in query mode and no context chunks are found from search, backfill, or pins -  do not
  // let the LLM try to hallucinate a response or use general knowledge and exit early
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

  // If streaming is not explicitly enabled for connector
  // we do regular waiting of a response and send a single chunk.
  if (LLMConnector.streamingEnabled() !== true) {
  console.log(
    `\x1b[31m[STREAMING DISABLED]\x1b[0m Streaming is not available for ${LLMConnector.constructor.name}. Will use regular chat method.`
  );
  const { textResponse, metrics: performanceMetrics } =
    await LLMConnector.getChatCompletion(messages, {
      temperature: workspace?.openAiTemp ?? LLMConnector.defaultTemp,
      tools: activeTools,  // 👈 ADD THIS
      tool_choice: "auto",     // 👈 ADD THIS
    });

  // 👇 NEW: Check if textResponse is a message object with tool_calls
  if (textResponse?.tool_calls && textResponse.tool_calls.length > 0) {
    const toolCall = textResponse.tool_calls[0];
    console.log(`🧩 Native tool call detected: ${toolCall.function.name}`);
    
    return {
      tool_call: toolCall.function.name,
      parameters: JSON.parse(toolCall.function.arguments)
    };
  }

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
    tools: activeTools,
    tool_choice: "auto",
  });
  
  const result = await LLMConnector.handleStream(response, stream, {
    uuid,
    sources,
  });
  
  // 👇 NEW: Check if result contains tool_calls
  if (result && typeof result === 'object' && result.tool_calls && result.tool_calls.length > 0) {
    const toolCall = result.tool_calls[0];
    console.log(`🧩 Native tool call detected (streamed): ${toolCall.function.name}`);
    
    // 🔧 FIX: Don't parse here - arguments should already be a string
    // The handleStream method should have accumulated all chunks
    let parsedArgs;
    try {
      parsedArgs = typeof toolCall.function.arguments === 'string' 
        ? JSON.parse(toolCall.function.arguments)
        : toolCall.function.arguments;
    } catch (parseError) {
      console.error("Failed to parse tool arguments:", parseError);
      console.log("Raw arguments:", toolCall.function.arguments);
      throw new Error(`Invalid tool call arguments: ${parseError.message}`);
    }
    
    return {
      tool_call: toolCall.function.name,
      parameters: parsedArgs
    };
  }
  
  completeText = typeof result === 'string' ? result : result.fullText || result;
  metrics = stream.metrics;
}
if (completeText?.length > 0) {
  // 🧠 Save chat
  const { chat } = await WorkspaceChats.new({
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

  // ✅ Stream a normal completion
  writeResponseChunk(response, {
    uuid,
    type: "finalizeResponseStream",
    close: true,
    error: false,
    metrics,
  });

  // ✅ Try to detect tool_call JSON (e.g. { "tool_call": "quiz_create", ... })
  let parsedResponse = {};
  try {
    parsedResponse = JSON.parse(completeText);
  } catch {
    parsedResponse = { text: completeText };
  }

  // If it contains a tool_call, return it so chatEndpoints can trigger that flow
  if (parsedResponse?.tool_call) {
    console.log(`🧩 Detected tool call: ${parsedResponse.tool_call}`);
  }

  return parsedResponse;
}

// fallback finalize
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

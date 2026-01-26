const { v4: uuidv4 } = require("uuid");
const { reqBody, userFromSession, multiUserMode } = require("../utils/http");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const { streamChatWithWorkspace } = require("../utils/chats/stream");
const {
  ROLES,
  flexUserRoleValid,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const {
  validWorkspaceAndThreadSlug,
  validWorkspaceSlug,
} = require("../utils/middleware/validWorkspace");
const { writeResponseChunk } = require("../utils/helpers/chat/responses");
const { WorkspaceThread } = require("../models/workspaceThread");
const { User } = require("../models/user");
const truncate = require("truncate");
const { getModelTag } = require("./utils");

function chatEndpoints(app) {
  if (!app) return;

 app.post(
  "/workspace/:slug/stream-chat",
  [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
  async (request, response) => {
    try {
      const user = await userFromSession(request, response);
      const { message, attachments = [] } = reqBody(request);
      const workspace = response.locals.workspace;

      if (!message?.length) {
        response.status(400).json({
          id: uuidv4(),
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: !message?.length ? "Message is empty." : null,
        });
        return;
      }

      response.setHeader("Cache-Control", "no-cache");
      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Access-Control-Allow-Origin", "*");
      response.setHeader("Connection", "keep-alive");
      response.flushHeaders();

      if (multiUserMode(response) && !(await User.canSendChat(user))) {
        writeResponseChunk(response, {
          id: uuidv4(),
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: `You have met your maximum 24 hour chat quota of ${user.dailyMessageLimit} chats. Try again later.`,
        });
        return;
      }

      // 🧠 STREAM CHAT
      const result = await streamChatWithWorkspace(
        response,
        workspace,
        message,
        workspace?.chatMode,
        user,
        null,
        attachments
      );

// 🧩  Detect tool call (from model output)
if (result?.tool_call === "quiz_create") {
  console.log("⚙️ Tool call detected: quiz_create");

  writeResponseChunk(response, {
    id: uuidv4(),
    type: "data",
    role: "assistant",
    tool_call: "quiz_create",
    textResponse: "Preparing your quiz...",
    close: false,
  });

  try {
    const params = result.parameters || {};
    
    // ✅ ADD: Extract additional context from the user's message
    const enhancedParams = {
      ...params,
      userId: user?.id,
      workspaceSlug: workspace.slug,
         userMessage: message, 
      subject: params.subject || extractSubjectFromMessage(message),
      grade: params.grade || user?.grade || workspace.grade || "10",
      numQuestions: params.numQuestions || 5,
      difficulty: params.difficulty || "medium",
    };

    console.log("📝 Enhanced quiz params:", enhancedParams);
    
    const apiBase = process.env.API_BASE || "http://localhost:3001";
    
    const quizRes = await fetch(`${apiBase}/api/agent-flows/quiz/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.authorization || "",
      },
      body: JSON.stringify(enhancedParams), // Use enhanced params
    });

    if (!quizRes.ok) {
      throw new Error(`Quiz API failed: ${quizRes.status}`);
    }

    const quizData = await quizRes.json();
    console.log("✅ Quiz tool executed:", quizData);

    writeResponseChunk(response, {
      id: uuidv4(),
      type: "data",
      textResponse: "",
      role: "assistant",
      tool_call: "quiz_create",
      quiz: quizData.quiz || {},
      close: false,
    });
  } catch (error) {
    console.error("❌ Quiz generation failed:", error);
    writeResponseChunk(response, {
      id: uuidv4(),
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: `Quiz generation failed: ${error.message}`,
    });
  }
}

// 🎴 Detect flashcard tool call
if (result?.tool_call === "flashcard_create") {
  console.log("⚙️ Tool call detected: flashcard_create");

  writeResponseChunk(response, {
    id: uuidv4(),
    type: "data",
    role: "assistant",
    tool_call: "flashcard_create",
    textResponse: "Preparing your flashcards...",
    close: false,
  });

  try {
    const params = result.parameters || {};
    
    const enhancedParams = {
      ...params,
      userMessage: message,
      userId: user?.id,
      workspaceSlug: workspace.slug,
      subject: params.subject || extractSubjectFromMessage(message),
      grade: params.grade || user?.grade || workspace.grade || "10",
      numCards: params.numCards || 5,
      difficulty: params.difficulty || "medium",
    };

    console.log("📝 Enhanced flashcard params:", enhancedParams);
    
    const apiBase = process.env.API_BASE || "http://localhost:3001";
    
    const flashcardRes = await fetch(`${apiBase}/api/agent-flows/flashcard/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.authorization || "",
      },
      body: JSON.stringify(enhancedParams),
    });

    if (!flashcardRes.ok) {
      throw new Error(`Flashcard API failed: ${flashcardRes.status}`);
    }

    const flashcardData = await flashcardRes.json();
    console.log("✅ Flashcard tool executed:", flashcardData);

    writeResponseChunk(response, {
      id: uuidv4(),
      type: "data",
      textResponse: "",
      role: "assistant",
      tool_call: "flashcard_create",
      flashcards: flashcardData.flashcards || {},
      close: false,
    });
  } catch (error) {
    console.error("❌ Flashcard generation failed:", error);
    writeResponseChunk(response, {
      id: uuidv4(),
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: `Flashcard generation failed: ${error.message}`,
    });
  }
}

// 🔍 Detect web search tool call
if (result?.tool_call === "web_search") {
  console.log("⚙️ Tool call detected: web_search");

  writeResponseChunk(response, {
    id: uuidv4(),
    type: "data",
    role: "assistant",
    tool_call: "web_search",
    textResponse: "Searching the web...",
    close: false,
  });

  try {
    const params = result.parameters || {};
    
    const searchParams = {
      query: params.query || message, // Use the original message if no specific query
      provider: params.provider || "duckduckgo",
      numResults: params.numResults || 10,
    };

    console.log("🔍 Web search params:", searchParams);
    
    const apiBase = process.env.API_BASE || "http://localhost:3001";
    
    const searchRes = await fetch(`${apiBase}/api/agent-flows/web-search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: request.headers.authorization || "",
      },
      body: JSON.stringify(searchParams),
    });

    if (!searchRes.ok) {
      throw new Error(`Web search API failed: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();
    console.log("✅ Web search tool executed:", searchData);

    // Format the results into a readable response
    let formattedResults = `I found ${searchData.results?.length || 0} results for "${searchParams.query}":\n\n`;
    
    searchData.results?.slice(0, 5).forEach((result, i) => {
      formattedResults += `${i + 1}. **${result.title}**\n`;
      formattedResults += `   ${result.snippet}\n`;
      formattedResults += `   ${result.url}\n\n`;
    });

    writeResponseChunk(response, {
      id: uuidv4(),
      type: "data",
      textResponse: formattedResults,
      role: "assistant",
      tool_call: "web_search",
      searchResults: searchData.results || [],
      close: false,
    });
  } catch (error) {
    console.error("❌ Web search failed:", error);
    writeResponseChunk(response, {
      id: uuidv4(),
      type: "abort",
      textResponse: null,
      sources: [],
      close: true,
      error: `Web search failed: ${error.message}`,
    });
  }
}


//  Helper function to extract subject from message
function extractSubjectFromMessage(message) {
  const lowerMsg = message.toLowerCase();
  
  // Common subjects to detect
  const subjects = {
    'biology': ['biology', 'bio', 'cells', 'plants', 'animals', 'photosynthesis'],
    'chemistry': ['chemistry', 'chem', 'reactions', 'elements', 'compounds'],
    'physics': ['physics', 'motion', 'energy', 'forces', 'electricity'],
    'mathematics': ['math', 'mathematics', 'algebra', 'geometry', 'calculus'],
    'history': ['history', 'historical', 'war', 'independence'],
    'geography': ['geography', 'maps', 'continents', 'climate'],
    'english': ['english', 'literature', 'grammar', 'writing'],
  };
  
  for (const [subject, keywords] of Object.entries(subjects)) {
    if (keywords.some(keyword => lowerMsg.includes(keyword))) {
      return subject.charAt(0).toUpperCase() + subject.slice(1);
    }
  }
  
  return 'General'; // Default subject
}

      await Telemetry.sendTelemetry("sent_chat", {
        multiUserMode: multiUserMode(response),
        LLMSelection: process.env.LLM_PROVIDER || "ollama",
        Embedder: process.env.EMBEDDING_ENGINE || "ollama",
        VectorDbSelection: process.env.VECTOR_DB || "pgvector",
        multiModal: Array.isArray(attachments) && attachments?.length !== 0,
        TTSSelection: process.env.TTS_PROVIDER || "native",
        LLMModel: getModelTag(),
      });

      await EventLogs.logEvent(
        "sent_chat",
        {
          workspaceName: workspace?.name,
          chatModel: workspace?.chatModel || "gpt-oss:20b",
        },
        user?.id
      );

      response.end();
    } catch (e) {
      console.error("🔥 Chat stream error:", e);
      writeResponseChunk(response, {
        id: uuidv4(),
        type: "abort",
        textResponse: null,
        sources: [],
        close: true,
        error: e.message,
      });
      response.end();
    }
  }
);

  app.post(
    "/workspace/:slug/thread/:threadSlug/stream-chat",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceAndThreadSlug,
    ],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { message, attachments = [] } = reqBody(request);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;

        if (!message?.length) {
          response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: !message?.length ? "Message is empty." : null,
          });
          return;
        }

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();

        if (multiUserMode(response) && !(await User.canSendChat(user))) {
          writeResponseChunk(response, {
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: `You have met your maximum 24 hour chat quota of ${user.dailyMessageLimit} chats. Try again later.`,
          });
          return;
        }

        await streamChatWithWorkspace(
          response,
          workspace,
          message,
          workspace?.chatMode,
          user,
          thread,
          attachments
        );

        // If thread was renamed emit event to frontend via special `action` response.
        await WorkspaceThread.autoRenameThread({
          thread,
          workspace,
          user,
          newName: truncate(message, 22),
          onRename: (thread) => {
            writeResponseChunk(response, {
              action: "rename_thread",
              thread: {
                slug: thread.slug,
                name: thread.name,
              },
            });
          },
        });

        await Telemetry.sendTelemetry("sent_chat", {
          multiUserMode: multiUserMode(response),
          LLMSelection: process.env.LLM_PROVIDER || "ollama",
          Embedder: process.env.EMBEDDING_ENGINE || "ollama",
          VectorDbSelection: process.env.VECTOR_DB || "pgvector",
          multiModal: Array.isArray(attachments) && attachments?.length !== 0,
          TTSSelection: process.env.TTS_PROVIDER || "native",
          LLMModel: getModelTag(),
        });

        await EventLogs.logEvent(
          "sent_chat",
          {
            workspaceName: workspace.name,
            thread: thread.name,
            chatModel: workspace?.chatModel || "gpt-oss:20b",
          },
          user?.id
        );
        response.end();
      } catch (e) {
        console.error(e);
        writeResponseChunk(response, {
          id: uuidv4(),
          type: "abort",
          textResponse: null,
          sources: [],
          close: true,
          error: e.message,
        });
        response.end();
      }
    }
  );
}

module.exports = { chatEndpoints };

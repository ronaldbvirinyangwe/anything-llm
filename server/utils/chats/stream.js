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
const { TOOL_DEFINITIONS } = require("./tools/definitions");

const TOOL_DISPLAY_MESSAGES = {
  "flashcard_create":      "🃏 Creating your flashcards...",
  "quiz_create":           "📝 Building your quiz...",
  "check-my-answer":       "🦉 Your tutor is marking your answer...",
  "generate-notes":        "📚 Your tutor is writing your notes...",
  "study-planner-elicit":  "📅 Opening your study planner...",
  "study-planner":         "📅 Building your study plan...",
  "explain-concept":       "🦉 Your tutor is thinking...",
  "document-summarizer":   "📄 Reading your documents...",
  "web-browsing":          "🔍 Searching the web...",
  "web-scraping":          "🌐 Reading that page...",
  "create-chart":          "📊 Drawing your chart...",
};

/**
 * Detects tool intent from the user message using keyword/pattern matching.
 * This is model-agnostic and works reliably with local LLMs that ignore tool definitions.
 *
 * Returns a tool_call object if matched, or null to proceed with normal chat.
 */
/**
 * Detects tool intent from the user message using keyword/pattern matching.
 * Returns { tool_call, parameters, via } or null.
 *
 * via: "api"   → POST to an internal /agent-flows/ route (handled by chat.js)
 * via: "agent" → trigger WorkspaceAgentInvocation (runs the aibitat plugin)
 */
async function detectToolIntent(message) {
  if (!message || typeof message !== "string") return null;

  // ── Extract frontend-injected metadata ────────────────────────────────────
  const gradeMatch   = message.match(/\[Grade:\s*([^\]]+)\]/i);
  const subjectMatch = message.match(/\[Subject:\s*([^\]]+)\]/i);
  const grade        = gradeMatch?.[1]?.trim()   ?? "unknown";
  const subject      = subjectMatch?.[1]?.trim() ?? "General";
  const cleanMessage = message.replace(/\[[^\]]+\]/g, "").trim();

  if (!cleanMessage) return null;

  const WORD_TO_NUM = {
    one:1, two:2, three:3, four:4, five:5,
    six:6, seven:7, eight:8, nine:9, ten:10,
  };
  function extractNum(str) {
    const m = str.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\b/i);
    if (!m) return null;
    return parseInt(m[1]) || WORD_TO_NUM[m[1].toLowerCase()] || null;
  }

  // ── Build the intent result from a resolved tool name ────────────────────
  function buildIntent(tool) {
    if (!tool || tool === "none") return null;
    const API_TOOLS = ["quiz_create", "flashcard_create"];
    const via = API_TOOLS.includes(tool) ? "api" : "agent";

    if (tool === "quiz_create") {

      const explicitTopic = cleanMessage.match(
    /(?:on|about|for|covering)\s+(.+?)(?:\s*[,.]|$)/i
  )?.[1]?.trim();

      return {
        via,
        tool_call: "quiz_create",
        parameters: {
          topic:        explicitTopic ?? "",
          subject,
          grade,
          numQuestions: extractNum(cleanMessage) ?? 5,
          userMessage:  cleanMessage,
          difficulty:   "medium",
        },
      };
    }
    if (tool === "flashcard_create") {

       const explicitTopic = cleanMessage.match(
    /(?:on|about|for|covering)\s+(.+?)(?:\s*[,.]|$)/i
  )?.[1]?.trim();
      return {
        via,
        tool_call: "flashcard_create",
        parameters: {
          topic:       explicitTopic ?? "",
          subject,
          grade,
          numCards:    extractNum(cleanMessage) ?? 10,
          userMessage: cleanMessage,
          difficulty:  "medium",
        },
      };
    }
    if (tool === "generate-notes") {
      const topicMatch = cleanMessage.match(/notes?\s+(?:on|about|for|covering)\s+(.+)/i);
      const topic = topicMatch?.[1]?.trim() ?? cleanMessage;
      const depth = /\bdetailed?\b|\bin[- ]depth\b|\bcomprehensive\b/i.test(cleanMessage)
        ? "detailed"
        : /\bbrief\b|\bshort\b|\bquick\b/i.test(cleanMessage)
        ? "brief"
        : "standard";
      return { via: "agent", tool_call: "generate-notes", parameters: { subject, topic, depth, message: cleanMessage } };
    }
    if (tool === "study-planner-elicit") {
      return { via: "agent", tool_call: "study-planner-elicit", parameters: { message: cleanMessage } };
    }
    if (tool === "explain-concept") {
      const conceptMatch = cleanMessage.match(
        /^(?:explain|what\s+is|what\s+are|define|describe|tell\s+me\s+about|how\s+does)\s+(.+)/i
      );
      const concept = conceptMatch?.[1]?.trim() ?? cleanMessage;
      return { via: "agent", tool_call: "explain-concept", parameters: { concept, subject, message: cleanMessage } };
    }
    if (tool === "document-summarizer") {
      const fileMatch = cleanMessage.match(/(?:summarize|summarise)\s+(.+)/i);
      return { via: "agent", tool_call: "document-summarizer", parameters: { filename: fileMatch?.[1]?.trim() ?? null, message: cleanMessage } };
    }
    if (tool === "web-browsing") {
      const queryMatch = cleanMessage.match(/(?:search\s+(?:the\s+web\s+)?for|look\s+up|find)\s+(.+)/i);
      const query = queryMatch?.[1]?.trim() ?? cleanMessage;
      return { via: "agent", tool_call: "web-browsing", parameters: { query, message: cleanMessage } };
    }
    if (tool === "create-chart") {
      return { via: "agent", tool_call: "create-chart", parameters: { message: cleanMessage } };
    }
    return null;
  }

  // ── LAYER 1: Fast regex fallback (always runs first, zero latency) ────────
  function regexClassify(text) {
    const t = text.toLowerCase();

    if (/flashcard|flash\s*card|study\s*card|memory\s*card/.test(t))
      return "flashcard_create";

    if (
      /\bquiz\b/.test(t) ||
      /\btest\s+me\b/.test(t) ||
      /practice\s+question/.test(t) ||
      /revision\s+question/.test(t) ||
      /past\s+paper/.test(t) ||
      /exam\s+question/.test(t) ||
      /\bgive\s+me\s+(?:\w+\s+)?question/.test(t) ||
      /\bask\s+me\s+(?:some\s+)?question/.test(t) ||
      /(?:generate|create|make)\s+(?:a\s+)?(?:quiz|test|assessment)/.test(t) ||
      /\bquestion[s]?\s+(?:on|about|for)\b/.test(t)
    ) return "quiz_create";

    if (/(?:generate|make|create|write|give\s+me)\s+(?:study\s+)?notes?\s+(?:on|about|for)|study\s+notes?\s+(?:on|about|for)/.test(t))
      return "generate-notes";

    if (/(?:make|create|build|give\s+me|plan)\s+(?:me\s+)?(?:a\s+)?(?:study|revision|exam)\s+(?:plan|schedule|timetable)|how\s+should\s+i\s+(?:revise|study)\s+for|help\s+me\s+(?:plan|prepare)\s+for/.test(t))
      return "study-planner-elicit";

    if (/^(?:explain|what\s+is|what\s+are|define|describe|tell\s+me\s+about|how\s+does)\s+/i.test(text))
      return "explain-concept";

    if (/summarize|summarise|give\s+me\s+a\s+summary\s+of/.test(t))
      return "document-summarizer";

    if (/search\s+(?:the\s+)?web|look\s+up|find\s+(?:recent|latest|current)|what(?:'s|\s+is)\s+(?:the\s+latest|happening|current)/.test(t))
      return "web-browsing";

    if (/(?:create|make|generate|show|draw|plot)\s+(?:a\s+)?(?:chart|graph|pie|bar\s+chart|line\s+graph|visuali[sz])/.test(t))
      return "create-chart";

    return null;
  }

  // Try regex first — instant, no network call
  const regexTool = regexClassify(cleanMessage);
  if (regexTool) {
    console.log(`⚡ [Classifier regex] "${cleanMessage}" → "${regexTool}"`);
    return buildIntent(regexTool);
  }

  // ── LAYER 2: LLM classifier for ambiguous messages ────────────────────────
  // Only reaches here if regex found nothing — handles natural phrasings
  // like "fire away", "I want to revise", "can you test me on this"
  try {
    const vllmBase =
      process.env.VLLM_BASE_PATH ||
      process.env.OLLAMA_BASE_PATH ||
      "http://192.168.1.128:11434/v1";

    // Use a small dedicated classifier model if configured, 
    // otherwise fall back to the main model
   const classifierModel   = process.env.CLASSIFIER_MODEL   || process.env.OLLAMA_MODEL_PREF || "gpt-oss:20b";
const classifierBaseUrl = process.env.CLASSIFIER_BASE_URL || vllmBase;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${classifierBaseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: classifierModel,
        messages: [
          {
            role: "system",
            content: "You are a JSON classifier. Respond with ONLY a raw JSON object. No thinking tags. No markdown. No explanation.",
          },
          {
            role: "user",
            content: `Classify this student message into ONE tool or "none".

TOOLS:
- "quiz_create"          : wants practice questions, quiz, to be tested, revision questions
- "flashcard_create"     : wants flashcards, study cards, memory cards
- "generate-notes"       : wants notes or study guide written out
- "study-planner-elicit" : wants a study plan or revision schedule
- "explain-concept"      : wants something explained or defined
- "document-summarizer"  : wants a document summarised
- "web-browsing"         : wants to search the web
- "create-chart"         : wants a chart or graph
- "none"                 : everything else

Message: "${cleanMessage.replace(/"/g, "'")}"

JSON response:`,
          },
        ],
        stream: false,
        temperature: 0.0,
        max_tokens: 50,
      }),
    });

    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    let raw = data.choices?.[0]?.message?.content ?? "";

    console.log(`🔍 [Classifier LLM raw] "${raw}"`);

    if (!raw.trim()) throw new Error("Empty response from classifier model");

    // Strip think blocks and markdown
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    raw = raw.replace(/```json|```/gi, "").trim();

    const jsonMatch = raw.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) throw new Error(`No JSON in: "${raw}"`);

    const { tool } = JSON.parse(jsonMatch[0]);
    console.log(`✅ [Classifier LLM] "${cleanMessage}" → "${tool}"`);

    return buildIntent(tool?.trim());

  } catch (err) {
    console.warn("⚠️ [Classifier LLM] Failed:", err.message);
    return null;
  }
}

const VALID_CHAT_MODE = ["chat", "query"];

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

  // Exit early if this is an agent-handled chat
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

  // Query-mode requires documents — exit early if none exist
  if ((!hasVectorizedSpace || embeddingsCount === 0) && chatMode === "query") {
    const textResponse =
      workspace?.queryRefusalResponse ??
      "There is no relevant information in this workspace to answer your query.";

        const toolIntent = await detectToolIntent(updatedMessage);
        
    writeResponseChunk(response, {
      id: uuid,
      type: "textResponse",
      textResponse: TOOL_DISPLAY_MESSAGES[toolIntent.tool_call] ?? "🦉 Your tutor is thinking...",
      sources: [],
      attachments,
      close: true,
      error: null,
    });

    await WorkspaceChats.new({
      workspaceId: workspace.id,
      prompt: message,
      response: { text: textResponse, sources: [], type: chatMode, attachments },
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

  // Inject vision analysis from attachments into context
  if (attachments?.length > 0) {
    const visionContext = attachments
      .filter((a) => a.analysis)
      .map((a) => {
        const text = a.analysis.description || a.analysis.extractedText;
        return `[Visual Content Analysis: ${a.name}]\n${text}\n---`;
      });

    if (visionContext.length > 0) {
      console.log(`👁️ Adding ${visionContext.length} vision analyses to context`);
      contextTexts = [...visionContext, ...contextTexts];
    }
  }

  // Inject pinned docs
  await new DocumentManager({
    workspace,
    maxTokens: LLMConnector.promptWindowLimit(),
  })
    .pinnedDocs()
    .then((pinnedDocs) => {
      pinnedDocs.forEach((doc) => {
        const { pageContent, ...metadata } = doc;
        pinnedDocIdentifiers.push(sourceIdentifier(doc));
        contextTexts.push(pageContent);
        sources.push({
          text: pageContent.slice(0, 1_000) + "...continued on in source document...",
          ...metadata,
        });
      });
    });

  // Inject parsed workspace files
  const parsedFiles = await WorkspaceParsedFiles.getContextFiles(
    workspace,
    thread || null,
    user || null
  );
  parsedFiles.forEach((doc) => {
    const { pageContent, ...metadata } = doc;
    contextTexts.push(pageContent);
    sources.push({
      text: pageContent.slice(0, 1_000) + "...continued on in source document...",
      ...metadata,
    });
  });

  // Vector similarity search
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
      : { contextTexts: [], sources: [], message: null };

  if (vectorSearchResults.message) {
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

  // Query mode still needs context after vector search
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
      response: { text: textResponse, sources: [], type: chatMode, attachments },
      threadId: thread?.id || null,
      include: false,
      user,
    });
    return;
  }

  // Suppress web_search when exam paper content is injected
  const activeTools = systemAddition?.includes("== EXAM PAPER CONTENT ==")
    ? TOOL_DEFINITIONS.filter((t) => t.function.name !== "web_search")
    : TOOL_DEFINITIONS;

  const messages = await LLMConnector.compressMessages(
    {
      systemPrompt:
        (await chatPrompt(workspace, user)) +
        (systemAddition ? "\n\n" + systemAddition : ""),
      userPrompt: updatedMessage,
      contextTexts,
      chatHistory,
      attachments,
    },
    rawHistory
  );

  // ─── Tool intent pre-check ────────────────────────────────────────────────
  // Use a non-streaming completion with tool definitions to detect whether the
  // LLM wants to invoke a tool. If it does, return the tool call early so the
  // caller (chat.js) can route to the appropriate handler without ever opening
  // the stream.
// ─── Keyword-based tool routing ───────────────────────────────────────────

const toolIntent = await detectToolIntent(updatedMessage);

  if (toolIntent) {
    console.log(`✅ Tool intent detected [${toolIntent.via}]: ${toolIntent.tool_call}`);

    if (toolIntent.via === "api") {
      // Direct route — return to chat.js which POSTs to /agent-flows/
      return { tool_call: toolIntent.tool_call, parameters: toolIntent.parameters };
    }

    if (toolIntent.via === "agent") {
      // Spin up an agent invocation so the aibitat plugin handles it
      const { WorkspaceAgentInvocation } = require("../../models/workspaceAgentInvocation");

      const { invocation: agentInvocation } = await WorkspaceAgentInvocation.new({
        prompt: updatedMessage,
        workspace,
        user,
        thread,
      });

      if (!agentInvocation) {
        console.warn(`⚠️ Could not start agent for tool: ${toolIntent.tool_call} — falling through to normal chat`);
        // Fall through — don't return, let the stream run
      } else {
        writeResponseChunk(response, {
          id: uuid,
          type: "agentInitWebsocketConnection",
          textResponse: null,
          sources: [],
          close: false,
          error: null,
          websocketUUID: agentInvocation.uuid,
        });

        writeResponseChunk(response, {
          id: uuid,
          type: "statusResponse",
          textResponse: `Opening ${toolIntent.tool_call}...`,
          sources: [],
          close: true,
          error: null,
          animate: true,
        });

        return;
      }
    }
  }

  console.log("ℹ️ No tool intent detected — proceeding with normal stream");
  // ─────────────────────────────────────────────────────────────────────────

  // Non-streaming path
  if (LLMConnector.streamingEnabled() !== true) {
    console.log(
      `\x1b[31m[STREAMING DISABLED]\x1b[0m Streaming not available for ${LLMConnector.constructor.name}.`
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
    // Streaming path
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
}

module.exports = {
  VALID_CHAT_MODE,
  streamChatWithWorkspace,
};
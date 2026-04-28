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
const { getVectorDbClass, getLLMProvider } = require("../utils/helpers");
const {
  intelligentRetrievalWithExpansion,
  hasDocuments,
  formatContextForLLM,
} = require("./intelligentRetrieval");
const { WorkspaceChats } = require("../models/workspaceChats");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { grepAgents } = require("../utils/chats/agents");

function chatEndpoints(app) {
  if (!app) return;

  /**
   * Legacy fallback for specific question number queries
   */
  async function getQuestionContext(workspace, questionNumber) {
    const VectorDb = getVectorDbClass();
    try {
      const results = await VectorDb.performSimilaritySearch({
        namespace: workspace.slug,
        input: `Question ${questionNumber}`,
        similarityThreshold: 0.1,
        topN: 1,
        filterMetadata: { questionNumber: parseInt(questionNumber) },
      });
      if (results && results.length > 0) {
        return JSON.parse(results[0].metadata.questionData || "{}");
      }
      return null;
    } catch (error) {
      console.error("Legacy getQuestionContext error:", error.message);
      return null;
    }
  }

  function extractSubjectFromMessage(message) {
    const lowerMsg = message.toLowerCase();
    const subjects = {
      biology: ["biology", "bio", "cells", "plants", "animals", "photosynthesis"],
      chemistry: ["chemistry", "chem", "reactions", "elements", "compounds"],
      physics: ["physics", "motion", "energy", "forces", "electricity"],
      mathematics: ["math", "mathematics", "algebra", "geometry", "calculus"],
      history: ["history", "historical", "war", "independence"],
      geography: ["geography", "maps", "continents", "climate"],
      english: ["english", "literature", "grammar", "writing"],
    };
    for (const [subject, keywords] of Object.entries(subjects)) {
      if (keywords.some((kw) => lowerMsg.includes(kw))) {
        return subject.charAt(0).toUpperCase() + subject.slice(1);
      }
    }
    return "General";
  }

  async function getStudentQuizHistory(userId, limit = 20) {
    const results = await prisma.quiz_results.findMany({
      where: { user_id: userId },
      orderBy: { submitted_at: "desc" },
      take: limit,
      select: {
        subject: true,
        score: true,
        total_questions: true,
        correct_answers: true,
        submitted_at: true,
        quiz_code: true,
        detailed_feedback: true,
      },
    });

    if (!results.length) return null;

    const quizContextBlocks = results.map((r, i) => {
      const date = new Date(r.submitted_at).toLocaleDateString();
      let feedback = [];
      try {
        feedback = JSON.parse(r.detailed_feedback || "[]");
      } catch {
        feedback = [];
      }

      const incorrect = feedback.filter((f) =>
        f.type === "multiple-choice" ? !f.isCorrect : f.pointsEarned < f.pointsPossible
      );
      const correct = feedback.filter((f) =>
        f.type === "multiple-choice" ? f.isCorrect : f.pointsEarned >= f.pointsPossible
      );

      const struggledDetail = incorrect
        .map((f) => {
          if (f.type === "multiple-choice") {
            return `  - Q${f.questionNumber}: "${f.question ?? "N/A"}"
  Student answered: ${f.studentAnswer ?? "No answer recorded"} | Correct: ${f.correctAnswer ?? "N/A"}
  AI Feedback: ${f.explanation ?? "No feedback available"}`;
          } else {
            return `  - Q${f.questionNumber}: "${f.question ?? "N/A"}"
  Student answered: "${f.studentAnswer ?? "No answer recorded"}"
  Score: ${f.pointsEarned ?? 0}/${f.pointsPossible ?? 0}
  AI Feedback: ${f.explanation?.substring(0, 200) ?? "No feedback available"}...`;
          }
        })
        .join("\n");

      return `Quiz ${i + 1}: ${r.subject} on ${date}
  Overall Score: ${r.score}% (${r.correct_answers}/${r.total_questions})
  Questions answered correctly: ${correct.length}
  Questions struggled with: ${incorrect.length}
${struggledDetail ? `  Struggled questions:\n${struggledDetail}` : "  No struggled questions."}`;
    });

    const subjectMap = {};
    for (const r of results) {
      if (!subjectMap[r.subject]) subjectMap[r.subject] = [];
      subjectMap[r.subject].push(r.score);
    }

    const weakSubjects = Object.entries(subjectMap)
      .map(([subject, scores]) => ({
        subject,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .filter((s) => s.avg < 60)
      .map((s) => `${s.subject} (avg ${Math.round(s.avg)}%)`)
      .join(", ");

    const summary = results
      .map((r, i) => {
        const date = new Date(r.submitted_at).toLocaleDateString();
        return `${i + 1}. ${r.subject} — ${r.score}% (${r.correct_answers}/${r.total_questions}) on ${date}`;
      })
      .join("\n");

    return { summary, weakSubjects, quizContextBlocks, raw: results };
  }

  // ============================================================
  // 🧠 SHARED: Intelligent retrieval helper
  // ============================================================
  async function runIntelligentRetrieval(message, workspace) {
    let enhancedMessage = message;
    let retrievedContext = null;
    let retrievalMetadata = {
      attempted: false,
      successful: false,
      resultsCount: 0,
      method: null,
    };

    const workspaceHasDocuments = await hasDocuments(workspace);

    if (!workspaceHasDocuments) {
      console.log("📭 No documents in workspace - skipping retrieval");
      return { enhancedMessage, retrievedContext, retrievalMetadata };
    }

    console.log("📚 Workspace has documents - running intelligent retrieval");
    retrievalMetadata.attempted = true;

    try {
      const LLMConnector = getLLMProvider({
        provider: process.env.LLM_PROVIDER,
        model: process.env.LLM_MODEL,
      });

      const questionMatch = message.match(/(?:question|q\.?)\s*(\d+)/i);
      const isSpecificQuestion = !!questionMatch;

      const results = await intelligentRetrievalWithExpansion(message, workspace, {
        maxResults: isSpecificQuestion ? 3 : 5,
        enableExpansion: !isSpecificQuestion,
        enableMetadata: true,
        LLMConnector,
      });

      if (results && results.length > 0) {
        console.log(`✅ Retrieved ${results.length} relevant documents`);
        retrievalMetadata.successful = true;
        retrievalMetadata.resultsCount = results.length;
        retrievalMetadata.method = "intelligent_retrieval";

        retrievedContext = formatContextForLLM(results, message);
        enhancedMessage = `${retrievedContext}\n\n---\n\nStudent Question: ${message}`;

        console.log("🎯 Message enhanced with document context");
      } else {
        console.log("ℹ️ No relevant documents found for this query");
      }
    } catch (retrievalError) {
      console.error("⚠️ Intelligent retrieval failed:", retrievalError.message);

      const questionMatch = message.match(/(?:question|q\.?)\s*(\d+)/i);
      if (questionMatch) {
        const questionNum = parseInt(questionMatch[1]);
        console.log(`🔄 Fallback: Trying legacy method for Question ${questionNum}`);

        const questionContext = await getQuestionContext(workspace, questionNum);

        if (questionContext) {
          console.log(`✅ Found Question ${questionNum} via legacy method`);
          retrievalMetadata.successful = true;
          retrievalMetadata.resultsCount = 1;
          retrievalMetadata.method = "legacy_fallback";

          enhancedMessage = `The student is asking about Question ${questionNum} from their uploaded exam paper.

Here is Question ${questionNum}:
${questionContext.text}

${
  questionContext.type === "multiple_choice"
    ? `Options:\n${questionContext.options.map((o) => `${o.letter}) ${o.text}`).join("\n")}`
    : ""
}

${
  questionContext.markScheme?.length > 0
    ? `Mark Scheme:\n${questionContext.markScheme.join("\n")}`
    : ""
}

Student's question: ${message}

Please help them with this specific question.`;
        }
      }

      console.log("ℹ️ Continuing without document context");
    }

    return { enhancedMessage, retrievedContext, retrievalMetadata };
  }

  // ============================================================
  // 🧠 SHARED: Quiz history helper
  // ============================================================
  async function buildQuizHistoryContext(userId) {
    if (!userId) return "";
    try {
      const quizHistory = await getStudentQuizHistory(userId, 20);
      if (!quizHistory) return "";

      console.log("📊 Quiz history injected into context");
      return `
== Student Quiz History ==
Recent Quizzes:
${quizHistory.summary}

${quizHistory.weakSubjects
  ? `Subjects needing attention: ${quizHistory.weakSubjects}`
  : "No consistently weak subjects detected."}

Detailed Breakdown:
${quizHistory.quizContextBlocks.join("\n\n")}
==========================
`;
    } catch (err) {
      console.error("⚠️ Failed to load quiz history:", err.message);
      return "";
    }
  }

  // ============================================================
  // POST /workspace/:slug/stream-chat
  // ============================================================
  app.post(
    "/workspace/:slug/stream-chat",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { message, attachments = [] } = reqBody(request);
        const workspace = response.locals.workspace;

        if (!message?.length) {
          return response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: "Message is empty.",
          });
        }

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();

        // ✅ FIX: Strip injected prefix tags before passing to grepAgents.
        // The client prepends tags like [Subject: X] [Grade: Y] to the message
        // for LLM context, but grepAgents tries to JSON.parse the message which
        // breaks if those tags are present.
        const rawMessage = message.replace(/^(\[[^\]]+\]\s*)+/, '').trim();

        const isAgentInvocation = await grepAgents({
          uuid: uuidv4(),
          response,
          message: rawMessage,
          workspace,
          user,
          thread: null,
        });

        if (isAgentInvocation) return;

        // 🧠 Intelligent retrieval
        const { enhancedMessage, retrievedContext, retrievalMetadata } =
          await runIntelligentRetrieval(message, workspace);

        // Log successful retrieval
        if (retrievalMetadata.successful) {
          await EventLogs.logEvent(
            "intelligent_retrieval_success",
            {
              query: message.substring(0, 100),
              resultsCount: retrievalMetadata.resultsCount,
              workspaceName: workspace.name,
            },
            user?.id
          );
        }

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

        // 📊 Quiz history (passed as extra context, separate from the message)
        const quizHistoryContext = await buildQuizHistoryContext(user?.id);

        // 🎓 Fetch student profile for grade and curriculum
        let studentProfile = null;
        if (user?.id) {
          try {
            studentProfile = await prisma.students.findFirst({
              where: { user_id: Number(user.id) },
              select: { grade: true, curriculum: true },
            });
          } catch (_) {}
        }

        const extraContext = [
          quizHistoryContext,
          retrievedContext || "",
        ].filter(Boolean).join("\n\n");

        const result = await streamChatWithWorkspace(
          response,
          workspace,
          message,                // ← saved to DB: clean original message only
          workspace?.chatMode,
          user,
          null,
          attachments,
          extraContext            // LLM context: quiz history + document context
        );

        // ============================================================
        // 🧩 TOOL CALL HANDLING
        // ============================================================
console.log("🔎 DEBUG streamChatWithWorkspace result:", JSON.stringify(result));

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
            const enhancedParams = {
              ...params,
              userId: user?.id,
              workspaceSlug: workspace.slug,
              userMessage: message,
              subject: params.subject || extractSubjectFromMessage(message),
              topic: params.topic || params.subject || extractSubjectFromMessage(message),
              grade: params.grade || studentProfile?.grade || "10",
              numQuestions: params.numQuestions || 5,
              difficulty: params.difficulty || "medium",
            };

            const apiBase = process.env.API_BASE || "http://localhost:3001";
            const quizRes = await fetch(`${apiBase}/api/agent-flows/quiz/create`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: request.headers.authorization || "",
              },
              body: JSON.stringify(enhancedParams),
            });

            if (!quizRes.ok) throw new Error(`Quiz API failed: ${quizRes.status}`);
            const quizData = await quizRes.json();

            writeResponseChunk(response, {
              id: uuidv4(),
              type: "data",
              textResponse: "",
              role: "assistant",
              tool_call: "quiz_create",
              quiz: quizData.quiz || {},
              savedQuizId: quizData.savedQuizId ?? null,
              close: false,
            });
            writeResponseChunk(response, {
              uuid: uuidv4(),
              type: "finalizeResponseStream",
              close: true,
              error: false,
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
              topic: params.topic || params.subject || extractSubjectFromMessage(message),
              grade: params.grade || studentProfile?.grade || "10",
              numCards: params.numCards || 5,
              difficulty: params.difficulty || "medium",
            };

            const apiBase = process.env.API_BASE || "http://localhost:3001";
            const flashcardRes = await fetch(`${apiBase}/api/agent-flows/flashcard/create`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: request.headers.authorization || "",
              },
              body: JSON.stringify(enhancedParams),
            });

            if (!flashcardRes.ok) throw new Error(`Flashcard API failed: ${flashcardRes.status}`);
            const flashcardData = await flashcardRes.json();

            writeResponseChunk(response, {
              id: uuidv4(),
              type: "data",
              textResponse: "",
              role: "assistant",
              tool_call: "flashcard_create",
              flashcards: flashcardData.flashcards || {},
              savedFlashcardSetId: flashcardData.savedFlashcardSetId ?? null,
              close: false,
            });
            writeResponseChunk(response, {
              uuid: uuidv4(),
              type: "finalizeResponseStream",
              close: true,
              error: false,
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

        if (result?.tool_call === "web_search") {
          console.log("⚙️ Tool call detected: web_search");
          writeResponseChunk(response, {
            id: uuidv4(),
            type: "textResponseChunk",
            textResponse: "🔎 *Searching the web for information...*\n\n",
            role: "assistant",
            close: false,
          });

          try {
            const params = result.parameters || {};
            const searchParams = {
              query: params.query || message,
              provider: params.provider || "tavily",
              numResults: params.numResults || 5,
            };

            const apiBase = process.env.API_BASE || "http://localhost:3001";
            const searchRes = await fetch(`${apiBase}/api/agent-flows/web-search`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: request.headers.authorization || "",
              },
              body: JSON.stringify(searchParams),
            });

            if (!searchRes.ok) throw new Error(`Web search API failed: ${searchRes.status}`);
            const searchData = await searchRes.json();
            const results = searchData.results || [];

            if (results.length === 0) {
              writeResponseChunk(response, {
                id: uuidv4(),
                type: "textResponseChunk",
                textResponse: "I couldn't find any relevant results on the web for that query.",
                close: true,
                error: false,
              });
              return;
            }

            const contextBlock = results
              .map((r, i) => `[Source ${i + 1}]: ${r.title}\nURL: ${r.url}\nContent: ${r.snippet}`)
              .join("\n\n");

            const synthesisPrompt = `
You are Chikoro AI, a helpful study assistant.
The user asked: "${message}"

I have performed a web search and found the following results:
---
${contextBlock}
---

INSTRUCTIONS:
1. Synthesize a clear, conversational answer to the user's question based ONLY on the search results above.
2. Do not just list the results. Explain the answer naturally.
3. If the results do not fully answer the question, admit what is missing.
4. Cite your sources using [Source X] notation where appropriate.
5. Format your response with Markdown for readability.
`;

            const LLMConnector = getLLMProvider({
              provider: workspace?.chatProvider,
              model: workspace?.chatModel,
            });

            const stream = await LLMConnector.streamGetChatCompletion(
              [
                {
                  role: "system",
                  content:
                    "You are a helpful research assistant. Provide direct answers based on the search results provided. Do NOT use any tools.",
                },
                { role: "user", content: synthesisPrompt },
              ],
              { temperature: 0.1}
            );

            const synthesizedText = await LLMConnector.handleStream(response, stream, {
              uuid: uuidv4(),
              sources: results.map((r) => ({ title: r.title, url: r.url, text: r.snippet })),
            });

            if (synthesizedText?.length > 0) {
              await WorkspaceChats.new({
                workspaceId: workspace.id,
                prompt: message,
                response: {
                  text: "🔎 *Searching the web for information...*\n\n" + synthesizedText,
                  sources: results.map((r) => ({ title: r.title, url: r.url, text: r.snippet })),
                  type: workspace?.chatMode || "chat",
                  attachments: [],
                  metrics: stream.metrics || {},
                },
                threadId: null,
                user,
              });
              console.log("💾 Web search conversation saved");
            }

            writeResponseChunk(response, {
              uuid: uuidv4(),
              type: "finalizeResponseStream",
              close: true,
              error: false,
              metrics: stream.metrics || {},
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

        await Telemetry.sendTelemetry("sent_chat", {
          multiUserMode: multiUserMode(response),
          LLMSelection: process.env.LLM_PROVIDER || "ollama",
          Embedder: process.env.EMBEDDING_ENGINE || "ollama",
          VectorDbSelection: process.env.VECTOR_DB || "pgvector",
          multiModal: Array.isArray(attachments) && attachments?.length !== 0,
          TTSSelection: process.env.TTS_PROVIDER || "native",
          LLMModel: getModelTag(),
          retrievalAttempted: retrievalMetadata.attempted,
          retrievalSuccessful: retrievalMetadata.successful,
          retrievalMethod: retrievalMetadata.method,
        });

        await EventLogs.logEvent(
          "sent_chat",
          {
            workspaceName: workspace?.name,
            chatModel: workspace?.chatModel || "gpt-oss:20b",
            hasDocumentContext: retrievalMetadata.successful,
            documentsRetrieved: retrievalMetadata.resultsCount,
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

  // ============================================================
  // POST /workspace/:slug/thread/:threadSlug/stream-chat
  // ============================================================
  app.post(
    "/workspace/:slug/thread/:threadSlug/stream-chat",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceAndThreadSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { message, attachments = [] } = reqBody(request);
        const workspace = response.locals.workspace;
        const thread = response.locals.thread;

        // ✅ FIX: Strip injected prefix tags before passing to grepAgents.
        // Already used for agent invocation; also used for thread auto-rename below.
        const rawMessage = message.replace(/^(\[[^\]]+\]\s*)+/, '').trim();

        if (!message?.length) {
          return response.status(400).json({
            id: uuidv4(),
            type: "abort",
            textResponse: null,
            sources: [],
            close: true,
            error: "Message is empty.",
          });
        }

        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Connection", "keep-alive");
        response.flushHeaders();

        const isAgentInvocation = await grepAgents({
          uuid: uuidv4(),
          response,
          message: rawMessage,  // ✅ stripped message — no prefix tags
          workspace,
          user,
          thread: thread,
        });

        if (isAgentInvocation) return;

        // 🧠 Intelligent retrieval (shared helper — same logic as workspace endpoint)
        const { enhancedMessage, retrievedContext, retrievalMetadata } =
          await runIntelligentRetrieval(message, workspace);

        if (retrievalMetadata.successful) {
          await EventLogs.logEvent(
            "intelligent_retrieval_success",
            {
              query: message.substring(0, 100),
              resultsCount: retrievalMetadata.resultsCount,
              workspaceName: workspace.name,
              threadName: thread.name,
            },
            user?.id
          );
        }

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

        // 📊 Quiz history
        const quizHistoryContext = await buildQuizHistoryContext(user?.id);

        const extraContext = [
          quizHistoryContext,
          retrievedContext || "",
        ].filter(Boolean).join("\n\n");

        await streamChatWithWorkspace(
          response,
          workspace,
          message,                // ← saved to DB: clean original message only
          workspace?.chatMode,
          user,
          thread,
          attachments,
          extraContext            // LLM context: quiz history + document context
        );

        await WorkspaceThread.autoRenameThread({
          thread,
          workspace,
          user,
          newName: truncate(rawMessage, 22),  // ✅ use rawMessage so thread name is clean
          onRename: (thread) => {
            writeResponseChunk(response, {
              action: "rename_thread",
              thread: { slug: thread.slug, name: thread.name },
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
          retrievalAttempted: retrievalMetadata.attempted,
          retrievalSuccessful: retrievalMetadata.successful,
          retrievalMethod: retrievalMetadata.method,
        });

        await EventLogs.logEvent(
          "sent_chat",
          {
            workspaceName: workspace.name,
            thread: thread.name,
            chatModel: workspace?.chatModel || "gpt-oss:20b",
            hasDocumentContext: retrievalMetadata.successful,
            documentsRetrieved: retrievalMetadata.resultsCount,
          },
          user?.id
        );

        response.end();
      } catch (e) {
        console.error("🔥 Thread chat stream error:", e);
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
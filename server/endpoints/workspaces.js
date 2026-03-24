const path = require("path");
const fs = require("fs");
const {
  reqBody,
  multiUserMode,
  userFromSession,
  safeJsonParse,
} = require("../utils/http");
const { normalizePath, isWithin } = require("../utils/files");
const { Workspace } = require("../models/workspace");
const { Document } = require("../models/documents");
const { DocumentVectors } = require("../models/vectors");
const { WorkspaceChats } = require("../models/workspaceChats");
const { getVectorDbClass, getLLMProvider } = require("../utils/helpers");
const { handleFileUpload, handlePfpUpload, handleExamUpload } = require("../utils/files/multer");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const {
  WorkspaceSuggestedMessages,
} = require("../models/workspacesSuggestedMessages");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const { convertToChatHistory } = require("../utils/helpers/chat/responses");
const { CollectorApi } = require("../utils/collectorApi");
const {
  determineWorkspacePfpFilepath,
  fetchPfp,
} = require("../utils/files/pfp");
const { getTTSProvider } = require("../utils/TextToSpeech");
const { WorkspaceThread } = require("../models/workspaceThread");
const truncate = require("truncate");
const { purgeDocument } = require("../utils/files/purgeDocument");
const { getModelTag } = require("./utils");
const { searchWorkspaceAndThreads } = require("../utils/helpers/search");
const { workspaceParsedFilesEndpoints } = require("./workspacesParsedFiles");
const {
  extractQuestionsInChunks,
  mergeQuestionsWithMarkScheme,
  parseQuestionsWithMetadata,
} = require("./questionExtractor");
const {
  analyzeImageWithVision,
  generateEmbeddableContent,
} = require("./Imageextractor");

// ============================================================
// 🔧 SHARED HELPER: Embed per-question chunks with metadata
//
// Called after any standard PDF upload to add question-level
// metadata so metadataSearch can find specific questions by number.
// Runs fire-and-forget — does not block the upload response.
// ============================================================
async function embedQuestionsWithMetadata(workspace, document, originalname, userId) {
  try {
    // FIX: asPdf calls writeToServerDocuments which writes pageContent to a JSON file on
    // disk and returns only { id, location }. So document.pageContent is always undefined
    // at this point. We must read the content back from the stored JSON file on disk.
    let examContent =
      document.pageContent ||
      (Array.isArray(document)
        ? document.map((d) => d.pageContent).filter(Boolean).join("\n\n")
        : "");

    if ((!examContent || examContent.trim().length < 100) && document.location) {
      try {
        const { documentsPath } = require("../utils/files");
        const docFilePath = path.join(documentsPath, document.location);
        if (fs.existsSync(docFilePath)) {
          const raw = fs.readFileSync(docFilePath, "utf-8");
          const parsed = JSON.parse(raw);
          examContent = parsed.pageContent || parsed.content || "";
          console.log("Read pageContent from disk: " + examContent.length + " chars");
        } else {
          console.log("embedQuestionsWithMetadata: doc file not found at " + docFilePath);
        }
      } catch (readErr) {
        console.error("embedQuestionsWithMetadata: failed reading from disk:", readErr.message);
      }
    }

    if (!examContent || examContent.trim().length < 100) {
      console.log("embedQuestionsWithMetadata: no content for \"" + originalname + "\" — skipping.");
      console.log("document keys: " + Object.keys(document || {}).join(", "));
      return;
    }

    console.log("embedQuestionsWithMetadata: extracting from " + examContent.length + " chars");

    const extracted = await extractQuestionsInChunks(examContent, "exam");
    const parsedQuestions = parseQuestionsWithMetadata(extracted);

    if (!parsedQuestions?.length) {
      console.log("ℹ️ No questions extracted — skipping per-question embedding");
      return;
    }

    const VectorDb = getVectorDbClass();

    for (const question of parsedQuestions) {
      const questionText = `Question ${question.questionNumber}: ${question.text}`;
      const fullContext =
        question.type === "multiple_choice"
          ? `${questionText}\n${question.options
              .map((o) => `${o.letter}) ${o.text}`)
              .join("\n")}`
          : `${questionText}\n${
              question.markScheme?.length > 0
                ? "Mark Scheme:\n" + question.markScheme.join("\n")
                : ""
            }`;

      await VectorDb.addDocumentToNamespace(
        workspace.slug,
        {
          content: fullContext,
          metadata: {
            questionNumber: question.questionNumber,
            type: question.type,
            source: originalname,
            workspaceId: workspace.id,
            userId,
            questionData: JSON.stringify(question),
          },
        },
        originalname
      );
    }

    console.log(
      `✅ Embedded ${parsedQuestions.length} questions with metadata for "${originalname}"`
    );
  } catch (err) {
    console.error("embedQuestionsWithMetadata error:", err.message);
  }
}

// ============================================================
// 🔧 SHARED HELPER: Get or create teacher workspace
// ============================================================
async function getTeacherWorkspace(user) {
  if (!user || user.role !== "teacher") return null;

  let workspace = await Workspace.get({ slug: `teacher-${user.id}` });

  if (!workspace) {
    const { workspace: newWorkspace, message } = await Workspace.new(
      `${user.username}'s Teaching Workspace`,
      user.id
    );

    if (!newWorkspace) {
      console.error("Failed to create teacher workspace:", message);
      return null;
    }

    const updateResult = await Workspace.update(newWorkspace.id, {
      slug: `teacher-${user.id}`,
    });

    if (!updateResult.workspace) {
      console.error("Failed to update workspace slug:", updateResult.message);
      return null;
    }

    workspace = await Workspace.get({ id: newWorkspace.id });
  }

  return workspace;
}

// ============================================================
// 🔧 FIXED: processFileAsync — removed undefined notifyUser/userId
// ============================================================
async function processFileAsync(slug, originalname, userId = null) {
  try {
    const Collector = new CollectorApi();
    const { success, documents } = await Collector.processDocument(originalname);

    if (success && documents?.length > 0) {
      const workspace = await Workspace.get({ slug });
      if (!workspace) {
        console.error(`processFileAsync: workspace not found for slug "${slug}"`);
        return;
      }
      await Document.addDocuments(workspace, [documents[0].location], userId);
      console.log(`✅ processFileAsync: embedded "${originalname}" into workspace "${slug}"`);
    }
  } catch (err) {
    console.error(`❌ processFileAsync failed for "${originalname}":`, err.message);
  }
}

function workspaceEndpoints(app) {
  if (!app) return;
  const responseCache = new Map();

  app.post(
    "/workspace/new",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager, ROLES.teacher, ROLES.student])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { name = null, onboardingComplete = false } = reqBody(request);
        const { workspace, message } = await Workspace.new(name, user?.id);
        await Telemetry.sendTelemetry(
          "workspace_created",
          {
            multiUserMode: multiUserMode(response),
            LLMSelection: process.env.LLM_PROVIDER || "ollama",
            Embedder: process.env.EMBEDDING_ENGINE || "ollama",
            VectorDbSelection: process.env.VECTOR_DB || "pgvector",
            TTSSelection: process.env.TTS_PROVIDER || "native",
            LLMModel: getModelTag(),
          },
          user?.id
        );
        await EventLogs.logEvent(
          "workspace_created",
          { workspaceName: workspace?.name || "Unknown Workspace" },
          user?.id
        );
        if (onboardingComplete === true)
          await Telemetry.sendTelemetry("onboarding_complete");
        response.status(200).json({ workspace, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/update",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager, ROLES.teacher, ROLES.student])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const data = reqBody(request);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        await Workspace.trackChange(currWorkspace, data, user);
        const { workspace, message } = await Workspace.update(currWorkspace.id, data);
        response.status(200).json({ workspace, message });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/upload",
    [validatedRequest, flexUserRoleValid([ROLES.all]), handleFileUpload],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) return response.sendStatus(400).end();

        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          return response.status(500).json({
            success: false,
            error: `The school library assistant is currently offline.`,
          });
        }

        const { success, reason, documents = [] } = await Collector.processDocument(originalname);
        if (!success) {
          return response.status(500).json({ success: false, error: reason });
        }

        if (documents.length > 0) {
          await Document.addDocuments(
            currWorkspace,
            documents.map((d) => d.location),
            user?.id
          );
        }

        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent(
          "document_uploaded",
          { documentName: originalname, autoEmbedded: true },
          user?.id
        );

        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/upload-link",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const Collector = new CollectorApi();
        const { link = "" } = reqBody(request);
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          return response.status(500).json({
            success: false,
            error: `Document processing API is not online. Link ${link} will not be processed automatically.`,
          });
        }

        const { success, reason } = await Collector.processLink(link);
        if (!success) {
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(`Link ${link} uploaded processed and successfully. It is now available in documents.`);
        await Telemetry.sendTelemetry("link_uploaded");
        await EventLogs.logEvent("link_uploaded", { link }, response.locals?.user?.id);
        response.status(200).json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/update-embeddings",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager, ROLES.teacher, ROLES.student])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const { slug = null } = request.params;
        const { adds = [], deletes = [] } = reqBody(request);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        await Document.removeDocuments(currWorkspace, deletes, response.locals?.user?.id);
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          adds,
          response.locals?.user?.id
        );
        const updatedWorkspace = await Workspace.get({ id: currWorkspace.id });
        response.status(200).json({
          workspace: updatedWorkspace,
          message:
            failedToEmbed.length > 0
              ? `${failedToEmbed.length} documents failed to add.\n\n${errors.map((msg) => `${msg}`).join("\n\n")}`
              : null,
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        await WorkspaceChats.delete({ workspaceId: Number(workspace.id) });
        await DocumentVectors.deleteForWorkspace(workspace.id);
        await Document.delete({ workspaceId: Number(workspace.id) });
        await Workspace.delete({ id: Number(workspace.id) });

        await EventLogs.logEvent(
          "workspace_deleted",
          { workspaceName: workspace?.name || "Unknown Workspace" },
          response.locals?.user?.id
        );

        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          console.error(e.message);
        }
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/reset-vector-db",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { slug = "" } = request.params;
        const user = await userFromSession(request, response);
        const VectorDb = getVectorDbClass();
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        await DocumentVectors.deleteForWorkspace(workspace.id);
        await Document.delete({ workspaceId: Number(workspace.id) });

        await EventLogs.logEvent(
          "workspace_vectors_reset",
          { workspaceName: workspace?.name || "Unknown Workspace" },
          response.locals?.user?.id
        );

        try {
          await VectorDb["delete-namespace"]({ namespace: slug });
        } catch (e) {
          console.error(e.message);
        }
        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspaces",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspaces = multiUserMode(response)
          ? await Workspace.whereWithUser(user)
          : await Workspace.where();
        response.status(200).json({ workspaces });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });
        response.status(200).json({ workspace });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/chats",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { slug } = request.params;
        const user = await userFromSession(request, response);
        const workspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!workspace) {
          response.sendStatus(400).end();
          return;
        }

        const history = multiUserMode(response)
          ? await WorkspaceChats.forWorkspaceByUser(workspace.id, user.id)
          : await WorkspaceChats.forWorkspace(workspace.id);
        response.status(200).json({ history: convertToChatHistory(history) });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/delete-chats",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatIds = [] } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        if (!workspace || !Array.isArray(chatIds)) {
          response.sendStatus(400).end();
          return;
        }

        await WorkspaceChats.delete({
          id: { in: chatIds.map((id) => Number(id)) },
          user_id: user?.id ?? null,
          workspaceId: workspace.id,
        });

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/delete-edited-chats",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { startingId } = reqBody(request);
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        await WorkspaceChats.delete({
          workspaceId: workspace.id,
          thread_id: null,
          user_id: user?.id,
          id: { gte: Number(startingId) },
        });

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/update-chat",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatId, newText = null } = reqBody(request);
        if (!newText || !String(newText).trim())
          throw new Error("Cannot save empty response");

        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const existingChat = await WorkspaceChats.get({
          workspaceId: workspace.id,
          thread_id: null,
          user_id: user?.id,
          id: Number(chatId),
        });
        if (!existingChat) throw new Error("Invalid chat.");

        const chatResponse = safeJsonParse(existingChat.response, null);
        if (!chatResponse) throw new Error("Failed to parse chat response");

        await WorkspaceChats._update(existingChat.id, {
          response: JSON.stringify({ ...chatResponse, text: String(newText) }),
        });

        response.sendStatus(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/chat-feedback/:chatId",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { chatId } = request.params;
        const { feedback = null } = reqBody(request);
        const existingChat = await WorkspaceChats.get({
          id: Number(chatId),
          workspaceId: response.locals.workspace.id,
        });

        if (!existingChat) {
          response.status(404).end();
          return;
        }

        const result = await WorkspaceChats.updateFeedbackScore(chatId, feedback);
        response.status(200).json({ success: result });
      } catch (error) {
        console.error("Error updating chat feedback:", error);
        response.status(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/suggested-messages",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const suggestedMessages = await WorkspaceSuggestedMessages.getMessages(slug);
        response.status(200).json({ success: true, suggestedMessages });
      } catch (error) {
        console.error("Error fetching suggested messages:", error);
        response.status(500).json({ success: false, message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/suggested-messages",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async (request, response) => {
      try {
        const { messages = [] } = reqBody(request);
        const { slug } = request.params;
        if (!Array.isArray(messages)) {
          return response.status(400).json({
            success: false,
            message: "Invalid message format. Expected an array of messages.",
          });
        }

        await WorkspaceSuggestedMessages.saveAll(messages, slug);
        return response.status(200).json({
          success: true,
          message: "Suggested messages saved successfully.",
        });
      } catch (error) {
        console.error("Error processing the suggested messages:", error);
        response.status(500).json({
          success: true,
          message: "Error saving the suggested messages.",
        });
      }
    }
  );

  app.post(
    "/workspace/:slug/update-pin",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { docPath, pinStatus = false } = reqBody(request);
        const workspace = response.locals.workspace;

        const document = await Document.get({
          workspaceId: workspace.id,
          docpath: docPath,
        });
        if (!document) return response.sendStatus(404).end();

        await Document.update(document.id, { pinned: pinStatus });
        return response.status(200).end();
      } catch (error) {
        console.error("Error processing the pin status update:", error);
        return response.status(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/tts/:chatId",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async function (request, response) {
      try {
        const { chatId } = request.params;
        const workspace = response.locals.workspace;
        const cacheKey = `${workspace.slug}:${chatId}`;
        const wsChat = await WorkspaceChats.get({
          id: Number(chatId),
          workspaceId: workspace.id,
        });

        const cachedResponse = responseCache.get(cacheKey);
        if (cachedResponse) {
          response.writeHead(200, { "Content-Type": cachedResponse.mime || "audio/mpeg" });
          response.end(cachedResponse.buffer);
          return;
        }

        const text = safeJsonParse(wsChat.response, null)?.text;
        if (!text) return response.sendStatus(204).end();

        const TTSProvider = getTTSProvider();
        const buffer = await TTSProvider.ttsBuffer(text);
        if (buffer === null) return response.sendStatus(204).end();

        responseCache.set(cacheKey, { buffer, mime: "audio/mpeg" });
        response.writeHead(200, { "Content-Type": "audio/mpeg" });
        response.end(buffer);
        return;
      } catch (error) {
        console.error("Error processing the TTS request:", error);
        response.status(500).json({ message: "TTS could not be completed" });
      }
    }
  );

  app.get(
    "/workspace/:slug/pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const cachedResponse = responseCache.get(slug);

        if (cachedResponse) {
          response.writeHead(200, { "Content-Type": cachedResponse.mime || "image/png" });
          response.end(cachedResponse.buffer);
          return;
        }

        const pfpPath = await determineWorkspacePfpFilepath(slug);
        if (!pfpPath) {
          response.sendStatus(204).end();
          return;
        }

        const { found, buffer, mime } = fetchPfp(pfpPath);
        if (!found) {
          response.sendStatus(204).end();
          return;
        }

        responseCache.set(slug, { buffer, mime });
        response.writeHead(200, { "Content-Type": mime || "image/png" });
        response.end(buffer);
        return;
      } catch (error) {
        console.error("Error processing the logo request:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/upload-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.all]), handlePfpUpload],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const uploadedFileName = request.randomFileName;
        if (!uploadedFileName) {
          return response.status(400).json({ message: "File upload failed." });
        }

        const workspaceRecord = await Workspace.get({ slug });
        const oldPfpFilename = workspaceRecord.pfpFilename;
        if (oldPfpFilename) {
          const storagePath = path.join(__dirname, "../storage/assets/pfp");
          const oldPfpPath = path.join(storagePath, normalizePath(workspaceRecord.pfpFilename));
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          if (fs.existsSync(oldPfpPath)) fs.unlinkSync(oldPfpPath);
        }

        const { workspace, message } = await Workspace._update(workspaceRecord.id, {
          pfpFilename: uploadedFileName,
        });

        return response.status(workspace ? 200 : 500).json({
          message: workspace ? "Profile picture uploaded successfully." : message,
        });
      } catch (error) {
        console.error("Error processing the profile picture upload:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.delete(
    "/workspace/:slug/remove-pfp",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager])],
    async function (request, response) {
      try {
        const { slug } = request.params;
        const workspaceRecord = await Workspace.get({ slug });
        const oldPfpFilename = workspaceRecord.pfpFilename;

        if (oldPfpFilename) {
          const storagePath = path.join(__dirname, "../storage/assets/pfp");
          const oldPfpPath = path.join(storagePath, normalizePath(oldPfpFilename));
          if (!isWithin(path.resolve(storagePath), path.resolve(oldPfpPath)))
            throw new Error("Invalid path name");
          if (fs.existsSync(oldPfpPath)) fs.unlinkSync(oldPfpPath);
        }

        const { workspace, message } = await Workspace._update(workspaceRecord.id, {
          pfpFilename: null,
        });

        responseCache.delete(slug);

        return response.status(workspace ? 200 : 500).json({
          message: workspace ? "Profile picture removed successfully." : message,
        });
      } catch (error) {
        console.error("Error processing the profile picture removal:", error);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.post(
    "/workspace/:slug/thread/fork",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const { chatId, threadSlug } = reqBody(request);
        if (!chatId)
          return response.status(400).json({ message: "chatId is required" });

        const threadId = !!threadSlug
          ? (
              await WorkspaceThread.get({
                slug: String(threadSlug),
                workspace_id: workspace.id,
              })
            )?.id ?? null
          : null;

        const chatsToFork = await WorkspaceChats.where(
          {
            workspaceId: workspace.id,
            user_id: user?.id,
            include: true,
            thread_id: threadId,
            api_session_id: null,
            id: { lte: Number(chatId) },
          },
          null,
          { id: "asc" }
        );

        const { thread: newThread, message: threadError } = await WorkspaceThread.new(
          workspace,
          user?.id
        );
        if (threadError) return response.status(500).json({ error: threadError });

        let lastMessageText = "";
        const chatsData = chatsToFork.map((chat) => {
          const chatResponse = safeJsonParse(chat.response, {});
          if (chatResponse?.text) lastMessageText = chatResponse.text;
          return {
            workspaceId: workspace.id,
            prompt: chat.prompt,
            response: JSON.stringify(chatResponse),
            user_id: user?.id,
            thread_id: newThread.id,
          };
        });
        await WorkspaceChats.bulkCreate(chatsData);
        await WorkspaceThread.update(newThread, {
          name: !!lastMessageText ? truncate(lastMessageText, 22) : "Forked Thread",
        });

        await EventLogs.logEvent(
          "thread_forked",
          {
            workspaceName: workspace?.name || "Unknown Workspace",
            threadName: newThread.name,
          },
          user?.id
        );
        response.status(200).json({ newThreadSlug: newThread.slug });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ message: "Internal server error" });
      }
    }
  );

  app.put(
    "/workspace/workspace-chats/:id",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { id } = request.params;
        const user = await userFromSession(request, response);
        const validChat = await WorkspaceChats.get({
          id: Number(id),
          user_id: user?.id ?? null,
        });
        if (!validChat)
          return response.status(404).json({ success: false, error: "Chat not found." });

        await WorkspaceChats._update(validChat.id, { include: false });
        response.json({ success: true, error: null });
      } catch (e) {
        console.error(e.message, e);
        response.status(500).json({ success: false, error: "Server error" });
      }
    }
  );

  // ============================================================
  // POST /workspace/:slug/upload-and-embed
  //
  // Used by chat drag-and-drop. Returns simple JSON (not SSE).
  // Callers do NOT need to change — response shape is identical.
  //
  // UPGRADED: PDFs now trigger background question extraction so
  // per-question metadata is available for intelligent retrieval.
  // Images still go through vision analysis as before.
  // ============================================================
  app.post(
    "/workspace/:slug/upload-and-embed",
    [validatedRequest, flexUserRoleValid([ROLES.all]), handleFileUpload],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) {
          response.sendStatus(400).end();
          return;
        }

        const Collector = new CollectorApi();
        const { originalname, mimetype, path: filePath } = request.file;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          return response.status(500).json({
            success: false,
            error: `Document processing API is not online.`,
          });
        }

        // ============================================================
        // 📸 IMAGE EXTRACTOR — unchanged
        // ============================================================
        let targetFilename = originalname;

        if (mimetype.startsWith("image/")) {
          console.log(`📸 Image detected (${originalname}). Running Vision Analysis...`);
          const analysis = await analyzeImageWithVision(filePath, originalname);

          if (analysis) {
            const textContent = generateEmbeddableContent(analysis);
            const analysisFilename = `${originalname}.analysis.txt`;
            const analysisPath = `${filePath}.analysis.txt`;
            fs.writeFileSync(analysisPath, textContent);
            targetFilename = analysisFilename;
            console.log(`✅ Image analyzed. Embedding description instead of raw image.`);
          } else {
            console.log(`⚠️ Vision analysis failed. Falling back to standard processing.`);
          }
        }
        // ============================================================

        const { success, reason, documents } = await Collector.processDocument(targetFilename);

        if (!success || documents?.length === 0) {
          response.status(500).json({ success: false, error: reason }).end();
          return;
        }

        Collector.log(`Document ${targetFilename} processed successfully.`);

        await Telemetry.sendTelemetry("document_uploaded");
        await EventLogs.logEvent(
          "document_uploaded",
          { documentName: originalname },
          response.locals?.user?.id
        );

        const document = documents[0];
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          currWorkspace,
          [document.location],
          response.locals?.user?.id
        );

        if (failedToEmbed.length > 0) {
          return response.status(200).json({ success: false, error: errors?.[0], document: null });
        }

        // ✅ UPGRADED: Synchronous question extraction for PDFs.
        // We await this before responding so that per-question metadata is in the
        // vector DB by the time the student can type their first question.
        // Non-PDF files (images, text) skip this and respond immediately as before.
        const isPdf = mimetype === "application/pdf" || originalname.toLowerCase().endsWith(".pdf");
        if (isPdf && document.pageContent) {
          try {
            console.log(`📄 Extracting questions from "${originalname}" before responding...`);
            await embedQuestionsWithMetadata(currWorkspace, document, originalname, user?.id);
          } catch (err) {
            // Non-fatal — log and continue. Student can still chat, semantic search is fallback.
            console.error("⚠️ Question extraction failed (continuing anyway):", err.message);
          }
        }

        response.status(200).json({
          success: true,
          error: null,
          document: { id: document.id, location: document.location },
        });
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

app.post(
  "/workspace/:slug/upload-and-embed-content",
  [validatedRequest, flexUserRoleValid([ROLES.all]), handleFileUpload],
  async function (request, response) {
    try {
      const { slug = null } = request.params;
      const user = await userFromSession(request, response);
      const currWorkspace = multiUserMode(response)
        ? await Workspace.getWithUser(user, { slug })
        : await Workspace.get({ slug });

      if (!currWorkspace) {
        response.sendStatus(400).end();
        return;
      }

      if (!request.file) {
        return response.status(400).json({ success: false, error: "No file uploaded" });
      }

      // Set headers for streaming
      response.setHeader('Content-Type', 'text/event-stream');
      response.setHeader('Cache-Control', 'no-cache');
      response.setHeader('Connection', 'keep-alive');
      response.setHeader('X-Accel-Buffering', 'no');

      const sendProgress = (data) => {
        response.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      const Collector = new CollectorApi();
      const { 
        originalname,  // User's filename: "1000000027.jpg"
        filename,      // Multer's filename: "abc123xyz.jpeg"
        mimetype,
        path: filepath 
      } = request.file;

      // ✅ Log file details
      console.log('📁 File uploaded:', { originalname, filename, filepath, exists: fs.existsSync(filepath) });

      sendProgress({ type: 'progress', message: 'Checking document processor...', progress: 10 });

      const processingOnline = await Collector.online();
      if (!processingOnline) {
        sendProgress({ type: 'error', error: 'Document processing API is not online.' });
        response.end();
        return;
      }

      sendProgress({ type: 'progress', message: 'Processing document...', progress: 30 });

      // ============================================================
      // 📸 IMAGE EXTRACTOR INTEGRATION (FIXED)
      // ============================================================
      let targetFilename = filename; // ✅ Start with Multer's filename

      if (mimetype.startsWith('image/')) {
        console.log(`📸 Image detected (${originalname}). Running Vision Analysis...`);
        
        // 1. Run AI Vision Analysis (uses actual file path)
        const analysis = await analyzeImageWithVision(filepath, originalname);
        
        if (analysis) {
          sendProgress({ type: 'progress', message: 'Analyzing image...', progress: 50 });
          
          // 2. Generate text content
          const textContent = generateEmbeddableContent(analysis);
          
          // 3. ✅ FIX: Save analysis next to the MULTER filename
          const analysisPath = `${filepath}.analysis.txt`;
          fs.writeFileSync(analysisPath, textContent);
          
          // 4. ✅ FIX: Update target to MULTER filename + extension
          targetFilename = `${filename}.analysis.txt`;
          
          console.log(`✅ Image analyzed. Embedding description: ${targetFilename}`);
        } else {
          console.log(`⚠️ Vision analysis failed. Falling back to standard processing.`);
        }
      }

      sendProgress({ type: 'progress', message: 'Embedding document...', progress: 60 });

      // ✅ Now Collector can find the file (it's in hotdir with the correct name)
      const { success, reason, documents } = await Collector.processDocument(targetFilename);

      if (!success || documents?.length === 0) {
        sendProgress({ type: 'error', error: reason || 'Processing failed' });
        response.end();
        return;
      }

      sendProgress({ type: 'progress', message: 'Document processed, embedding...', progress: 70 });

      await Telemetry.sendTelemetry("document_uploaded");
      await EventLogs.logEvent(
        "document_uploaded",
        { documentName: originalname }, // Log user's name for clarity
        user?.id
      );

      const document = documents[0];
      const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
        currWorkspace,
        [document.location],
        user?.id
      );

      if (failedToEmbed.length > 0) {
        sendProgress({ type: 'error', error: errors?.[0] || 'Embedding failed' });
        response.end();
        return;
      }

      sendProgress({ type: 'progress', message: 'Finalizing...', progress: 90 });

      sendProgress({
        type: 'complete',
        success: true,
        document: {
          id: document.id,
          location: document.location,
        },
        progress: 100
      });

      response.end();

    } catch (e) {
      console.error('Upload error:', e.message, e);
      response.write(`data: ${JSON.stringify({ type: 'error', error: e.message })}\n\n`);
      response.end();
    }
  }
);

  app.delete(
    "/workspace/:slug/remove-and-unembed",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager]), handleFileUpload],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const body = reqBody(request);
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace || !body.documentLocation)
          return response.sendStatus(400).end();

        await purgeDocument(body.documentLocation);
        response.status(200).end();
      } catch (e) {
        console.error(e.message, e);
        response.sendStatus(500).end();
      }
    }
  );

  app.get(
    "/workspace/:slug/prompt-history",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (_, response) => {
      try {
        response.status(200).json({
          history: await Workspace.promptHistory({
            workspaceId: response.locals.workspace.id,
          }),
        });
      } catch (error) {
        console.error("Error fetching prompt history:", error);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/prompt-history",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager]), validWorkspaceSlug],
    async (_, response) => {
      try {
        response.status(200).json({
          success: await Workspace.deleteAllPromptHistory({
            workspaceId: response.locals.workspace.id,
          }),
        });
      } catch (error) {
        console.error("Error clearing prompt history:", error);
        response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/prompt-history/:id",
    [validatedRequest, flexUserRoleValid([ROLES.admin, ROLES.manager]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { id } = request.params;
        response.status(200).json({
          success: await Workspace.deletePromptHistory({
            workspaceId: response.locals.workspace.id,
            id: Number(id),
          }),
        });
      } catch (error) {
        console.error("Error deleting prompt history:", error);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/search",
    [validatedRequest, flexUserRoleValid([ROLES.all])],
    async (request, response) => {
      try {
        const { searchTerm } = reqBody(request);
        const searchResults = await searchWorkspaceAndThreads(
          searchTerm,
          response.locals?.user
        );
        response.status(200).json(searchResults);
      } catch (error) {
        console.error("Error searching for workspaces:", error);
        response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/analyze-visual",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const { name, contentString } = reqBody(request);

        if (!contentString) {
          return response.status(400).json({ success: false, error: "No content provided" });
        }

        const base64Data = contentString.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const tempPath = path.join(__dirname, `../storage/tmp/${Date.now()}_${name}`);

        const tmpDir = path.dirname(tempPath);
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

        fs.writeFileSync(tempPath, buffer);

        const analysis = await analyzeImageWithVision(tempPath, name);

        fs.unlinkSync(tempPath);

        if (!analysis) {
          return response.status(500).json({ success: false, error: "Failed to analyze image" });
        }

        return response.json({
          success: true,
          analysis: {
            description: analysis.description,
            extractedText: analysis.extractedText,
            tags: require("./Imageextractor").generateSearchTags(analysis),
          },
        });
      } catch (error) {
        console.error("Vision analysis error:", error);
        return response.status(500).json({ success: false, error: error.message });
      }
    }
  );

  // ============================================================
  // POST /teacher/documents/upload
  // ============================================================
  app.post(
    "/teacher/documents/upload",
    [validatedRequest, flexUserRoleValid([ROLES.teacher]), handleExamUpload],
    async (request, response) => {
      request.setTimeout(900000);
      response.setTimeout(900000);

      try {
        const user = await userFromSession(request, response);
        const workspace = await getTeacherWorkspace(user);

        if (!workspace) {
          return response.status(403).json({
            success: false,
            error: "Teacher workspace not accessible",
          });
        }

        const examFile = request.files?.examPaper?.[0];
        const markSchemeFile = request.files?.markScheme?.[0];

        if (!examFile) {
          return response.status(400).json({
            success: false,
            error: "No exam paper uploaded",
          });
        }

        let metadata = {};
        try {
          if (request.body.metadata) metadata = JSON.parse(request.body.metadata);
        } catch (e) {
          console.error("Error parsing metadata:", e);
        }

        const Collector = new CollectorApi();
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          return response.status(500).json({
            success: false,
            error: `Document processing API is not online.`,
          });
        }

        const examResult = await Collector.processDocument(examFile.originalname);

        if (!examResult.success || !examResult.documents?.length) {
          return response.status(500).json({
            success: false,
            error: examResult.reason || "Failed to process exam paper",
          });
        }

        let markSchemeContent = "";
        if (markSchemeFile) {
          const schemeResult = await Collector.processDocument(markSchemeFile.originalname);
          if (schemeResult.success && schemeResult.documents?.length) {
            markSchemeContent =
              schemeResult.documents[0].pageContent ||
              schemeResult.documents.map((d) => d.pageContent).join("\n\n");
          }
        }

        const allDocLocations = examResult.documents.map((d) => d.location);
        const { failedToEmbed = [], errors = [] } = await Document.addDocuments(
          workspace,
          allDocLocations,
          user.id
        );

        if (failedToEmbed.length > 0) {
          return response.status(500).json({ success: false, error: errors.join(", ") });
        }

        const LLMConnector = getLLMProvider({
          provider: process.env.LLM_PROVIDER,
          model: process.env.LLM_MODEL,
        });

        const examContent =
          examResult.documents[0].pageContent ||
          examResult.documents.map((d) => d.pageContent).join("\n\n");

        console.log(`Exam content length: ${examContent.length} chars`);
        console.log(`Mark scheme length: ${markSchemeContent.length} chars`);

        function smartChunk(content, maxChunkSize = 10000) {
          if (content.length <= maxChunkSize) return [content];

          const chunks = [];
          let currentChunk = "";
          const sections = content.split(/\n\n+/);

          for (const section of sections) {
            if (currentChunk.length + section.length > maxChunkSize && currentChunk.length > 0) {
              chunks.push(currentChunk.trim());
              currentChunk = "";
            }

            if (section.length > maxChunkSize) {
              if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
              }
              let remaining = section;
              while (remaining.length > maxChunkSize) {
                chunks.push(remaining.substring(0, maxChunkSize).trim());
                remaining = remaining.substring(maxChunkSize);
              }
              if (remaining.length > 0) currentChunk = remaining;
            } else {
              currentChunk += (currentChunk.length > 0 ? "\n\n" : "") + section;
            }
          }

          if (currentChunk.trim().length > 0) chunks.push(currentChunk.trim());
          return chunks;
        }

        async function extractTeacherQuestionsInChunks(content, type = "exam") {
          const MAX_CHUNK_SIZE = 10000;
          const chunks = smartChunk(content, MAX_CHUNK_SIZE);

          console.log(`Processing ${type} in ${chunks.length} chunk(s)...`);

          const chunkPromises = chunks.map(async (chunk, i) => {
            const chunkPrompt = `You are an expert at extracting exam questions from documents.

${type === "mark_scheme" ? "This is a MARK SCHEME. Extract questions AND marking criteria." : "This is an EXAM PAPER. Extract questions."}

CONTENT (Part ${i + 1} of ${chunks.length}):
${chunk}

Extract all questions. Format:

MULTIPLE CHOICE:
1. [Question]
A) [Option A]
B) [Option B]
C) [Option C]
D) [Option D]
Answer: [Letter]

STRUCTURED:
1. [Question]
Mark Scheme:
- [Point 1]
- [Point 2]

Extract now:`;

            try {
              const chunkResponse = await LLMConnector.getChatCompletion(
                [{ role: "user", content: chunkPrompt }],
                { temperature: 0.3, max_tokens: 4000 }
              );

              if (chunkResponse?.textResponse) {
                console.log(`✅ Chunk ${i + 1}/${chunks.length} processed`);
                return chunkResponse.textResponse;
              }
              console.error(`❌ Chunk ${i + 1}/${chunks.length} no response`);
              return "";
            } catch (chunkError) {
              console.error(`Error processing chunk ${i + 1}:`, chunkError.message);
              return "";
            }
          });

          const results = await Promise.all(chunkPromises);
          return results.filter((r) => r.length > 0).join("\n\n");
        }

        async function mergeTeacherQuestionsWithMarkScheme(examQuestions, markSchemeQuestions) {
          if (!markSchemeQuestions) return examQuestions;

          const maxMergeLength = 15000;
          const truncatedExam =
            examQuestions.length > maxMergeLength
              ? examQuestions.substring(0, maxMergeLength)
              : examQuestions;
          const truncatedScheme =
            markSchemeQuestions.length > maxMergeLength
              ? markSchemeQuestions.substring(0, maxMergeLength)
              : markSchemeQuestions;

          const mergePrompt = `Merge exam questions with mark schemes.

EXAM QUESTIONS:
${truncatedExam}

MARK SCHEME:
${truncatedScheme}

Format:

MULTIPLE CHOICE:
1. [Question]
A) [A]
B) [B]
C) [C]
D) [D]
Answer: [Letter]

STRUCTURED:
1. [Question]
Mark Scheme:
- [Point] ([marks])

Merge now:`;

          try {
            const mergeResponse = await LLMConnector.getChatCompletion(
              [{ role: "user", content: mergePrompt }],
              { temperature: 0.2, max_tokens: 4000 }
            );
            return mergeResponse?.textResponse || examQuestions;
          } catch (mergeError) {
            console.error("Error merging:", mergeError.message);
            return examQuestions;
          }
        }

        console.log("📄 Extracting questions from exam paper...");
        const examQuestions = await extractTeacherQuestionsInChunks(examContent, "exam");

        let finalExtractedContent = examQuestions;

        if (markSchemeContent && markSchemeContent.trim().length > 0) {
          console.log("📋 Extracting mark scheme...");
          const markSchemeQuestions = await extractTeacherQuestionsInChunks(
            markSchemeContent,
            "mark_scheme"
          );
          console.log("🔄 Merging...");
          finalExtractedContent = await mergeTeacherQuestionsWithMarkScheme(
            examQuestions,
            markSchemeQuestions
          );
        }

        if (!finalExtractedContent || finalExtractedContent.trim().length === 0) {
          console.error("LLM returned no content");
          return response.status(500).json({
            success: false,
            error: "Failed to extract quiz content from document",
          });
        }

        const questionCount = (finalExtractedContent.match(/^\d+\./gm) || []).length;
        console.log(`✅ Successfully extracted ${questionCount} questions`);

        await Telemetry.sendTelemetry("exam_paper_extracted");
        await EventLogs.logEvent(
          "exam_paper_extracted",
          {
            documentName: examFile.originalname,
            hasMarkScheme: !!markSchemeFile,
            subject: metadata.subject || "Unknown",
            questionCount,
          },
          user.id
        );

        response.status(200).json({
          success: true,
          documents: examResult.documents.map((d) => ({ id: d.id, location: d.location })),
          extractedQuiz: {
            content: finalExtractedContent,
            questionCount,
            hasMarkScheme: !!markSchemeFile,
            metadata,
          },
        });
      } catch (e) {
        console.error("Teacher document upload failed:", e);
        response.status(500).json({ success: false, error: e.message });
      }
    }
  );

  // ============================================================
  // POST /workspace/:slug/upload-exam-paper
  // Streaming SSE upload with AI question extraction.
  // Use this when you want progress feedback on the frontend.
  // ============================================================
  app.post(
    "/workspace/:slug/upload-exam-paper",
    [validatedRequest, flexUserRoleValid([ROLES.all]), handleFileUpload],
    async function (request, response) {
      try {
        const { slug = null } = request.params;
        const user = await userFromSession(request, response);
        const currWorkspace = multiUserMode(response)
          ? await Workspace.getWithUser(user, { slug })
          : await Workspace.get({ slug });

        if (!currWorkspace) return response.sendStatus(400).end();

        if (!request.file) {
          return response.status(400).json({ success: false, error: "No file uploaded" });
        }

        response.setHeader("Content-Type", "text/event-stream");
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("Connection", "keep-alive");
        response.setHeader("X-Accel-Buffering", "no");

        const sendProgress = (data) => {
          response.write(`data: ${JSON.stringify(data)}\n\n`);
        };

        const { originalname, filename } = request.file;
        const Collector = new CollectorApi();

        sendProgress({ type: "progress", message: "Checking document processor...", progress: 10 });

        const processingOnline = await Collector.online();
        if (!processingOnline) {
          sendProgress({ type: "error", error: "Document processing API is not online." });
          response.end();
          return;
        }

        sendProgress({ type: "progress", message: "Processing PDF...", progress: 20 });

        const { success, reason, documents } = await Collector.processDocument(filename);

        if (!success || !documents?.length) {
          sendProgress({ type: "error", error: reason || "Processing failed" });
          response.end();
          return;
        }

        sendProgress({ type: "progress", message: "Extracting questions with AI...", progress: 40 });

        const examContent =
          documents[0].pageContent || documents.map((d) => d.pageContent).join("\n\n");

        console.log(`📄 Extracting questions from: ${originalname}`);

        const extractedQuestions = await extractQuestionsInChunks(examContent, "exam");

        if (!extractedQuestions || extractedQuestions.trim().length === 0) {
          sendProgress({ type: "error", error: "Failed to extract questions from document" });
          response.end();
          return;
        }

        sendProgress({ type: "progress", message: "Parsing question structure...", progress: 60 });

        const parsedQuestions = parseQuestionsWithMetadata(extractedQuestions);
        console.log(`✅ Extracted ${parsedQuestions.length} questions`);

        sendProgress({ type: "progress", message: "Embedding questions with metadata...", progress: 70 });

        const VectorDb = getVectorDbClass();

        for (const question of parsedQuestions) {
          const questionText = `Question ${question.questionNumber}: ${question.text}`;
          const fullContext =
            question.type === "multiple_choice"
              ? `${questionText}\n${question.options.map((o) => `${o.letter}) ${o.text}`).join("\n")}`
              : `${questionText}\n${
                  question.markScheme.length > 0
                    ? "Mark Scheme:\n" + question.markScheme.join("\n")
                    : ""
                }`;

          await VectorDb.addDocumentToNamespace(
            currWorkspace.slug,
            {
              content: fullContext,
              metadata: {
                questionNumber: question.questionNumber,
                type: question.type,
                source: originalname,
                workspaceId: currWorkspace.id,
                userId: user?.id,
                questionData: JSON.stringify(question),
              },
            },
            originalname
          );
        }

        sendProgress({ type: "progress", message: "Finalizing...", progress: 90 });

        await Document.addDocuments(currWorkspace, [documents[0].location], user?.id);

        await Telemetry.sendTelemetry("exam_paper_uploaded");
        await EventLogs.logEvent(
          "exam_paper_uploaded",
          { documentName: originalname, questionCount: parsedQuestions.length },
          user?.id
        );

        sendProgress({
          type: "complete",
          success: true,
          questionCount: parsedQuestions.length,
          questions: parsedQuestions,
          document: { id: documents[0].id, location: documents[0].location },
          progress: 100,
        });

        response.end();
      } catch (e) {
        console.error("Exam upload error:", e.message, e);
        response.write(`data: ${JSON.stringify({ type: "error", error: e.message })}\n\n`);
        response.end();
      }
    }
  );

  workspaceParsedFilesEndpoints(app);
}

module.exports = { workspaceEndpoints };
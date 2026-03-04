const path = require("path");
const fs = require("fs");
const { reqBody, multiUserMode, userFromSession } = require("../utils/http");
const { handleFileUpload } = require("../utils/files/multer");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { EventLogs } = require("../models/eventLogs");
const { validWorkspaceSlug } = require("../utils/middleware/validWorkspace");
const { CollectorApi } = require("../utils/collectorApi");
const { WorkspaceThread } = require("../models/workspaceThread");
const { WorkspaceParsedFiles } = require("../models/workspaceParsedFiles");
const { Document } = require("../models/documents");
const { v4: uuidv4 } = require("uuid");

/**
 * Split exam paper text into per-question chunks
 * Detects patterns like "1     The diagram..." or "2     Which row..."
 */
function splitByQuestion(text, filename) {
  // More strict: question numbers must be at start of line after blank line
  // and followed by 4+ spaces then a capital letter
  // Negative lookbehind prevents matching mid-sentence numbers
  const questionRegex = /\n\n(\d{1,2})\s{4,}(?=[A-Z])/g;
  const matches = [...text.matchAll(questionRegex)];

  if (matches.length < 3) return null;

  // Additional validation: question numbers must be sequential
  const validMatches = [];
  let expectedNext = 1;
  
  for (const match of matches) {
    const num = parseInt(match[1]);
    // Accept if it's the expected next number or close to it (allow gaps)
    if (num === expectedNext || num === expectedNext + 1) {
      validMatches.push(match);
      expectedNext = num + 1;
    }
    // Skip if number is way out of sequence (it's a list item, not a question)
  }

  if (validMatches.length < 3) return null;

  const chunks = [];
  for (let i = 0; i < validMatches.length; i++) {
    const start = validMatches[i].index;
    const end = validMatches[i + 1]?.index ?? text.length;
    const questionNum = parseInt(validMatches[i][1]);
    chunks.push({
      questionNumber: questionNum,
      content: text.slice(start, end).trim(),
      title: `${filename} - Question ${questionNum}`
    });
  }

  return chunks;
}

function workspaceParsedFilesEndpoints(app) {
  if (!app) return;

  app.get(
    "/workspace/:slug/parsed-files",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async (request, response) => {
      try {
        const threadSlug = request.query.threadSlug || null;
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const thread = threadSlug
          ? await WorkspaceThread.get({ slug: String(threadSlug) })
          : null;
        const { files, contextWindow, currentContextTokenCount } =
          await WorkspaceParsedFiles.getContextMetadataAndLimits(
            workspace,
            thread || null,
            multiUserMode(response) ? user : null
          );

        return response
          .status(200)
          .json({ files, contextWindow, currentContextTokenCount });
      } catch (e) {
        console.error(e.message, e);
        return response.sendStatus(500).end();
      }
    }
  );

  app.delete(
    "/workspace/:slug/delete-parsed-files",
    [validatedRequest, flexUserRoleValid([ROLES.all]), validWorkspaceSlug],
    async function (request, response) {
      try {
        const { fileIds = [] } = reqBody(request);
        if (!fileIds.length) return response.sendStatus(400).end();
        const success = await WorkspaceParsedFiles.delete({
          id: { in: fileIds.map((id) => parseInt(id)) },
        });
        return response.status(success ? 200 : 500).end();
      } catch (e) {
        console.error(e.message, e);
        return response.sendStatus(500).end();
      }
    }
  );

  app.post(
    "/workspace/:slug/embed-parsed-file/:fileId",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      validWorkspaceSlug,
    ],
    async function (request, response) {
      const { fileId = null } = request.params;
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;

        if (!fileId) return response.sendStatus(400).end();
        const { success, error, document } =
          await WorkspaceParsedFiles.moveToDocumentsAndEmbed(fileId, workspace);

        if (!success) {
          return response.status(500).json({
            success: false,
            error: error || "Failed to embed file",
          });
        }

        await Telemetry.sendTelemetry("document_embedded");
        await EventLogs.logEvent(
          "document_embedded",
          {
            documentName: document?.name || "unknown",
            workspaceId: workspace.id,
          },
          user?.id
        );

        return response.status(200).json({
          success: true,
          error: null,
          document,
        });
      } catch (e) {
        console.error(e.message, e);
        return response.sendStatus(500).end();
      } finally {
        if (!fileId) return;
        await WorkspaceParsedFiles.delete({ id: parseInt(fileId) });
      }
    }
  );

  app.post(
    "/workspace/:slug/parse",
    [
      validatedRequest,
      flexUserRoleValid([ROLES.all]),
      handleFileUpload,
      validWorkspaceSlug,
    ],
    async function (request, response) {
      try {
        const user = await userFromSession(request, response);
        const workspace = response.locals.workspace;
        const Collector = new CollectorApi();
        const { originalname } = request.file;
        const processingOnline = await Collector.online();

        if (!processingOnline) {
          return response.status(500).json({
            success: false,
            error: `Document processing API is not online. Document ${originalname} will not be parsed.`,
          });
        }

        const { success, reason, documents } =
          await Collector.processDocument(originalname);

        if (!success || !documents?.[0]) {
          return response.status(500).json({
            success: false,
            error: reason || "No document returned from collector",
          });
        }

        // Try to split exam papers by question number
        let finalDocuments = documents;
        const pageContent = documents[0]?.pageContent;
        if (pageContent) {
          const questionChunks = splitByQuestion(pageContent, originalname);
          if (questionChunks && questionChunks.length >= 3) {
            console.log(
              `📝 Exam paper detected: splitting into ${questionChunks.length} question chunks`
            );
            finalDocuments = questionChunks.map((chunk) => ({
              ...documents[0],
              id: uuidv4(),
              pageContent: chunk.content,
              title: chunk.title,
              questionNumber: chunk.questionNumber,
            }));
          }
        }

        // Write each chunk to storage and embed into workspace
        const storageDir = process.env.STORAGE_DIR ||
          path.resolve(__dirname, "../../server/storage");
        const customDocsDir = path.join(storageDir, "documents", "custom-documents");
        if (!fs.existsSync(customDocsDir)) fs.mkdirSync(customDocsDir, { recursive: true });

        for (const doc of finalDocuments) {
          const chunkFilename = `${originalname}-q${doc.questionNumber || "full"}-${doc.id}`;
          const chunkPath = path.join(customDocsDir, `${chunkFilename}.json`);
          fs.writeFileSync(chunkPath, JSON.stringify(doc, null, 2));
          await Document.addDocuments(workspace, [
            `custom-documents/${chunkFilename}.json`,
          ]);
        }

        // Get thread ID if provided
        const { threadSlug = null } = reqBody(request);
        const thread = threadSlug
          ? await WorkspaceThread.get({
              slug: String(threadSlug),
              workspace_id: workspace.id,
              user_id: user?.id || null,
            })
          : null;

        // Save parsed file records for UI display
        const files = await Promise.all(
          documents.map(async (doc) => {
            const metadata = { ...doc };
            delete metadata.pageContent;
            const filename = `${originalname}-${doc.id}.json`;
            const { file, error: dbError } = await WorkspaceParsedFiles.create({
              filename,
              workspaceId: workspace.id,
              userId: user?.id || null,
              threadId: thread?.id || null,
              metadata: JSON.stringify(metadata),
              tokenCountEstimate: doc.token_count_estimate || 0,
            });
            if (dbError) throw new Error(dbError);
            return file;
          })
        );

        Collector.log(`Document ${originalname} parsed successfully.`);
        await EventLogs.logEvent(
          "document_uploaded_to_chat",
          {
            documentName: originalname,
            workspace: workspace.slug,
            thread: thread?.name || null,
          },
          user?.id
        );

        return response.status(200).json({
          success: true,
          error: null,
          files,
        });
      } catch (e) {
        console.error(e.message, e);
        return response.sendStatus(500).end();
      }
    }
  );
}

module.exports = { workspaceParsedFilesEndpoints };
const pluralize = require("pluralize");
const { WorkspaceAgentInvocation } = require("../../models/workspaceAgentInvocation");
const { writeResponseChunk } = require("../helpers/chat/responses");
const fetch = require("node-fetch");

async function grepAgents({
  uuid,
  response,
  message,
  workspace,
  user = null,
  thread = null,
}) {
  const agentHandles = WorkspaceAgentInvocation.parseAgents(message);

  // 🔍 Check if user explicitly invoked an agent (/agent ... command)
  if (agentHandles.length > 0) {
    const { invocation: newInvocation } = await WorkspaceAgentInvocation.new({
      prompt: message,
      workspace,
      user,
      thread,
    });

    if (!newInvocation) {
      writeResponseChunk(response, {
        id: uuid,
        type: "statusResponse",
        textResponse: `${pluralize("Agent", agentHandles.length)} ${agentHandles.join(
          ", "
        )} could not be called. Chat will be handled as default chat.`,
        sources: [],
        close: true,
        animate: false,
        error: null,
      });
      return;
    }

    writeResponseChunk(response, {
      id: uuid,
      type: "agentInitWebsocketConnection",
      textResponse: null,
      sources: [],
      close: false,
      error: null,
      websocketUUID: newInvocation.uuid,
    });

    writeResponseChunk(response, {
      id: uuid,
      type: "statusResponse",
      textResponse: `${pluralize("Agent", agentHandles.length)} ${agentHandles.join(
        ", "
      )} invoked.\nSwapping over to agent chat. Type /exit to exit agent execution loop early.`,
      sources: [],
      close: true,
      error: null,
      animate: true,
    });

    return true;
  }

  // 🧩 🔥 NEW: detect AI tool calls like {"tool":"quiz_create"}
  try {
    const parsed = JSON.parse(message);
    if (parsed?.tool === "quiz_create" && parsed?.args) {
      console.log("🤖 Quiz Creation Tool detected — invoking agent...");

      const quizRes = await fetch(
        `${process.env.API_BASE || "http://localhost:3000"}/agent-flows/quiz/create`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: user?.token ? `Bearer ${user.token}` : "",
          },
          body: JSON.stringify(parsed.args),
        }
      );

      const result = await quizRes.json();

      if (result?.tool === "quiz_create") {
        // Stream result to the front-end via chunk
        writeResponseChunk(response, {
          id: uuid,
          type: "agentToolResponse",
          textResponse: null,
          jsonResponse: result,
          sources: [],
          close: true,
          animate: false,
          error: null,
        });
        return true;
      }
    }
  } catch (err) {
    // Ignore if message isn’t JSON
  }

  // Default: no agent found, proceed with normal chat
  return false;
}

module.exports = { grepAgents };
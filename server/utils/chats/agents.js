const pluralize = require("pluralize");
const { WorkspaceAgentInvocation } = require("../../models/workspaceAgentInvocation");
const { writeResponseChunk } = require("../helpers/chat/responses");
const fetch = require("node-fetch");

// Maps bracket-syntax tool names → internal API routes
const BRACKET_TOOL_ROUTES = {
  flashcard_create_agent: "/agent-flows/flashcard/create",
  quiz_create_agent: "/agent-flows/quiz/create",
  // Add more tools here as needed:
  // summary_agent: "/agent-flows/summary/create",
};

/**
 * Parses a bracket-syntax tool call from LLM output.
 * Input:  [flashcard_create_agent topic="weathering" numCards=3]
 * Output: { tool: "flashcard_create_agent", args: { topic: "weathering", numCards: 3 } }
 * Returns null if no match.
 */
function parseBracketToolCall(text) {
  if (!text || typeof text !== "string") return null;

  // Match the outermost [...] containing a known tool name
  const bracketMatch = text.match(/\[([a-zA-Z_][a-zA-Z0-9_]*)([^\]]*)\]/);
  if (!bracketMatch) return null;

  const toolName = bracketMatch[1];
  const argString = bracketMatch[2].trim();

  if (!BRACKET_TOOL_ROUTES[toolName]) return null;

  // Parse key=value pairs — handles: key="value with spaces", key='value', key=rawValue
  const args = {};
  const argPattern = /([a-zA-Z_][a-zA-Z0-9_]*)=(?:"([^"]*)"|'([^']*)'|(\S+))/g;
  let argMatch;
  while ((argMatch = argPattern.exec(argString)) !== null) {
    const key = argMatch[1];
    const value = argMatch[2] ?? argMatch[3] ?? argMatch[4];
    // Coerce numeric strings to numbers
    args[key] = isNaN(value) ? value : Number(value);
  }

  return { tool: toolName, args };
}

async function grepAgents({
  uuid,
  response,
  message,
  workspace,
  user = null,
  thread = null,
}) {
  console.log("🔍 grepAgents received message:", message?.substring(0, 100));
  const agentHandles = WorkspaceAgentInvocation.parseAgents(message);

  // ── Path 1: Explicit @agent invocation ──────────────────────────────────────
  if (agentHandles.length > 0) {
    const { invocation: newInvocation } = await WorkspaceAgentInvocation.new({
      prompt: message,
      workspace,
      user,
      thread,
    });

    console.log("🤖 Agent invocation result:", newInvocation);

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
      textResponse: null,
      sources: [],
      close: true,
      error: null,
      animate: true,
    });

    return true;
  }

  // ── Path 2: Raw JSON tool payload ────────────────────────────────────────────
  try {
    if (message && message.trim().startsWith("{")) {
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
    }
  } catch (error) {
    console.log("ℹ️ grepAgents skipped JSON parse for standard message.");
  }

  // ── Path 3: Bracket-syntax tool call from LLM output ─────────────────────────
  const bracketTool = parseBracketToolCall(message);
  if (bracketTool) {
    const { tool, args } = bracketTool;
    const route = BRACKET_TOOL_ROUTES[tool];

    console.log(`🔧 Bracket tool call detected: ${tool}`, args);

    try {
      const toolRes = await fetch(
        `${process.env.API_BASE || "http://localhost:3000"}${route}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: user?.token ? `Bearer ${user.token}` : "",
          },
          body: JSON.stringify(args),
        }
      );

      if (!toolRes.ok) {
        throw new Error(`Tool route ${route} responded with ${toolRes.status}`);
      }

      const result = await toolRes.json();

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
    } catch (err) {
      console.error(`❌ Bracket tool call failed for ${tool}:`, err.message);

      writeResponseChunk(response, {
        id: uuid,
        type: "statusResponse",
        textResponse: `Tool "${tool}" could not be executed: ${err.message}`,
        sources: [],
        close: true,
        animate: false,
        error: err.message,
      });

      return true; // Still consumed — don't fall through to normal chat
    }
  }

  // Default: no agent found, proceed with normal chat
  return false;
}

module.exports = { grepAgents };
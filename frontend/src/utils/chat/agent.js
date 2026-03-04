import { v4 } from "uuid";
import { safeJsonParse } from "../request";
import { saveAs } from "file-saver";
import { API_BASE } from "../constants";
import { useEffect, useState } from "react";

export const AGENT_SESSION_START = "agentSessionStart";
export const AGENT_SESSION_END = "agentSessionEnd";
const handledEvents = [
  "statusResponse",
  "fileDownload",
  "awaitingFeedback",
  "wssFailure",
  "rechartVisualize",
  // Streaming events
  "reportStreamEvent",
];

export function websocketURI() {
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  if (API_BASE === "/api") return `${wsProtocol}//${window.location.host}`;
  return `${wsProtocol}//${new URL(import.meta.env.VITE_API_BASE).host}`;
}

export default function handleSocketResponse(socket, event, setChatHistory, parsedOverride = null) {
  const data = parsedOverride ?? safeJsonParse(event.data, null);
  if (data === null) return;

  // No message type is defined then this is a generic message
  // that we need to print to the user as a system response
  if (!data.hasOwnProperty("type") && !socket.supportsAgentStreaming) {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          uuid: v4(),
          content: data.content,
          role: "assistant",
          sources: [],
          closed: true,
          error: null,
          animate: false,
          pending: false,
        },
      ];
    });
  }

  if (!handledEvents.includes(data.type) || !data.content) return;

  if (data.type === "reportStreamEvent") {
    // Enable agent streaming for the next message so we can handle streaming or non-streaming responses
    // If we get this message we know the provider supports agentic streaming
    socket.supportsAgentStreaming = true;

    return setChatHistory((prev) => {
      if (data.content.type === "removeStatusResponse")
        return [...prev.filter((msg) => msg.uuid !== data.content.uuid)];

      const knownMessage = data.content.uuid
        ? prev.find((msg) => msg.uuid === data.content.uuid)
        : null;
      if (!knownMessage) {
        if (data.content.type === "fullTextResponse") {
          return [
            ...prev.filter((msg) => !!msg.content),
            {
              uuid: data.content.uuid,
              type: "textResponse",
              content: data.content.content,
              role: "assistant",
              sources: [],
              closed: true,
              error: null,
              animate: false,
              pending: false,
            },
          ];
        }

        // Handle textResponseChunk initialization as textResponse instead of statusResponse.
        // Without this the first chunk creates a statusResponse (thought bubble) by falling through to the default case.
        // Providers like Gemini send large chunks and can complete in a single chunk before the update logic can convert it.
        // Other providers send many small chunks so the second chunk triggers the update logic to fix the type.
        if (data.content.type === "textResponseChunk") {
          return [
            ...prev.filter((msg) => !!msg.content),
            {
              uuid: data.content.uuid,
              type: "textResponse",
              content: data.content.content,
              role: "assistant",
              sources: [],
              closed: true,
              error: null,
              animate: false,
              pending: false,
            },
          ];
        }

        return [
          ...prev.filter((msg) => !!msg.content),
          {
            uuid: data.content.uuid,
            type: "statusResponse",
            content: data.content.content,
            role: "assistant",
            sources: [],
            closed: true,
            error: null,
            animate: false,
            pending: false,
          },
        ];
      } else {
        const { type, content, uuid } = data.content;
        // For tool call invocations, we need to update the existing message entirely since it is accumulated
        // and we dont know if the function will have arguments or not while streaming - so replace the existing message entirely
       if (type === "toolCallInvocation") {
        console.log("🔍 toolCallInvocation data.content:", data.content); 
  const knownMessage = prev.find((msg) => msg.uuid === uuid);

  // 🧠 Detect specific tool types and set a human-friendly display message
  let displayMessage = null;
  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    if (parsed?.tool_call === "quiz_create") {
      displayMessage = "✅ Quiz generated successfully! Click to reopen.";
    } else if (parsed?.tool_call === "flashcard_create") {
      displayMessage = "🎴 Flashcards created successfully! Click to reopen.";
    } else if (parsed?.tool_call) {
      displayMessage = `🧩 ${parsed.tool_call.replace(/_/g, " ")} completed.`;
    }
  } catch {
    // content is not JSON, skip
  }

  const newMessage = {
    uuid,
    type: "toolCallInvocation",
    content:displayMessage || content, 
    savedQuizId: data.content.savedQuizId ?? null,        
  savedFlashcardSetId: data.content.savedFlashcardSetId ?? null, 
  };

  if (!knownMessage) return [...prev, newMessage];

  return [
    ...prev.filter((msg) => msg.uuid !== uuid),
    { ...knownMessage, ...newMessage },
  ];
}

        if (type === "textResponseChunk") {
          return prev
            .map((msg) =>
              msg.uuid === uuid
                ? {
                    ...msg,
                    type: "textResponse",
                    content: msg.content + content,
                  }
                : msg?.content
                  ? msg
                  : null
            )
            .filter((msg) => !!msg);
        }

        // Generic text response - will be put in the agent thought bubble
        return prev.map((msg) =>
          msg.uuid === data.content.uuid
            ? { ...msg, content: msg.content + data.content.content }
            : msg
        );
      }
    });
  }

  if (data.type === "fileDownload") {
    saveAs(data.content.b64Content, data.content.filename ?? "unknown.txt");
    return;
  }

  if (data.type === "rechartVisualize") {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          type: "rechartVisualize",
          uuid: v4(),
          content: data.content,
          role: "assistant",
          sources: [],
          closed: true,
          error: null,
          animate: false,
          pending: false,
        },
      ];
    });
  }

  if (data.type === "wssFailure") {
    return setChatHistory((prev) => {
      return [
        ...prev.filter((msg) => !!msg.content),
        {
          uuid: v4(),
          content: data.content,
          role: "assistant",
          sources: [],
          closed: true,
          error: data.content,
          animate: false,
          pending: false,
        },
      ];
    });
  }

  return setChatHistory((prev) => {
    return [
      ...prev.filter((msg) => !!msg.content),
      {
        uuid: v4(),
        type: data.type,
        content: data.content,
        role: "assistant",
        sources: [],
        closed: true,
        error: null,
        animate: data?.animate || false,
        pending: false,
      },
    ];
  });
}

export function useIsAgentSessionActive() {
  const [activeSession, setActiveSession] = useState(false);
  useEffect(() => {
    function listenForAgentSession() {
      if (!window) return;
      window.addEventListener(AGENT_SESSION_START, () =>
        setActiveSession(true)
      );
      window.addEventListener(AGENT_SESSION_END, () => setActiveSession(false));
    }
    listenForAgentSession();
  }, []);

  return activeSession;
}

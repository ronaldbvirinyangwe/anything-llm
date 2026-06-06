// hooks/useMascotFromAgent.js
import { useState, useEffect } from "react";
import { TOOL_MASCOT_STATE } from "@/components/ChikoroMascot";

export function useMascotFromAgent(socketRef) {
  const [mascotState, setMascotState] = useState({
    expression: "happy",
    message: null,
    active: false,
  });

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket) return;

    const handleEvent = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }

      const { type, content } = data;

      // Tool call identified — switch mascot immediately
      if (type === "toolCallInvocation") {
        // content looks like "Parsed Tool Call: study-planner(...)"
        const toolName = content?.match(/^Parsed Tool Call:\s*([\w-]+)/)?.[1];
        const state = TOOL_MASCOT_STATE[toolName] ?? TOOL_MASCOT_STATE["__thinking__"];
        setMascotState({ expression: state.expression, message: state.message, active: true });
        return;
      }

      // Agent is streaming its "thinking" phase
      if (type === "statusResponse") {
        setMascotState((prev) =>
          prev.active ? prev : { expression: "thinking", message: "Working on it... 🧠", active: false }
        );
        return;
      }

      // Final text is streaming — tool is done
      if (type === "textResponseChunk" || type === "fullTextResponse") {
        setMascotState({ ...TOOL_MASCOT_STATE["__done__"], active: false });
        return;
      }

      // Agent finished entirely
      if (type === "agentEnd" || type === "finalizeResponseStream") {
        setTimeout(() => {
          setMascotState({ expression: "happy", message: null, active: false });
        }, 2500);
      }
    };

    socket.addEventListener("message", handleEvent);
    return () => socket.removeEventListener("message", handleEvent);
  }, [socketRef?.current]);

  return mascotState;
}
import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { CURRICULUM_KEY } from "@/utils/constants";
import ChatHistory from "./ChatHistory";
import { CLEAR_ATTACHMENTS_EVENT, DndUploaderContext } from "./DnDWrapper";
import PromptInput, {
  PROMPT_INPUT_EVENT,
  PROMPT_INPUT_ID,
} from "./PromptInput";
import Workspace from "@/models/workspace";
import handleChat, { ABORT_STREAM_EVENT } from "@/utils/chat";
import { isMobile } from "react-device-detect";
import { SidebarMobileHeader } from "../../Sidebar";
import { useParams } from "react-router-dom";
import { v4 } from "uuid";
import handleSocketResponse, {
  websocketURI,
  AGENT_SESSION_END,
  AGENT_SESSION_START,
} from "@/utils/chat/agent";
import DnDFileUploaderWrapper from "./DnDWrapper";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { ChatTooltips } from "./ChatTooltips";
import { MetricsProvider } from "./ChatHistory/HistoricalMessage/Actions/RenderMetrics";
import useUser from "@/hooks/useUser";
import SubjectSelector from "./SubjectSelector";
import Test from "../../../pages/QuizPage/Test";
import "./chatLayout.css";
import Flashcards from "../../../pages/Flashcards/Flashcards";
import { useSubscriptionGuard } from "@/hooks/useSubscriptionGuard";
import { NotificationMessage } from "./ChatHistory";
import { MASCOT_EXPRESSIONS, ChikoroMascot,MascotWithBubble,TOOL_MASCOT_STATE } from "@/components/ChikoroMascot";
import ExamPanel from "@/pages/QuizPage/ExamPanel";

// Chart types recognised by Chartable / recharts — keep in sync with agent.js
const CHART_TYPES = ["bar", "line", "pie", "area", "scatter", "radar"];

export default function ChatContainer({ workspace, knownHistory = [] }) {
  const { threadSlug = null } = useParams();
  const [message, setMessage] = useState("");
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);
  const [socketId, setSocketId] = useState(null);
  const [agentWebsocket, setAgentWebsocket] = useState(null);
  const [notificationWebsocket, setNotificationWebsocket] = useState(null);
  const { files, parseAttachments } = useContext(DndUploaderContext);

  const [subject, setSubject] = useState("");
  const [curriculum, setCurriculum] = useState("");
  const [academicLevel, setAcademicLevel] = useState("");
  const [age, setAge] = useState("");
  const [grade, setGrade] = useState("");
  const { user } = useUser();

  const [showQuiz, setShowQuiz] = useState(false);
  const [quizData, setQuizData] = useState(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [flashcardData, setFlashcardData] = useState(null);
  const { isLoading, hasAccess, subscriptionStatus, subscriptionExpiry } =
    useSubscriptionGuard(true);

  // ═══════════════════════════════════════════════════════════
  // 🤖 MASCOT STATE
  // ═══════════════════════════════════════════════════════════
  const [mascotExpression, setMascotExpression] = useState(MASCOT_EXPRESSIONS.waving);

  const removeStudyPlanForm = useCallback(() => {
  setChatHistory((prev) =>
    prev.filter(
      (msg) => !(typeof msg.content === "string" && msg.content.startsWith("STUDY_PLAN_FORM::")) ||
      msg.content.startsWith("STUDY_ONBOARDING::") 
    )
  );
}, [])

  useEffect(() => {
    if (loadingResponse) {
      setMascotExpression(MASCOT_EXPRESSIONS.thinking);
    } else if (showQuiz) {
      setMascotExpression(MASCOT_EXPRESSIONS.quizzing);
    } else if (showFlashcards) {
      setMascotExpression(MASCOT_EXPRESSIONS.studying);
    } else if (chatHistory.filter((m) => m.role !== "notification").length === 0) {
      setMascotExpression(MASCOT_EXPRESSIONS.waving);
    } else {
      setMascotExpression(MASCOT_EXPRESSIONS.happy);
    }
  }, [loadingResponse, showQuiz, showFlashcards, chatHistory]);

  useEffect(() => {
    const lastMsg = chatHistory[chatHistory.length - 1];
    if (
      lastMsg?.role === "assistant" &&
      !lastMsg.pending &&
      !lastMsg.animate &&
      lastMsg.content &&
      !loadingResponse
    ) {
      setMascotExpression(MASCOT_EXPRESSIONS.explaining);
      const timer = setTimeout(() => {
        setMascotExpression(MASCOT_EXPRESSIONS.happy);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [chatHistory, loadingResponse]);

  // ═══════════════════════════════════════════════════════════

  const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3009/api";

  const chatAreaRef = useRef(null);
  const chatHistoryRef = useRef(chatHistory);
  useEffect(() => {
    chatHistoryRef.current = chatHistory;
  }, [chatHistory]);

  const subjectRef = useRef(subject);
  const curriculumRef = useRef(curriculum);
  const academicLevelRef = useRef(academicLevel);
  const gradeRef = useRef(grade);
  const ageRef = useRef(age);
  useEffect(() => { subjectRef.current = subject; }, [subject]);
  useEffect(() => { curriculumRef.current = curriculum; }, [curriculum]);
  useEffect(() => { academicLevelRef.current = academicLevel; }, [academicLevel]);
  useEffect(() => { gradeRef.current = grade; }, [grade]);
  useEffect(() => { ageRef.current = age; }, [age]);

  // 🧠 Fetch user profile info
  useEffect(() => {
    async function fetchProfileById() {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        if (!token) return;

        const userId = user?.id;
        if (!userId) return;

        const res = await fetch(`${API_BASE}/system/profile/${userId}`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 404) {
          console.error("❌ Ghost User Detected. Auto-clearing session.");
          localStorage.removeItem("chikoroai_authToken");
          window.location.href = "/login";
          return;
        }

        if (!res.ok) {
          console.error("Profile fetch failed:", await res.text());
          return;
        }

        const { success, profile } = await res.json();
        if (success && profile) {
          setAge(profile.age || "");
          setGrade(profile.grade || "");
          setCurriculum(localStorage.getItem(CURRICULUM_KEY) || profile.curriculum || "");
          setAcademicLevel(profile.academicLevel || "");
        }
      } catch (e) {
        console.error("Failed to fetch profile by ID:", e);
      }
    }

    if (user?.id) fetchProfileById();
  }, [user, API_BASE]);

  // Listen for quiz creation events

  useEffect(() => {
    const handleQuizCreated = (event) => {
      if (event.detail?.quiz?.questions?.length > 0) {
        openQuizPanel(event.detail.quiz);
        setMascotExpression(MASCOT_EXPRESSIONS.quizzing);
      }
    };
    window.addEventListener("QUIZ_CREATED", handleQuizCreated);
    return () => window.removeEventListener("QUIZ_CREATED", handleQuizCreated);
  }, []);

  useEffect(() => {
    const handleFlashcardCreated = (event) => {
      if (event.detail?.flashcards?.cards?.length > 0) {
        setFlashcardData(event.detail.flashcards);
        setShowFlashcards(true);
        setMascotExpression(MASCOT_EXPRESSIONS.studying);
      }
    };
    window.addEventListener("FLASHCARD_CREATED", handleFlashcardCreated);
    return () => window.removeEventListener("FLASHCARD_CREATED", handleFlashcardCreated);
  }, []);

  const { listening, resetTranscript } = useSpeechRecognition({
    clearTranscriptOnListen: true,
  });

  const handleMessageChange = (event) => {
    setMessage(event.target.value);
  };

  function setMessageEmit(messageContent = "", writeMode = "replace") {
    if (writeMode === "append") setMessage((prev) => prev + messageContent);
    else setMessage(messageContent ?? "");
    window.dispatchEvent(
      new CustomEvent(PROMPT_INPUT_EVENT, {
        detail: { messageContent, writeMode },
      })
    );
  }

  function openQuizPanel(quiz) {
    setQuizData(quiz);
    setShowQuiz(true);
  }

  const buildContextPrefix = useCallback(() => {
    return [
      subjectRef.current && `[Subject: ${subjectRef.current}]`,
      curriculumRef.current && `[Curriculum: ${curriculumRef.current}]`,
      academicLevelRef.current && `[Academic Level: ${academicLevelRef.current}]`,
      gradeRef.current && `[Grade: ${gradeRef.current}]`,
      ageRef.current && `[Age: ${ageRef.current}]`,
    ]
      .filter(Boolean)
      .join(" ");
  }, []);

  const handleMessageClick = async (message) => {
    const token = localStorage.getItem("chikoroai_authToken");

    if (message.savedQuizId) {
      try {
        const res = await fetch(`${API_BASE}/agent-flows/quiz/${message.savedQuizId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { success, quiz } = await res.json();
        if (success) {
          setQuizData({ ...quiz, questions: quiz.questions });
          setShowQuiz(true);
        }
      } catch (e) {
        console.error("Failed to load saved quiz:", e);
      }
    }

    if (message.savedFlashcardSetId) {
      try {
        const res = await fetch(`${API_BASE}/agent-flows/flashcard/${message.savedFlashcardSetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const { success, flashcardSet } = await res.json();
        if (success) {
          setFlashcardData({ ...flashcardSet, cards: flashcardSet.cards });
          setShowFlashcards(true);
        }
      } catch (e) {
        console.error("Failed to load saved flashcards:", e);
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!message || message === "") return false;

    const contextPrefix = buildContextPrefix();
    const contextualMessage = `${contextPrefix} ${message}`.trim();
    const displayMessage = message;

    const prevChatHistory = [
      ...chatHistoryRef.current,
      {
        uuid: v4(),
        content: displayMessage,
        userMessage: contextualMessage,
        role: "user",
        attachments: parseAttachments(),
      },
      {
        uuid: v4(),
        content: "",
        role: "assistant",
        pending: true,
        userMessage: contextualMessage,
        animate: true,
      },
    ];

    if (listening) endSTTSession();
    setChatHistory(prevChatHistory);
    setMessageEmit("");
    setLoadingResponse(true);
  };

  function endSTTSession() {
    SpeechRecognition.stopListening();
    resetTranscript();
  }

  const regenerateAssistantMessage = useCallback((chatId) => {
    const currentHistory = chatHistoryRef.current;
    const updatedHistory = currentHistory.slice(0, -1);
    const lastUserMessage = updatedHistory.slice(-1)[0];
    Workspace.deleteChats(workspace.slug, [chatId])
      .then(() =>
        sendCommand({
          text: lastUserMessage.content,
          autoSubmit: true,
          history: updatedHistory,
          attachments: lastUserMessage?.attachments,
        })
      )
      .catch((e) => console.error(e));
  }, [workspace.slug]);

  const sendCommand = useCallback(async ({
    text = "",
    autoSubmit = false,
    history = [],
    attachments = [],
    writeMode = "replace",
  } = {}) => {
    if (!autoSubmit) {
      setMessageEmit(text, writeMode);
      return;
    }

    if (writeMode === "append") {
      const currentText = document.getElementById(PROMPT_INPUT_ID)?.value;
      text = currentText + text;
    }

    if (!text || text === "") return false;

    const contextPrefix = buildContextPrefix();
    const contextualText = `${contextPrefix} ${text}`.trim();
    const displayText = text;

    const baseHistory = history.length > 0 ? history : chatHistoryRef.current;

    const prevChatHistory = [
      ...baseHistory,
      {
        uuid: v4(),
        content: displayText,
        userMessage: contextualText,
        role: "user",
        attachments,
      },
      {
        uuid: v4(),
        content: "",
        role: "assistant",
        pending: true,
        userMessage: contextualText,
        attachments,
        animate: true,
      },
    ];

    setChatHistory(prevChatHistory);
    setMessageEmit("");
    setLoadingResponse(true);
  }, [buildContextPrefix]);

    // 🎓 Study planner form submit
useEffect(() => {
  const handler = (e) => {
    const prompt = e.detail?.prompt;
    if (!prompt) return;
    removeStudyPlanForm();
    sendCommand({ text: prompt, autoSubmit: true });
  };
  window.addEventListener("SEND_CHAT_MESSAGE", handler);
  return () => window.removeEventListener("SEND_CHAT_MESSAGE", handler);
}, [sendCommand]);
  // ─────────────────────────────────────────────────────────────────────────────
  // agentSafeChatHistory — used ONLY inside the agent WebSocket message handler.
  // Filters out internal agent debug statusResponse messages from the chat UI.
  // ─────────────────────────────────────────────────────────────────────────────
  const agentSafeChatHistory = useCallback((updater) => {
    setChatHistory((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return next.filter((msg) => {
        if (msg.type !== "statusResponse") return true;
        const text = typeof msg.content === "string" ? msg.content : "";
        const BLOCKED = [
          "Agent is thinking",
          "Done thinking",
          "Parsed Tool Call:",
          '{"name":',
           "Agent @agent invoked",
  "Swapping over to agent chat",
  "Type /exit to exit",
  "The tool call has direct output enabled",
  "The result will be returned directly",
  "no further tool calls will be run",
  "Tool use completed",
  "tool call resulted in direct output",
        ];
        return !BLOCKED.some((s) => text.includes(s));
      });
    });
  }, []);

  useEffect(() => {
    if (!loadingResponse) return;

    async function fetchReply() {
      const currentHistory = chatHistoryRef.current;
      const promptMessage =
        currentHistory.length > 0 ? currentHistory[currentHistory.length - 1] : null;
      const remHistory = currentHistory.length > 0 ? currentHistory.slice(0, -1) : [];
      var _chatHistory = [...remHistory];

      if (!!agentWebsocket) {
        if (!promptMessage || !promptMessage?.userMessage) return false;
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));
        agentWebsocket.send(
          JSON.stringify({
            type: "awaitingFeedback",
            feedback: promptMessage?.userMessage,
          })
        );
        return;
      }

      if (!promptMessage || !promptMessage?.userMessage) return false;
      const attachments = promptMessage?.attachments ?? parseAttachments();
      window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));

      const promptToSend = promptMessage?.userMessage || promptMessage?.content || "";
      await Workspace.multiplexStream({
        workspaceSlug: workspace.slug,
        threadSlug,
        prompt: promptToSend,
        // ✅ CORRECT: original signature — agentSafeChatHistory does NOT belong here
        chatHandler: (chatResult) =>
          handleChat(
            chatResult,
            setLoadingResponse,
            setChatHistory,
            remHistory,
            _chatHistory,
            setSocketId
          ),
        attachments,
      });
    }

    fetchReply();
  }, [loadingResponse]);

  const [mascotMessage, setMascotMessage] = useState(null);

  // Agent WebSocket
  useEffect(() => {
    function handleWSS() {
      try {
        if (!socketId || !!agentWebsocket) return;
        const socket = new WebSocket(
          `${websocketURI()}/api/agent-invocation/${socketId}`
        );
        socket.supportsAgentStreaming = false;

        window.addEventListener(ABORT_STREAM_EVENT, () => {
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          if (agentWebsocket) agentWebsocket.close();
        });

       socket.addEventListener("message", (event) => {
  let parsed;
  try {
    parsed = JSON.parse(event.data);
  } catch (e) {
    console.warn("Skipping non-JSON agent message:", event.data);
    return;
  }

  if (typeof parsed?.content === "string" && (
    parsed.content.startsWith("STUDY_ONBOARDING::") ||
    parsed.content.startsWith("STUDY_PLAN_FORM::") ||
    parsed.content.startsWith("FOLLOW_UP_QUESTIONS::")
  )) {
    agentSafeChatHistory((prev) => [
      ...prev.filter((msg) => !!msg.content || msg.type === "rechartVisualize"),
      {
        uuid: v4(),
        role: "assistant",
        content: parsed.content,
        pending: false,
        animate: false,
        closed: true,
        sources: [],
        error: null,
      },
    ]);
    return;
  }

  // ── LOG 1: Raw message arriving from agent ──────────────────
  console.log("🟡 [WS RAW] type:", parsed?.type, "| keys:", Object.keys(parsed));
  if (parsed?.content) {
    console.log("🟡 [WS RAW] content type:", typeof parsed.content,
      "| content preview:", typeof parsed.content === "object"
        ? JSON.stringify(parsed.content)?.substring(0, 200)
        : parsed.content?.substring?.(0, 200)
    );
  }

// ── Mascot: detect toolCallInvocation ────────────────────────
if (parsed?.type === "reportStreamEvent") {
  const inner = parsed.content;

  // Agent is thinking (function-call streaming phase)
  if (inner?.type === "statusResponse" && inner?.content?.includes("Agent is thinking")) {
    setMascotExpression(MASCOT_EXPRESSIONS.thinking);
  }

  // Tool has been identified — switch to tool-specific expression
  if (inner?.type === "toolCallInvocation") {
    const toolName = inner?.content?.match(/^Parsed Tool Call:\s*([\w-]+)/)?.[1];
    const state = TOOL_MASCOT_STATE[toolName];
   if (state) {
  setMascotExpression(state.expression);
  setMascotMessage(state.message);
} else {
  setMascotExpression(MASCOT_EXPRESSIONS.thinking);
  setMascotMessage("Working on it... 🧠");
}
  }
  // Clear message when done
if (inner?.type === "fullTextResponse" || inner?.type === "textResponseChunk") {
  setMascotMessage(null);                  
}

  // Tool result is streaming back — switch to explaining
  if (inner?.type === "textResponseChunk" || inner?.type === "fullTextResponse") {
    setMascotExpression(MASCOT_EXPRESSIONS.explaining);
    
  }
}

  // ── Unwrap standard string content ──────────────────────────
  if (parsed?.content && typeof parsed.content === "string") {
    try {
      const inner = JSON.parse(parsed.content);
      if (inner?.tool_call) {
        Object.assign(parsed, inner);
        console.log("🔵 [WS UNWRAP string] merged tool_call:", inner?.tool_call);
      }
    } catch (_) {
      console.log("🔵 [WS UNWRAP string] content was string but not valid JSON");
    }
  }

  // ── Unwrap to/from/content/state envelope (agent flow result) ──
  if (!parsed?.type && parsed?.from && parsed?.to && typeof parsed?.content === "string") {
    console.log("🟠 [WS FLOW ENVELOPE] detected to/from shape — parsing content");
    try {
      const inner = JSON.parse(parsed.content);
      console.log("🟠 [WS FLOW ENVELOPE] inner keys:", Object.keys(inner), "| tool:", inner?.tool, "| tool_call:", inner?.tool_call);

      // Normalise: backend sends `tool`, frontend checks `tool_call`
      if (inner?.tool && !inner?.tool_call) {
        inner.tool_call = inner.tool;
      }

      Object.assign(parsed, inner);
      console.log("🟠 [WS FLOW ENVELOPE] after merge — tool_call:", parsed?.tool_call,
        "| hasFlashcards:", !!parsed?.flashcards,
        "| cardsLength:", parsed?.flashcards?.cards?.length,
        "| hasQuiz:", !!parsed?.quiz
      );
    } catch (e) {
      console.warn("🟠 [WS FLOW ENVELOPE] failed to parse content:", e.message);
    }
  }

  // ── LOG 3: After all unwraps ─────────────────────────────────
  console.log("🟢 [WS POST-UNWRAP]", {
    type: parsed?.type,
    tool_call: parsed?.tool_call,
    hasQuiz: !!parsed?.quiz,
    questionsLength: parsed?.quiz?.questions?.length,
    hasFlashcards: !!parsed?.flashcards,
    cardsLength: parsed?.flashcards?.cards?.length,
    contentType: parsed?.content?.type,
    savedFlashcardSetId: parsed?.savedFlashcardSetId ?? parsed?.content?.savedFlashcardSetId,
    savedQuizId: parsed?.savedQuizId ?? parsed?.content?.savedQuizId,
  });

  // ── LOG 4: Flashcard trigger check ───────────────────────────
  console.log("🟣 [WS FLASHCARD CHECK]", {
    tool_call: parsed?.tool_call,
    hasFlashcards: !!parsed?.flashcards,
    cardsLength: parsed?.flashcards?.cards?.length,
    wouldTrigger: parsed?.tool_call === "flashcard_create" && parsed?.flashcards?.cards?.length > 0,
  });

  // ── LOG 5: Quiz trigger check ─────────────────────────────────
  console.log("🟣 [WS QUIZ CHECK]", {
    tool_call: parsed?.tool_call,
    hasQuiz: !!parsed?.quiz,
    questionsLength: parsed?.quiz?.questions?.length,
    wouldTrigger: parsed?.tool_call === "quiz_create" && parsed?.quiz?.questions?.length > 0,
  });

//   if (
//   typeof parsed?.content === "string" &&
//   parsed.content.startsWith("STUDY_PLAN_FORM::")
// ) {
//   agentSafeChatHistory((prev) => [
//     ...prev.filter((msg) => !!msg.content || msg.type === "rechartVisualize"),
//     {
//       uuid: v4(),
//       role: "assistant",
//       content: parsed.content,
//       pending: false,
//       animate: false,
//       closed: true,
//       sources: [],
//       error: null,
//     },
//   ]);
//   return;
// }


// if (
//   typeof parsed?.content === "string" &&
//   parsed.content.startsWith("FOLLOW_UP_QUESTIONS::")
// ) {
//   agentSafeChatHistory((prev) => [
//     ...prev.filter((msg) => !!msg.content || msg.type === "rechartVisualize"),
//     {
//       uuid: v4(),
//       role: "assistant",
//       content: parsed.content,  // ← clean prefix, renders correctly
//       pending: false,
//       animate: false,
//       closed: true,
//       sources: [],
//       error: null,
//     },
//   ]);
//   return;
// }

  try {
    const rawContent = parsed?.content ?? parsed?.text ?? parsed?.message ?? "";
    const content = typeof rawContent === "string" ? rawContent : "";
    const nestedContent =
      typeof parsed?.content?.content === "string"
        ? parsed.content.content
        : "";
    const rawData = String(event.data ?? "");

    const FILTERED_PREFIXES = [
      '{"name":',
      "Parsed Tool Call:",
      "Agent is thinking",
      "Done thinking",
      'create-chart","arguments":',
      'quiz_create","arguments":',
      'flashcard_create","arguments":',
      'web_search","arguments":',
      'study-planner-elicit","arguments":',
      'study_planner_elicit","arguments":',
       "Agent @agent invoked",
  "Swapping over to agent chat",
  "Type /exit to exit",
  "The tool call has direct output enabled",
  "Tool use completed",
  "tool call resulted in direct output",
    ];
    const FILTERED_PATTERNS = [
      /^@\w+ is executing `.+` tool/,
      /^@\w+:\s/,
      /^[\w_-]+","arguments"\s*:\s*\{/,
    ];

    const isInternalAgentLog =
      FILTERED_PREFIXES.some(
        (prefix) =>
          content.trimStart().startsWith(prefix) ||
          rawData.trimStart().startsWith(prefix) ||
          nestedContent.trimStart().startsWith(prefix)
      ) ||
      FILTERED_PATTERNS.some(
        (pattern) =>
          pattern.test(content) ||
          pattern.test(rawData) ||
          pattern.test(nestedContent)
      ) ||
      parsed?.type === "agentThought" ||
      parsed?.type === "toolCall";

    if (isInternalAgentLog) {
      console.log("🚫 [WS FILTERED] message blocked as internal agent log");
      return;
    }

    // ── Flashcard handler ─────────────────────────────────────
    if (parsed?.tool_call === "flashcard_create" && parsed?.flashcards?.cards?.length > 0) {
      console.log("✅ [WS FLASHCARD TRIGGERED] cards:", parsed.flashcards.cards.length);
      setFlashcardData(parsed.flashcards);
      setShowFlashcards(true);
      setMascotExpression(MASCOT_EXPRESSIONS.studying);
      parsed.display_message = `🎴 Flashcards created — ${parsed.flashcards.cards.length} cards ready. Click to reopen.`;
    }

    // ── Quiz handler ──────────────────────────────────────────
    if (parsed?.tool_call === "quiz_create" && parsed?.quiz?.questions?.length > 0) {
      console.log("✅ [WS QUIZ TRIGGERED] questions:", parsed.quiz.questions.length);
      openQuizPanel(parsed.quiz);
      setMascotExpression(MASCOT_EXPRESSIONS.quizzing);
      parsed.display_message = `✅ Quiz generated on **${parsed.parameters?.subject || "a subject"}** (${parsed.quiz.questions.length} questions). Click to reopen.`;
    }

    // ── Study planner elicit handler ──────────────────────────
    if (parsed?.tool_call === "study_planner_elicit") {
      agentSafeChatHistory((prev) => [
        ...prev.filter((msg) => !!msg.content || msg.type === "rechartVisualize"),
        {
          uuid: v4(),
          role: "assistant",
          content: `STUDY_PLAN_FORM::${JSON.stringify({ prefill: parsed.prefill ?? {} })}`,
          pending: false,
          animate: false,
          closed: true,
          sources: [],
          error: null,
        },
      ]);
      return;
    }

    // ── Chart handler ─────────────────────────────────────────
    const inlineChartCandidate =
      parsed?.tool_call === "create_chart" ? parsed?.chart :
      parsed?.tool_call === "create-chart" ? parsed?.chart :
      (parsed?.dataset && CHART_TYPES.includes(parsed?.type)) ? parsed : null;

    if (inlineChartCandidate) {
      console.log("✅ [WS CHART TRIGGERED]", inlineChartCandidate);
      const chartData = {
        ...inlineChartCandidate,
        dataset:
          typeof inlineChartCandidate.dataset === "string"
            ? JSON.parse(inlineChartCandidate.dataset)
            : inlineChartCandidate.dataset,
      };
      agentSafeChatHistory((prev) => [
        ...prev.filter((msg) => !!msg.content),
        {
          type: "rechartVisualize",
          uuid: v4(),
          content: chartData,
          role: "assistant",
          sources: [],
          closed: true,
          error: null,
          animate: false,
          pending: false,
        },
      ]);
      return;
    }

    console.log("⚪ [WS FALLTHROUGH] passing to handleSocketResponse");
    handleSocketResponse(socket, event, agentSafeChatHistory, parsed);
  } catch (e) {
    console.error("Error processing agent message:", e);
  }
});

        socket.addEventListener("close", (_event) => {
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          removeStudyPlanForm();
          setChatHistory((prev) => [
            // ✅ Keep notifications, keep messages with content, keep charts
            ...prev.filter(
              (msg) =>
                msg.role === "notification" ||
                !!msg.content ||
                msg.type === "rechartVisualize"
            ),
          ]);
          setLoadingResponse(false);
          setAgentWebsocket(null);
          setSocketId(null);
        });

        setAgentWebsocket(socket);
        window.dispatchEvent(new CustomEvent(AGENT_SESSION_START));
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));
      } catch (e) {
        setChatHistory((prev) => [
          ...prev.filter((msg) => msg.role === "notification" || !!msg.content),
          {
            uuid: v4(),
            type: "abort",
            content: e.message,
            role: "assistant",
            sources: [],
            closed: true,
            error: e.message,
            animate: false,
            pending: false,
          },
        ]);
        setLoadingResponse(false);
        setAgentWebsocket(null);
        setSocketId(null);
      }
    }
    handleWSS();
  }, [socketId]);

  // Notification WebSocket
  useEffect(() => {
    if (!user?.id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host.includes("localhost")
      ? "localhost:3001"
      : window.location.host;
    const wsUrl = `${protocol}//${host}/ws/notifications`;

    let ws;
    try {
      ws = new WebSocket(wsUrl);
      setNotificationWebsocket(ws);
    } catch (error) {
      console.error("❌ Failed to create notification WebSocket:", error);
      return;
    }

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "register", userId: user.id }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "quiz_assigned") {
          setChatHistory((prev) => [
            ...prev,
            {
              uuid: v4(),
              content: data.message,
              role: "notification",
              type: "quiz_assigned",
              link: data.link,
              pending: false,
              animate: true,
              actionLabel: "Take Quiz",
            },
          ]);
          setMascotExpression(MASCOT_EXPRESSIONS.encouraging);
          setTimeout(() => setMascotExpression(MASCOT_EXPRESSIONS.happy), 4000);

          if ("Notification" in window && Notification.permission === "granted") {
            const browserNotif = new Notification("New Quiz Assigned", {
              body: data.message,
              icon: "/logo.png",
              tag: "quiz-notification",
            });
            browserNotif.onclick = () => {
              window.focus();
              window.location.href = data.link;
              browserNotif.close();
            };
          }
        }

        if (data.type === "subscription_status") {
          setChatHistory((prev) => [
            ...prev,
            {
              uuid: v4(),
              content: data.message,
              role: "notification",
              type: "subscription_status",
              status: data.status,
              redirect: data.redirect || null,
              pending: false,
              animate: true,
            },
          ]);

          if (data.redirect) window.location.href = data.redirect;

          if ("Notification" in window && Notification.permission === "granted") {
            const notif = new Notification("Subscription Update", {
              body: data.message,
              icon: "/logo.png",
              tag: `subscription-${data.status}`,
            });
            notif.onclick = () => {
              window.focus();
              if (data.redirect) window.location.href = data.redirect;
            };
          }
        }
      } catch (e) {
        console.error("❌ Failed to parse notification:", event.data, e);
      }
    };

    ws.onerror = (error) => console.error("❌ Notification WebSocket error:", error);
    ws.onclose = (event) => console.log("🔌 Notification WebSocket closed", event.code, event.reason);

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    return () => {
      if (ws) ws.close();
    };
  }, [user?.id]);

  // Fetch unread notifications on mount
  useEffect(() => {
    const fetchUnreadNotifications = async () => {
      if (!user?.id) return;
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        const res = await fetch(`${API_BASE}/system/notifications/unread`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) return;
        const { success, notifications } = await res.json();
        if (success && notifications.length > 0) {
          const notificationMessages = notifications.map((notif) => ({
            uuid: `notif-${notif.id}`,
            content: notif.message,
            role: "notification",
            type: notif.type,
            link: notif.link,
            pending: false,
            animate: false,
            notificationId: notif.id,
            createdAt: notif.createdAt,
          }));
          setChatHistory((prev) => {
            const existingIds = new Set(
              prev.filter((m) => m.notificationId).map((m) => m.notificationId)
            );
            const newNotifs = notificationMessages.filter(
              (n) => !existingIds.has(n.notificationId)
            );
            return [...newNotifs, ...prev];
          });
        }
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    fetchUnreadNotifications();
  }, [user?.id, API_BASE]);

  // ─────────────────────────────────────────────────────────────────────────────
  // THE FIX: knownHistory sync — only reset when workspace or thread changes.
  // ─────────────────────────────────────────────────────────────────────────────
  const prevWorkspaceSlug = useRef(workspace.slug);
  const prevThreadSlug = useRef(threadSlug);
  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevWorkspaceSlug.current = workspace.slug;
      prevThreadSlug.current = threadSlug;
      return;
    }

    const workspaceChanged = prevWorkspaceSlug.current !== workspace.slug;
    const threadChanged = prevThreadSlug.current !== threadSlug;

    prevWorkspaceSlug.current = workspace.slug;
    prevThreadSlug.current = threadSlug;

    if (!workspaceChanged && !threadChanged) return;

    setChatHistory((prev) => {
      const notifications = prev.filter((m) => m.role === "notification");
      return [...notifications, ...knownHistory];
    });
  }, [knownHistory, workspace.slug, threadSlug]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="spinner mb-4" />
          <p className="text-white/60">Verifying subscription...</p>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  const notifications = chatHistory.filter((m) => m.role === "notification");
  const chatMessages = chatHistory.filter((m) => m.role !== "notification");

  return (
    <div className={`chat-layout ${showQuiz ? "with-quiz" : ""} ${showFlashcards ? "with-flashcards" : ""}`}>
      {subscriptionExpiry &&
        new Date(subscriptionExpiry.getTime() - 3 * 24 * 60 * 60 * 1000) < new Date() && (
          <div className="bg-yellow-500/20 text-yellow-300 px-4 py-2 text-sm border-b border-yellow-500/30">
            ⚠️ Your subscription expires on {subscriptionExpiry.toLocaleDateString()}.
            <a href="/payment" className="underline ml-2">Renew now</a>
          </div>
        )}

      <div
        ref={chatAreaRef}
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="transition-all duration-500 relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px]
                   bg-theme-bg-secondary w-full h-full overflow-y-scroll no-scroll z-[2]"
      >
        {isMobile && <SidebarMobileHeader />}
        <SubjectSelector
          subject={subject}
          setSubject={setSubject}
          curriculum={curriculum}
          setCurriculum={(val) => {
            localStorage.setItem(CURRICULUM_KEY, val);
            setCurriculum(val);
          }}
          grade={grade}
        />

        <DnDFileUploaderWrapper>
          <MetricsProvider>
            {notifications.length > 0 && (
              <div className="notification-banner-container px-4 py-2 space-y-2">
                {notifications.map((notif) => (
                  <NotificationMessage
                    key={notif.uuid || notif.notificationId}
                    message={notif}
                  />
                ))}
              </div>
            )}
            <ChatHistory
              history={chatMessages}
              workspace={workspace}
              sendCommand={sendCommand}
              updateHistory={setChatHistory}
              regenerateAssistantMessage={regenerateAssistantMessage}
              hasAttachments={files.length > 0}
              onMessageClick={handleMessageClick}
              mascotExpression={mascotExpression}
            />
          </MetricsProvider>
          <PromptInput
            submit={handleSubmit}
            onChange={handleMessageChange}
            isStreaming={loadingResponse}
            sendCommand={sendCommand}
            attachments={files}
          />
        </DnDFileUploaderWrapper>
        <ChatTooltips />
      </div>

      {showQuiz && (
        <aside className="quiz-panel">
         
          <ExamPanel externalTest={quizData} onClose={() => { setShowQuiz(false); }} />
        </aside>
      )}

      {showFlashcards && flashcardData && (
        <aside className="quiz-panel flashcard-panel">
         
          <Flashcards flashcardData={flashcardData} />
        </aside>
      )}
    </div>
  );
}
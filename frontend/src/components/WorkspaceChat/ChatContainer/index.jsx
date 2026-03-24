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
import { MASCOT_EXPRESSIONS, ChikoroMascot } from "@/components/ChikoroMascot";

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
  // 🤖 MASCOT STATE — drives expression across the chat page
  // ═══════════════════════════════════════════════════════════
  const [mascotExpression, setMascotExpression] = useState(MASCOT_EXPRESSIONS.waving);

  // Derive mascot expression from app state
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

  // Briefly show "explaining" when a new assistant message completes streaming
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

  const API_BASE = import.meta.env.VITE_API_BASE || "https://api.chikoro-ai.com/api";

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
          console.error("❌ Ghost User Detected (ID mismatch). Auto-clearing session.");
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

    if (user?.id) {
      fetchProfileById();
    }
  }, [user, API_BASE]);

  // Listen for quiz creation events
  useEffect(() => {
    const handleQuizCreated = (event) => {
      if (event.detail?.quiz?.questions?.length > 0) {
        openQuizPanel(event.detail.quiz);
        // 🤖 Mascot reacts to quiz creation
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
        // 🤖 Mascot reacts to flashcard creation
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

    const userUuid = v4();
    const assistantUuid = v4();

    const prevChatHistory = [
      ...chatHistoryRef.current,
      {
        uuid: userUuid,
        content: displayMessage,
        userMessage: contextualMessage,
        role: "user",
        attachments: parseAttachments(),
      },
      {
        uuid: assistantUuid,
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

    const userUuid = v4();
    const assistantUuid = v4();

    const baseHistory = history.length > 0 ? history : chatHistoryRef.current;

    const prevChatHistory = [
      ...baseHistory,
      {
        uuid: userUuid,
        content: displayText,
        userMessage: contextualText,
        role: "user",
        attachments,
      },
      {
        uuid: assistantUuid,
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

  // Agent WebSocket useEffect
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
          setLoadingResponse(true);
          try {
            const parsed = JSON.parse(event.data);

            if (parsed?.tool_call === "quiz_create" && parsed?.quiz?.questions?.length > 0) {
              openQuizPanel(parsed.quiz);
              setMascotExpression(MASCOT_EXPRESSIONS.quizzing);
              parsed.display_message = `✅ Quiz generated on **${parsed.parameters?.subject || "a subject"}** (${parsed.quiz.questions.length} questions). Click to reopen.`;
            }

            if (parsed?.tool_call === "flashcard_create" && parsed?.flashcards?.cards?.length > 0) {
              setMascotExpression(MASCOT_EXPRESSIONS.studying);
              parsed.display_message = `🎴 Flashcards created — ${parsed.flashcards.cards.length} cards ready. Click to reopen.`;
            }

            handleSocketResponse(socket, event, setChatHistory, parsed);
          } catch (e) {
            console.error("Failed to parse data");
            window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
            socket.close();
          }
          setLoadingResponse(false);
        });

        socket.addEventListener("close", (_event) => {
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          setChatHistory((prev) => [
            ...prev.filter((msg) => !!msg.content),
            {
              uuid: v4(),
              type: "statusResponse",
              content: "Agent session complete.",
              role: "assistant",
              sources: [],
              closed: true,
              error: null,
              animate: false,
              pending: false,
            },
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
          ...prev.filter((msg) => !!msg.content),
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

  // Notification WebSocket useEffect
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

          // 🤖 Mascot reacts to notification
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

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setChatHistory((prev) => {
      const nonChatMessages = prev.filter((m) => m.role === "notification");
      return [...nonChatMessages, ...knownHistory];
    });
  }, [knownHistory]);

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
          <div className="chk-panel-header">
            <ChikoroMascot expression={mascotExpression} size={32} animate={true} />
            <span className="chk-panel-title">Quiz Mode</span>
            <button className="close-quiz" onClick={() => {
              setShowQuiz(false);
              setLoadingResponse(false);
              window.dispatchEvent(new CustomEvent(ABORT_STREAM_EVENT));
            }}>
              ✕
            </button>
          </div>
          <Test externalTest={quizData} />
        </aside>
      )}

      {showFlashcards && flashcardData && (
        <aside className="quiz-panel flashcard-panel">
          <div className="chk-panel-header">
            <ChikoroMascot expression={mascotExpression} size={32} animate={true} />
            <span className="chk-panel-title">Flashcards</span>
            <button className="close-quiz" onClick={() => {
              setShowFlashcards(false);
              setLoadingResponse(false);
              window.dispatchEvent(new CustomEvent(ABORT_STREAM_EVENT));
            }}>
              ✕
            </button>
          </div>
          <Flashcards flashcardData={flashcardData} />
        </aside>
      )}
    </div>
  );
}
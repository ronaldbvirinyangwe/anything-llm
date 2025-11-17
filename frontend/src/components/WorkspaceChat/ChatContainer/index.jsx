import { useState, useEffect, useContext, useRef } from "react";
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

export default function ChatContainer({ workspace, knownHistory = [] }) {
  const { threadSlug = null } = useParams();
  const [message, setMessage] = useState("");
  const [loadingResponse, setLoadingResponse] = useState(false);
  const [chatHistory, setChatHistory] = useState(knownHistory);
  const [socketId, setSocketId] = useState(null);
  const [websocket, setWebsocket] = useState(null);
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

  useEffect(() => {
    console.log("🔄 showFlashcards changed to:", showFlashcards);
    console.log("🔄 flashcardData:", flashcardData);
  }, [showFlashcards, flashcardData]);

  const API_BASE = import.meta.env.VITE_API_BASE;
  
  // 🧠 Fetch user profile info (curriculum, grade, etc.)
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

        if (!res.ok) {
          console.error("Profile fetch failed:", await res.text());
          return;
        }

        const { success, profile } = await res.json();
        if (success && profile) {
          console.log("✅ Profile fetched:", profile);
          setAge(profile.age || "");
          setGrade(profile.grade || "");
          setCurriculum(profile.curriculum || "");
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
      console.log("🧠 Quiz event received in ChatContainer:", event.detail.quiz);
      if (event.detail?.quiz?.questions?.length > 0) {
        openQuizPanel(event.detail.quiz);
      }
    };

    window.addEventListener("QUIZ_CREATED", handleQuizCreated);
    
    return () => {
      window.removeEventListener("QUIZ_CREATED", handleQuizCreated);
    };
  }, []);

  useEffect(() => {
    const handleFlashcardCreated = (event) => {
      console.log("🎴 Flashcard event received:", event.detail);
      console.log("🎴 Flashcards object:", event.detail?.flashcards);
      console.log("🎴 Cards array:", event.detail?.flashcards?.cards);
      
      if (event.detail?.flashcards?.cards?.length > 0) {
        console.log("✅ Opening flashcard panel with", event.detail.flashcards.cards.length, "cards");
        setFlashcardData(event.detail.flashcards);
        setShowFlashcards(true);
      } else {
        console.error("❌ No cards found");
      }
    };

    window.addEventListener("FLASHCARD_CREATED", handleFlashcardCreated);
    
    return () => {
      window.removeEventListener("FLASHCARD_CREATED", handleFlashcardCreated);
    };
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

  // 🧩 Helper — builds context string for the model only
  const buildContextPrefix = () => {
    return [
      subject && `[Subject: ${subject}]`,
      curriculum && `[Curriculum: ${curriculum}]`,
      academicLevel && `[Academic Level: ${academicLevel}]`,
      grade && `[Grade: ${grade}]`,
      age && `[Age: ${age}]`,
    ]
      .filter(Boolean)
      .join(" ");
  };

 const handleSubmit = async (event) => {
  event.preventDefault();
  if (!message || message === "") return false;

  const contextPrefix = buildContextPrefix();
  const contextualMessage = `${contextPrefix} ${message}`.trim();
  const displayMessage = message; // <-- what we show in chat

  const prevChatHistory = [
    ...chatHistory,
    {
      content: displayMessage,       // shown in UI
      userMessage: contextualMessage, // sent to model
      role: "user",
      attachments: parseAttachments(),
    },
    {
      content: "", // assistant placeholder shown as pending
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

  const regenerateAssistantMessage = (chatId) => {
    const updatedHistory = chatHistory.slice(0, -1);
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
  };

  const sendCommand = async ({
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

let prevChatHistory;
if (history.length > 0) {
  prevChatHistory = [
    ...history,
    {
      content: displayText,
      userMessage: contextualText,
      role: "user",
      attachments: attachments,
    },
    {
      content: "",
      role: "assistant",
      pending: true,
      userMessage: contextualText,
      attachments,
      animate: true,
    },
  ];
} else {
  prevChatHistory = [
    ...chatHistory,
    {
      content: displayText,
      userMessage: contextualText,
      role: "user",
      attachments,
    },
    {
      content: "",
      role: "assistant",
      pending: true,
      userMessage: contextualText,
      attachments,
      animate: true,
    },
  ];
}
setChatHistory(prevChatHistory);
setMessageEmit("");
setLoadingResponse(true);
  };

  useEffect(() => {
    async function fetchReply() {
      const promptMessage =
        chatHistory.length > 0 ? chatHistory[chatHistory.length - 1] : null;
      const remHistory = chatHistory.length > 0 ? chatHistory.slice(0, -1) : [];
      var _chatHistory = [...remHistory];

      if (!!websocket) {
        if (!promptMessage || !promptMessage?.userMessage) return false;
        window.dispatchEvent(new CustomEvent(CLEAR_ATTACHMENTS_EVENT));
        websocket.send(
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
      return;
    }
    loadingResponse === true && fetchReply();
  }, [loadingResponse, chatHistory, workspace]);

  useEffect(() => {
    function handleWSS() {
      try {
        if (!socketId || !!websocket) return;
        const socket = new WebSocket(
          `${websocketURI()}/api/agent-invocation/${socketId}`
        );
        socket.supportsAgentStreaming = false;

        window.addEventListener(ABORT_STREAM_EVENT, () => {
          window.dispatchEvent(new CustomEvent(AGENT_SESSION_END));
          websocket.close();
        });

        socket.addEventListener("message", (event) => {
  setLoadingResponse(true);
  try {
    const parsed = JSON.parse(event.data);

    // 🧠 Detect tool calls and enrich them
    if (parsed?.tool_call === "quiz_create" && parsed?.quiz?.questions?.length > 0) {
      openQuizPanel(parsed.quiz);

      // ✅ Add a human-friendly message
      parsed.display_message = `✅ Quiz generated successfully on **${parsed.parameters?.subject || "a subject"}** for **${parsed.parameters?.grade || "students"}** (${parsed.quiz.questions.length} questions).`;
    }

    if (parsed?.tool_call === "flashcard_create" && parsed?.flashcards?.cards?.length > 0) {
      parsed.display_message = `🎴 Flashcards created successfully — ${parsed.flashcards.cards.length} cards ready for study.`;
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
          setWebsocket(null);
          setSocketId(null);
        });
        setWebsocket(socket);
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
        setWebsocket(null);
        setSocketId(null);
      }
    }
    handleWSS();
  }, [socketId]);

  // Add this near your other useEffects
useEffect(() => {
  console.log("🔍 WebSocket useEffect triggered");
  console.log("🔍 User object:", user);
  console.log("🔍 User ID:", user?.id);
  
  if (!user?.id) {
    console.log("❌ No user ID, skipping WebSocket connection");
    return;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host.includes("localhost") 
    ? "localhost:3001" 
    : window.location.host;
  const wsUrl = `${protocol}//${host}/ws/notifications`;

  console.log("🔌 Attempting to connect to:", wsUrl);
  
  let ws;
  try {
    ws = new WebSocket(wsUrl);
    console.log("🔌 WebSocket object created:", ws);
  } catch (error) {
    console.error("❌ Failed to create WebSocket:", error);
    return;
  }

  ws.onopen = () => {
    console.log("✅ Connected to Notifications WebSocket");
    console.log("✅ WebSocket readyState:", ws.readyState);
    // Register with user ID
    const registerMsg = JSON.stringify({ 
      type: "register", 
      userId: user.id 
    });
    console.log("📝 Sending registration:", registerMsg);
    ws.send(registerMsg);
    console.log("📝 Registered user ID:", user.id);
  };

 ws.onmessage = (event) => {
  try {
    const notif = JSON.parse(event.data);
    console.log("📢 Notification received:", notif);

    if (notif.type === "quiz_assigned") {
      // Show notification in chat history with action button
      setChatHistory((prev) => [
        ...prev,
        {
          uuid: v4(),
          content: notif.message,
          role: "notification",
          type: "quiz_assigned",
          link: notif.link,
          pending: false,
          animate: true,
          actionLabel: "Take Quiz", // Add action button text
        },
      ]);

      // Browser notification
      if ("Notification" in window && Notification.permission === "granted") {
        const browserNotif = new Notification("New Quiz Assigned", {
          body: notif.message,
          icon: "/logo.png",
          tag: "quiz-notification", // Prevent duplicates
        });

        // Make browser notification clickable
        browserNotif.onclick = () => {
          window.focus();
          window.location.href = notif.link; // Navigate to quiz
          browserNotif.close();
        };
      }
    }
  } catch (e) {
    console.error("❌ Failed to parse notification:", event.data, e);
  }
};
  ws.onerror = (error) => {
    console.error("❌ WebSocket error:", error);
    console.error("❌ WebSocket state:", ws.readyState);
  };

  ws.onclose = (event) => {
    console.log("🔌 WebSocket closed");
    console.log("🔌 Close code:", event.code);
    console.log("🔌 Close reason:", event.reason);
    console.log("🔌 Was clean:", event.wasClean);
  };

  // Request notification permission on mount
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      console.log("🔔 Notification permission:", permission);
    });
  }

  return () => {
    console.log("🧹 Cleaning up WebSocket connection");
    if (ws) {
      ws.close();
    }
  };
}, [user?.id]);

useEffect(() => {
  if (!user?.id) return; // Don't connect without a user

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.host.includes("localhost") 
    ? "localhost:3001" 
    : window.location.host;
  const wsUrl = `${protocol}//${host}/ws/notifications`;

  console.log("🔌 Connecting to WebSocket for subscription updates:", wsUrl);
  const socket = new WebSocket(wsUrl);
  setWebsocket(socket); // optional if you want to store it

  socket.onopen = () => {
    console.log("✅ WebSocket connected for subscription updates");

    // Register user with backend
    const registerMsg = JSON.stringify({
      type: "register",
      userId: user.id,
    });
    socket.send(registerMsg);
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Only handle subscription status updates here
      if (data.type === "subscription_status") {
        console.log("📢 Subscription status received:", data);

        // Add the message to chatHistory
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

        // Optional: redirect if backend sends redirect URL
        if (data.redirect) {
          window.location.href = data.redirect;
        }

        // Optional: show browser notification
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
    } catch (err) {
      console.error("❌ Failed to parse subscription WS message:", event.data, err);
    }
  };

  socket.onerror = (err) => {
    console.error("❌ Subscription WebSocket error:", err);
  };

  socket.onclose = (event) => {
    console.log("🔌 Subscription WebSocket closed", event.code, event.reason);
  };

  // Request notification permission if default
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().then((permission) => {
      console.log("🔔 Notification permission:", permission);
    });
  }

  return () => {
    console.log("🧹 Cleaning up Subscription WebSocket");
    if (socket) socket.close();
  };
}, [user?.id]);

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

      if (!res.ok) {
        console.log("⚠️ Failed to fetch notifications:", res.status);
        return;
      }

      const { success, notifications } = await res.json();
      
      if (success && notifications.length > 0) {
        console.log("📬 Loaded", notifications.length, "unread notifications");
        
        // Add notifications to chat history
        const notificationMessages = notifications.map(notif => ({
          uuid: v4(),
          content: notif.message,
          role: "notification",
          type: notif.type,
          link: notif.link,
          pending: false,
          animate: false,
          notificationId: notif.id,
          createdAt: notif.createdAt,
        }));

        // Prepend notifications to chat history
        setChatHistory(prev => [...notificationMessages, ...prev]);
      }
    } catch (err) {
      console.error("❌ Failed to fetch notifications:", err);
    }
  };

  fetchUnreadNotifications();
}, [user?.id, API_BASE]);

  console.log("🎨 Rendering ChatContainer:", { showQuiz, showFlashcards, hasFlashcardData: !!flashcardData });
  console.log("📊 Profile state:", { curriculum, grade, age, academicLevel });

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

  // 🔒 IF NO ACCESS, SHOW NOTHING (user will be redirected by the hook)
  if (!hasAccess) {
    return null;
  }
  

  return (
    <div className={`chat-layout ${showQuiz ? "with-quiz" : ""} ${showFlashcards ? "with-flashcards" : ""}`}>
      {/* 💬 Main Chat Section */}

       {subscriptionExpiry && 
       new Date(subscriptionExpiry.getTime() - 3 * 24 * 60 * 60 * 1000) < new Date() && (
        <div className="bg-yellow-500/20 text-yellow-300 px-4 py-2 text-sm border-b border-yellow-500/30">
          ⚠️ Your subscription expires on {subscriptionExpiry.toLocaleDateString()}. 
          <a href="/payment" className="underline ml-2">Renew now</a>
        </div>
      )}
      
      <div
        style={{ height: isMobile ? "100%" : "calc(100% - 32px)" }}
        className="transition-all duration-500 relative md:ml-[2px] md:mr-[16px] md:my-[16px] md:rounded-[16px]
                   bg-theme-bg-secondary w-full h-full overflow-y-scroll no-scroll z-[2]"
      >
        {isMobile && <SidebarMobileHeader />}
        <SubjectSelector 
          subject={subject} 
          setSubject={setSubject}
          curriculum={curriculum}
          grade={grade}
        />

        <DnDFileUploaderWrapper>
          <MetricsProvider>
            <ChatHistory
              history={chatHistory}
              workspace={workspace}
              sendCommand={sendCommand}
              updateHistory={setChatHistory}
              regenerateAssistantMessage={regenerateAssistantMessage}
              hasAttachments={files.length > 0}
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

      {/* 🧠 Anthropic-style Right Panel (Quiz/Test) */}
      {showQuiz && (
        <aside className="quiz-panel">
          <Test externalTest={quizData} />
          <button className="close-quiz" onClick={() => setShowQuiz(false)}>
            ✕
          </button>
        </aside>
      )}
      {/* Flashcards Panel */}
      {showFlashcards && flashcardData && (
        <aside className="quiz-panel flashcard-panel">
          <button className="close-quiz" onClick={() => {
            console.log("❌ Closing flashcards");
            setShowFlashcards(false);
          }}>
            ✕
          </button>
          <Flashcards flashcardData={flashcardData} />
        </aside>
      )}
    </div>
  );
}
import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import HistoricalMessage from "./HistoricalMessage";
import PromptReply from "./PromptReply";
import StatusResponse from "./StatusResponse";
import { useManageWorkspaceModal } from "../../../Modals/ManageWorkspace";
import ManageWorkspace from "../../../Modals/ManageWorkspace";
import { ArrowDown } from "@phosphor-icons/react";
import debounce from "lodash.debounce";
import useUser from "@/hooks/useUser";
import Chartable from "./Chartable";
import Workspace from "@/models/workspace";
import { useParams } from "react-router-dom";
import paths from "@/utils/paths";
import Appearance from "@/models/appearance";
import useTextSize from "@/hooks/useTextSize";
import { v4 } from "uuid";
import { useTranslation } from "react-i18next";
import { useChatMessageAlignment } from "@/hooks/useChatMessageAlignment";
import { useNavigate } from "react-router-dom";
import './notification.css';
import { useVirtualizer } from "@tanstack/react-virtual";
import  { MascotWithBubble, ChikoroMascot, MascotSpeechBubble, MASCOT_EXPRESSIONS } from "@/components/ChikoroMascot";
import { ThoughtChainComponent, THOUGHT_REGEX_OPEN } from "../ChatHistory/ThoughtContainer/index";

// ═══════════════════════════════════════════════════════════════
// NOTIFICATION MESSAGE — now with mascot based on notification type
// ═══════════════════════════════════════════════════════════════

function getNotificationExpression(type) {
  switch (type) {
    case "quiz_assigned":
      return MASCOT_EXPRESSIONS.quizzing;
    case "subscription_status":
      return MASCOT_EXPRESSIONS.comeback;
    case "streak_broken":
      return MASCOT_EXPRESSIONS.disappointed;
    case "inactive_reminder":
      return MASCOT_EXPRESSIONS.sleeping;
    default:
      return MASCOT_EXPRESSIONS.encouraging;
  }
}

export const NotificationMessage = memo(function NotificationMessage({ message }) {
  const navigate = useNavigate();
  const API_BASE = import.meta.env.VITE_API_BASE || "https://api.chikoro-ai.com/api";

  const handleTakeQuiz = async () => {
    if (message.notificationId) {
      try {
        const token = localStorage.getItem("chikoroai_authToken");
        await fetch(`${API_BASE}/system/notifications/${message.notificationId}/read`, {
          method: 'PATCH',
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (err) {
        console.error("❌ Failed to mark notification as read:", err);
      }
    }

    if (message.link) {
      navigate(message.link);
    }
  };

  const mascotExpr = getNotificationExpression(message.type);

  return (
    <div className={`notification-card ${message.darkMode ? 'dark' : ''}`}>
      <div className="notification-icon">
        <ChikoroMascot
          expression={mascotExpr}
          size={36}
          animate={true}
        />
      </div>
      <div className="notification-content">
        <p className="notification-message">{message.content}</p>
        <p className="notification-time">
          {message.createdAt
            ? new Date(message.createdAt).toLocaleString()
            : 'Just now'}
        </p>
      </div>
      {message.link && (
        <button onClick={handleTakeQuiz} className="notification-button">
          Take Quiz
        </button>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════
// CHAT HISTORY — now with mascot integration
// ═══════════════════════════════════════════════════════════════
export default function ChatHistory({
  history = [],
  workspace,
  sendCommand,
  updateHistory,
  regenerateAssistantMessage,
  hasAttachments = false,
  onMessageClick,
  mascotExpression = MASCOT_EXPRESSIONS.happy, // 🤖 NEW PROP
}) {
  const { t } = useTranslation();
  const lastScrollTopRef = useRef(0);
  const { user } = useUser();
  const { threadSlug = null } = useParams();
  const { showing, showModal, hideModal } = useManageWorkspaceModal();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const chatHistoryRef = useRef(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const isStreaming = history[history.length - 1]?.animate;
  const { showScrollbar } = Appearance.getSettings();
  const { textSizeClass } = useTextSize();
  const { getMessageAlignment } = useChatMessageAlignment();

  const historyRef = useRef(history);
  useEffect(() => {
    historyRef.current = history;
  }, [history]);

  useEffect(() => {
    if (!isUserScrolling && (isAtBottom || isStreaming)) {
      scrollToBottom(false);
    }
  }, [history, isAtBottom, isStreaming, isUserScrolling]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isBottom = scrollHeight - scrollTop === clientHeight;

    if (Math.abs(scrollTop - lastScrollTopRef.current) > 10) {
      setIsUserScrolling(!isBottom);
    }

    setIsAtBottom(isBottom);
    lastScrollTopRef.current = scrollTop;
  };

  const debouncedScroll = debounce(handleScroll, 100);

  useEffect(() => {
    const chatHistoryElement = chatHistoryRef.current;
    if (chatHistoryElement) {
      chatHistoryElement.addEventListener("scroll", debouncedScroll);
      return () =>
        chatHistoryElement.removeEventListener("scroll", debouncedScroll);
    }
  }, []);

  const scrollToBottom = (smooth = false) => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTo({
        top: chatHistoryRef.current.scrollHeight,
        ...(smooth ? { behavior: "smooth" } : {}),
      });
    }
  };

  const handleSendSuggestedMessage = (heading, message) => {
    sendCommand({ text: `${heading} ${message}`, autoSubmit: true });
  };

  const saveEditedMessage = useCallback(async ({
    editedMessage,
    chatId,
    role,
    attachments = [],
  }) => {
    if (!editedMessage) return;
    const currentHistory = historyRef.current;

    if (role === "user") {
      const updatedHistory = currentHistory.slice(
        0,
        currentHistory.findIndex((msg) => msg.chatId === chatId) + 1
      );
      updatedHistory[updatedHistory.length - 1].content = editedMessage;
      await Workspace.deleteEditedChats(workspace.slug, threadSlug, chatId);
      sendCommand({
        text: editedMessage,
        autoSubmit: true,
        history: updatedHistory,
        attachments,
      });
      return;
    }

    if (role === "assistant") {
      const updatedHistory = [...currentHistory];
      const targetIdx = currentHistory.findIndex(
        (msg) => msg.chatId === chatId && msg.role === role
      );
      if (targetIdx < 0) return;
      updatedHistory[targetIdx].content = editedMessage;
      updateHistory(updatedHistory);
      await Workspace.updateChatResponse(
        workspace.slug,
        threadSlug,
        chatId,
        editedMessage
      );
      return;
    }
  }, [workspace.slug, threadSlug, sendCommand, updateHistory]);

  const forkThread = useCallback(async (chatId) => {
    const newThreadSlug = await Workspace.forkThread(
      workspace.slug,
      threadSlug,
      chatId
    );
    window.location.href = paths.workspace.thread(workspace.slug, newThreadSlug);
  }, [workspace.slug, threadSlug]);

  const compiledHistory = useMemo(
    () =>
      buildMessages({
        workspace,
        history,
        regenerateAssistantMessage,
        saveEditedMessage,
        forkThread,
        getMessageAlignment,
        onMessageClick,
      }),
    [
      workspace,
      history,
      regenerateAssistantMessage,
      saveEditedMessage,
      forkThread,
      getMessageAlignment,
      onMessageClick,
    ]
  );

  const lastMessageInfo = useMemo(() => getLastMessageInfo(history), [history]);

  const renderStatusResponse = useCallback(
    (item, index) => {
      const hasSubsequentMessages = index < compiledHistory.length - 1;
      return (
        <StatusResponse
          key={`status-group-${index}`}
          messages={item}
          isThinking={!hasSubsequentMessages && lastMessageInfo.isAnimating}
        />
      );
    },
    [compiledHistory.length, lastMessageInfo]
  );

  const rowVirtualizer = useVirtualizer({
    count: compiledHistory.length,
    getScrollElement: () => chatHistoryRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  // ═══════════════════════════════════════════════════════════
  // 🤖 EMPTY STATE — Mascot welcome screen with suggestions
  // ═══════════════════════════════════════════════════════════
  if (history.length === 0 && !hasAttachments) {
    return (
      <div className="flex flex-col h-full md:mt-0 pb-44 md:pb-40 w-full justify-end items-center">
        {showing && (
          <ManageWorkspace
            hideModal={hideModal}
            providedSlug={workspace.slug}
          />
        )}

        {/* 🤖 Mascot Welcome */}
        <div className="chk-welcome-mascot">
          <MascotWithBubble
            expression={MASCOT_EXPRESSIONS.waving}
            size={120}
            showBubble={true}
            bubblePosition="bottom"
          />

          {/* Suggested messages */}
          {workspace?.suggestedMessages?.length > 0 && (
            <div className="chk-welcome-suggestions">
              {workspace.suggestedMessages.slice(0, 4).map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() =>
                    handleSendSuggestedMessage(
                      suggestion.heading,
                      suggestion.message
                    )
                  }
                >
                  <strong>{suggestion.heading}</strong>
                  {suggestion.message}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`markdown text-white/80 light:text-theme-text-primary font-light ${textSizeClass} h-full md:h-[83%] pb-[100px] pt-6 md:pt-0 md:pb-20 md:mx-0 overflow-y-scroll flex flex-col justify-start ${showScrollbar ? "show-scrollbar" : "no-scroll"}`}
      id="chat-history"
      ref={chatHistoryRef}
      onScroll={handleScroll}
    >
      {/* Virtual list container */}
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {Array.isArray(compiledHistory[virtualRow.index])
              ? renderStatusResponse(compiledHistory[virtualRow.index], virtualRow.index)
              : compiledHistory[virtualRow.index]}
          </div>
        ))}
      </div>

      {showing && (
        <ManageWorkspace hideModal={hideModal} providedSlug={workspace.slug} />
      )}

      {!isAtBottom && (
        <div className="fixed bottom-40 right-10 md:right-20 z-50 cursor-pointer animate-pulse">
          <div className="flex flex-col items-center">
            <div
              className="p-1 rounded-full border border-white/10 bg-white/10 hover:bg-white/20 hover:text-white"
              onClick={() => {
                scrollToBottom(true);
                setIsUserScrolling(false);
              }}
            >
              <ArrowDown weight="bold" className="text-white/60 w-5 h-5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getLastMessageInfo = (history) => {
  const lastMessage = history?.[history.length - 1] || {};
  return {
    isAnimating: lastMessage?.animate,
    isStatusResponse: lastMessage?.type === "statusResponse",
  };
};

function WorkspaceChatSuggestions({ suggestions = [], sendSuggestion }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-theme-text-primary text-xs mt-10 w-full justify-center">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          className="text-left p-2.5 rounded-xl bg-theme-sidebar-footer-icon hover:bg-theme-sidebar-footer-icon-hover border border-theme-border"
          onClick={() => sendSuggestion(suggestion.heading, suggestion.message)}
        >
          <p className="font-semibold">{suggestion.heading}</p>
          <p>{suggestion.message}</p>
        </button>
      ))}
    </div>
  );
}

/**
 * Builds the history of messages for the chat.
 * Now includes an inline thinking mascot before the streaming reply.
 */
function buildMessages({
  history,
  workspace,
  regenerateAssistantMessage,
  saveEditedMessage,
  forkThread,
  getMessageAlignment,
  onMessageClick,
}) {
  return history.reduce((acc, props, index) => {
    const isLastBotReply =
      index === history.length - 1 && props.role === "assistant";

    if (props.role === "notification") {
      acc.push(
        <NotificationMessage key={props.uuid || `notif-${index}`} message={props} />
      );
      return acc;
    }

    const isClickable = !!(props.savedQuizId || props.savedFlashcardSetId);

    if (props.type === "rechartVisualize" && !!props.content) {
      acc.push(
        <Chartable key={props.uuid} workspace={workspace} props={props} />
      );
    } else if (isLastBotReply && props.animate) {
  const mascotExpr = (!props.content || props.pending)
    ? MASCOT_EXPRESSIONS.thinking
    : MASCOT_EXPRESSIONS.explaining;

  const hasThought = props.content && THOUGHT_REGEX_OPEN.test(props.content);

  acc.push(
    <div key={`mascot-reply-${props.uuid}`}>
      <div className="chk-thinking-inline">
        <ChikoroMascot expression={mascotExpr} size={36} animate={true} />
        <MascotSpeechBubble
          message={mascotExpr === "thinking" ? "Let me think..." : "Here's what I found..."}
          visible={!props.content}
          position="right"
        />
      </div>

      {/* 🧠 Show thought chain if model is reasoning */}
      {hasThought && (
        <ThoughtChainComponent
          content={props.content}
          expanded={false}
        />
      )}

      <PromptReply
        key={props.uuid || `reply-${index}`}
        uuid={props.uuid}
        reply={props.content}
        pending={props.pending}
        sources={props.sources}
        error={props.error}
        workspace={workspace}
        closed={props.closed}
      />
    </div>
  );
    } else {
      const hasThought = props.content && THOUGHT_REGEX_OPEN.test(props.content);
      acc.push(
         <div
      key={props.chatId || `msg-${index}`}
      onClick={() => isClickable && onMessageClick?.(props)}
      className={isClickable ? "cursor-pointer ring-1 ring-transparent hover:ring-blue-400 rounded-xl transition-all" : ""}
      title={isClickable ? "Click to reopen" : undefined}
    >
      {/* 🧠 Show completed thought chain for assistant messages */}
      {props.role === "assistant" && hasThought && (
        <ThoughtChainComponent
          content={props.content}
          expanded={false}
        />
      )}
      <HistoricalMessage
            message={props.content}
            role={props.role}
            workspace={workspace}
            sources={props.sources}
            feedbackScore={props.feedbackScore}
            chatId={props.chatId}
            error={props.error}
            attachments={props.attachments}
            regenerateMessage={regenerateAssistantMessage}
            isLastMessage={isLastBotReply}
            saveEditedMessage={saveEditedMessage}
            forkThread={forkThread}
            metrics={props.metrics}
            alignmentCls={getMessageAlignment?.(props.role)}
            tool_call={props.tool_call}
            quizData={props.quizData}
            flashcardData={props.flashcardData}
          />
        </div>
      );
    }
    return acc;
  }, []);
}
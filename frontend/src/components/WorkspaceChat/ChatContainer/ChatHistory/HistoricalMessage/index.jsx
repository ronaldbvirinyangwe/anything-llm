import React, { memo } from "react";
import { Info, Warning } from "@phosphor-icons/react";
import UserIcon from "../../../../UserIcon";
import Actions from "./Actions";
import renderMarkdown from "@/utils/chat/markdown";
import { userFromStorage } from "@/utils/request";
import Citations from "../Citation";
import { v4 } from "uuid";
import DOMPurify from "@/utils/chat/purify";
import { EditMessageForm, useEditMessage } from "./Actions/EditMessage";
import { useWatchDeleteMessage } from "./Actions/DeleteMessage";
import TTSMessage from "./Actions/TTSButton";
import {
  THOUGHT_REGEX_CLOSE,
  THOUGHT_REGEX_COMPLETE,
  THOUGHT_REGEX_OPEN,
  ThoughtChainComponent,
} from "../ThoughtContainer";
import paths from "@/utils/paths";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { chatQueryRefusalResponse } from "@/utils/chat";

const HistoricalMessage = ({
  uuid = v4(),
  message,
  role,
  workspace,
  sources = [],
  attachments = [],
  error = false,
  feedbackScore = null,
  chatId = null,
  isLastMessage = false,
  regenerateMessage,
  saveEditedMessage,
  forkThread,
  metrics = {},
  alignmentCls = "",
  tool_call = null,
  quizData = null,
  flashcardData = null,
}) => {
  const { t } = useTranslation();
  const { isEditing } = useEditMessage({ chatId, role });
  const { isDeleted, completeDelete, onEndAnimation } = useWatchDeleteMessage({
    chatId,
    role,
  });
  const adjustTextArea = (event) => {
    const element = event.target;
    element.style.height = "auto";
    element.style.height = element.scrollHeight + "px";
  };

  const isRefusalMessage =
    role === "assistant" && message === chatQueryRefusalResponse(workspace);

  if (!!error) {
    return (
      <div
        key={uuid}
        className={`flex justify-center items-end w-full bg-theme-bg-chat`}
      >
        <div className="py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col">
          <div className={`flex gap-x-5 ${alignmentCls}`}>
            <ProfileImage role={role} workspace={workspace} />
            <div className="p-2 rounded-lg bg-red-50 text-red-500">
              <span className="inline-block">
                <Warning className="h-4 w-4 mb-1 inline-block" /> Could not
                respond to message.
              </span>
              <p className="text-xs font-mono mt-2 border-l-2 border-red-300 pl-2 bg-red-200 p-2 rounded-sm">
                {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (completeDelete) return null;

  return (
    <div
      key={uuid}
      onAnimationEnd={onEndAnimation}
      className={`${
        isDeleted ? "animate-remove" : ""
      } flex justify-center items-end w-full group bg-theme-bg-chat`}
    >
      <div className="py-8 px-4 w-full flex gap-x-5 md:max-w-[80%] flex-col">
        <div className={`flex gap-x-5 ${alignmentCls}`}>
          <div className="flex flex-col items-center">
            <ProfileImage role={role} workspace={workspace} />
            <div className="mt-1 -mb-10">
              {role === "assistant" && (
                <TTSMessage
                  slug={workspace?.slug}
                  chatId={chatId}
                  message={message}
                />
              )}
            </div>
          </div>
          {isEditing ? (
            <EditMessageForm
              role={role}
              chatId={chatId}
              message={message}
              attachments={attachments}
              adjustTextArea={adjustTextArea}
              saveChanges={saveEditedMessage}
            />
          ) : (
            <div className="break-words">
              <RenderChatContent
                role={role}
                message={message}
                expanded={isLastMessage}
              />
              {tool_call === "quiz_create" && quizData && (
  <button
    onClick={() => window.dispatchEvent(
      new CustomEvent("QUIZ_CREATED", { detail: { quiz: quizData } })
    )}
    className="flex items-center gap-x-2 bg-purple-600 hover:bg-purple-700
               text-white px-4 py-2 rounded-lg text-sm font-medium transition"
  >
    📝 View Quiz — {quizData.topic || quizData.subject || "Quiz"}
  </button>
)}

{tool_call === "flashcard_create" && flashcardData && (
  <button
    onClick={() => window.dispatchEvent(
      new CustomEvent("FLASHCARD_CREATED", { detail: { flashcards: flashcardData } })
    )}
    className="flex items-center gap-x-2 bg-blue-600 hover:bg-blue-700
               text-white px-4 py-2 rounded-lg text-sm font-medium transition"
  >
    🎴 View Flashcards — {flashcardData.topic || flashcardData.subject || "Flashcards"}
  </button>
)}
              {isRefusalMessage && (
                <Link
                  data-tooltip-id="query-refusal-info"
                  data-tooltip-content={`${t("chat.refusal.tooltip-description")}`}
                  className="!no-underline group !flex w-fit"
                  to={paths.chatModes()}
                  target="_blank"
                >
                  <div className="flex flex-row items-center gap-x-1 group-hover:opacity-100 opacity-60 w-fit">
                    <Info className="text-theme-text-secondary" />
                    <p className="!m-0 !p-0 text-theme-text-secondary !no-underline text-xs cursor-pointer">
                      {t("chat.refusal.tooltip-title")}
                    </p>
                  </div>
                </Link>
              )}
              <ChatAttachments attachments={attachments} />
            </div>
          )}
        </div>
        <div className="flex gap-x-5 ml-14">
          <Actions
            message={message}
            feedbackScore={feedbackScore}
            chatId={chatId}
            slug={workspace?.slug}
            isLastMessage={isLastMessage}
            regenerateMessage={regenerateMessage}
            isEditing={isEditing}
            role={role}
            forkThread={forkThread}
            metrics={metrics}
            alignmentCls={alignmentCls}
          />
        </div>
        {role === "assistant" && <Citations sources={sources} />}
      </div>
    </div>
  );
};

function ProfileImage({ role, workspace }) {
  if (role === "assistant" && workspace.pfpUrl) {
    return (
      <div className="relative w-[35px] h-[35px] rounded-full flex-shrink-0 overflow-hidden">
        <img
          src={workspace.pfpUrl}
          alt="Workspace profile picture"
          className="absolute top-0 left-0 w-full h-full object-cover rounded-full bg-white"
        />
      </div>
    );
  }

  return (
    <UserIcon
      user={{
        uid: role === "user" ? userFromStorage()?.username : workspace.slug,
      }}
      role={role}
    />
  );
}

export default memo(
  HistoricalMessage,
  // Skip re-render the historical message:
  // if the content is the exact same AND (not streaming)
  // the lastMessage status is the same (regen icon)
  // and the chatID matches between renders. (feedback icons)
  (prevProps, nextProps) => {
    return (
      prevProps.message === nextProps.message &&
      prevProps.isLastMessage === nextProps.isLastMessage &&
      prevProps.chatId === nextProps.chatId
    );
  }
);

function ChatAttachments({ attachments = [] }) {
  if (!attachments.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((item) => (
        <img
          key={item.name}
          src={item.contentString}
          className="max-w-[300px] rounded-md"
        />
      ))}
    </div>
  );
}


const RenderChatContent = memo(
  ({ role, message, expanded = false }) => {
    // 🧠 Strip context prefix from user messages before display
    if (role !== "assistant") {
      let displayMessage = message;
      
      // Remove context prefix pattern: [Subject: ...] [Curriculum: ...] etc.
      if (typeof message === "string") {
        // This regex removes all [Key: Value] patterns at the start
        displayMessage = message.replace(/^(?:\[[\w\s]+:[\w\s]+\]\s*)+/, "").trim();
      }
      
      return (
        <span
          className="flex flex-col gap-y-1"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(displayMessage)),
          }}
        />
      );
    }

    let thoughtChain = null;
    let msgToRender = message;

    if (!message) return null;

    // 🧩 Try parsing JSON (tool calls, structured messages, etc.)
    let displayMsg = null;
    try {
      const parsed = typeof message === "string" ? JSON.parse(message) : message;

      // ✅ Prefer display_message if backend provided it
      if (parsed?.display_message) {
        displayMsg = parsed.display_message;
      } 
      // ✅ Fallback: handle tool calls like {"tool_call": "quiz_create"}
      else if (parsed?.tool_call) {
        const readableName = parsed.tool_call
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase());
        displayMsg = `✅ ${readableName} completed successfully!`;
      } 
      // ✅ Fallback for error-style tool responses
      else if (parsed?.error) {
        displayMsg = `⚠️ ${parsed.error}`;
      }
    } catch (err) {
      // Not JSON, ignore
    }

    // ✅ If we have a human-readable display message, use it
    if (displayMsg) msgToRender = displayMsg;

    // 🧩 Handle AI thought chains (<thinking> ... </thinking>)
    if (typeof msgToRender === "string") {
      if (msgToRender.match(THOUGHT_REGEX_COMPLETE)) {
        thoughtChain = msgToRender.match(THOUGHT_REGEX_COMPLETE)?.[0];
        msgToRender = msgToRender.replace(THOUGHT_REGEX_COMPLETE, "");
      }

      if (
        msgToRender.match(THOUGHT_REGEX_OPEN) &&
        msgToRender.match(THOUGHT_REGEX_CLOSE)
      ) {
        const closingTag = msgToRender.match(THOUGHT_REGEX_CLOSE)?.[0];
        const splitMessage = msgToRender.split(closingTag);
        thoughtChain = splitMessage[0] + closingTag;
        msgToRender = splitMessage[1];
      }
    }

    // ✅ Finally, render sanitized markdown
    return (
      <>
        {thoughtChain && (
          <ThoughtChainComponent content={thoughtChain} expanded={expanded} />
        )}
        <span
          className="flex flex-col gap-y-1"
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(renderMarkdown(msgToRender)),
          }}
        />
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.role === nextProps.role &&
      prevProps.message === nextProps.message &&
      prevProps.expanded === nextProps.expanded
    );
  }
);

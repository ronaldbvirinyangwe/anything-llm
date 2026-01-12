import { THREAD_RENAME_EVENT } from "@/components/Sidebar/ActiveWorkspaces/ThreadContainer";
import { emitAssistantMessageCompleteEvent } from "@/components/contexts/TTSProvider";
export const ABORT_STREAM_EVENT = "abort-chat-stream";

// For handling of chat responses in the frontend by their various types.
export default function handleChat(
  chatResult,
  setLoadingResponse,
  setChatHistory,
  remHistory,
  _chatHistory,
  setWebsocket
) {
  const {
    uuid,
    textResponse,
    type,
    sources = [],
    error,
    close,
    animate = false,
    chatId = null,
    action = null,
    metrics = {},
    tool_call = null,
    quiz = null,
    flashcards = null,
  } = chatResult;

  // ✅ Handle quiz creation
  if (type === "data" && tool_call === "quiz_create" && quiz) {
    console.log("🎯 Quiz detected in handleChat!", quiz);
    
    window.dispatchEvent(new CustomEvent("QUIZ_CREATED", { 
      detail: { quiz } 
    }));
    
    setChatHistory([
      ...remHistory,
      {
        uuid,
        content: textResponse || "Quiz created successfully!",
        role: "assistant",
        sources,
        closed: close,
        error,
        animate,
        pending: false,
        chatId,
        metrics,
      },
    ]);
    return; // ✅ Early return
  }

  // ✅ Handle flashcard creation
  if (type === "data" && tool_call === "flashcard_create" && flashcards) {
    console.log("🎴 Flashcards detected in handleChat!", flashcards);
    
    window.dispatchEvent(new CustomEvent("FLASHCARD_CREATED", { 
      detail: { flashcards } 
    }));
    
    setChatHistory([
      ...remHistory,
      {
        uuid,
        content: textResponse || "Flashcards created successfully!",
        role: "assistant",
        sources,
        closed: close,
        error,
        animate,
        pending: false,
        chatId,
        metrics,
      },
    ]);
    return; // ✅ Early return
  }

  // ✅ Rest of the original code
  if (type === "abort" || type === "statusResponse") {
    setLoadingResponse(false);
    setChatHistory([
      ...remHistory,
      {
        type,
        uuid,
        content: textResponse,
        role: "assistant",
        sources,
        closed: true,
        error,
        animate,
        pending: false,
        metrics,
      },
    ]);
    _chatHistory.push({
      type,
      uuid,
      content: textResponse,
      role: "assistant",
      sources,
      closed: true,
      error,
      animate,
      pending: false,
      metrics,
    });
  } else if (type === "textResponse") {
    setLoadingResponse(false);
    setChatHistory([
      ...remHistory,
      {
        uuid,
        content: textResponse,
        role: "assistant",
        sources,
        closed: close,
        error,
        animate: !close,
        pending: false,
        chatId,
        metrics,
      },
    ]);
    _chatHistory.push({
      uuid,
      content: textResponse,
      role: "assistant",
      sources,
      closed: close,
      error,
      animate: !close,
      pending: false,
      chatId,
      metrics,
    });
    emitAssistantMessageCompleteEvent(chatId);
  } else if (
    type === "textResponseChunk" ||
    type === "finalizeResponseStream"
  ) {
    const chatIdx = _chatHistory.findIndex((chat) => chat.uuid === uuid);
    if (chatIdx !== -1) {
      const existingHistory = { ..._chatHistory[chatIdx] };
      let updatedHistory;

      if (type === "finalizeResponseStream") {
        updatedHistory = {
          ...existingHistory,
          closed: close,
          animate: !close,
          pending: false,
          chatId,
          metrics,
        };

        _chatHistory[chatIdx - 1] = { ..._chatHistory[chatIdx - 1], chatId };

        emitAssistantMessageCompleteEvent(chatId);
        setLoadingResponse(false);
      } else {
        updatedHistory = {
          ...existingHistory,
          content: existingHistory.content + textResponse,
          sources,
          error,
          closed: close,
          animate: !close,
          pending: false,
          chatId,
          metrics,
        };
      }
      _chatHistory[chatIdx] = updatedHistory;
    } else {
      _chatHistory.push({
        uuid,
        sources,
        error,
        content: textResponse,
        role: "assistant",
        closed: close,
        animate: !close,
        pending: false,
        chatId,
        metrics,
      });
    }
    setChatHistory([..._chatHistory]);
  } else if (type === "agentInitWebsocketConnection") {
    setWebsocket(chatResult.websocketUUID);
  } else if (type === "stopGeneration") {
    const chatIdx = _chatHistory.length - 1;
    const existingHistory = { ..._chatHistory[chatIdx] };
    const updatedHistory = {
      ...existingHistory,
      sources: [],
      closed: true,
      error: null,
      animate: false,
      pending: false,
      metrics,
    };
    _chatHistory[chatIdx] = updatedHistory;

    setChatHistory([..._chatHistory]);
    setLoadingResponse(false);
  }

  // Action Handling via special 'action' attribute on response.
  if (action === "reset_chat") {
    setChatHistory([_chatHistory.pop()]);
  }

  if (action === "rename_thread") {
    if (!!chatResult?.thread?.slug && chatResult.thread.name) {
      window.dispatchEvent(
        new CustomEvent(THREAD_RENAME_EVENT, {
          detail: {
            threadSlug: chatResult.thread.slug,
            newName: chatResult.thread.name,
          },
        })
      );
    }
  }
}

export function chatPrompt(workspace) {
  return (
    workspace?.openAiPrompt ??
    `You are **Chikoro AI**, a personalised intelligent tutor.

Teaching Context:
- Curriculum: \${curriculum}
- Subject: **\${subject}**
- Grade Level: **\${grade}**
- Student Age: **\${age} years**

🧩 Tutoring Objectives:
- Provide step-by-step explanations.
- Use examples relatable to Zimbabwean life (e.g., kombis, maize farming, markets, schools).
- Mix English and Shona naturally: English for key concepts, Shona for greetings only./
- Encourage reasoning, not just answers.
- End every response with a short **Practice Question** related to the current topic.
- Cite sources when applicable.

💡 Example tone:
Warm, patient, and supportive — like a local teacher helping students during study time.
If the user asks off-topic questions, politely steer them back to their subject.

🧠 **Important: Tool Instructions**
If the user asks to generate a quiz, test,exam  or flashcards — DO NOT create it directly.
Instead, respond **only** with a JSON tool call like this:


\`\`\`json
{
  "tool_call": "quiz_create",
  "parameters": {
    "subject": "<subject>",
    "grade": "<grade>",
    "userMessage": "<userMessage>",
    "numQuestions": 5,
    "difficulty": "medium"
  }
}
{
  "tool_call": "flashcard_create",
  "parameters": {
    "subject": "<subject>",
    "userMessage": "<userMessage>",
    "grade": "<grade>",
    "numCards": 5,
    "difficulty": "medium"
  }
}
\`\`\`

Otherwise, answer normally in your bilingual teaching style.`
  );
}

export function chatQueryRefusalResponse(workspace) {
  return (
    workspace?.queryRefusalResponse ??
    "There is no relevant information in this workspace to answer your query."
  );
}

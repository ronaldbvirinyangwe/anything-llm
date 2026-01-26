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
    `You are **Chikoro AI**, an intelligent, culturally-aware personalised tutor designed for Zimbabwean learners.

### Teaching Context
- Curriculum: ${curriculum}
- Subject: ${subject}
- Grade Level: ${grade}
- Student Age: ${age} years

### Core Role
Your role is to teach the current topic clearly, patiently, and interactively, just like a supportive Zimbabwean teacher helping a learner after school.

### Teaching Guidelines
1. Explain concepts **step-by-step**, starting from simple ideas and building up gradually.
2. Encourage **reasoning and understanding**, not memorisation. Ask guiding questions when helpful.
3. Use **local Zimbabwean examples** where possible:
   - kombis, maize farming, tuckshops, markets (Mbare, Sakubva), schools, households, daily routines.
4. Begin each response with a **short warm greeting** mixing **Shona and English**  
5. Use **age-appropriate language** and explanations suitable for the given grade level.
6. Adapt your explanations based on learner responses:
   - If the learner struggles, simplify and give another example.
   - If the learner performs well, gently increase difficulty.
7. If the learner asks an **off-topic question**, respond politely and guide them back to the subject.
8. Provide **positive reinforcement** and encouragement to build learner confidence.
9. Suggest **additional practice questions** or activities at the end of explanations to reinforce learning.
10. Maintain a **warm, patient, and respectful tone** throughout the interaction.


### Safety & Accuracy
- Do not provide harmful, inappropriate, or age-inappropriate content.
- When stating facts, formulas, or definitions, **cite trusted sources** (e.g. ZIMSEC syllabus, textbooks, or reputable educational websites).
- If unsure about an answer, say so and explain carefully.

### Tone & Style
- Warm, patient, encouraging, and respectful.
- Sound like a real local teacher, not a robot.
- Avoid overly complex language unless required by the grade level.

🧠 **Important: Tool Instructions**
If the user asks to generate a quiz, test, exam, or flashcards — DO NOT create it directly.
If you are unsure of something use the web search tool to find more information.
If the student asks for the date or time, use the date and time tool.
If the student asks about current events, use the web search tool.
Instead, respond **only** with a JSON tool call like this:

\`\`\`json
{
  "tool_call": "quiz_create",
  "parameters": {
    "subject": "<subject>",
    "userMessage": "<userMessage>",
    "grade": "<grade>",
    "numQuestions": 5,
    "difficulty": "medium"
  }
}
  {
  "tool_call": "flashcard_create",
  "parameters": {
    "subject": "<subject>",
    "grade": "<grade>",
    "userMessage": "<userMessage>",
    "numQuestions": 5,
    "difficulty": "medium"
  }
  {
  "tool_call": "web_search_tool",
  "parameters": {
      "query": "",  
    "provider": "duckduckgo",
    "numResults": 10 
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

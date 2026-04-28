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
        tool_call: "quiz_create",
        quizData: quiz,
      },
    ]);
    return;
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
        tool_call: "flashcard_create",
        flashcardData: flashcards,
      },
    ]);
    return;
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

export function chatPrompt(workspace, profile = {}) {
  const name = profile?.name || "learner";
  const curriculum = profile?.curriculum || "ZIMSEC";
  const academicLevel = profile?.academicLevel || "Secondary";
  const grade = profile?.grade || "7";
  const age = profile?.age || "13";

  return (
    workspace?.openAiPrompt ??
    `You are **Chikoro AI**, an intelligent, culturally-aware personalised tutor designed for Zimbabwean learners.

### Student Profile
- Name: ${name}
- Curriculum: ${curriculum}
- Academic Level: ${academicLevel}
- Grade: ${grade}
- Age: ${age} years

### Core Role
Your role is to teach clearly, patiently, and interactively — like a supportive Zimbabwean teacher helping a learner after school. Always keep the student's grade and age in mind: your vocabulary, depth of explanation, and examples must be appropriate for a Grade ${grade} student (${age} years old).

### Exam Level Context
[Injected dynamically by the server based on the student's academic level and grade — Primary / O-Level / A-Level specific guidance is added here at runtime.]

### Teaching Guidelines
1. Explain concepts **step-by-step**, starting from simple ideas and building up gradually.
2. Encourage **reasoning and understanding**, not memorisation. Ask guiding questions when helpful.
3. Use **local Zimbabwean examples** where possible (kombis, maize farming, tuckshops, markets like Mbare or Sakubva, daily routines).
4. On the very first message of a session, open with a **short warm greeting in Shona or Ndebele**. Do not repeat greetings in follow-up messages.
5. Use vocabulary and sentence complexity appropriate for Grade ${grade} (${age} years old). Do not use university-level language for primary students or oversimplify for A-Level students.
6. Adapt dynamically based on learner responses:
   - If they struggle, simplify and try a different example.
   - If they clearly understand, gently increase depth.
7. If the learner asks something off-topic from schoolwork entirely (not just across subjects), politely acknowledge and guide them back.
8. Provide **positive reinforcement** — build confidence, especially after mistakes.
9. Only suggest practice questions when the student requests them or has just finished a full topic.
10. Keep responses **concise and mobile-friendly** — avoid walls of text.

### Safety & Accuracy
- No harmful, inappropriate, or age-inappropriate content.
- State facts confidently; if uncertain about current data, say so and offer to search.

### Tool Usage

- You have access to the following tools: quiz_create_agent, flashcard_create_agent, web_search_tool.
- QUIZ RULE (strict): Any time the user asks for a quiz, test, or set of questions on any topic — whether via @agent, a direct request, or implied — you MUST call quiz_create_agent. Never write quiz questions as plain text under any circumstances.
- FLASHCARD RULE (strict): Any time the user asks for flashcards, memory cards, or revision cards — you MUST call flashcard_create_agent. Never write flashcards as plain text.
- SEARCH RULE (strict): Any time the user asks to look something up, find current information, or search the web — you MUST call web_search_tool. Never guess or fabricate current information.
- After invoking any tool, stop generating text immediately. Do not narrate the tool call or describe what it will do.
- Never output raw JSON or tool call objects in your response text.
- One-Call Rule: You are permitted exactly ONE tool call per message.
- No Retries: If you receive a message that a tool has already been run, do not call it again. Simply say "I've prepared that for you!" and ask the student what they'd like to do next.


### Agents

- You have access to the following agents: rag-memory, document-summarizer, web-scraping, save-file-to-browser, create-chart, web-browsing.
- FILE RULE (strict): Any time the user asks to save, download, or export content — you MUST invoke save-file-to-browser. Never write file content as plain text.
- CHART RULE (strict): Any time the user asks for a chart or graph — you MUST invoke create-chart using only the keys "name" and "value". Never use "count" or "importance".
- If the user types @agent followed by a message, determine intent and route to the correct tool or agent exactly once:

- Quiz / test / questions → quiz_create_agent (tool)
- Flashcards / revision cards → flashcard_create_agent (tool)
- Web search / look up → web_search_tool (tool)
- Save / export / download → save-file-to-browser (agent)
- Chart / graph → create-chart (agent)
- Summarise a document → document-summarizer (agent)
- Browse a specific URL → web-browsing (agent)


- After invoking any agent, send one short friendly message and stop. Do not repeat the invocation.
- When an agent completes its task, briefly summarise the outcome and suggest a natural next step.
- If the user types /exit while an agent is active, gracefully exit and return to normal tutoring.
- One-Call Rule: Invoke each agent exactly once per request.
- Tone must remain consistent — warm, patient, and encouraging — even when handing off to an agent.

### Quiz rule(strict)
When calling quiz_create_agent, always pass the following parameters extracted 
from the user's message:
- topic: the subject of the quiz (e.g. "software")
- numQuestions: the number of questions requested (e.g. 2)

### Using Quiz History
When the student's past quiz results are provided in context:
- Use them silently to calibrate your explanations — don't recite the data back.
- Be extra thorough on topics where they scored below 60%.
- Acknowledge improvement where scores have gone up.
`
  );
}

export function chatQueryRefusalResponse(workspace) {
  return (
    workspace?.queryRefusalResponse ??
    "There is no relevant information in this workspace to answer your query."
  );
}

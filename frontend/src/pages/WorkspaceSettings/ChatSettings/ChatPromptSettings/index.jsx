import { useEffect, useState, useRef, Fragment } from "react";
import { chatPrompt } from "@/utils/chat";
import { useTranslation } from "react-i18next";
import SystemPromptVariable from "@/models/systemPromptVariable";
import Highlighter from "react-highlight-words";
import { Link, useSearchParams } from "react-router-dom";
import paths from "@/utils/paths";
import ChatPromptHistory from "./ChatPromptHistory";
import PublishEntityModal from "@/components/CommunityHub/PublishEntityModal";
import { useModal } from "@/hooks/useModal";

// TODO: Move to backend and have user-language sensitive default prompt
const DEFAULT_PROMPT = `
You are **Chikoro AI**, an intelligent, culturally-aware personalised tutor designed for Zimbabwean learners.

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

Otherwise, answer normally in your bilingual teaching style.
`;

export default function ChatPromptSettings({ workspace, setHasChanges }) {
  const { t } = useTranslation();
  const [availableVariables, setAvailableVariables] = useState([]);
  const [prompt, setPrompt] = useState(chatPrompt(workspace));
  const [isEditing, setIsEditing] = useState(false);
  const [showPromptHistory, setShowPromptHistory] = useState(false);
  const promptRef = useRef(null);
  const promptHistoryRef = useRef(null);
  const historyButtonRef = useRef(null);
  const [searchParams] = useSearchParams();
  const {
    isOpen: showPublishModal,
    closeModal: closePublishModal,
    openModal: openPublishModal,
  } = useModal();
  const [currentPrompt, setCurrentPrompt] = useState(chatPrompt(workspace));

  useEffect(() => {
    async function setupVariableHighlighting() {
      const { variables } = await SystemPromptVariable.getAll();
      setAvailableVariables(variables);
    }
    setupVariableHighlighting();
  }, []);

  useEffect(() => {
    if (searchParams.get("action") === "focus-system-prompt")
      setIsEditing(true);
  }, [searchParams]);

  useEffect(() => {
    if (isEditing && promptRef.current) {
      promptRef.current.focus();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        promptHistoryRef.current &&
        !promptHistoryRef.current.contains(event.target) &&
        historyButtonRef.current &&
        !historyButtonRef.current.contains(event.target)
      ) {
        setShowPromptHistory(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleRestore = (prompt) => {
    setPrompt(prompt);
    setShowPromptHistory(false);
    setHasChanges(true);
  };

  const handlePublishClick = (prompt) => {
    setCurrentPrompt(prompt);
    setShowPromptHistory(false);
    openPublishModal();
  };

  return (
    <>
      <ChatPromptHistory
        ref={promptHistoryRef}
        workspaceSlug={workspace.slug}
        show={showPromptHistory}
        onRestore={handleRestore}
        onPublishClick={handlePublishClick}
        onClose={() => {
          setShowPromptHistory(false);
        }}
      />
      <div>
        <div className="flex flex-col">
          <div className="flex items-center justify-between">
            <label htmlFor="name" className="block input-label">
              {t("chat.prompt.title")}
            </label>
          </div>
          <p className="text-white text-opacity-60 text-xs font-medium py-1.5">
            {t("chat.prompt.description")}
          </p>
          <p className="text-white text-opacity-60 text-xs font-medium mb-2">
            You can insert{" "}
            <Link
              to={paths.settings.systemPromptVariables()}
              className="text-primary-button"
            >
              prompt variables
            </Link>{" "}
            like:{" "}
            {availableVariables.slice(0, 3).map((v, i) => (
              <Fragment key={v.key}>
                <span className="bg-theme-settings-input-bg px-1 py-0.5 rounded">
                  {`{${v.key}}`}
                </span>
                {i < availableVariables.length - 1 && ", "}
              </Fragment>
            ))}
            {availableVariables.length > 3 && (
              <Link
                to={paths.settings.systemPromptVariables()}
                className="text-primary-button"
              >
                +{availableVariables.length - 3} more...
              </Link>
            )}
          </p>
        </div>

        <input type="hidden" name="openAiPrompt" defaultValue={prompt} />
        <div className="relative w-full flex flex-col items-end">
          <button
            ref={historyButtonRef}
            type="button"
            className="text-theme-text-secondary hover:text-white light:hover:text-black text-xs font-medium"
            onClick={(e) => {
              e.preventDefault();
              setShowPromptHistory(!showPromptHistory);
            }}
          >
            {showPromptHistory ? "Hide History" : "View History"}
          </button>
          <div className="relative w-full">
            <span
              className={`${!!prompt ? "hidden" : "block"} text-sm pointer-events-none absolute top-2 left-0 p-2.5 w-full h-full !text-theme-settings-input-placeholder opacity-60`}
            >
              {DEFAULT_PROMPT}
            </span>
            {isEditing ? (
              <textarea
                ref={promptRef}
                autoFocus={true}
                rows={5}
                onFocus={(e) => {
                  const length = e.target.value.length;
                  e.target.setSelectionRange(length, length);
                }}
                onBlur={(e) => {
                  setIsEditing(false);
                  setPrompt(e.target.value);
                }}
                onChange={(e) => {
                  setPrompt(e.target.value);
                  setHasChanges(true);
                }}
                onPaste={(e) => {
                  setPrompt(e.target.value);
                  setHasChanges(true);
                }}
                style={{
                  resize: "vertical",
                  overflowY: "scroll",
                  minHeight: "150px",
                }}
                defaultValue={prompt}
                className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 mt-2"
              />
            ) : (
              <div
                onClick={() => setIsEditing(true)}
                style={{
                  resize: "vertical",
                  overflowY: "scroll",
                  minHeight: "150px",
                }}
                className="border-none bg-theme-settings-input-bg text-white text-sm rounded-lg focus:outline-primary-button active:outline-primary-button outline-none block w-full p-2.5 mt-2"
              >
                <Highlighter
                  className="whitespace-pre-wrap"
                  highlightClassName="bg-cta-button p-0.5 rounded-md"
                  searchWords={availableVariables.map((v) => `{${v.key}}`)}
                  autoEscape={true}
                  caseSensitive={true}
                  textToHighlight={prompt}
                />
              </div>
            )}
          </div>
          <div className="w-full flex flex-row items-center justify-between pt-2">
            {prompt !== DEFAULT_PROMPT && (
              <>
                <button
                  type="button"
                  onClick={() => handleRestore(DEFAULT_PROMPT)}
                  className="text-theme-text-primary hover:text-white light:hover:text-black text-xs font-medium"
                >
                  Clear
                </button>
                <PublishPromptCTA
                  hidden={
                    isEditing ||
                    prompt === DEFAULT_PROMPT ||
                    prompt?.trim().length < 10
                  }
                  onClick={() => {
                    setCurrentPrompt(prompt);
                    openPublishModal();
                  }}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <PublishEntityModal
        show={showPublishModal}
        onClose={closePublishModal}
        entityType="system-prompt"
        entity={currentPrompt}
      />
    </>
  );
}

function PublishPromptCTA({ hidden = false, onClick }) {
  if (hidden) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-none text-primary-button hover:text-white light:hover:text-black text-xs font-medium"
    >
      Publish to Community Hub
    </button>
  );
}

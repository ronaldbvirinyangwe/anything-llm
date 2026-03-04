const { AgentFlows } = require("../utils/agentFlows");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const { Telemetry } = require("../models/telemetry");

function agentFlowEndpoints(app) {
 
// Save or update an agent flow configuration safely
app.post(
  "/agent-flows/save",
  [validatedRequest, flexUserRoleValid([ROLES.admin])],
  async (request, response) => {
    try {
      const { name, config, uuid } = request.body;

      // 🧩 Validate input
      if (!name || !config) {
        return response.status(400).json({
          success: false,
          error: "Name and config are required",
        });
      }

      // 🧠 Ensure valid structure before saving
      if (typeof config !== "object") {
        return response.status(400).json({
          success: false,
          error: "Config must be a valid object",
        });
      }

      // ✅ Prevent saveFlow crash — ensure blocks is always an array
      if (!Array.isArray(config.blocks)) {
        console.warn(`[AgentFlows] No blocks array found for ${name}, creating empty one.`);
        config.blocks = [];
      }

      // 💾 Save flow using AgentFlows utility
      const flow = AgentFlows.saveFlow(name, config, uuid);

      if (!flow || !flow.success) {
        console.error("⚠️ Failed to save flow:", flow?.error);
        return response.status(500).json({
          success: false,
          error: flow?.error || "Failed to save flow",
        });
      }

      // 🧭 Log telemetry only for new flows
      if (!uuid) {
        await Telemetry.sendTelemetry("agent_flow_created", {
          blockCount: config.blocks?.length || 0,
        });
      }

      // ✅ Respond success
      return response.status(200).json({
        success: true,
        message: `Agent flow "${name}" saved successfully.`,
        flow,
      });
    } catch (error) {
      console.error("❌ Error saving flow:", error);
      return response.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  }
);

  // List all available flows
  app.get(
    "/agent-flows/list",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (_request, response) => {
      try {
        const flows = AgentFlows.listFlows();
        return response.status(200).json({
          success: true,
          flows,
        });
      } catch (error) {
        console.error("Error listing flows:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Get a specific flow by UUID
  app.get(
    "/agent-flows/:uuid",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const flow = AgentFlows.loadFlow(uuid);
        if (!flow) {
          return response.status(404).json({
            success: false,
            error: "Flow not found",
          });
        }

        return response.status(200).json({
          success: true,
          flow,
        });
      } catch (error) {
        console.error("Error getting flow:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Run a specific flow
  // app.post(
  //   "/agent-flows/:uuid/run",
  //   [validatedRequest, flexUserRoleValid([ROLES.admin])],
  //   async (request, response) => {
  //     try {
  //       const { uuid } = request.params;
  //       const { variables = {} } = request.body;

  //       // TODO: Implement flow execution
  //       console.log("Running flow with UUID:", uuid);

  //       await Telemetry.sendTelemetry("agent_flow_executed", {
  //         variableCount: Object.keys(variables).length,
  //       });

  //       return response.status(200).json({
  //         success: true,
  //         results: {
  //           success: true,
  //           results: "test",
  //           variables: variables,
  //         },
  //       });
  //     } catch (error) {
  //       console.error("Error running flow:", error);
  //       return response.status(500).json({
  //         success: false,
  //         error: error.message,
  //       });
  //     }
  //   }
  // );

  // Delete a specific flow
  app.delete(
    "/agent-flows/:uuid",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const { success } = AgentFlows.deleteFlow(uuid);

        if (!success) {
          return response.status(500).json({
            success: false,
            error: "Failed to delete flow",
          });
        }

        return response.status(200).json({
          success,
        });
      } catch (error) {
        console.error("Error deleting flow:", error);
        return response.status(500).json({
          success: false,
          error: error.message,
        });
      }
    }
  );

  // Toggle flow active status
  app.post(
    "/agent-flows/:uuid/toggle",
    [validatedRequest, flexUserRoleValid([ROLES.admin])],
    async (request, response) => {
      try {
        const { uuid } = request.params;
        const { active } = request.body;

        const flow = AgentFlows.loadFlow(uuid);
        if (!flow) {
          return response
            .status(404)
            .json({ success: false, error: "Flow not found" });
        }

        flow.config.active = active;
        const { success } = AgentFlows.saveFlow(flow.name, flow.config, uuid);

        if (!success) {
          return response
            .status(500)
            .json({ success: false, error: "Failed to update flow" });
        }

        return response.json({ success: true, flow });
      } catch (error) {
        console.error("Error toggling flow:", error);
        response.status(500).json({ success: false, error: error.message });
      }
    }
  );

app.post("/agent-flows/quiz/create", [validatedRequest], async (req, res) => {
  try {
    const {
      subject,
      topic = "",
      grade,
      numQuestions = 5,
      difficulty = "medium",
      userMessage = "",
      userId = null,
      workspaceSlug = null
    } = req.body;

    // topic is the specific concept from the conversation; fall back to userMessage
    const quizTopic = topic || userMessage || "general curriculum topics";

    if (!subject || !grade) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: subject and grade",
      });
    }

    console.log(`🤖 Agent is generating a quiz for ${subject} (Grade ${grade})`);

    const wantsHistoryBased = userMessage.toLowerCase().includes('history') || 
                              userMessage.toLowerCase().includes('previous') ||
                              userMessage.toLowerCase().includes('what we discussed') ||
                              userMessage.toLowerCase().includes('based on');

    let contextInfo = "";
    
    if (wantsHistoryBased && workspaceSlug) {
      try {
        // ✅ FIX: Get workspace ID from slug first
        const { Workspace } = require("../models/workspace");
        const workspace = await Workspace.get({ slug: workspaceSlug });
        
        if (workspace) {
          const { WorkspaceChats } = require("../models/workspaceChats");
          const recentChats = await WorkspaceChats.where(
            { workspaceId: workspace.id }, // ✅ Use workspace.id (number) not slug
            100,
            { id: "desc" }
          );
          
          if (recentChats && recentChats.length > 0) {
            contextInfo = "\n\nRecent conversation context:\n" + 
              recentChats
                .filter(chat => chat.role === 'user' || chat.role === 'assistant')
                .slice(0, 10)
                .map(chat => `${chat.role}: ${chat.content}`)
                .join("\n");
            
            console.log(`📚 Added ${recentChats.length} messages as context`);
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch chat history:", err.message);
      }
    }

    // === AI Prompt ===
    const prompt = `You are Chikoro AI — a Zimbabwean AI tutor aligned with ZIMSEC and Cambridge curricula.

TASK: Create ${numQuestions} questions STRICTLY about "${quizTopic}" for ${subject}, Grade ${grade}, difficulty: ${difficulty}.
ALL questions must be about "${quizTopic}" only. Do not generate questions on any other topic.

CRITICAL RULES:
1. Return ONLY valid JSON
2. NO text before the opening {
3. NO text after the closing }
4. NO markdown code blocks
5. NO explanations

EXACT JSON FORMAT REQUIRED:
{
  "subject": "${subject}",
  "topic": "${quizTopic}",
  "grade": "${grade}",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "type": "MCQ",
      "question": "Example question about ${quizTopic}?",
      "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"],
      "correct_answer": "B. Second option"
    }
  ]
}

- ${Math.ceil(numQuestions/2)} MCQ questions (4 options each, labeled A-D)
- ${Math.floor(numQuestions/2)} short-answer questions
- Use Zimbabwean context and ZIMSEC/Cambridge curriculum alignment where relevant
${wantsHistoryBased ? '- Base on recent conversation context below' : ''}
${contextInfo}

Remember: Return ONLY the JSON object. Start with { and end with }.`;

    const ollamaRes = await fetch(`${process.env.VLLM_BASE_PATH}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY || "EMPTY"}`,
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL_PREF || "gpt-oss:20b",
        messages: [{ role: "user", content: prompt }],
        stream: false,
        temperature: 0.3,
      }),
    });

    if (!ollamaRes.ok) throw new Error(`vLLM did not respond properly: ${ollamaRes.status}`);

    const ollamaData = await ollamaRes.json();
    let raw = ollamaData.choices?.[0]?.message?.content || "";

    console.log("🔍 Raw vLLM response:", raw.substring(0, 200));

    // === Enhanced JSON parsing ===
    function safeParseQuizJSON(raw) {
      // Try direct parse first
      try {
        return JSON.parse(raw);
      } catch (err) {
        console.warn("⚠️ Initial parse failed, attempting cleanup...");
      }

      // Aggressive cleanup
      try {
        let cleaned = raw
          .replace(/```json|```/g, "")           // Remove markdown
          .replace(/^[^{]*({.*})[^}]*$/s, "$1")  // Extract first JSON object
          .replace(/\r\n|\n|\r/g, " ")           // Remove line breaks
          .replace(/\\"/g, '"')                  // Fix escaped quotes
          .replace(/\\'/g, "'")                  // Fix escaped single quotes
          .replace(/"\s*:\s*"/g, '":"')          // Fix spacing in key-value
          .replace(/,\s*}/g, "}")                // Remove trailing commas in objects
          .replace(/,\s*\]/g, "]")               // Remove trailing commas in arrays
          .trim();

        // Find the actual JSON object bounds
        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        
        if (start !== -1 && end !== -1 && end > start) {
          cleaned = cleaned.substring(start, end + 1);
        }

        console.log("🔧 Cleaned JSON:", cleaned.substring(0, 200));
        return JSON.parse(cleaned);
      } catch (retryErr) {
        console.error("🚨 Final parse failed:", retryErr.message);
        console.error("🚨 Cleaned text:", raw.substring(0, 500));
        return null;
      }
    }

    let quiz = safeParseQuizJSON(raw);
    
    // ✅ Fallback: Create a sample question if parsing totally failed
    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
      console.warn("⚠️ Invalid quiz JSON, creating fallback quiz");
      quiz = {
        subject,
        grade,
        userMessage,
        questions: [
          {
            type: "MCQ",
            question: `What is a key concept in ${subject}?`,
            options: ["A. Option 1", "B. Option 2", "C. Option 3", "D. Option 4"],
            correct_answer: "A. Option 1"
          }
        ]
      };
    }

    console.log(`✅ Quiz generated with ${quiz.questions.length} questions`);

    if (userId) {
      // Save to chat history for persistence
try {
  const { WorkspaceChats } = require("../models/workspaceChats");
  const { Workspace } = require("../models/workspace");
  if (workspaceSlug) {
    const workspace = await Workspace.get({ slug: workspaceSlug });
    if (workspace) {
      await WorkspaceChats.new({
        workspaceId: workspace.id,
        prompt: userMessage || `Create a ${subject} quiz`,
        response: {
          text: `Quiz created successfully on ${subject} for Grade ${grade}!`,
          sources: [],
          type: "chat",
          attachments: [],
          metrics: {},
          tool_call: "quiz_create",
          quizData: quiz,
        },
        threadId: null,
        user: userId ? { id: parseInt(userId) } : null,
      });
      console.log("💾 Quiz saved to chat history");
    }
  }
} catch (chatErr) {
  console.warn("⚠️ Failed to save quiz to chat history:", chatErr.message);
}
    }

    return res.status(200).json({
      success: true,
      tool: "quiz_create",
      quiz,
    });
  } catch (error) {
    console.error("🔥 Quiz agent error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Quiz agent failed",
    });
  }
});


app.post("/agent-flows/flashcard/create", [validatedRequest], async (req, res) => {
  try {
    const {
      subject,
      topic = "",
      grade,
      numCards = 10,
      difficulty = "medium",
      userMessage = "",
      userId = null,
      workspaceSlug = null
    } = req.body;

    const flashcardTopic = topic || userMessage || "general curriculum topics";

    if (!subject || !grade) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: subject and grade",
      });
    }

    console.log(`🎴 Agent is generating flashcards for ${subject} (Grade ${grade})`);

    const wantsHistoryBased = userMessage.toLowerCase().includes('history') || 
                              userMessage.toLowerCase().includes('previous') ||
                              userMessage.toLowerCase().includes('what we discussed') ||
                              userMessage.toLowerCase().includes('based on');

    let contextInfo = "";
    
    if (wantsHistoryBased && workspaceSlug) {
      try {
        const { Workspace } = require("../models/workspace");
        const workspace = await Workspace.get({ slug: workspaceSlug });
        
        if (workspace) {
          const { WorkspaceChats } = require("../models/workspaceChats");
          const recentChats = await WorkspaceChats.where(
            { workspaceId: workspace.id },
            100,
            { id: "desc" }
          );
          
          if (recentChats && recentChats.length > 0) {
            contextInfo = "\n\nRecent conversation context:\n" + 
              recentChats
                .filter(chat => chat.role === 'user' || chat.role === 'assistant')
                .slice(0, 10)
                .map(chat => `${chat.role}: ${chat.content}`)
                .join("\n");
            
            console.log(`📚 Added ${recentChats.length} messages as context`);
          }
        }
      } catch (err) {
        console.warn("⚠️ Could not fetch chat history:", err.message);
      }
    }

    // === AI Prompt ===
    const prompt = `You are Chikoro AI — a Zimbabwean AI tutor aligned with ZIMSEC and Cambridge curricula.

TASK: Create ${numCards} flashcards STRICTLY about "${flashcardTopic}" for ${subject}, Grade ${grade}, difficulty: ${difficulty}.
ALL cards must be about "${flashcardTopic}" only. Do not generate cards on any other topic.

CRITICAL: Your response must be ONLY valid JSON. No text before or after. No markdown. No explanations.

Create flashcards with this EXACT structure:
{
  "subject": "${subject}",
  "topic": "${flashcardTopic}",
  "grade": "${grade}",
  "cards": [
    {
      "front": "What is ${flashcardTopic}?",
      "back": "A detailed answer about ${flashcardTopic} here.",
      "category": "${flashcardTopic}"
    }
  ]
}

Each card must:
- front: A clear, concise question about "${flashcardTopic}"
- back: A detailed, educational answer about "${flashcardTopic}"
- category: A subtopic within "${flashcardTopic}"
Use Zimbabwean context, local examples, and ZIMSEC/Cambridge curriculum alignment where relevant.

${wantsHistoryBased ? 'Base flashcards on the topics discussed in the recent conversation.' : ''}
${contextInfo}

Return ONLY the JSON object. Start with { and end with }. No other text.`;

    const ollamaRes = await fetch(`${process.env.VLLM_BASE_PATH}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY || "EMPTY"}`,
      },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL_PREF || "gpt-oss:20b",
        messages: [{ role: "user", content: prompt }],
        stream: false,
        temperature: 0.3,
      }),
    });

    if (!ollamaRes.ok) throw new Error(`vLLM did not respond properly: ${ollamaRes.status}`);

    const ollamaData = await ollamaRes.json();
    let raw = ollamaData.choices?.[0]?.message?.content || "";

    console.log("🔍 Raw vLLM response:", raw.substring(0, 200));

    // === Enhanced JSON parsing ===
    function safeParseFlashcardJSON(raw) {
      try {
        return JSON.parse(raw);
      } catch (err) {
        console.warn("⚠️ Initial parse failed, attempting cleanup...");
      }

      try {
        let cleaned = raw
          .replace(/```json|```/g, "")
          .replace(/^[^{]*({.*})[^}]*$/s, "$1")
          .replace(/\r\n|\n|\r/g, " ")
          .replace(/\\"/g, '"')
          .replace(/\\'/g, "'")
          .replace(/"\s*:\s*"/g, '":"')
          .replace(/,\s*}/g, "}")
          .replace(/,\s*\]/g, "]")
          .trim();

        const start = cleaned.indexOf("{");
        const end = cleaned.lastIndexOf("}");
        
        if (start !== -1 && end !== -1 && end > start) {
          cleaned = cleaned.substring(start, end + 1);
        }

        console.log("🔧 Cleaned JSON:", cleaned.substring(0, 200));
        return JSON.parse(cleaned);
      } catch (retryErr) {
        console.error("🚨 Final parse failed:", retryErr.message);
        return null;
      }
    }

    let flashcards = safeParseFlashcardJSON(raw);
    
    // Fallback if parsing failed
    if (!flashcards || !flashcards.cards || flashcards.cards.length === 0) {
      console.warn("⚠️ Invalid flashcard JSON, creating fallback");
      flashcards = {
        subject,
        grade,
        cards: [
          {
            front: `Key concept in ${subject}`,
            back: "This is a placeholder flashcard. The AI will generate proper cards on retry.",
            category: subject
          }
        ]
      };
    }

    console.log(`✅ Flashcards generated with ${flashcards.cards.length} cards`);

    // ✅ Save to database
if (userId) {
  try {
  const { WorkspaceChats } = require("../models/workspaceChats");
  const { Workspace } = require("../models/workspace");
  if (workspaceSlug) {
    const workspace = await Workspace.get({ slug: workspaceSlug });
    if (workspace) {
      await WorkspaceChats.new({
        workspaceId: workspace.id,
        prompt: userMessage || `Create ${subject} flashcards`,
        response: {
          text: `Flashcards created successfully on ${subject} for Grade ${grade}!`,
          sources: [],
          type: "chat",
          attachments: [],
          metrics: {},
          tool_call: "flashcard_create",
          flashcardData: flashcards,
        },
        threadId: null,
        user: userId ? { id: parseInt(userId) } : null,
      });
      console.log("💾 Flashcards saved to chat history");
    }
  }
} catch (chatErr) {
  console.warn("⚠️ Failed to save flashcards to chat history:", chatErr.message);
}
}

    return res.status(200).json({
      success: true,
      tool: "flashcard_create",
      flashcards,
    });
  } catch (error) {
    console.error("🔥 Flashcard agent error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Flashcard agent failed",
    });
  }
});

// 🔍 Web Search Tool
app.post("/agent-flows/web-search", [validatedRequest], async (req, res) => {
  try {
    const { query, provider = "tavily", numResults = 5 } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: "Missing search query",
      });
    }

    let results = [];

    switch (provider) {
       case "tavily":
        results = await require("../utils/search/tavily")(query, numResults);
        break;

      // case "duckduckgo":
      //   results = await require("../utils/search/duckduckgo")(query, numResults);
      //   break;

      case "serper":
        results = await require("../utils/search/serper")(query, numResults);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Unsupported search provider",
        });
    }

    return res.json({
      success: true,
      tool: "web_search",
      query,
      results,
    });
  } catch (err) {
    console.error("🌐 Web search failed:", err);
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

// Get saved quizzes for a user
app.get("/agent-flows/quiz/history/:userId", [validatedRequest], async (req, res) => {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    const quizzes = await prisma.savedQuiz.findMany({
      where: { userId: parseInt(req.params.userId) },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.status(200).json({ success: true, quizzes });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Get saved flashcard sets for a user
app.get("/agent-flows/flashcard/history/:userId", [validatedRequest], async (req, res) => {
  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient();
    const flashcardSets = await prisma.savedFlashcardSet.findMany({
      where: { userId: parseInt(req.params.userId) },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return res.status(200).json({ success: true, flashcardSets });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

setTimeout(() => {
  try {
    const existing = AgentFlows.listFlows()?.find(
      (f) => f.name === "web_search_tool"
    );

    if (!existing) {
      const flowConfig = {
        description: "Performs live web search for current information and research",
        active: true,
        blocks: [
          {
            type: "tool",
            name: "web_search",
            endpoint: "/agent-flows/web-search",
            method: "POST",
            params: ["query", "provider", "numResults"],
          },
        ],
      };

      if (!Array.isArray(flowConfig.blocks)) flowConfig.blocks = [];

      const saved = AgentFlows.saveFlow("web_search_tool", flowConfig);
      if (!saved || !saved.success) {
        console.error("⚠️ Failed to save web_search_tool:", saved?.error);
      } else {
        console.log("✅ web_search_tool registered successfully.");
      }
    } else {
      console.log("ℹ️ web_search_tool already registered.");
    }
  } catch (err) {
    console.error("⚠️ Failed to register web_search_tool:", err.message);
  }
}, 2000);

// Register flashcard agent flow
setTimeout(() => {
  try {
    const existing = AgentFlows.listFlows()?.find(
      (f) => f.name === "flashcard_create_agent"
    );

    if (!existing) {
      const flowConfig = {
        description: "Generates curriculum-aligned flashcards for Chikoro AI",
        active: true,
        blocks: [
          {
            type: "tool",
            name: "flashcard_create",
            endpoint: "/agent-flows/flashcard/create",
            method: "POST",
            params: ["subject", "userMessage", "grade", "numCards", "difficulty"],
          },
        ],
      };

      if (!Array.isArray(flowConfig.blocks)) flowConfig.blocks = [];

      const saved = AgentFlows.saveFlow("flashcard_create_agent", flowConfig);
      if (!saved || !saved.success) {
        console.error("⚠️ Failed to save flashcard agent flow:", saved?.error);
      } else {
        console.log("✅ flashcard_create_agent registered successfully.");
      }
    } else {
      console.log("ℹ️ flashcard_create_agent already registered.");
    }
  } catch (err) {
    console.error("⚠️ Failed to register flashcard agent:", err.message);
  }
}, 2000);

setTimeout(() => {
  try {
    const existing = AgentFlows.listFlows()?.find(
      (f) => f.name === "quiz_create_agent"
    );

    if (!existing) {
      const flowConfig = {
        description: "Generates curriculum-aligned quizzes for Chikoro AI",
        active: true,
        blocks: [
          {
            type: "tool",
            name: "quiz_create",
            endpoint: "/agent-flows/quiz/create",
            method: "POST",
            params: ["subject", "userMessage", "grade", "numQuestions", "difficulty"],
          },
        ],
      };

      // ✅ Make sure blocks array exists
      if (!Array.isArray(flowConfig.blocks)) flowConfig.blocks = [];

      const saved = AgentFlows.saveFlow("quiz_create_agent", flowConfig);
      if (!saved || !saved.success) {
        console.error("⚠️ Failed to save quiz agent flow:", saved?.error);
      } else {
        console.log("✅ quiz_create_agent registered successfully.");
      }
    } else {
      console.log("ℹ️ quiz_create_agent already registered.");
    }
  } catch (err) {
    console.error("⚠️ Failed to register quiz agent:", err.message);
  }
}, 2000);
}


module.exports = { agentFlowEndpoints };

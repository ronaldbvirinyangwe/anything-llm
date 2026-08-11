// Set required env vars before requiring modules
process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

const {
  SystemPromptVariables,
} = require("../../../models/systemPromptVariables");
const Provider = require("../../../utils/agents/aibitat/providers/ai-provider");
const mockActiveMCPServers = jest.fn();

jest.mock("../../../models/systemPromptVariables");
jest.mock("../../../models/systemSettings");
jest.mock("../../../utils/agents/imported", () => ({
  activeImportedPlugins: jest.fn().mockReturnValue([]),
}));
jest.mock("../../../utils/agentFlows", () => ({
  AgentFlows: {
    activeFlowPlugins: jest.fn().mockReturnValue([]),
  },
}));
jest.mock("../../../utils/MCP", () => {
  return jest.fn().mockImplementation(() => ({
    activeMCPServers: mockActiveMCPServers,
  }));
});

const {
  WORKSPACE_AGENT,
  mcpSkillsForContext,
} = require("../../../utils/agents/defaults");

describe("WORKSPACE_AGENT.getDefinition", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveMCPServers.mockResolvedValue([]);
    // Mock SystemSettings to return empty arrays for agent skills
    const { SystemSettings } = require("../../../models/systemSettings");
    SystemSettings.getValueOrFallback = jest.fn().mockResolvedValue("[]");
  });

  it("should use provider default system prompt when workspace has no openAiPrompt", async () => {
    const workspace = {
      id: 1,
      name: "Test Workspace",
      openAiPrompt: null,
    };
    const user = { id: 1 };
    const provider = "openai";
    const expectedPrompt = await Provider.systemPrompt({
      provider,
      workspace,
      user,
    });
    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      user
    );
    expect(definition.role).toBe(expectedPrompt);
    expect(
      SystemPromptVariables.expandSystemPromptVariables
    ).not.toHaveBeenCalled();
  });

  it("should use workspace system prompt with variable expansion when openAiPrompt exists", async () => {
    const workspace = {
      id: 1,
      name: "Test Workspace",
      openAiPrompt:
        "You are a helpful assistant for {workspace.name}. The current user is {user.name}.",
    };
    const user = { id: 1 };
    const provider = "openai";

    const expandedPrompt =
      "You are a helpful assistant for Test Workspace. The current user is John Doe.";
    SystemPromptVariables.expandSystemPromptVariables.mockResolvedValue(
      expandedPrompt
    );

    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      user
    );

    expect(
      SystemPromptVariables.expandSystemPromptVariables
    ).toHaveBeenCalledWith(workspace.openAiPrompt, user.id, workspace.id);
    expect(definition.role).toBe(expandedPrompt);
  });

  it("should handle workspace system prompt without user context", async () => {
    const workspace = {
      id: 1,
      name: "Test Workspace",
      openAiPrompt: "You are a helpful assistant. Today is {date}.",
    };
    const user = null;
    const provider = "lmstudio";
    const expandedPrompt =
      "You are a helpful assistant. Today is January 1, 2024.";
    SystemPromptVariables.expandSystemPromptVariables.mockResolvedValue(
      expandedPrompt
    );

    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      user
    );

    expect(
      SystemPromptVariables.expandSystemPromptVariables
    ).toHaveBeenCalledWith(workspace.openAiPrompt, null, workspace.id);
    expect(definition.role).toBe(expandedPrompt);
  });

  it("should return functions array in definition", async () => {
    const workspace = { id: 1, openAiPrompt: null };
    const provider = "openai";

    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      null
    );

    expect(definition).toHaveProperty("functions");
    expect(Array.isArray(definition.functions)).toBe(true);
  });

  it("should use LMStudio specific prompt when workspace has no openAiPrompt", async () => {
    const workspace = { id: 1, openAiPrompt: null };
    const user = null;
    const provider = "lmstudio";
    const definition = await WORKSPACE_AGENT.getDefinition(
      provider,
      workspace,
      null
    );

    expect(definition.role).toBe(
      await Provider.systemPrompt({ provider, workspace, user })
    );
    expect(definition.role).toContain("helpful ai assistant");
  });

  it("adds only concise relevant educational context for a student", async () => {
    const context = {
      learner: {
        userId: 7,
        studentId: 17,
        username: "private-username",
        name: "Private Name",
        age: 15,
      },
      education: {
        academicLevel: "O-Level",
        curriculum: "ZIMSEC",
        grade: "10",
        studyPlan: {
          id: 27,
          subject: "Mathematics",
          topics: ["Algebra", "Geometry"],
        },
      },
      performance: {
        averageScore: 54,
        weakSubjects: [{ subject: "Mathematics", averageScore: 50 }],
        recentQuizzes: [{ quizCode: "SECRET-CODE", score: 50 }],
      },
      session: {
        activeStudyPlanId: 27,
        today: [{ topic: "Algebra", status: "pending" }],
      },
      permissions: { role: "student", isAuthenticated: true },
    };

    const definition = await WORKSPACE_AGENT.getDefinition(
      "openai",
      { id: 1, openAiPrompt: null },
      { id: 7 },
      context
    );

    expect(definition.role).toContain(
      "Academic profile: O-Level, ZIMSEC, grade 10"
    );
    expect(definition.role).toContain("Subjects needing support: Mathematics");
    expect(definition.role).toContain(
      "Active study plan: Mathematics (Algebra, Geometry)"
    );
    expect(definition.role).toContain("Today's study topics: Algebra");
    expect(definition.role).not.toContain("Private Name");
    expect(definition.role).not.toContain("private-username");
    expect(definition.role).not.toContain("SECRET-CODE");
    expect(definition.role).not.toContain("averageScore");
  });

  it("does not alter the role when there is no student profile", async () => {
    const workspace = { id: 1, openAiPrompt: null };
    const user = { id: 8 };
    const baseRole = await Provider.systemPrompt({
      provider: "openai",
      workspace,
      user,
    });

    const definition = await WORKSPACE_AGENT.getDefinition(
      "openai",
      workspace,
      user,
      {
        learner: { userId: 8, studentId: null },
        education: { academicLevel: null },
      }
    );

    expect(definition.role).toBe(baseRole);
  });

  it("adds actionable educational plan guidance to the role", async () => {
    const definition = await WORKSPACE_AGENT.getDefinition(
      "openai",
      { id: 1, openAiPrompt: null },
      { id: 1 },
      null,
      {
        actionable: true,
        agent: "assessor",
        intent: "create-quiz",
        skills: ["quiz_create_agent"],
      }
    );

    expect(definition.role).toContain("Educational specialist: assessor");
    expect(definition.role).toContain("Preferred skills: quiz_create_agent");
  });

  it("keeps MCP tools away from learner roles unless explicitly enabled", async () => {
    mockActiveMCPServers.mockResolvedValue(["@@mcp_test"]);
    delete process.env.ENABLE_STUDENT_MCP;

    await expect(
      mcpSkillsForContext({ permissions: { role: "student" } })
    ).resolves.toEqual([]);
    await expect(
      mcpSkillsForContext({ permissions: { role: "teacher" } })
    ).resolves.toEqual(["@@mcp_test"]);
  });
});

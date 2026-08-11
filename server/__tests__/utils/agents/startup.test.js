process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";
process.env.OPEN_AI_KEY = "test-key";

const mockBuildEducationalContext = jest.fn();
const mockGetWorkspaceDefinition = jest.fn();

jest.mock("../../../utils/educationalContext", () => ({
  buildEducationalContext: (...args) => mockBuildEducationalContext(...args),
}));
jest.mock("../../../utils/agents/defaults", () => ({
  USER_AGENT: {
    name: "USER",
    getDefinition: jest.fn().mockReturnValue({ role: "user", functions: [] }),
  },
  WORKSPACE_AGENT: {
    name: "@agent",
    getDefinition: (...args) => mockGetWorkspaceDefinition(...args),
  },
  agentSkillsFromSystemSettings: jest.fn().mockResolvedValue([]),
  mcpSkillsForContext: jest.fn().mockResolvedValue([]),
}));

class MockAIbitat {
  constructor(options) {
    this.handlerProps = options.handlerProps;
    this.agents = new Map();
  }

  agent(name, definition) {
    this.agents.set(name, definition);
  }

  use() {}
}

jest.mock("../../../utils/agents/aibitat", () => MockAIbitat);
jest.mock("../../../utils/agents/aibitat/plugins", () => ({
  websocket: { name: "websocket", plugin: jest.fn().mockReturnValue({}) },
  chatHistory: { name: "chat-history", plugin: jest.fn().mockReturnValue({}) },
}));
jest.mock("../../../utils/agents/aibitat/plugins/auto-memory", () => ({
  autoMemory: { name: "auto-memory", plugin: jest.fn().mockReturnValue({}) },
}));
jest.mock("../../../utils/agents/aibitat/plugins/http-socket.js", () => ({
  httpSocket: { name: "http-socket", plugin: jest.fn().mockReturnValue({}) },
}));
jest.mock("../../../utils/agents/imported", () => ({
  activeImportedPlugins: jest.fn().mockReturnValue([]),
}));
jest.mock("../../../utils/agentFlows", () => ({
  AgentFlows: { activeFlowPlugins: jest.fn().mockReturnValue([]) },
}));
jest.mock("../../../utils/MCP", () =>
  jest.fn().mockImplementation(() => ({
    activeMCPServers: jest.fn().mockResolvedValue([]),
  }))
);
jest.mock("../../../models/workspaceChats", () => ({
  WorkspaceChats: { where: jest.fn().mockResolvedValue([]) },
}));
jest.mock("../../../models/user", () => ({
  User: { get: jest.fn() },
}));
jest.mock("../../../models/workspaceAgentInvocation", () => ({
  WorkspaceAgentInvocation: {
    getWithWorkspace: jest.fn(),
    parseAgents: jest.fn().mockReturnValue([]),
  },
}));

const { User } = require("../../../models/user");
const {
  WorkspaceAgentInvocation,
} = require("../../../models/workspaceAgentInvocation");
const { AgentHandler } = require("../../../utils/agents");
const { EphemeralAgentHandler } = require("../../../utils/agents/ephemeral");

describe("agent educational context startup", () => {
  let consoleSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    mockGetWorkspaceDefinition.mockResolvedValue({
      role: "workspace",
      functions: [],
    });
    User.get.mockResolvedValue({ id: 7 });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("builds and shares one context during persistent startup", async () => {
    const workspace = { id: 4, agentProvider: "openai", agentModel: "gpt-4o" };
    const invocation = {
      user_id: 7,
      workspace_id: 4,
      workspace,
      prompt: "Help me study",
    };
    const context = { learner: { studentId: 17 } };
    WorkspaceAgentInvocation.getWithWorkspace.mockResolvedValue(invocation);
    mockBuildEducationalContext.mockResolvedValue(context);

    const handler = await new AgentHandler({ uuid: "persistent-1" }).init();
    await handler.createAIbitat({ socket: {} });
    await handler.createAIbitat({ socket: {} });

    expect(mockBuildEducationalContext).toHaveBeenCalledTimes(1);
    expect(mockBuildEducationalContext).toHaveBeenCalledWith({
      userId: 7,
      workspaceId: 4,
    });
    expect(handler.aibitat.handlerProps.educationalContext).toBe(context);
    expect(mockGetWorkspaceDefinition).toHaveBeenLastCalledWith(
      "openai",
      workspace,
      { id: 7 },
      context,
      expect.objectContaining({
        intent: "fallback-tutoring",
        actionable: false,
      })
    );
    expect(() => {
      const log = handler.aibitat.handlerProps.log;
      log("safe callback");
    }).not.toThrow();
  });

  it("builds and shares one empty context during anonymous ephemeral startup", async () => {
    const workspace = { id: 5, agentProvider: "openai", agentModel: "gpt-4o" };
    const context = { learner: { studentId: null } };
    mockBuildEducationalContext.mockResolvedValue(context);

    const handler = await new EphemeralAgentHandler({
      uuid: "ephemeral-1",
      workspace,
      prompt: "Hello",
    }).init();
    await handler.createAIbitat({ handler: {} });
    await handler.createAIbitat({ handler: {} });

    expect(mockBuildEducationalContext).toHaveBeenCalledTimes(1);
    expect(mockBuildEducationalContext).toHaveBeenCalledWith({
      userId: null,
      workspaceId: 5,
    });
    expect(User.get).not.toHaveBeenCalled();
    expect(handler.aibitat.handlerProps.educationalContext).toBe(context);
    expect(mockGetWorkspaceDefinition).toHaveBeenLastCalledWith(
      "openai",
      workspace,
      null,
      context,
      expect.objectContaining({
        intent: "fallback-tutoring",
        actionable: false,
      })
    );
    expect(() => {
      const log = handler.aibitat.handlerProps.log;
      log("safe callback");
    }).not.toThrow();
  });
});

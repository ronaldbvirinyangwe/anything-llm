jest.mock("../../../utils/agentFlows", () => ({
  AgentFlows: { saveFlow: jest.fn() },
}));
jest.mock("../../../utils/middleware/multiUserProtected", () => ({
  flexUserRoleValid: jest.fn(),
  ROLES: { admin: "admin", manager: "manager" },
}));
jest.mock("../../../utils/middleware/validatedRequest", () => ({
  validatedRequest: jest.fn(),
}));
jest.mock("../../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn(async () => {}) },
}));
jest.mock("../../../models/workspace", () => ({ Workspace: {} }));
jest.mock("../../../models/workspaceChats", () => ({ WorkspaceChats: {} }));
jest.mock("../../../models/workspaceUsers", () => ({ WorkspaceUser: {} }));
jest.mock("../../../utils/prisma", () => ({}));

const { AgentFlows } = require("../../../utils/agentFlows");
const { Telemetry } = require("../../../models/telemetry");
const { saveAgentFlow } = require("../../../endpoints/agentFlows");

describe("saveAgentFlow", () => {
  it("returns the saved flow rather than the save result wrapper", async () => {
    const flow = {
      uuid: "flow-id",
      name: "test flow",
      config: { steps: [{ type: "start", config: {} }] },
    };
    AgentFlows.saveFlow.mockReturnValue({ success: true, flow });
    const response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await saveAgentFlow(
      { body: { name: "test flow", config: { blocks: [] } } },
      response
    );

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, flow })
    );
    expect(Telemetry.sendTelemetry).toHaveBeenCalledWith("agent_flow_created", {
      blockCount: 1,
    });
  });
});

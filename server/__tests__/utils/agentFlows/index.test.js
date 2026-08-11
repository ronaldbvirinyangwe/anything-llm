const fs = require("fs");
const os = require("os");
const path = require("path");

jest.mock("../../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn(async () => {}) },
}));
jest.mock("../../../utils/files", () => ({
  normalizePath: (filePath) => filePath,
}));

const { AgentFlows } = require("../../../utils/agentFlows");

describe("AgentFlows config normalization", () => {
  let flowsDir;

  beforeEach(() => {
    flowsDir = fs.mkdtempSync(path.join(os.tmpdir(), "agent-flows-"));
    AgentFlows.flowsDir = flowsDir;
  });

  afterEach(() => {
    fs.rmSync(flowsDir, { recursive: true, force: true });
  });

  it("saves blocks as canonical steps and preserves the legacy blocks field", () => {
    const blocks = [
      { type: "api-call", config: { url: "https://example.com" } },
    ];
    const result = AgentFlows.saveFlow("legacy", { blocks }, "flow-id");

    expect(result.success).toBe(true);
    expect(result.flow.config.blocks).toEqual(blocks);
    expect(result.flow.config.steps).toEqual([
      { type: "apiCall", config: { url: "https://example.com" } },
    ]);
    expect(AgentFlows.loadFlow("flow-id").config.steps).toEqual(
      result.flow.config.steps
    );
  });

  it("prefers steps when both steps and blocks are present", () => {
    const result = AgentFlows.saveFlow(
      "current",
      {
        steps: [{ type: "llmInstruction", config: {} }],
        blocks: [{ type: "web-scraping", config: {} }],
      },
      "flow-id"
    );

    expect(result.flow.config.steps).toEqual([
      { type: "llmInstruction", config: {} },
    ]);
  });
});

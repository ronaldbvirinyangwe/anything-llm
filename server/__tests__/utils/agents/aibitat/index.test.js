/* eslint-env jest */

jest.mock("../../../../models/telemetry", () => ({
  Telemetry: { sendTelemetry: jest.fn() },
}));

const AIbitat = require("../../../../utils/agents/aibitat");

const parameters = {
  type: "object",
  required: ["query"],
  properties: {
    query: { type: "string" },
  },
  additionalProperties: false,
};

function createProvider(streaming, completions) {
  const next = jest.fn(async () => completions.shift());
  return streaming
    ? { supportsAgentStreaming: true, stream: next }
    : { supportsAgentStreaming: false, complete: next };
}

function execute(aibitat, provider, streaming, functions) {
  const method = streaming ? "handleAsyncExecution" : "handleExecution";
  return aibitat[method](
    provider,
    [{ role: "user", content: "search" }],
    functions
  );
}

describe.each([
  ["non-streaming", false],
  ["streaming", true],
])("AIbitat tool execution (%s)", (_label, streaming) => {
  test("returns structured validation feedback without executing invalid calls", async () => {
    const handler = jest.fn(async () => "result");
    const fn = { name: "search", parameters, handler };
    const aibitat = new AIbitat().function(fn);
    const provider = createProvider(streaming, [
      { functionCall: { name: "search", arguments: { query: 3 } } },
      { functionCall: { name: "search", arguments: { query: "valid" } } },
      { textResponse: "finished" },
    ]);

    await expect(execute(aibitat, provider, streaming, [fn])).resolves.toBe(
      "finished"
    );
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ query: "valid" });

    const secondRequestMessages = (provider.stream || provider.complete).mock
      .calls[1][0];
    const feedback = JSON.parse(secondRequestMessages.at(-1).content);
    expect(feedback).toMatchObject({
      ok: false,
      error: {
        code: "INVALID_TOOL_ARGUMENTS",
        details: {
          tool: "search",
          errors: [
            expect.objectContaining({ path: "$.query", keyword: "type" }),
          ],
        },
      },
    });
  });

  test("bounds unknown tool retries", async () => {
    const aibitat = new AIbitat({ maxUnknownToolRetries: 1 });
    const provider = createProvider(streaming, [
      { functionCall: { name: "invented", arguments: {} } },
      { functionCall: { name: "still-invented", arguments: {} } },
    ]);

    const result = await execute(aibitat, provider, streaming, []);
    expect(JSON.parse(result)).toMatchObject({
      error: { code: "UNKNOWN_TOOL", details: { tool: "still-invented" } },
    });
    expect(provider.stream || provider.complete).toHaveBeenCalledTimes(2);
  });

  test("enforces the total tool-call limit", async () => {
    const handler = jest.fn(async () => "result");
    const fn = { name: "search", parameters, handler };
    const aibitat = new AIbitat({
      maxToolCalls: 1,
      maxToolRepeats: 5,
    }).function(fn);
    const provider = createProvider(streaming, [
      { functionCall: { name: "search", arguments: { query: "one" } } },
      { functionCall: { name: "search", arguments: { query: "two" } } },
    ]);

    const result = await execute(aibitat, provider, streaming, [fn]);
    expect(JSON.parse(result).error.code).toBe("TOOL_CALL_LIMIT_EXCEEDED");
    expect(handler).toHaveBeenCalledTimes(1);
  });

  test("allows repeated calls up to the configured per-tool limit", async () => {
    const handler = jest.fn(async ({ query }) => query);
    const fn = { name: "search", parameters, handler };
    const aibitat = new AIbitat({
      maxToolCalls: 5,
      maxToolRepeats: 2,
    }).function(fn);
    const provider = createProvider(streaming, [
      { functionCall: { name: "search", arguments: { query: "one" } } },
      { functionCall: { name: "search", arguments: { query: "two" } } },
      { functionCall: { name: "search", arguments: { query: "three" } } },
    ]);

    const result = await execute(aibitat, provider, streaming, [fn]);
    expect(JSON.parse(result).error.code).toBe("TOOL_REPEAT_LIMIT_EXCEEDED");
    expect(handler).toHaveBeenCalledTimes(2);
  });

  test("preserves direct tool output", async () => {
    const aibitat = new AIbitat();
    const handler = jest.fn(async () => {
      aibitat.skipHandleExecution = true;
      return "direct result";
    });
    const fn = { name: "search", parameters, handler };
    aibitat.function(fn);
    const provider = createProvider(streaming, [
      { functionCall: { name: "search", arguments: { query: "one" } } },
    ]);

    await expect(execute(aibitat, provider, streaming, [fn])).resolves.toBe(
      "direct result"
    );
    expect(provider.stream || provider.complete).toHaveBeenCalledTimes(1);
    expect(aibitat.skipHandleExecution).toBe(false);
  });
});

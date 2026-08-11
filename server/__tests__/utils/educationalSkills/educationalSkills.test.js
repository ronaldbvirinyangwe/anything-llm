/* eslint-env jest */
const {
  EducationalSkillGateway,
  EducationalSkillRegistry,
  ERROR_CODES,
  createSkillStableName,
  validateJsonSchema,
} = require("../../../utils/educationalSkills");

const inputSchema = {
  type: "object",
  required: ["studentId", "answers"],
  properties: {
    studentId: { type: "string" },
    mode: { type: "string", enum: ["practice", "graded"] },
    confidence: { type: "number" },
    reviewed: { type: "boolean" },
    answers: {
      type: "array",
      items: {
        type: "object",
        required: ["questionId", "answer"],
        properties: {
          questionId: { type: "integer" },
          answer: { type: ["string", "null"] },
        },
        additionalProperties: false,
      },
    },
  },
  additionalProperties: false,
};
const outputSchema = {
  type: "object",
  required: ["score"],
  properties: { score: { type: "integer" } },
  additionalProperties: false,
};

function registerSkill(registry, overrides = {}) {
  return registry.register({
    namespace: "assessment",
    name: "quiz.grade",
    description: "Grades a quiz submission",
    inputSchema,
    outputSchema,
    execute: async (input) => ({ score: input.answers.length }),
    ...overrides,
  });
}

describe("EducationalSkillRegistry", () => {
  test("registers contracts under canonical, stable names", () => {
    const registry = new EducationalSkillRegistry();
    const skill = registerSkill(registry);

    expect(createSkillStableName("assessment", "quiz.grade")).toBe(
      "assessment.quiz.grade"
    );
    expect(skill.stableName).toBe("assessment.quiz.grade");
    expect(registry.get(skill.stableName)).toBe(skill);
    expect(registry.list()[0]).not.toHaveProperty("execute");
    expect(() => registerSkill(registry)).toThrow("already registered");
  });

  test("rejects malformed names and contracts", () => {
    const registry = new EducationalSkillRegistry();
    expect(() => registerSkill(registry, { namespace: "Not Stable" })).toThrow(
      "namespace"
    );
    expect(() => registerSkill(registry, { execute: undefined })).toThrow(
      "execute"
    );
    expect(() =>
      registerSkill(registry, { inputSchema: { type: "date" } })
    ).toThrow("unsupported");
    expect(() =>
      registerSkill(registry, {
        inputSchema: { type: "string", minLength: 1 },
      })
    ).toThrow("not supported");
  });
});

describe("educational skill input validation", () => {
  test("validates required properties, enums, arrays, and nested types", () => {
    const valid = validateJsonSchema(
      {
        studentId: "student-1",
        mode: "practice",
        confidence: 0.8,
        reviewed: true,
        answers: [{ questionId: 1, answer: null }],
      },
      inputSchema
    );
    expect(valid).toEqual({ valid: true, errors: [] });

    const invalid = validateJsonSchema(
      {
        mode: "surprise",
        confidence: Infinity,
        reviewed: "yes",
        answers: [{ questionId: "one", answer: "A", extra: true }],
        ignored: true,
      },
      inputSchema
    );
    expect(invalid.valid).toBe(false);
    expect(invalid.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "$.studentId", keyword: "required" }),
        expect.objectContaining({ path: "$.mode", keyword: "enum" }),
        expect.objectContaining({ path: "$.confidence", keyword: "type" }),
        expect.objectContaining({ path: "$.reviewed", keyword: "type" }),
      ])
    );
    expect(invalid.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "$.answers[0].questionId",
          keyword: "type",
        }),
        expect.objectContaining({
          path: "$.answers[0].extra",
          keyword: "additionalProperties",
        }),
        expect.objectContaining({
          path: "$.ignored",
          keyword: "additionalProperties",
        }),
      ])
    );
  });
});

describe("EducationalSkillGateway", () => {
  test("checks authorization and returns structured success results", async () => {
    const registry = new EducationalSkillRegistry();
    registerSkill(registry, {
      roles: ["teacher", "admin"],
      permissions: ["assessment:grade"],
    });
    const gateway = new EducationalSkillGateway(registry, {
      createExecutionId: () => "execution-1",
      now: () => 100,
    });
    const input = { studentId: "s1", answers: [] };

    const denied = await gateway.execute("assessment.quiz.grade", input, {
      caller: { id: "u1", role: "student", permissions: ["assessment:grade"] },
    });
    expect(denied).toMatchObject({
      ok: false,
      error: { code: ERROR_CODES.FORBIDDEN },
    });

    const result = await gateway.execute("assessment.quiz.grade", input, {
      caller: {
        id: "u2",
        roles: ["teacher"],
        permissions: ["assessment:grade"],
      },
    });
    expect(result).toEqual({
      ok: true,
      data: { score: 0 },
      meta: {
        executionId: "execution-1",
        stableName: "assessment.quiz.grade",
        startedAt: 100,
        finishedAt: 100,
        durationMs: 0,
      },
    });
  });

  test("rejects invalid input before invoking the skill", async () => {
    const execute = jest.fn();
    const registry = new EducationalSkillRegistry();
    registerSkill(registry, { execute });
    const gateway = new EducationalSkillGateway(registry);

    const result = await gateway.execute("assessment.quiz.grade", {
      studentId: "s1",
      answers: "not-an-array",
    });
    expect(result).toMatchObject({
      ok: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        details: { errors: expect.any(Array) },
      },
    });
    expect(execute).not.toHaveBeenCalled();
  });

  test("rejects invalid structured output", async () => {
    const registry = new EducationalSkillRegistry();
    registerSkill(registry, { execute: async () => ({ score: "unknown" }) });
    const gateway = new EducationalSkillGateway(registry);

    const result = await gateway.execute("assessment.quiz.grade", {
      studentId: "s1",
      answers: [],
    });

    expect(result).toMatchObject({
      ok: false,
      error: {
        code: ERROR_CODES.INVALID_OUTPUT,
        details: { errors: expect.any(Array) },
      },
    });
  });

  test("enforces independent per-caller call limits", async () => {
    let now = 0;
    const registry = new EducationalSkillRegistry();
    registerSkill(registry, { callLimit: { maxCalls: 1, windowMs: 1000 } });
    const gateway = new EducationalSkillGateway(registry, { now: () => now });
    const input = { studentId: "s1", answers: [] };

    expect(
      (
        await gateway.execute("assessment.quiz.grade", input, {
          caller: { id: "teacher-1" },
        })
      ).ok
    ).toBe(true);
    const limited = await gateway.execute("assessment.quiz.grade", input, {
      caller: { id: "teacher-1" },
    });
    expect(limited).toMatchObject({
      ok: false,
      error: {
        code: ERROR_CODES.RATE_LIMITED,
        details: { retryAfterMs: 1000 },
      },
    });
    expect(
      (
        await gateway.execute("assessment.quiz.grade", input, {
          caller: { id: "teacher-2" },
        })
      ).ok
    ).toBe(true);

    now = 1000;
    expect(
      (
        await gateway.execute("assessment.quiz.grade", input, {
          caller: { id: "teacher-1" },
        })
      ).ok
    ).toBe(true);
  });

  test("times out execution and passes an aborted signal to the skill", async () => {
    let receivedSignal;
    const registry = new EducationalSkillRegistry();
    registerSkill(registry, {
      timeoutMs: 10,
      execute: (_input, context) => {
        receivedSignal = context.signal;
        return new Promise(() => {});
      },
    });
    const gateway = new EducationalSkillGateway(registry);
    const result = await gateway.execute("assessment.quiz.grade", {
      studentId: "s1",
      answers: [],
    });

    expect(result.error.code).toBe(ERROR_CODES.TIMEOUT);
    expect(receivedSignal).toBeInstanceOf(AbortSignal);
    expect(receivedSignal.aborted).toBe(true);
  });

  test("supports caller cancellation and execution tracing hooks", async () => {
    const events = [];
    const registry = new EducationalSkillRegistry();
    registerSkill(registry, {
      execute: (_input, context) =>
        new Promise((_resolve, reject) => {
          context.signal.addEventListener("abort", () =>
            reject(new Error("stop"))
          );
        }),
    });
    const gateway = new EducationalSkillGateway(registry, {
      hooks: { onEvent: (event) => events.push(event) },
    });
    const controller = new AbortController();
    const pending = gateway.execute(
      "assessment.quiz.grade",
      { studentId: "s1", answers: [] },
      { signal: controller.signal }
    );
    controller.abort();
    const result = await pending;

    expect(result.error.code).toBe(ERROR_CODES.ABORTED);
    expect(events.map((event) => event.type)).toEqual(["start", "finish"]);
    expect(events[1].result).toBe(result);
  });

  test("converts thrown values and missing skills into structured errors", async () => {
    const registry = new EducationalSkillRegistry();
    registerSkill(registry, {
      execute: async () => {
        throw new Error("grade failed");
      },
    });
    const gateway = new EducationalSkillGateway(registry);
    const input = { studentId: "s1", answers: [] };

    await expect(
      gateway.execute("assessment.quiz.grade", input)
    ).resolves.toMatchObject({
      ok: false,
      error: { code: ERROR_CODES.EXECUTION_ERROR, message: "grade failed" },
    });
    await expect(
      gateway.execute("missing.skill", input)
    ).resolves.toMatchObject({
      ok: false,
      error: { code: ERROR_CODES.NOT_FOUND },
    });
  });
});

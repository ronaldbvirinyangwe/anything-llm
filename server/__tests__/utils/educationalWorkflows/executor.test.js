/* eslint-env jest */
const {
  EducationalWorkflowExecutor,
  WORKFLOW_STATUSES,
} = require("../../../utils/educationalWorkflows");

function successfulGateway(handler = (_skill, input) => input) {
  return {
    execute: jest.fn(async (skill, input) => ({
      ok: true,
      data: await handler(skill, input),
      meta: { executionId: `skill-${skill}` },
    })),
  };
}

describe("EducationalWorkflowExecutor", () => {
  const workflow = {
    id: "example",
    stopOnError: true,
    steps: [
      {
        id: "first",
        skill: "example.first",
        saveAs: "first",
        input: ({ input }) => ({ value: input.value }),
      },
      {
        id: "second",
        skill: "example.second",
        saveAs: "second",
        input: ({ values }) => ({ previous: values.first }),
      },
    ],
  };

  it("executes structured steps with shared context and traceable results", async () => {
    let now = 10;
    const gateway = successfulGateway((skill, input) => ({ skill, input }));
    const executor = new EducationalWorkflowExecutor(gateway, {
      createExecutionId: () => "workflow-1",
      now: () => now++,
    });
    const context = { caller: { id: "learner-1" }, courseId: "course-1" };

    const result = await executor.execute(workflow, { value: 3 }, { context });

    expect(result).toMatchObject({
      ok: true,
      status: WORKFLOW_STATUSES.COMPLETED,
      executionId: "workflow-1",
      workflowId: "example",
      results: [
        { stepId: "first", skill: "example.first", status: "completed" },
        { stepId: "second", skill: "example.second", status: "completed" },
      ],
    });
    expect(gateway.execute).toHaveBeenNthCalledWith(
      1,
      "example.first",
      { value: 3 },
      expect.objectContaining({
        caller: context.caller,
        courseId: "course-1",
        workflow: {
          executionId: "workflow-1",
          id: "example",
          stepId: "first",
        },
      })
    );
    expect(result.values.second).toEqual({
      skill: "example.second",
      input: { previous: result.values.first },
    });
  });

  it("stops on a gateway error and does not run later steps", async () => {
    const gateway = successfulGateway();
    gateway.execute.mockResolvedValueOnce({
      ok: false,
      error: { code: "EXECUTION_ERROR", message: "failed" },
    });
    const result = await new EducationalWorkflowExecutor(gateway).execute(
      workflow,
      { value: 3 }
    );

    expect(result).toMatchObject({
      ok: false,
      status: WORKFLOW_STATUSES.FAILED,
      error: { code: "EXECUTION_ERROR" },
    });
    expect(gateway.execute).toHaveBeenCalledTimes(1);
  });

  it("passes cancellation to the gateway and reports cancellation", async () => {
    const controller = new AbortController();
    const gateway = {
      execute: jest.fn(async (_skill, _input, context) => {
        expect(context.signal).toBe(controller.signal);
        controller.abort();
        return {
          ok: false,
          error: { code: "ABORTED", message: "Skill execution aborted" },
        };
      }),
    };

    const result = await new EducationalWorkflowExecutor(gateway).execute(
      workflow,
      { value: 3 },
      { signal: controller.signal }
    );

    expect(result.status).toBe(WORKFLOW_STATUSES.CANCELLED);
    expect(gateway.execute).toHaveBeenCalledTimes(1);
  });

  it("can pause and resume without replaying completed steps", async () => {
    const gateway = successfulGateway();
    const resumable = {
      id: "resumable",
      steps: [
        { id: "prepare", skill: "example.prepare", saveAs: "prepared" },
        {
          id: "answer",
          pause: ({ input, values }) => {
            if (input.answer) {
              values.answer = input.answer;
              return null;
            }
            return {
              reason: "learner_input_required",
              requiredFields: ["answer"],
            };
          },
        },
        { id: "finish", skill: "example.finish" },
      ],
    };
    const executor = new EducationalWorkflowExecutor(gateway);

    const paused = await executor.execute(resumable, { topic: "fractions" });
    const completed = await executor.resume(resumable, paused.resumeState, {
      answer: "1/2",
    });

    expect(paused.status).toBe(WORKFLOW_STATUSES.PAUSED);
    expect(paused.pause).toMatchObject({
      stepId: "answer",
      reason: "learner_input_required",
    });
    expect(completed.status).toBe(WORKFLOW_STATUSES.COMPLETED);
    expect(completed.values.answer).toBe("1/2");
    expect(gateway.execute.mock.calls.map(([skill]) => skill)).toEqual([
      "example.prepare",
      "example.finish",
    ]);
  });
});

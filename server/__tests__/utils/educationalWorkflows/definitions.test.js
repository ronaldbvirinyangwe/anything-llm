/* eslint-env jest */
const {
  EducationalWorkflowExecutor,
  createMasteryWorkflow,
  createStudyPlanningWorkflow,
  missingStudyPlanRequirements,
} = require("../../../utils/educationalWorkflows");

function gateway(handler) {
  return {
    execute: jest.fn(async (skill, input, context) => ({
      ok: true,
      data: await handler(skill, input, context),
      meta: { executionId: skill },
    })),
  };
}

describe("mastery workflow", () => {
  it("pauses for learner input after feedback and remediation", async () => {
    const skillGateway = gateway((skill) =>
      skill === "test.remediate"
        ? {
            lesson: "Review denominators",
            reassessmentPrompt: "What is 1/2 + 1/2?",
          }
        : { useful: true }
    );
    const workflow = createMasteryWorkflow({
      feedback: "test.feedback",
      remediation: "test.remediate",
      reassessment: "test.reassess",
      evidenceUpdate: "test.evidence",
    });
    const executor = new EducationalWorkflowExecutor(skillGateway);

    const paused = await executor.execute(workflow, {
      learnerId: "l1",
      objective: "add fractions",
      response: "1/2 + 1/2 = 1/4",
    });

    expect(paused.status).toBe("paused");
    expect(paused.pause).toEqual({
      stepId: "learner-reassessment-response",
      reason: "learner_input_required",
      requiredFields: ["reassessmentResponse"],
      prompt: "What is 1/2 + 1/2?",
    });
    expect(skillGateway.execute.mock.calls.map(([skill]) => skill)).toEqual([
      "test.feedback",
      "test.remediate",
    ]);

    const completed = await executor.resume(workflow, paused.resumeState, {
      reassessmentResponse: "1",
    });
    expect(completed.status).toBe("completed");
    expect(skillGateway.execute.mock.calls.map(([skill]) => skill)).toEqual([
      "test.feedback",
      "test.remediate",
      "test.reassess",
      "test.evidence",
    ]);
    expect(skillGateway.execute).toHaveBeenNthCalledWith(
      3,
      "test.reassess",
      expect.objectContaining({ response: "1" }),
      expect.any(Object)
    );
    expect(skillGateway.execute).toHaveBeenNthCalledWith(
      4,
      "test.evidence",
      expect.objectContaining({ assessment: { useful: true } }),
      expect.any(Object)
    );
  });
});

describe("study-planning workflow", () => {
  const workflow = createStudyPlanningWorkflow({
    elicit: "test.elicit",
    generate: "test.generate",
    track: "test.track",
  });

  it("elicits and pauses when requirements are missing", async () => {
    const skillGateway = gateway(() => ({ prompt: "When is your exam?" }));
    const result = await new EducationalWorkflowExecutor(skillGateway).execute(
      workflow,
      { subject: "Biology", topics: ["cells"], studyHoursPerDay: 1 }
    );

    expect(result.status).toBe("paused");
    expect(result.pause).toMatchObject({
      reason: "learner_input_required",
      requiredFields: ["examDate"],
      prompt: "When is your exam?",
    });
    expect(skillGateway.execute).toHaveBeenCalledWith(
      "test.elicit",
      expect.objectContaining({
        known: expect.objectContaining({ subject: "Biology" }),
        missingFields: ["examDate"],
      }),
      expect.any(Object)
    );
  });

  it("generates and tracks a plan when requirements are complete", async () => {
    const skillGateway = gateway((skill) =>
      skill === "test.generate"
        ? { id: "plan-1", sessions: [] }
        : { tracked: true }
    );
    const result = await new EducationalWorkflowExecutor(skillGateway).execute(
      workflow,
      {
        learnerId: "l1",
        subject: "Biology",
        exam_date: "2026-11-16",
        topics: ["cells", "respiration"],
        hours_per_day: 1,
      }
    );

    expect(result.status).toBe("completed");
    expect(skillGateway.execute.mock.calls.map(([skill]) => skill)).toEqual([
      "test.generate",
      "test.track",
    ]);
    expect(result.output).toEqual({
      plan: { id: "plan-1", sessions: [] },
      tracking: { tracked: true },
    });
  });

  it("normalizes aliases while identifying missing requirements", () => {
    expect(
      missingStudyPlanRequirements({
        subject: "Maths",
        exam_date: "2026-10-01",
        topics: ["algebra"],
        study_hours_per_day: 2,
      })
    ).toEqual([]);
  });
});

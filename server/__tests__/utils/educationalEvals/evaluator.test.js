const {
  evaluateEducationalDecision,
  evaluateEducationalSuite,
} = require("../../../utils/educationalEvals");

describe("educational evaluation framework", () => {
  const fixture = {
    id: "deterministic-example",
    expected: {
      intent: "teach",
      requiredSkills: ["explain-concept"],
      forbiddenSkills: ["study-planner"],
      role: "tutor",
      constraints: { curriculum: "ZIMSEC", grade: "Form 2" },
    },
    rubricChecks: [
      {
        id: "has-practice",
        check: (decision) => ({
          passed: decision.steps.includes("practice"),
          message: "A practice step is required.",
        }),
      },
    ],
  };

  it("passes a decision satisfying every deterministic check", () => {
    const evaluation = evaluateEducationalDecision(fixture, {
      intent: "teach",
      skills: ["explain-concept"],
      role: "tutor",
      curriculum: "ZIMSEC",
      grade: "Form 2",
      steps: ["explain", "practice"],
    });

    expect(evaluation).toMatchObject({
      id: fixture.id,
      passed: true,
      score: 1,
      summary: { passed: 7, failed: 0, total: 7 },
    });
    expect(evaluation.checks.map(({ id }) => id)).toEqual([
      "intent",
      "required-skills",
      "forbidden-skills",
      "role",
      "curriculum",
      "grade",
      "rubric:has-practice",
    ]);
  });

  it("reports all failures without short-circuiting", () => {
    const evaluation = evaluateEducationalDecision(fixture, {
      intent: "plan",
      skills: ["study-planner"],
      role: "assistant",
      curriculum: "Cambridge",
      grade: "Form 5",
      steps: [],
    });

    expect(evaluation.passed).toBe(false);
    expect(evaluation.score).toBe(0);
    expect(evaluation.summary).toEqual({ passed: 0, failed: 7, total: 7 });
    expect(evaluation.checks.every(({ passed }) => !passed)).toBe(true);
  });

  it("turns invalid or throwing rubric outcomes into deterministic failures", () => {
    const evaluation = evaluateEducationalDecision(
      {
        id: "rubric-errors",
        rubricChecks: [
          { id: "invalid", check: () => "yes" },
          {
            id: "throws",
            check: () => {
              throw new Error("boom");
            },
          },
        ],
      },
      {}
    );

    expect(evaluation.passed).toBe(false);
    expect(evaluation.checks).toEqual([
      expect.objectContaining({ id: "rubric:invalid", passed: false }),
      expect.objectContaining({
        id: "rubric:throws",
        passed: false,
        message: "Rubric check threw: boom",
      }),
    ]);
  });

  it("aggregates fixture results by stable fixture id", () => {
    const suite = evaluateEducationalSuite([fixture], {
      [fixture.id]: {
        intent: "teach",
        skills: ["explain-concept"],
        role: "tutor",
        curriculum: "ZIMSEC",
        grade: "Form 2",
        steps: ["practice"],
      },
    });

    expect(suite).toMatchObject({
      passed: true,
      summary: { passed: 1, failed: 0, total: 1 },
    });
  });
});

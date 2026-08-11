process.env.STORAGE_DIR = __dirname;
process.env.NODE_ENV = "test";

jest.mock("../../../utils/chats/agents", () => ({ grepAgents: jest.fn() }));

const { detectToolIntent } = require("../../../utils/chats/stream");

describe("educational chat intent routing", () => {
  it("routes curriculum-aware note requests through the educational planner", async () => {
    const result = await detectToolIntent(
      "[Curriculum: ZIMSEC] [Grade: Form 3] [Subject: Biology] Write notes about respiration"
    );

    expect(result).toMatchObject({
      via: "agent",
      tool_call: "generate-notes",
      educationalPlan: {
        actionable: true,
        agent: "tutor",
        curriculum: "ZIMSEC",
        grade: "Form 3",
        intent: "generate-notes",
      },
    });
  });

  it("preserves the existing direct quiz UI route", async () => {
    const result = await detectToolIntent(
      "[Grade: Form 4] [Subject: Mathematics] Create a 7 question quiz on algebra"
    );

    expect(result).toMatchObject({
      via: "api",
      tool_call: "quiz_create",
      parameters: {
        grade: "Form 4",
        subject: "Mathematics",
        numQuestions: 7,
        topic: "algebra",
      },
    });
  });

  it("routes remediation as a multi-skill educational plan", async () => {
    const result = await detectToolIntent(
      "[Subject: Biology] I got the photosynthesis question wrong. Help me understand it and try again."
    );

    expect(result).toMatchObject({
      via: "agent",
      tool_call: "check-my-answer",
      educationalPlan: {
        intent: "mastery-remediation",
        skills: ["check-my-answer", "explain-concept"],
        steps: ["feedback", "remediation", "reassessment"],
        advanceTopic: false,
      },
    });
  });
});

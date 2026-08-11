const {
  EducationalPlanner,
  planEducationalRequest,
  profileAllowsSkill,
  profiles,
} = require("../../../utils/educationalAgents");
const {
  educationalEvalFixtures,
  evaluateEducationalSuite,
} = require("../../../utils/educationalEvals");

describe("deterministic educational planner", () => {
  test("passes the educational evaluation fixtures", () => {
    const decisions = Object.fromEntries(
      educationalEvalFixtures.map((fixture) => [
        fixture.id,
        planEducationalRequest(fixture.input),
      ])
    );

    expect(
      evaluateEducationalSuite(educationalEvalFixtures, decisions)
    ).toMatchObject({
      passed: true,
      summary: { passed: 3, failed: 0, total: 3 },
    });
  });

  test.each([
    ["Explain photosynthesis", "explain-concept", "tutor", "explain-concept"],
    [
      "Create a 10 question Biology quiz on cells",
      "create-quiz",
      "assessor",
      "quiz_create_agent",
    ],
    [
      "Write Biology notes about respiration",
      "generate-notes",
      "tutor",
      "generate-notes",
    ],
    [
      "Make 12 flashcards on cell division",
      "create-flashcards",
      "tutor",
      "flashcard_create_agent",
    ],
    ["Can you help me with Biology?", "fallback-tutoring", "tutor", null],
  ])("routes %s", (message, intent, agent, skill) => {
    const result = planEducationalRequest(message, {
      curriculum: "ZIMSEC",
      grade: "Form 3",
    });

    expect(result).toMatchObject({
      intent,
      agent,
      role: agent,
      skills: skill ? [skill] : [],
      missingFields: [],
      curriculum: "ZIMSEC",
      grade: "Form 3",
    });
    expect(
      result.skills.every((name) => profileAllowsSkill(profiles[agent], name))
    ).toBe(true);
  });

  test("routes teacher note generation to the teacher assistant", () => {
    expect(
      planEducationalRequest("Write Biology notes about respiration", {
        permissions: { role: "teacher" },
      })
    ).toMatchObject({
      agent: "teacher-assistant",
      skills: ["generate-notes"],
    });
  });

  test("is deterministic and supports the planner class", () => {
    const planner = new EducationalPlanner();
    const request = {
      message:
        "Plan Physics revision for my 2026-10-20 exam, 2 hours per day, covering waves and electricity.",
      student: { curriculum: "Cambridge", grade: "Year 11" },
    };

    expect(planner.plan(request)).toEqual(planEducationalRequest(request));
    expect(planner.plan(request)).toMatchObject({
      intent: "generate-study-plan",
      parameters: {
        subject: "Physics",
        exam_date: "2026-10-20",
        hours_per_day: 2,
        topics: ["waves", "electricity"],
      },
    });
  });
});

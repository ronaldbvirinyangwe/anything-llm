const {
  educationalEvalFixtures,
  evaluateEducationalDecision,
  evaluateEducationalSuite,
  masteryLoopFixture,
} = require("../../../utils/educationalEvals");

describe("initial educational evaluation fixtures", () => {
  it("covers mastery remediation and both study-planning branches", () => {
    expect(educationalEvalFixtures.map(({ id }) => id)).toEqual([
      "mastery-loop-remediate-before-advancing",
      "study-plan-collect-missing-exam-date",
      "study-plan-generate-with-complete-requirements",
    ]);
  });

  it("accepts representative correct planner decisions", () => {
    const suite = evaluateEducationalSuite(educationalEvalFixtures, {
      "mastery-loop-remediate-before-advancing": {
        intent: "mastery-remediation",
        skills: ["check-my-answer", "explain-concept"],
        role: "tutor",
        curriculum: "ZIMSEC",
        grade: "Form 3",
        steps: ["feedback", "remediation", "reassessment"],
        advanceTopic: false,
      },
      "study-plan-collect-missing-exam-date": {
        intent: "collect-study-plan-requirements",
        skills: ["study-planner-elicit"],
        role: "academic-coach",
        curriculum: "ZIMSEC",
        grade: "Form 4",
        parameters: { subject: "Biology" },
        missingFields: ["exam_date"],
      },
      "study-plan-generate-with-complete-requirements": {
        intent: "generate-study-plan",
        skills: ["study-planner"],
        role: "academic-coach",
        curriculum: "ZIMSEC",
        grade: "Form 4",
        parameters: {
          subject: "Biology",
          exam_date: "2026-11-16",
          hours_per_day: 1,
          topics: ["cells", "respiration"],
        },
      },
    });

    expect(suite.passed).toBe(true);
    expect(suite.summary).toEqual({ passed: 3, failed: 0, total: 3 });
  });

  it("rejects a mastery sequence that omits feedback", () => {
    const evaluation = evaluateEducationalDecision(masteryLoopFixture, {
      intent: "mastery-remediation",
      skills: ["check-my-answer", "explain-concept"],
      role: "tutor",
      curriculum: "ZIMSEC",
      grade: "Form 3",
      steps: ["remediation", "reassessment"],
      advanceTopic: false,
    });

    expect(
      evaluation.checks.find(
        ({ id }) => id === "rubric:feedback-remediation-reassessment"
      )
    ).toMatchObject({ passed: false });
  });
});

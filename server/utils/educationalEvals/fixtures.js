const masteryLoopFixture = {
  id: "mastery-loop-remediate-before-advancing",
  input: {
    message:
      "I got the photosynthesis question wrong. Help me understand it and try again.",
    student: { curriculum: "ZIMSEC", grade: "Form 3" },
  },
  expected: {
    intent: "mastery-remediation",
    requiredSkills: ["check-my-answer", "explain-concept"],
    forbiddenSkills: ["study-planner", "course-generator"],
    role: "tutor",
    constraints: { curriculum: "ZIMSEC", grade: "Form 3" },
  },
  rubricChecks: [
    {
      id: "feedback-remediation-reassessment",
      description:
        "The plan gives feedback, remediates the gap, then reassesses.",
      check: (decision) => {
        const steps = decision.steps || [];
        const feedback = steps.indexOf("feedback");
        const remediation = steps.indexOf("remediation");
        const reassessment = steps.indexOf("reassessment");
        return (
          feedback >= 0 && feedback < remediation && remediation < reassessment
        );
      },
    },
    {
      id: "does-not-advance-topic",
      description:
        "The planner does not advance before mastery is demonstrated.",
      check: (decision) => decision.advanceTopic === false,
    },
  ],
};

const studyPlanningElicitFixture = {
  id: "study-plan-collect-missing-exam-date",
  input: {
    message: "Make me a Biology revision plan for cells and respiration.",
    student: { curriculum: "ZIMSEC", grade: "Form 4" },
  },
  expected: {
    intent: "collect-study-plan-requirements",
    requiredSkills: ["study-planner-elicit"],
    forbiddenSkills: ["study-planner"],
    role: "academic-coach",
    constraints: { curriculum: "ZIMSEC", grade: "Form 4" },
  },
  rubricChecks: [
    {
      id: "preserves-known-subject",
      description:
        "Known subject information is passed to the elicitation step.",
      check: (decision) => decision.parameters?.subject === "Biology",
    },
    {
      id: "collects-exam-date",
      description: "The missing exam date is requested before plan generation.",
      check: (decision) =>
        decision.missingFields?.includes("exam_date") === true,
    },
  ],
};

const studyPlanningReadyFixture = {
  id: "study-plan-generate-with-complete-requirements",
  input: {
    message:
      "Plan Biology revision for my 2026-11-16 exam, one hour daily, covering cells and respiration.",
    student: { curriculum: "ZIMSEC", grade: "Form 4" },
  },
  expected: {
    intent: "generate-study-plan",
    requiredSkills: ["study-planner"],
    forbiddenSkills: ["study-planner-elicit"],
    role: "academic-coach",
    constraints: { curriculum: "ZIMSEC", grade: "Form 4" },
  },
  rubricChecks: [
    {
      id: "uses-complete-planning-inputs",
      description:
        "The generation decision retains all supplied planning inputs.",
      check: (decision) =>
        decision.parameters?.subject === "Biology" &&
        decision.parameters?.exam_date === "2026-11-16" &&
        decision.parameters?.hours_per_day === 1 &&
        decision.parameters?.topics?.join(",") === "cells,respiration",
    },
  ],
};

const educationalEvalFixtures = [
  masteryLoopFixture,
  studyPlanningElicitFixture,
  studyPlanningReadyFixture,
];

module.exports = {
  educationalEvalFixtures,
  masteryLoopFixture,
  studyPlanningElicitFixture,
  studyPlanningReadyFixture,
};

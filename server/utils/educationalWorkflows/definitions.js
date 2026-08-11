const DEFAULT_SKILLS = Object.freeze({
  mastery: Object.freeze({
    evidenceUpdate: "mastery.evidence.update",
    feedback: "mastery.feedback",
    reassessment: "mastery.reassessment",
    remediation: "mastery.remediation",
  }),
  studyPlanning: Object.freeze({
    elicit: "study-planning.elicit",
    generate: "study-planning.generate",
    track: "study-planning.track",
  }),
});

const STUDY_PLAN_REQUIRED_FIELDS = Object.freeze([
  "subject",
  "examDate",
  "topics",
  "studyHoursPerDay",
]);

function firstDefined(input, ...keys) {
  for (const key of keys) {
    if (input[key] !== undefined && input[key] !== null) return input[key];
  }
  return undefined;
}

function studyPlanRequirements(input) {
  return {
    subject: input.subject,
    examDate: firstDefined(input, "examDate", "exam_date"),
    topics: input.topics,
    studyHoursPerDay: firstDefined(
      input,
      "studyHoursPerDay",
      "study_hours_per_day",
      "hours_per_day"
    ),
    daysOff: firstDefined(input, "daysOff", "days_off") || [],
    startDate: firstDefined(input, "startDate", "start_date"),
  };
}

function missingStudyPlanRequirements(input) {
  const requirements = studyPlanRequirements(input);
  return STUDY_PLAN_REQUIRED_FIELDS.filter((field) => {
    const value = requirements[field];
    return (
      value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0)
    );
  });
}

function createMasteryWorkflow(skills = {}) {
  const names = { ...DEFAULT_SKILLS.mastery, ...skills };
  return Object.freeze({
    id: "mastery",
    description:
      "Give feedback, remediate the gap, wait for learner work, reassess, and update mastery evidence.",
    stopOnError: true,
    steps: Object.freeze([
      {
        id: "feedback",
        skill: names.feedback,
        saveAs: "feedback",
        input: ({ input }) => ({
          learnerId: input.learnerId,
          objective: input.objective,
          response: input.response,
        }),
      },
      {
        id: "remediation",
        skill: names.remediation,
        saveAs: "remediation",
        input: ({ input, values }) => ({
          learnerId: input.learnerId,
          objective: input.objective,
          feedback: values.feedback,
        }),
      },
      {
        id: "learner-reassessment-response",
        pause: ({ input, values }) => {
          const response = firstDefined(
            input,
            "reassessmentResponse",
            "reassessmentAnswer"
          );
          if (response !== undefined && response !== "") {
            values.reassessmentResponse = response;
            return null;
          }
          return {
            reason: "learner_input_required",
            requiredFields: ["reassessmentResponse"],
            prompt:
              values.remediation?.reassessmentPrompt ||
              values.remediation?.prompt ||
              "Ask the learner to demonstrate the objective again.",
          };
        },
      },
      {
        id: "reassessment",
        skill: names.reassessment,
        saveAs: "reassessment",
        input: ({ input, values }) => ({
          learnerId: input.learnerId,
          objective: input.objective,
          response: values.reassessmentResponse,
          remediation: values.remediation,
        }),
      },
      {
        id: "evidence-update",
        skill: names.evidenceUpdate,
        saveAs: "evidence",
        input: ({ input, values }) => ({
          learnerId: input.learnerId,
          objective: input.objective,
          assessment: values.reassessment,
        }),
      },
    ]),
    output: ({ values }) => ({
      evidence: values.evidence,
      feedback: values.feedback,
      reassessment: values.reassessment,
      remediation: values.remediation,
    }),
  });
}

function createStudyPlanningWorkflow(skills = {}) {
  const names = { ...DEFAULT_SKILLS.studyPlanning, ...skills };
  return Object.freeze({
    id: "study-planning",
    description:
      "Collect missing planning requirements or generate and track a complete study plan.",
    stopOnError: true,
    steps: Object.freeze([
      {
        id: "elicit-requirements",
        skill: names.elicit,
        saveAs: "elicitation",
        when: ({ input }) => missingStudyPlanRequirements(input).length > 0,
        input: ({ input }) => ({
          known: studyPlanRequirements(input),
          missingFields: missingStudyPlanRequirements(input),
        }),
      },
      {
        id: "learner-planning-requirements",
        pause: ({ input, values }) => {
          const missingFields = missingStudyPlanRequirements(input);
          if (missingFields.length === 0) return null;
          return {
            reason: "learner_input_required",
            requiredFields: missingFields,
            prompt:
              values.elicitation?.prompt ||
              "Ask the learner for the missing study-plan requirements.",
          };
        },
      },
      {
        id: "generate-plan",
        skill: names.generate,
        saveAs: "plan",
        input: ({ input }) => studyPlanRequirements(input),
      },
      {
        id: "track-plan",
        skill: names.track,
        saveAs: "tracking",
        input: ({ input, values }) => ({
          learnerId: input.learnerId,
          plan: values.plan,
        }),
      },
    ]),
    output: ({ values }) => ({ plan: values.plan, tracking: values.tracking }),
  });
}

const masteryWorkflow = createMasteryWorkflow();
const studyPlanningWorkflow = createStudyPlanningWorkflow();

module.exports = {
  DEFAULT_SKILLS,
  STUDY_PLAN_REQUIRED_FIELDS,
  createMasteryWorkflow,
  createStudyPlanningWorkflow,
  masteryWorkflow,
  missingStudyPlanRequirements,
  studyPlanningWorkflow,
  studyPlanRequirements,
};

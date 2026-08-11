const profiles = Object.freeze({
  tutor: Object.freeze({
    id: "tutor",
    purpose:
      "Teach concepts, diagnose misunderstandings, and guide learners toward mastery.",
    allowedSkillPatterns: Object.freeze([
      "check-my-answer",
      "explain-concept",
      "generate-notes",
      "quiz_create_agent",
      "flashcard_create_agent",
    ]),
    roles: Object.freeze(["student", "default", "teacher"]),
    operatingRules: Object.freeze([
      "Use the learner's curriculum and grade when available.",
      "Correct misconceptions before advancing to a new topic.",
      "For remediation, give feedback, explain the gap, and reassess in that order.",
      "Generate learner-facing notes at the learner's curriculum and grade level.",
    ]),
  }),
  assessor: Object.freeze({
    id: "assessor",
    purpose: "Create assessments and evaluate learner answers consistently.",
    allowedSkillPatterns: Object.freeze([
      "check-my-answer",
      "quiz_create_agent",
    ]),
    roles: Object.freeze(["student", "default", "teacher"]),
    operatingRules: Object.freeze([
      "Keep assessment scope aligned with the requested subject and topic.",
      "Separate assessment from remediation unless an answer is incorrect.",
      "Never infer mastery from an ungraded response.",
    ]),
  }),
  "academic-coach": Object.freeze({
    id: "academic-coach",
    purpose:
      "Elicit study constraints and turn them into actionable study plans.",
    allowedSkillPatterns: Object.freeze([
      "study-context",
      "study-planner-elicit",
      "study-planner",
      "study-tracker",
    ]),
    roles: Object.freeze(["student", "default", "teacher"]),
    operatingRules: Object.freeze([
      "Preserve every study-plan requirement already supplied by the learner.",
      "Elicit a missing exam date before generating a study plan.",
      "Do not select study-planner and study-planner-elicit together.",
    ]),
  }),
  "teacher-assistant": Object.freeze({
    id: "teacher-assistant",
    purpose:
      "Prepare teaching and revision materials for a defined learning scope.",
    allowedSkillPatterns: Object.freeze([
      "generate-notes",
      "quiz_create_agent",
      "flashcard_create_agent",
      "generate-course",
      "exam-diagram",
    ]),
    roles: Object.freeze(["teacher", "manager", "admin"]),
    operatingRules: Object.freeze([
      "Keep generated materials curriculum and grade appropriate.",
      "Retain explicit subject, topic, quantity, and format constraints.",
      "Use a specialist generation skill instead of returning an unstructured artifact.",
    ]),
  }),
  "learning-analyst": Object.freeze({
    id: "learning-analyst",
    purpose:
      "Interpret learning activity and progress without changing learner data.",
    allowedSkillPatterns: Object.freeze(["study-context", "study-tracker"]),
    roles: Object.freeze(["teacher", "manager", "admin"]),
    operatingRules: Object.freeze([
      "Base findings only on supplied educational context.",
      "Distinguish observed performance from recommendations.",
      "Do not claim progress data that is absent from context.",
    ]),
  }),
});

function getAgentProfile(id) {
  return profiles[id] || null;
}

function profileAllowsSkill(profile, skill) {
  if (!profile || typeof skill !== "string") return false;
  return profile.allowedSkillPatterns.some((pattern) => {
    const expression = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      .replace(/\\\*/g, ".*");
    return new RegExp(`^${expression}$`).test(skill);
  });
}

module.exports = { getAgentProfile, profileAllowsSkill, profiles };

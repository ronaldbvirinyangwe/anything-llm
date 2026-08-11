const CHECK_IDS = {
  INTENT: "intent",
  REQUIRED_SKILLS: "required-skills",
  FORBIDDEN_SKILLS: "forbidden-skills",
  ROLE: "role",
  CURRICULUM: "curriculum",
  GRADE: "grade",
};

function result(id, passed, expected, actual, message) {
  return { id, passed, expected, actual, message };
}

function evaluateEducationalDecision(fixture, decision) {
  if (!fixture || typeof fixture !== "object") {
    throw new TypeError("fixture must be an object");
  }
  if (!decision || typeof decision !== "object") {
    throw new TypeError("decision must be an object");
  }

  const expected = fixture.expected || {};
  const constraints = expected.constraints || {};
  const skills = Array.isArray(decision.skills) ? decision.skills : [];
  const requiredSkills = expected.requiredSkills || [];
  const forbiddenSkills = expected.forbiddenSkills || [];
  const checks = [];

  if (Object.hasOwn(expected, "intent")) {
    checks.push(
      result(
        CHECK_IDS.INTENT,
        decision.intent === expected.intent,
        expected.intent,
        decision.intent,
        decision.intent === expected.intent
          ? "Intent matched."
          : `Expected intent ${expected.intent}, received ${decision.intent}.`
      )
    );
  }

  if (requiredSkills.length > 0) {
    const missing = requiredSkills.filter((skill) => !skills.includes(skill));
    checks.push(
      result(
        CHECK_IDS.REQUIRED_SKILLS,
        missing.length === 0,
        requiredSkills,
        skills,
        missing.length === 0
          ? "All required skills were selected."
          : `Missing required skills: ${missing.join(", ")}.`
      )
    );
  }

  if (forbiddenSkills.length > 0) {
    const selected = forbiddenSkills.filter((skill) => skills.includes(skill));
    checks.push(
      result(
        CHECK_IDS.FORBIDDEN_SKILLS,
        selected.length === 0,
        forbiddenSkills,
        skills,
        selected.length === 0
          ? "No forbidden skills were selected."
          : `Selected forbidden skills: ${selected.join(", ")}.`
      )
    );
  }

  if (Object.hasOwn(expected, "role")) {
    checks.push(
      result(
        CHECK_IDS.ROLE,
        decision.role === expected.role,
        expected.role,
        decision.role,
        decision.role === expected.role
          ? "Role matched."
          : `Expected role ${expected.role}, received ${decision.role}.`
      )
    );
  }

  for (const field of ["curriculum", "grade"]) {
    if (!Object.hasOwn(constraints, field)) continue;
    const passed = decision[field] === constraints[field];
    checks.push(
      result(
        CHECK_IDS[field.toUpperCase()],
        passed,
        constraints[field],
        decision[field],
        passed
          ? `${field} constraint matched.`
          : `Expected ${field} ${constraints[field]}, received ${decision[field]}.`
      )
    );
  }

  for (const rubric of fixture.rubricChecks || []) {
    if (
      !rubric ||
      typeof rubric.id !== "string" ||
      typeof rubric.check !== "function"
    ) {
      throw new TypeError(
        "rubric checks require a string id and check function"
      );
    }

    let passed = false;
    let message = rubric.description || rubric.id;
    try {
      const outcome = rubric.check(decision, fixture);
      if (typeof outcome === "boolean") {
        passed = outcome;
      } else if (outcome && typeof outcome.passed === "boolean") {
        passed = outcome.passed;
        message = outcome.message || message;
      } else {
        message = "Rubric check must return a boolean or { passed, message }.";
      }
    } catch (error) {
      message = `Rubric check threw: ${error.message}`;
    }

    checks.push(result(`rubric:${rubric.id}`, passed, true, passed, message));
  }

  const passedCount = checks.filter((check) => check.passed).length;
  return {
    id: fixture.id,
    passed: passedCount === checks.length,
    score: checks.length === 0 ? 1 : passedCount / checks.length,
    summary: {
      passed: passedCount,
      failed: checks.length - passedCount,
      total: checks.length,
    },
    checks,
  };
}

function evaluateEducationalSuite(fixtures, decisionsByFixtureId) {
  if (!Array.isArray(fixtures))
    throw new TypeError("fixtures must be an array");

  const results = fixtures.map((fixture) =>
    evaluateEducationalDecision(fixture, decisionsByFixtureId[fixture.id])
  );
  return {
    passed: results.every((evaluation) => evaluation.passed),
    summary: {
      passed: results.filter((evaluation) => evaluation.passed).length,
      failed: results.filter((evaluation) => !evaluation.passed).length,
      total: results.length,
    },
    results,
  };
}

module.exports = {
  CHECK_IDS,
  evaluateEducationalDecision,
  evaluateEducationalSuite,
};

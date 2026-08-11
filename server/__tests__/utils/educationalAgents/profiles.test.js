const {
  getAgentProfile,
  profileAllowsSkill,
  profiles,
} = require("../../../utils/educationalAgents");

describe("educational agent profiles", () => {
  test("declares the five domain profiles with complete contracts", () => {
    expect(Object.keys(profiles)).toEqual([
      "tutor",
      "assessor",
      "academic-coach",
      "teacher-assistant",
      "learning-analyst",
    ]);

    for (const profile of Object.values(profiles)) {
      expect(profile).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          purpose: expect.any(String),
          allowedSkillPatterns: expect.any(Array),
          roles: expect.any(Array),
          operatingRules: expect.any(Array),
        })
      );
      expect(profile.allowedSkillPatterns.length).toBeGreaterThan(0);
      expect(profile.roles.length).toBeGreaterThan(0);
      expect(profile.operatingRules.length).toBeGreaterThan(0);
    }
  });

  test("checks skill access against profile patterns", () => {
    expect(
      profileAllowsSkill(getAgentProfile("tutor"), "explain-concept")
    ).toBe(true);
    expect(
      profileAllowsSkill(getAgentProfile("assessor"), "study-planner")
    ).toBe(false);
    expect(getAgentProfile("unknown")).toBeNull();
  });
});

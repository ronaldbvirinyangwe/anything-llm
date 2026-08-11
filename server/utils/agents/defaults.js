const AgentPlugins = require("./aibitat/plugins");
const { SystemSettings } = require("../../models/systemSettings");
const { safeJsonParse } = require("../http");
const Provider = require("./aibitat/providers/ai-provider");
const ImportedPlugin = require("./imported");
const { AgentFlows } = require("../agentFlows");
const MCPCompatibilityLayer = require("../MCP");
const { SystemPromptVariables } = require("../../models/systemPromptVariables");

// This is a list of skills that are built-in and default enabled.
const DEFAULT_SKILLS = [
  AgentPlugins.memory.name,
  AgentPlugins.docSummarizer.name,
  AgentPlugins.webScraping.name,
  AgentPlugins.generateNotes.name,
  AgentPlugins.explainConcept.name,
  AgentPlugins.checkMyAnswer.name,
  AgentPlugins.StudyPlannerElicit.name,
  AgentPlugins.StudyPlanner.name,
  AgentPlugins.StudyContext.name,
  AgentPlugins.StudyTracker.name,
  AgentPlugins.FollowUpQuestions.name,
  AgentPlugins.StudyOnboarding.name,
  AgentPlugins.ExamDiagram.name,
  AgentPlugins.GenerateCourse.name,
];

const USER_AGENT = {
  name: "USER",
  getDefinition: () => {
    return {
      interrupt: "ALWAYS",
      role: "I am the human monitor and oversee this chat. Any questions on action or decision making should be directed to me.",
    };
  },
};

function educationalRoleContext(context) {
  if (!context?.learner?.studentId) return "";

  const details = [];
  const { education, performance, session } = context;
  const academicProfile = [
    education?.academicLevel,
    education?.curriculum,
    education?.grade ? `grade ${education.grade}` : null,
  ].filter(Boolean);
  if (academicProfile.length)
    details.push(`Academic profile: ${academicProfile.join(", ")}`);

  const weakSubjects = performance?.weakSubjects
    ?.slice(0, 3)
    .map(({ subject }) => subject)
    .filter(Boolean);
  if (weakSubjects?.length)
    details.push(`Subjects needing support: ${weakSubjects.join(", ")}`);

  const studyPlan = education?.studyPlan;
  if (studyPlan?.subject) {
    const topics = studyPlan.topics?.slice(0, 5).filter(Boolean) || [];
    details.push(
      `Active study plan: ${studyPlan.subject}${
        topics.length ? ` (${topics.join(", ")})` : ""
      }`
    );
  }

  const today = session?.today
    ?.slice(0, 3)
    .map(({ topic }) => topic)
    .filter(Boolean);
  if (today?.length) details.push(`Today's study topics: ${today.join(", ")}`);
  if (!details.length) return "";

  return `\n\nEducational context (use only when relevant):\n${details
    .map((detail) => `- ${detail}`)
    .join("\n")}`;
}

function educationalPlanContext(plan) {
  if (!plan?.actionable) return "";

  const instructions = [
    `Educational specialist: ${plan.agent}`,
    `Educational intent: ${plan.intent}`,
  ];
  if (plan.skills?.length)
    instructions.push(`Preferred skills: ${plan.skills.join(", ")}`);
  if (plan.missingFields?.length)
    instructions.push(
      `Ask for these missing details before acting: ${plan.missingFields.join(", ")}`
    );
  if (plan.advanceTopic === false)
    instructions.push(
      "Do not advance topics until the learner demonstrates mastery."
    );

  return `\n\nEducational execution plan:\n${instructions
    .map((instruction) => `- ${instruction}`)
    .join("\n")}`;
}

async function mcpSkillsForContext(context) {
  const role = context?.permissions?.role;
  const learnerRole = ["student", "default"].includes(role);
  if (learnerRole && process.env.ENABLE_STUDENT_MCP !== "true") return [];
  return new MCPCompatibilityLayer().activeMCPServers();
}

const WORKSPACE_AGENT = {
  name: "@agent",
  /**
   * Get the definition for the workspace agent with its role (prompt) and functions in Aibitat format
   * @param {string} provider
   * @param {import("@prisma/client").workspaces | null} workspace
   * @param {import("@prisma/client").users | null} user
   * @param {object | null} educationalContext
   * @param {object | null} educationalPlan
   * @returns {Promise<{ role: string, functions: object[] }>}
   */
  getDefinition: async (
    provider = null,
    workspace = null,
    user = null,
    educationalContext = null,
    educationalPlan = null
  ) => {
    const role = await Provider.systemPrompt({ provider, workspace, user });
    return {
      role: `${role}${educationalRoleContext(educationalContext)}${educationalPlanContext(educationalPlan)}`,
      functions: [
        ...(await agentSkillsFromSystemSettings()),
        ...ImportedPlugin.activeImportedPlugins(),
        ...AgentFlows.activeFlowPlugins(),
        ...(await mcpSkillsForContext(educationalContext)),
      ],
    };
  },
};

/**
 * Fetches and preloads the names/identifiers for plugins that will be dynamically
 * loaded later
 * @returns {Promise<string[]>}
 */
async function agentSkillsFromSystemSettings() {
  const systemFunctions = [];

  // Load non-imported built-in skills that are configurable, but are default enabled.
  const _disabledDefaultSkills = safeJsonParse(
    await SystemSettings.getValueOrFallback(
      { label: "disabled_agent_skills" },
      "[]"
    ),
    []
  );
  DEFAULT_SKILLS.forEach((skill) => {
    if (!_disabledDefaultSkills.includes(skill))
      systemFunctions.push(AgentPlugins[skill].name);
  });

  // Load non-imported built-in skills that are configurable.
  const _setting = safeJsonParse(
    await SystemSettings.getValueOrFallback(
      { label: "default_agent_skills" },
      "[]"
    ),
    []
  );
  _setting.forEach((skillName) => {
    if (!AgentPlugins.hasOwnProperty(skillName)) return;

    // This is a plugin module with many sub-children plugins who
    // need to be named via `${parent}#${child}` naming convention
    if (Array.isArray(AgentPlugins[skillName].plugin)) {
      for (const subPlugin of AgentPlugins[skillName].plugin) {
        systemFunctions.push(
          `${AgentPlugins[skillName].name}#${subPlugin.name}`
        );
      }
      return;
    }

    // This is normal single-stage plugin
    systemFunctions.push(AgentPlugins[skillName].name);
  });
  return systemFunctions;
}

module.exports = {
  USER_AGENT,
  WORKSPACE_AGENT,
  agentSkillsFromSystemSettings,
  mcpSkillsForContext,
};

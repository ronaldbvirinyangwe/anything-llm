// server/utils/agents/aibitat/plugins/course-gen-utils.js
const { PrismaClient } = require("@prisma/client");
const { getVectorDbClass } = require("../../../helpers"); // confirm this path/name against your repo

const prisma = new PrismaClient();

async function getOrCreateCourseWorkspace({ subject, curriculum, academicLevel, grade }) {
  const slug = `${curriculum}-${grade}-${subject}`.toLowerCase().replace(/\s+/g, "-");
  let workspace = await prisma.workspaces.findUnique({ where: { slug } });
  if (!workspace) {
    workspace = await prisma.workspaces.create({ data: { name: `${curriculum} ${grade} — ${subject}`, slug } });
  }
  return workspace;
}

async function retrieveSyllabusContext(workspace, query, topN = 6) {
  if (!workspace.vectorTag) return "";
  try {
    const VectorDb = getVectorDbClass();
    const results = await VectorDb.performSimilaritySearch({
      namespace: workspace.slug,
      input: query,
      LLMConnector: workspace.chatProvider,
      similarityThreshold: workspace.similarityThreshold ?? 0.25,
      topN: workspace.topN ?? topN,
    });
    return results?.contextTexts?.join("\n\n") || "";
  } catch (e) {
    return "";
  }
}

module.exports = { getOrCreateCourseWorkspace, retrieveSyllabusContext };
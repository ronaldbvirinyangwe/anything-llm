// server/utils/agents/aibitat/plugins/course-gen-core.js
const { PrismaClient } = require("@prisma/client");
const Provider = require("../providers/ai-provider");
const { HumanMessage, SystemMessage } = require("@langchain/core/messages");
const {
  getOrCreateCourseWorkspace,
  retrieveSyllabusContext,
} = require("./course-gen-utils");
const { getBaseLLMProviderModel } = require("../../../helpers");
const prisma = new PrismaClient();
const { jsonrepair } = require("jsonrepair");

async function getStudentProfile(userId) {
  if (!userId) return null;
  try {
    return await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
  } catch (e) {
    return null;
  }
}

function buildPlannerPrompt({ subject, student, syllabusContext }) {
  return [
    `You are a curriculum planner for the ${student.curriculum} ${student.grade} ${subject} syllabus.`,
    syllabusContext
      ? `Use these official syllabus excerpts as your primary source of truth — do not invent topics that contradict them:\n\n${syllabusContext}`
      : `No official syllabus document is on file yet — use your general knowledge of the ${student.curriculum} ${student.grade} ${subject} curriculum, and note in module 1's title that this is unverified against the official syllabus.`,
    "",
    "Break the subject into 3-6 modules in a sensible learning order.",
    "Respond ONLY with JSON, no preamble, no markdown fences, in this exact shape:",
    `{"modules":[{"position":1,"title":"..."}]}`,
  ].join("\n");
}

function buildLessonPrompt({ subject, student, moduleTitle, syllabusContext }) {
  return [
    `You are a lesson writer for ${student.curriculum} ${student.grade} ${subject}.`,
    `Write the lessons for the module: "${moduleTitle}".`,
    syllabusContext ? `Relevant syllabus excerpts:\n\n${syllabusContext}` : "",
    "",
    "Write 2-4 lessons. Each lesson needs a title, an estimated duration in minutes, and markdown content " +
      "(use ## headings, **bold** for key terms, > blockquotes for definitions, no tables).",
    "Pitch the content exactly to this student's level — vocabulary and prior knowledge for a " +
      `${student.grade} ${student.curriculum} student aged ${student.age}.`,
    'IMPORTANT: contentMd must be valid JSON string content — escape all newlines as \\n and all double quotes as \\". Do not include raw line breaks inside the string.',
    "Respond ONLY with JSON, no preamble, no markdown fences, in this exact shape:",
    `{"lessons":[{"position":1,"title":"...","durationMin":45,"contentMd":"..."}]}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildAssignmentPrompt({ subject, student, moduleTitle }) {
  return [
    `You design one practical assignment for the module "${moduleTitle}" in ${student.curriculum} ${student.grade} ${subject}.`,
    "The assignment should require the student to apply what they learned, not just recall it.",
    'IMPORTANT: escape all newlines as \\n and all double quotes as \\" inside string values. Do not include raw line breaks inside any string.',
    "Respond ONLY with JSON, no preamble, no markdown fences, in this exact shape:",
    `{"title":"...","description":"...","steps":["..."],"etaHours":"2-3h"}`,
  ].join("\n");
}

/**
 * Resolves the instance-wide default LLM provider/model from env vars —
 * the same source of truth SystemSettings.currentSettings() uses for
 * LLMProvider / LLMModel. There is no system_settings DB row for these;
 * they are derived at read-time, so we derive them the same way here.
 */
async function resolveDefaultLLM() {
  const provider = process.env.LLM_PROVIDER || null;
  const model = getBaseLLMProviderModel({ provider }) || null;
  return { provider, model };
}

/**
 * Strips code fences and extracts the outermost {...} block in case of
 * stray pre/post text the model adds outside the JSON object.
 */
function sanitizeJsonText(raw) {
  let cleaned = raw.replace(/```json|```/g, "").trim();
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

async function callJsonLLM({
  provider,
  model,
  systemPrompt,
  userPrompt,
  signal,
}) {
  if (!model)
    throw new Error(
      `callJsonLLM: no model provided for provider "${provider}"`
    );

  const llm = Provider.LangChainChatModel(provider, {
    temperature: 0.4,
    model,
    maxTokens: 8192,
  });

  const result = await llm.invoke(
    [new SystemMessage(systemPrompt), new HumanMessage(userPrompt)],
    { signal }
  );

  const text =
    typeof result?.content === "string"
      ? result.content
      : Array.isArray(result?.content)
        ? result.content.map((c) => c?.text ?? "").join("")
        : "";

  if (!text) {
    console.error(
      `callJsonLLM: empty text from ${provider}/${model}. Raw:`,
      JSON.stringify(result, null, 2)
    );
    throw new Error(`callJsonLLM: empty response from ${provider}/${model}`);
  }

  const finishReason =
    result?.response_metadata?.finish_reason ||
    result?.response_metadata?.finishReason ||
    null;

  if (finishReason === "length" || finishReason === "max_tokens") {
    console.error(
      `callJsonLLM: response truncated by token limit. Length: ${text.length} chars.`
    );
    throw new Error(
      `callJsonLLM: ${provider}/${model} response was truncated (hit token limit) before completing valid JSON. ` +
        `Raise maxTokens or shorten the requested content.`
    );
  }

  const cleaned = sanitizeJsonText(text);

  try {
    const repaired = jsonrepair(cleaned);
    const parsed = JSON.parse(repaired);
    return parsed;
  } catch (repairError) {
    const match = repairError.message.match(/position (\d+)/);
    const pos = match ? Number(match[1]) : null;

    if (pos !== null) {
      const start = Math.max(0, pos - 40);
      const end = Math.min(cleaned.length, pos + 40);
      const window = cleaned.slice(start, end);
      const charCodes = [...window]
        .map((c) => `${c === "\n" ? "\\n" : c}(${c.charCodeAt(0)})`)
        .join(" ");
      console.error(
        `callJsonLLM: JSON parse failed at position ${pos} and repair also failed.\n` +
          `Context: ...${window}...\n` +
          `Char codes: ${charCodes}`
      );
    } else {
      console.error(
        `callJsonLLM: JSON parse failed. Full raw text (${cleaned.length} chars):\n${cleaned}`
      );
    }

    throw new Error(
      `callJsonLLM: failed to parse JSON from ${provider}/${model} response: ${cleaned.slice(0, 200)}`
    );
  }
}

/**
 * Plans the course shape only — module titles, no content yet.
 */
async function planCourse({ subject, student, workspace, llmArgs }) {
  const syllabusContext = await retrieveSyllabusContext(
    workspace,
    `${subject} ${student.grade} ${student.curriculum} syllabus topics`
  );
  const plan = await callJsonLLM({
    ...llmArgs,
    systemPrompt: buildPlannerPrompt({ subject, student, syllabusContext }),
    userPrompt: `Plan the ${subject} course now.`,
  });
  return { plan, syllabusContext };
}

/**
 * Generates lessons + assignment for ONE already-created module row.
 * Used both by initial generation (module 1) and by read-ahead (module N+1).
 */
async function generateModuleContent({
  dbModule,
  student,
  subject,
  workspace,
  llmArgs,
  onProgress = () => {},
}) {
  await prisma.course_modules.update({
    where: { id: dbModule.id },
    data: { status: "generating" },
  });

  try {
    const moduleContext = await retrieveSyllabusContext(
      workspace,
      dbModule.title
    );

    const lessonData = await callJsonLLM({
      ...llmArgs,
      systemPrompt: buildLessonPrompt({
        subject,
        student,
        moduleTitle: dbModule.title,
        syllabusContext: moduleContext,
      }),
      userPrompt: `Write the lessons for "${dbModule.title}" now.`,
    });
    for (const l of lessonData.lessons) {
      await prisma.course_lessons.create({
        data: {
          moduleId: dbModule.id,
          position: l.position,
          title: l.title,
          durationMin: l.durationMin,
          contentMd: l.contentMd,
        },
      });
    }

    const assignmentData = await callJsonLLM({
      ...llmArgs,
      systemPrompt: buildAssignmentPrompt({
        subject,
        student,
        moduleTitle: dbModule.title,
      }),
      userPrompt: `Design the assignment for "${dbModule.title}" now.`,
    });
    await prisma.course_assignments.create({
      data: {
        moduleId: dbModule.id,
        title: assignmentData.title,
        description: assignmentData.description,
        stepsJson: assignmentData.steps,
        etaHours: assignmentData.etaHours,
      },
    });

    await prisma.course_modules.update({
      where: { id: dbModule.id },
      data: { status: "ready" },
    });
    onProgress(
      `Built "${dbModule.title}" (${lessonData.lessons.length} lessons + 1 assignment).`
    );
    return { lessonsCount: lessonData.lessons.length };
  } catch (error) {
    await prisma.course_modules
      .update({ where: { id: dbModule.id }, data: { status: "failed" } })
      .catch(() => {});
    throw error;
  }
}

/**
 * Resolves the LLM provider/model for a course's workspace, falling back to
 * instance defaults. Shared by initial generation and read-ahead generation
 * so they can never resolve to two different providers/models.
 */
async function resolveCourseLLM({ workspace, provider, model }) {
  const defaults = await resolveDefaultLLM();
  const llmProvider =
    provider ||
    workspace.agentProvider ||
    workspace.chatProvider ||
    defaults.provider;
  const llmModel =
    model || workspace.agentModel || workspace.chatModel || defaults.model;
  if (!llmProvider || !llmModel) {
    throw new Error(
      `resolveCourseLLM: could not resolve an LLM provider/model (provider=${llmProvider}, model=${llmModel}). ` +
        `Check workspace settings or LLM_PROVIDER env configuration.`
    );
  }
  return { llmProvider, llmModel };
}

/**
 * The actual generation pipeline. No `this`, no aibitat dependency.
 * Callable from anywhere: the plugin, an Express route, a cron job, a test.
 *
 * Plans the full course shape up front (all modules as placeholder rows,
 * status "not_started"), but only generates content for module 1. Later
 * modules are generated on demand via generateNextModule (read-ahead).
 *
 * @param {object} opts
 * @param {number} opts.userId
 * @param {string} opts.subject
 * @param {string} [opts.provider]   defaults if not running inside aibitat
 * @param {string} [opts.model]
 * @param {AbortSignal} [opts.signal]
 * @param {(msg: string) => void} [opts.onProgress]  optional progress callback
 */
async function runCourseGeneration({
  userId,
  subject,
  provider,
  model,
  signal,
  onProgress = () => {},
}) {
  const student = await getStudentProfile(userId);
  if (!student) throw new Error("No student profile found for this user.");

  onProgress(
    `Generating ${subject} for ${student.name} — ${student.grade}, ${student.curriculum}.`
  );

  let course = await prisma.courses.findFirst({
    where: {
      subject,
      curriculum: student.curriculum,
      academicLevel: student.academicLevel,
      grade: student.grade,
    },
  });

  if (course && course.status === "ready") {
    await prisma.student_courses.upsert({
      where: {
        studentId_courseId: { studentId: student.id, courseId: course.id },
      },
      create: { studentId: student.id, courseId: course.id },
      update: {},
    });
    return { course, alreadyExisted: true };
  }

  const workspace = await getOrCreateCourseWorkspace({
    subject,
    curriculum: student.curriculum,
    academicLevel: student.academicLevel,
    grade: student.grade,
  });

  const { llmProvider, llmModel } = await resolveCourseLLM({
    workspace,
    provider,
    model,
  });

  course = await prisma.courses.upsert({
    where: {
      subject_curriculum_academicLevel_grade: {
        subject,
        curriculum: student.curriculum,
        academicLevel: student.academicLevel,
        grade: student.grade,
      },
    },
    create: {
      subject,
      curriculum: student.curriculum,
      academicLevel: student.academicLevel,
      grade: student.grade,
      status: "generating",
      workspaceId: workspace.id,
    },
    update: { status: "generating" },
  });

  try {
    const llmArgs = { provider: llmProvider, model: llmModel, signal };
    const { plan, syllabusContext } = await planCourse({
      subject,
      student,
      workspace,
      llmArgs,
    });
    onProgress(`Planned ${plan.modules.length} modules.`);

    // Create ALL module placeholders up front, not_started.
    const dbModules = [];
    for (const m of plan.modules) {
      const dbModule = await prisma.course_modules.create({
        data: {
          courseId: course.id,
          position: m.position,
          title: m.title,
          status: "not_started",
        },
      });
      dbModules.push(dbModule);
    }

    // Only build module 1 now. The rest stay not_started until triggered
    // by read-ahead generation (generateNextModule).
    await generateModuleContent({
      dbModule: dbModules[0],
      student,
      subject,
      workspace,
      llmArgs,
      onProgress,
    });

    course = await prisma.courses.update({
      where: { id: course.id },
      data: { status: syllabusContext ? "ready" : "ready_unverified" },
    });

    await prisma.student_courses.upsert({
      where: {
        studentId_courseId: { studentId: student.id, courseId: course.id },
      },
      create: { studentId: student.id, courseId: course.id },
      update: {},
    });

    return { course, alreadyExisted: false };
  } catch (error) {
    await prisma.courses
      .update({ where: { id: course.id }, data: { status: "failed" } })
      .catch(() => {});
    throw error;
  }
}

/**
 * Generates the next not_started module for a course the student is already
 * enrolled in. Idempotent — no-ops if there is no pending module (e.g. it's
 * already generating, ready, or all modules are done).
 *
 * @param {object} opts
 * @param {number} opts.userId
 * @param {number} opts.courseId
 * @param {(msg: string) => void} [opts.onProgress]
 */
async function generateNextModule({ userId, courseId, onProgress = () => {} }) {
  const student = await getStudentProfile(userId);
  if (!student) throw new Error("No student profile found for this user.");

  const course = await prisma.courses.findUnique({ where: { id: courseId } });
  if (!course) throw new Error("Course not found");

  const nextModule = await prisma.course_modules.findFirst({
    where: { courseId, status: "not_started" },
    orderBy: { position: "asc" },
  });
  if (!nextModule) return { skipped: true, reason: "no_pending_module" };

  const workspace = await getOrCreateCourseWorkspace({
    subject: course.subject,
    curriculum: course.curriculum,
    academicLevel: course.academicLevel,
    grade: course.grade,
  });

  const { llmProvider, llmModel } = await resolveCourseLLM({ workspace });
  const llmArgs = { provider: llmProvider, model: llmModel };

  await generateModuleContent({
    dbModule: nextModule,
    student,
    subject: course.subject,
    workspace,
    llmArgs,
    onProgress,
  });

  return { skipped: false, module: nextModule };
}

module.exports = {
  callJsonLLM,
  runCourseGeneration,
  generateModuleContent,
  generateNextModule,
  getStudentProfile,
  resolveDefaultLLM,
};

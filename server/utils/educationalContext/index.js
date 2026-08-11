const prisma = require("../prisma");

const QUIZ_LIMIT = 20;
const WEAK_SUBJECT_THRESHOLD = 60;

function emptyContext(workspaceId = null) {
  return {
    learner: {
      userId: null,
      studentId: null,
      username: null,
      name: null,
      age: null,
    },
    education: {
      academicLevel: null,
      curriculum: null,
      grade: null,
      studyPlan: null,
    },
    performance: {
      quizAttempts: 0,
      averageScore: null,
      weakSubjects: [],
      weakAreas: [],
      recentQuizzes: [],
    },
    session: {
      workspaceId,
      activeStudyPlanId: null,
      today: [],
      upcoming: [],
      completed: [],
      missed: [],
      lastActiveAt: null,
    },
    permissions: {
      role: null,
      isAuthenticated: false,
      isSuspended: false,
      canLearn: false,
      canTeach: false,
      canManageEducation: false,
    },
  };
}

function positiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function isoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function planSessions(plan) {
  if (!plan?.sessions) return [];
  if (Array.isArray(plan.sessions)) return plan.sessions;
  if (typeof plan.sessions !== "string") return [];

  try {
    const sessions = JSON.parse(plan.sessions);
    return Array.isArray(sessions) ? sessions : [];
  } catch {
    return [];
  }
}

function normalizedSession(session) {
  return {
    date: typeof session?.date === "string" ? session.date : null,
    topic: typeof session?.topic === "string" ? session.topic : null,
    status: typeof session?.status === "string" ? session.status : null,
    completedAt: isoDate(session?.completed_at ?? session?.completedAt),
    rescheduledTo:
      typeof (session?.rescheduled_to ?? session?.rescheduledTo) === "string"
        ? session.rescheduled_to ?? session.rescheduledTo
        : null,
  };
}

function average(values) {
  if (!values.length) return null;
  return (
    Math.round(
      (values.reduce((sum, value) => sum + Number(value), 0) / values.length) *
        10
    ) / 10
  );
}

function buildPerformance(results, weakAreas = []) {
  const subjectScores = new Map();

  for (const result of results) {
    const subject = result.subject || "General";
    if (!subjectScores.has(subject)) subjectScores.set(subject, []);
    subjectScores.get(subject).push(result.score);
  }

  const weakSubjects = [...subjectScores.entries()]
    .map(([subject, scores]) => ({
      subject,
      averageScore: average(scores),
      attempts: scores.length,
    }))
    .filter(({ averageScore }) => averageScore < WEAK_SUBJECT_THRESHOLD)
    .sort(
      (a, b) =>
        a.averageScore - b.averageScore || a.subject.localeCompare(b.subject)
    );

  return {
    quizAttempts: results.length,
    averageScore: average(results.map(({ score }) => score)),
    weakSubjects,
    weakAreas: weakAreas.map((area) => ({
      id: area.id,
      subject: area.subject,
      question: area.question,
      correctAnswer: area.correctAnswer,
      explanation: area.explanation ?? null,
      timesWrong: area.timesWrong,
      lastWrongAt: isoDate(area.lastWrongAt),
    })),
    recentQuizzes: results.map((result) => ({
      subject: result.subject || "General",
      score: Number(result.score),
      totalQuestions: result.total_questions,
      correctAnswers: result.correct_answers,
      submittedAt: isoDate(result.submitted_at),
      quizCode: result.quiz_code ?? null,
    })),
  };
}

function buildPermissions(user) {
  const role = user?.role ?? null;
  const isAuthenticated = Boolean(user);
  const isSuspended = Boolean(user?.suspended);
  const enabled = isAuthenticated && !isSuspended;

  return {
    role,
    isAuthenticated,
    isSuspended,
    canLearn: enabled && ["student", "default"].includes(role),
    canTeach: enabled && ["teacher", "manager", "admin"].includes(role),
    canManageEducation: enabled && ["manager", "admin"].includes(role),
  };
}

class EducationalContextBuilder {
  constructor({ prismaClient = prisma, now = () => new Date() } = {}) {
    this.prisma = prismaClient;
    this.now = now;
  }

  async build({ userId, workspaceId = null } = {}) {
    const normalizedUserId = positiveInteger(userId);
    const normalizedWorkspaceId = positiveInteger(workspaceId);
    const context = emptyContext(normalizedWorkspaceId);
    if (!normalizedUserId) return context;

    const user = await this.#safeQuery(() =>
      this.prisma.users.findUnique({
        where: { id: normalizedUserId },
        select: {
          id: true,
          username: true,
          role: true,
          suspended: true,
        },
      })
    );
    if (!user) return context;

    const [student, quizResults, weakAreas, studyPlan] = await Promise.all([
      this.#safeQuery(() =>
        this.prisma.students.findFirst({
          where: { user_id: normalizedUserId },
          select: {
            id: true,
            name: true,
            age: true,
            academicLevel: true,
            curriculum: true,
            grade: true,
          },
        })
      ),
      this.#safeQuery(
        () =>
          this.prisma.quiz_results.findMany({
            where: { user_id: normalizedUserId },
            orderBy: { submitted_at: "desc" },
            take: QUIZ_LIMIT,
            select: {
              subject: true,
              score: true,
              total_questions: true,
              correct_answers: true,
              submitted_at: true,
              quiz_code: true,
            },
          }),
        []
      ),
      this.#safeQuery(
        () =>
          this.prisma.weakAreaCard.findMany({
            where: { userId: normalizedUserId, resolved: false },
            orderBy: [{ timesWrong: "desc" }, { lastWrongAt: "desc" }],
            take: 20,
            select: {
              id: true,
              subject: true,
              question: true,
              correctAnswer: true,
              explanation: true,
              timesWrong: true,
              lastWrongAt: true,
            },
          }),
        []
      ),
      this.#safeQuery(() =>
        this.prisma.study_plans.findFirst({
          where: {
            user_id: normalizedUserId,
            ...(normalizedWorkspaceId
              ? { workspace_id: normalizedWorkspaceId }
              : {}),
            status: "active",
            exam_date: { gte: this.now() },
          },
          orderBy: { created_at: "desc" },
        })
      ),
    ]);

    const sessions = planSessions(studyPlan).map(normalizedSession);
    const today = this.now().toISOString().slice(0, 10);

    context.learner = {
      userId: user.id,
      studentId: student?.id ?? null,
      username: user.username ?? null,
      name: student?.name ?? user.username ?? null,
      age: student?.age ?? null,
    };
    context.education = {
      academicLevel: student?.academicLevel ?? null,
      curriculum: student?.curriculum ?? null,
      grade: student?.grade ?? null,
      studyPlan: studyPlan
        ? {
            id: studyPlan.id,
            subject: studyPlan.subject ?? null,
            examDate: isoDate(studyPlan.exam_date),
            topics: Array.isArray(studyPlan.topics) ? studyPlan.topics : [],
            studyHours: studyPlan.study_hours ?? null,
            daysOff: Array.isArray(studyPlan.days_off)
              ? studyPlan.days_off
              : [],
            status: studyPlan.status ?? null,
          }
        : null,
    };
    context.performance = buildPerformance(quizResults, weakAreas);
    context.session = {
      workspaceId: normalizedWorkspaceId,
      activeStudyPlanId: studyPlan?.id ?? null,
      today: sessions.filter(
        (session) => session.date === today && session.status === "pending"
      ),
      upcoming: sessions.filter(
        (session) => session.date > today && session.status === "pending"
      ),
      completed: sessions.filter((session) => session.status === "complete"),
      missed: sessions.filter((session) =>
        ["missed", "rescheduled"].includes(session.status)
      ),
      lastActiveAt: isoDate(studyPlan?.last_active),
    };
    context.permissions = buildPermissions(user);

    return context;
  }

  async #safeQuery(query, fallback = null) {
    try {
      return (await query()) ?? fallback;
    } catch {
      return fallback;
    }
  }
}

async function buildEducationalContext(options) {
  return new EducationalContextBuilder().build(options);
}

module.exports = {
  EducationalContextBuilder,
  buildEducationalContext,
};

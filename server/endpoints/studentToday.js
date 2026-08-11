const express = require("express");
const prisma = require("../utils/prisma");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");

const router = express.Router();

router.use(validatedRequest, flexUserRoleValid([ROLES.student]));

function displayStatus(submission, assignment, now) {
  if (submission.status === "excused") return "excused";
  if (submission.status === "needs_revision") return "needs_revision";
  const late = Boolean(
    assignment.dueAt &&
      submission.submittedAt &&
      submission.submittedAt > assignment.dueAt
  );
  if (submission.gradedAt) return late ? "graded_late" : "graded";
  if (submission.submittedAt) return late ? "late" : "submitted";
  if (assignment.dueAt && assignment.dueAt < now) return "missing";
  return "assigned";
}

function localDate(now, timezoneOffset) {
  return new Date(now.getTime() - timezoneOffset * 60_000)
    .toISOString()
    .slice(0, 10);
}

function average(values) {
  if (!values.length) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

function assignmentPriority(item, now, endOfToday, inFortyEightHours) {
  if (item.status === "needs_revision") return 1;
  if (item.status === "missing") return 2;
  if (item.status === "assigned" && item.dueAt && item.dueAt <= endOfToday)
    return 3;
  if (
    item.status === "assigned" &&
    item.dueAt &&
    item.dueAt <= inFortyEightHours
  )
    return 4;
  if (item.status === "assigned") return 5;
  return item.feedback ? 6 : 7;
}

router.get("/today", async (request, response) => {
  try {
    const userId = Number(response.locals.user?.id);
    const rawOffset = Number(request.query.timezoneOffset || 0);
    const timezoneOffset = Math.min(840, Math.max(-840, rawOffset || 0));
    const now = new Date();
    const date = localDate(now, timezoneOffset);
    const localMidnightUtc = new Date(`${date}T00:00:00.000Z`);
    const endOfToday = new Date(
      localMidnightUtc.getTime() + timezoneOffset * 60_000 + 86_400_000 - 1
    );
    const inFortyEightHours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const student = await prisma.students.findUnique({
      where: { user_id: userId },
    });
    if (!student)
      return response.status(404).json({ error: "Student profile not found" });

    const [
      submissions,
      enrolments,
      results,
      plan,
      weakAreas,
      notifications,
      reviewDue,
    ] =
      await Promise.all([
        prisma.student_assignment_submissions.findMany({
          where: {
            studentId: student.id,
            assignment: { status: "published", teacherId: { not: null } },
          },
          include: { assignment: { include: { teacher: true } } },
          orderBy: [{ assignedAt: "asc" }, { id: "asc" }],
        }),
        prisma.student_courses.findMany({
          where: {
            studentId: student.id,
            course: {
              curriculum: student.curriculum,
              grade: student.grade,
            },
          },
          include: {
            course: {
              include: {
                modules: {
                  orderBy: [{ position: "asc" }, { id: "asc" }],
                  include: {
                    lessons: {
                      orderBy: [{ position: "asc" }, { id: "asc" }],
                      include: {
                        progress: { where: { studentId: student.id } },
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [{ enrolledAt: "asc" }, { id: "asc" }],
        }),
        prisma.quiz_results.findMany({
          where: { user_id: userId },
          select: {
            subject: true,
            topic: true,
            score: true,
            submitted_at: true,
            shared_quiz: { select: { topic: true } },
          },
          orderBy: [{ submitted_at: "desc" }, { id: "desc" }],
        }),
        prisma.study_plans.findFirst({
          where: {
            user_id: userId,
            status: "active",
            OR: [{ exam_date: null }, { exam_date: { gte: localMidnightUtc } }],
          },
          orderBy: [{ created_at: "desc" }, { id: "desc" }],
        }),
        prisma.weakAreaCard.findMany({
          where: { userId, resolved: false },
          orderBy: [
            { timesWrong: "desc" },
            { lastWrongAt: "desc" },
            { firstFlaggedAt: "asc" },
            { id: "asc" },
          ],
          take: 5,
        }),
        prisma.notifications.findMany({
          where: { userId, read: false },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 5,
        }),
        prisma.review_items.count({
          where: {
            userId,
            status: "active",
            dueOn: { lte: localMidnightUtc },
          },
        }),
      ]);

    const allAssignments = submissions
      .map((submission) => {
        const assignment = submission.assignment;
        return {
          id: assignment.id,
          title: assignment.title,
          subject: assignment.subject || "General",
          teacherName: assignment.teacher?.name || "Teacher",
          assignmentType: assignment.assignmentType,
          dueAt: assignment.dueAt,
          status: displayStatus(submission, assignment, now),
          maxPoints: assignment.maxPoints,
          scorePoints: submission.scorePoints,
          feedback: submission.feedback,
          gradedAt: submission.gradedAt,
          assignedAt: submission.assignedAt,
          link: `/student/assignments?focus=${assignment.id}`,
        };
      })
      .sort((left, right) => {
        const priority =
          assignmentPriority(left, now, endOfToday, inFortyEightHours) -
          assignmentPriority(right, now, endOfToday, inFortyEightHours);
        if (priority) return priority;
        const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Infinity;
        const rightDue = right.dueAt
          ? new Date(right.dueAt).getTime()
          : Infinity;
        return leftDue - rightDue || left.id - right.id;
      });
    const assignments = allAssignments.slice(0, 6);

    let nextLesson = null;
    for (const enrolment of enrolments) {
      for (const module of enrolment.course.modules) {
        const lesson = module.lessons.find(
          (candidate) => !candidate.progress.some((progress) => progress.done)
        );
        if (!lesson) continue;
        nextLesson = {
          courseId: enrolment.course.id,
          subject: enrolment.course.subject,
          moduleId: module.id,
          moduleTitle: module.title,
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          durationMin: lesson.durationMin,
          link: `/courses?course=${enrolment.course.id}&lesson=${lesson.id}`,
        };
        break;
      }
      if (nextLesson) break;
    }

    const topicEvidence = new Map();
    for (const result of results) {
      const subject = result.subject?.trim() || "General";
      const title =
        result.topic?.trim() || result.shared_quiz?.topic?.trim() || subject;
      const key = `${subject.toLowerCase()}::${title.toLowerCase()}`;
      if (!topicEvidence.has(key))
        topicEvidence.set(key, {
          subject,
          title,
          scores: [],
          lastAssessedAt: null,
        });
      const topic = topicEvidence.get(key);
      topic.scores.push(Number(result.score) || 0);
      if (!topic.lastAssessedAt) topic.lastAssessedAt = result.submitted_at;
    }
    const masteryRecommendation =
      [...topicEvidence.values()]
        .map((topic) => ({
          subject: topic.subject,
          title: topic.title,
          masteryPercent: average(topic.scores),
          assessmentCount: topic.scores.length,
          lastAssessedAt: topic.lastAssessedAt,
          status:
            average(topic.scores) >= 80 && topic.scores.length >= 2
              ? "mastered"
              : average(topic.scores) >= 60
                ? "proficient"
                : "developing",
          link: `/student/mastery?subject=${encodeURIComponent(topic.subject)}&topic=${encodeURIComponent(topic.title)}`,
        }))
        .filter((topic) => topic.status !== "mastered")
        .sort(
          (left, right) =>
            left.masteryPercent - right.masteryPercent ||
            new Date(left.lastAssessedAt) - new Date(right.lastAssessedAt) ||
            left.subject.localeCompare(right.subject) ||
            left.title.localeCompare(right.title)
        )[0] || null;

    const sessions = Array.isArray(plan?.sessions) ? plan.sessions : [];
    const todaySessions = sessions
      .filter(
        (session) => session?.date === date && session.status === "pending"
      )
      .map((session) => ({
        date: session.date,
        topic: session.topic || "Study session",
        status: session.status,
      }));
    const workspace = plan
      ? await prisma.workspaces.findUnique({
          where: { id: plan.workspace_id },
          select: { slug: true },
        })
      : null;
    const studyPlan = plan
      ? {
          id: plan.id,
          subject: plan.subject || "Study plan",
          examDate: plan.exam_date,
          studyHours: plan.study_hours,
          activeSession: todaySessions[0] || null,
          todaySessions,
          link: workspace ? `/workspace/${workspace.slug}` : "/",
        }
      : null;

    const actionAssignment = allAssignments.find((assignment) =>
      ["needs_revision", "missing", "assigned"].includes(assignment.status)
    );
    const primaryAction = actionAssignment
      ? {
          kind: "assignment",
          reason: actionAssignment.status,
          title: actionAssignment.title,
          eyebrow: actionAssignment.subject,
          detail:
            actionAssignment.status === "needs_revision"
              ? "Your teacher left feedback. Make the changes and resubmit."
              : actionAssignment.status === "missing"
                ? "This assignment is overdue. Submit it as soon as you can."
                : "Keep your work moving before the due date.",
          link: actionAssignment.link,
        }
      : reviewDue > 0
        ? {
            kind: "review",
            reason: "due_review",
            title: `${reviewDue} memory review${reviewDue === 1 ? "" : "s"} ready`,
            eyebrow: "Mastery recovery",
            detail: "A short delayed review will strengthen what you learned.",
            link: "/student/review",
          }
        : studyPlan?.activeSession
        ? {
            kind: "study_plan",
            reason: "scheduled_today",
            title: studyPlan.activeSession.topic,
            eyebrow: studyPlan.subject,
            detail: "This session is scheduled for today.",
            link: studyPlan.link,
          }
        : weakAreas[0]
          ? {
              kind: "weak_area",
              reason: "repeated_error",
              title: weakAreas[0].question,
              eyebrow: weakAreas[0].subject,
              detail: `You have missed this ${weakAreas[0].timesWrong} time${weakAreas[0].timesWrong === 1 ? "" : "s"}. Review the explanation and try again.`,
              link: "/student/results",
            }
          : masteryRecommendation
            ? {
                kind: "mastery",
                reason: "lowest_mastery",
                title: masteryRecommendation.title,
                eyebrow: masteryRecommendation.subject,
                detail: `Current assessed mastery is ${masteryRecommendation.masteryPercent}%.`,
                link: masteryRecommendation.link,
              }
            : nextLesson
              ? {
                  kind: "lesson",
                  reason: "continue_course",
                  title: nextLesson.lessonTitle,
                  eyebrow: nextLesson.subject,
                  detail: `Continue ${nextLesson.moduleTitle}.`,
                  link: nextLesson.link,
                }
              : null;

    return response.json({
      success: true,
      generatedAt: now,
      date,
      student: {
        id: student.id,
        name: student.name,
        curriculum: student.curriculum,
        academicLevel: student.academicLevel,
        grade: student.grade,
      },
      summary: {
        openAssignments: allAssignments.filter((assignment) =>
          ["needs_revision", "missing", "assigned"].includes(assignment.status)
        ).length,
        dueToday: allAssignments.filter(
          (assignment) =>
            assignment.status === "assigned" &&
            assignment.dueAt &&
            new Date(assignment.dueAt) <= endOfToday
        ).length,
        unreadNotifications: notifications.length,
        weakAreas: weakAreas.length,
        reviewDue,
      },
      primaryAction,
      assignments,
      studyPlan,
      weakAreas: weakAreas.map((area) => ({
        id: area.id,
        subject: area.subject,
        question: area.question,
        correctAnswer: area.correctAnswer,
        explanation: area.explanation,
        timesWrong: area.timesWrong,
        lastWrongAt: area.lastWrongAt,
      })),
      masteryRecommendation,
      nextLesson,
      unreadNotifications: notifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
      })),
    });
  } catch (error) {
    console.error("Student Today error:", error);
    return response
      .status(500)
      .json({ error: "Unable to load today overview" });
  }
});

module.exports = router;

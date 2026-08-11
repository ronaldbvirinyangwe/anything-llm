const express = require("express");
const router = express.Router();
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { PrismaClient } = require("@prisma/client");
const {
  runCourseGeneration,
} = require("../utils/agents/aibitat/plugins/course-gen-core");
const { getSubjectsFor } = require("../utils/subjects/catalog");

const prisma = new PrismaClient();

router.use(validatedRequest, flexUserRoleValid([ROLES.student]));

// ── In-memory progress store, keyed by `${userId}:${subject}` ──────────
// NOTE: this resets if the server restarts, and only works for a single
// server instance. Fine for now — move to Redis/DB if you scale out.
const courseGenState = new Map();
const STAGES = ["planner", "writer", "assignments", "review"];

function clientOperationId(req) {
  const value = String(req.get("Idempotency-Key") || "").trim();
  return value && value.length <= 100 ? value : null;
}

function stateKey(userId, subject) {
  return `${userId}:${subject}`;
}
function setState(userId, subject, patch) {
  const key = stateKey(userId, subject);
  const prev = courseGenState.get(key) || {};
  courseGenState.set(key, { ...prev, ...patch, updatedAt: Date.now() });
}

function average(values) {
  if (!values.length) return null;
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

function masteryStatus(score, assessmentCount) {
  if (score === null || assessmentCount === 0) return "not_assessed";
  if (score >= 80 && assessmentCount >= 2) return "mastered";
  if (score >= 60) return "proficient";
  return "developing";
}

// ── GET /subjects — subjects available for the logged-in student ───────
router.get("/subjects", [validatedRequest], async (req, res) => {
  try {
    const userId = res.locals.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const student = await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, error: "Student profile not found" });
    }

    const subjects = getSubjectsFor(student.curriculum, student.grade);
    res.json({ success: true, subjects });
  } catch (err) {
    console.error("Error fetching subjects:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

router.get("/mastery", [validatedRequest], async (req, res) => {
  try {
    const userId = Number(res.locals.user?.id);
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const student = await prisma.students.findFirst({
      where: { user_id: userId },
      select: {
        id: true,
        curriculum: true,
        academicLevel: true,
        grade: true,
      },
    });
    if (!student)
      return res
        .status(404)
        .json({ success: false, error: "Student profile not found" });

    const [results, enrolments, recoveryItems] = await Promise.all([
      prisma.quiz_results.findMany({
        where: { user_id: userId },
        select: {
          subject: true,
          topic: true,
          score: true,
          submitted_at: true,
          shared_quiz: { select: { topic: true } },
        },
        orderBy: { submitted_at: "desc" },
      }),
      prisma.student_courses.findMany({
        where: { studentId: student.id },
        select: {
          course: {
            select: {
              subject: true,
              status: true,
              modules: {
                orderBy: { position: "asc" },
                select: {
                  title: true,
                  lessons: {
                    select: {
                      progress: {
                        where: { studentId: student.id },
                        select: { done: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.review_items.findMany({
        where: { userId },
        select: {
          subject: true,
          topic: true,
          status: true,
          step: true,
          dueOn: true,
          masteredAt: true,
        },
      }),
    ]);

    const subjectMap = new Map();
    const ensureSubject = (name, icon = "📘") => {
      const key = String(name || "General")
        .trim()
        .toLowerCase();
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          name: String(name || "General").trim(),
          icon,
          scores: [],
          completedLessons: 0,
          totalLessons: 0,
          topics: new Map(),
          courseStatus: null,
        });
      }
      return subjectMap.get(key);
    };
    const ensureTopic = (subject, title) => {
      const name = String(title || "General assessment").trim();
      const key = name.toLowerCase();
      if (!subject.topics.has(key)) {
        subject.topics.set(key, {
          title: name,
          scores: [],
          completedLessons: 0,
          totalLessons: 0,
          lastAssessedAt: null,
          recoveryStep: 0,
          recoveryDueOn: null,
          recovered: false,
          recoveredAt: null,
        });
      }
      return subject.topics.get(key);
    };

    for (const catalogSubject of getSubjectsFor(
      student.curriculum,
      student.grade
    )) {
      ensureSubject(catalogSubject.name, catalogSubject.icon);
    }

    for (const result of results) {
      const subject = ensureSubject(result.subject);
      subject.scores.push(result.score);
      const topic = ensureTopic(
        subject,
        result.topic || result.shared_quiz?.topic || "General assessment"
      );
      topic.scores.push(result.score);
      if (!topic.lastAssessedAt) topic.lastAssessedAt = result.submitted_at;
    }

    for (const { course } of enrolments) {
      const subject = ensureSubject(course.subject);
      subject.courseStatus = course.status;
      for (const module of course.modules) {
        const topic = ensureTopic(subject, module.title);
        const completedLessons = module.lessons.filter(
          (lesson) => lesson.progress[0]?.done
        ).length;
        topic.completedLessons += completedLessons;
        topic.totalLessons += module.lessons.length;
        subject.completedLessons += completedLessons;
        subject.totalLessons += module.lessons.length;
      }
    }

    for (const item of recoveryItems) {
      const subject = ensureSubject(item.subject);
      const topic = ensureTopic(subject, item.topic);
      topic.recoveryStep = Math.max(topic.recoveryStep, item.step);
      if (!topic.recoveryDueOn || item.dueOn < topic.recoveryDueOn)
        topic.recoveryDueOn = item.dueOn;
      if (item.status === "mastered") {
        topic.recovered = true;
        topic.recoveredAt = item.masteredAt;
      }
    }

    const subjects = [...subjectMap.values()].map((subject) => {
      const masteryPercent = average(subject.scores);
      const topics = [...subject.topics.values()].map((topic) => {
        const topicMastery = average(topic.scores);
        return {
          title: topic.title,
          masteryPercent: topicMastery,
          status: topic.recovered
            ? "mastered"
            : masteryStatus(topicMastery, topic.scores.length),
          assessmentCount: topic.scores.length,
          recoveryStep: topic.recoveryStep,
          recoveryDueOn: topic.recoveryDueOn,
          recovered: topic.recovered,
          recoveredAt: topic.recoveredAt,
          coveragePercent: topic.totalLessons
            ? Math.round((topic.completedLessons / topic.totalLessons) * 100)
            : 0,
          completedLessons: topic.completedLessons,
          totalLessons: topic.totalLessons,
          lastAssessedAt: topic.lastAssessedAt,
        };
      });
      return {
        name: subject.name,
        icon: subject.icon,
        masteryPercent,
        status: masteryStatus(masteryPercent, subject.scores.length),
        assessmentCount: subject.scores.length,
        coveragePercent: subject.totalLessons
          ? Math.round((subject.completedLessons / subject.totalLessons) * 100)
          : 0,
        completedLessons: subject.completedLessons,
        totalLessons: subject.totalLessons,
        courseStatus: subject.courseStatus,
        topics,
      };
    });

    const assessed = subjects.filter(
      (subject) => subject.masteryPercent !== null
    );
    const topicCandidates = subjects.flatMap((subject) =>
      subject.topics.map((topic) => ({ ...topic, subject: subject.name }))
    );
    const recommended =
      topicCandidates
        .filter(
          (topic) =>
            topic.masteryPercent !== null && topic.status !== "mastered"
        )
        .sort((a, b) => a.masteryPercent - b.masteryPercent)[0] ||
      topicCandidates.find((topic) => topic.coveragePercent < 100) ||
      null;

    return res.json({
      success: true,
      profile: {
        curriculum: student.curriculum,
        academicLevel: student.academicLevel,
        grade: student.grade,
      },
      summary: {
        totalSubjects: subjects.length,
        assessedSubjects: assessed.length,
        masteredSubjects: subjects.filter(({ status }) => status === "mastered")
          .length,
        recoveredTopics: topicCandidates.filter(({ recovered }) => recovered)
          .length,
        averageMastery: average(
          assessed.map(({ masteryPercent }) => masteryPercent)
        ),
        coveragePercent: subjects.reduce(
          (total, subject) => total + subject.totalLessons,
          0
        )
          ? Math.round(
              (subjects.reduce(
                (total, subject) => total + subject.completedLessons,
                0
              ) /
                subjects.reduce(
                  (total, subject) => total + subject.totalLessons,
                  0
                )) *
                100
            )
          : 0,
      },
      recommendedTopic: recommended
        ? {
            subject: recommended.subject,
            title: recommended.title,
            masteryPercent: recommended.masteryPercent,
            status: recommended.status,
          }
        : null,
      subjects,
    });
  } catch (error) {
    console.error("Error fetching mastery map:", error);
    return res
      .status(500)
      .json({ success: false, error: "Unable to load mastery map" });
  }
});

// ── GET / — all courses the student is enrolled in, fully populated ────
router.get("/", [validatedRequest], async (req, res) => {
  try {
    const userId = res.locals.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const student = await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, error: "Student profile not found" });
    }

    const enrolments = await prisma.student_courses.findMany({
      where: { studentId: student.id },
      include: {
        course: {
          include: {
            modules: {
              orderBy: { position: "asc" },
              include: {
                lessons: {
                  orderBy: { position: "asc" },
                  include: {
                    progress: { where: { studentId: student.id } },
                  },
                },
                assignments: {
                  include: {
                    submissions: { where: { studentId: student.id } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const courses = enrolments.map((e) => {
      const catalogEntry = getSubjectsFor(
        student.curriculum,
        student.grade
      ).find((s) => s.name === e.course.subject);

      const modules = e.course.modules.map((m) => ({
        ...m,
        status: m.status, // already on the row now
        lessons: m.lessons.map((l) => ({
          ...l,
          done: l.progress.length > 0 && l.progress[0].done,
        })),
        assignments: m.assignments.map((a) => ({
          ...a,
          status: a.submissions[0]?.status || "not_started",
        })),
      }));

      return {
        ...e.course,
        modules,
        icon: catalogEntry?.icon || "📘",
      };
    });

    res.json({ success: true, courses });
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});
router.post("/generate", [validatedRequest], async (req, res) => {
  const userId = res.locals.user?.id;
  const subject = String(req.body.subject || "").trim();

  try {
    if (!userId) {
      return res.status(401).json({ success: false, error: "Unauthorized" });
    }
    if (!subject) {
      return res
        .status(400)
        .json({ success: false, error: "subject is required" });
    }
    const student = await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
    if (!student)
      return res
        .status(404)
        .json({ success: false, error: "Student profile not found" });
    const validSubject = getSubjectsFor(student.curriculum, student.grade).some(
      ({ name }) => name === subject
    );
    if (!validSubject)
      return res.status(400).json({
        success: false,
        error: "Subject is not available for this curriculum and grade.",
      });
    const currentState = courseGenState.get(stateKey(userId, subject));
    if (currentState?.status === "generating")
      return res.status(409).json({
        success: false,
        error: "This course is already being generated.",
      });

    // Reset/init state for this user+subject before kicking off generation
    setState(userId, subject, {
      status: "generating",
      stageIndex: 0,
      stage: STAGES[0],
      message: "Starting course generation…",
      course: null,
      error: null,
    });

    res.json({ success: true, status: "generating" });

    runCourseGeneration({
      userId,
      subject,
      onProgress: (msg, meta = {}) => {
        console.log(`[course-gen] ${msg}`);
        setState(userId, subject, {
          status: "generating",
          message: msg,
          ...(meta.stage
            ? { stage: meta.stage, stageIndex: STAGES.indexOf(meta.stage) }
            : {}),
        });
      },
    })
      .then(async ({ course }) => {
        const fullCourse = await prisma.courses.findUnique({
          where: { id: course.id },
          include: {
            modules: {
              orderBy: { position: "asc" },
              include: {
                lessons: { orderBy: { position: "asc" } },
                assignments: true,
              },
            },
          },
        });

        setState(userId, subject, {
          status: "complete",
          stage: "done",
          stageIndex: STAGES.length,
          message: "Course generation complete",
          course: fullCourse,
        });
      })
      .catch((err) => {
        console.error(`[course-gen] failed:`, err.message);
        setState(userId, subject, {
          status: "error",
          message: "Course generation failed",
          error: err.message,
        });
      });
  } catch (error) {
    console.error("Error starting course generation:", error);
    if (!res.headersSent)
      return res
        .status(500)
        .json({ success: false, error: "Unable to start course generation" });
  }
});

router.get("/status", [validatedRequest], async (req, res) => {
  const userId = res.locals.user?.id;
  const { subject } = req.query;

  if (!userId) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  if (!subject) {
    return res
      .status(400)
      .json({ success: false, error: "subject query param is required" });
  }

  try {
    const state = courseGenState.get(stateKey(userId, subject));
    if (!state) {
      const student = await prisma.students.findFirst({
        where: { user_id: Number(userId) },
      });
      if (!student)
        return res
          .status(404)
          .json({ success: false, error: "Student profile not found" });
      const course = await prisma.courses.findUnique({
        where: {
          subject_curriculum_academicLevel_grade: {
            subject,
            curriculum: student.curriculum,
            academicLevel: student.academicLevel,
            grade: student.grade,
          },
        },
        include: {
          modules: {
            orderBy: { position: "asc" },
            include: {
              lessons: { orderBy: { position: "asc" } },
              assignments: true,
            },
          },
        },
      });
      if (!course) return res.json({ success: true, status: "idle" });
      if (["complete", "completed", "ready"].includes(course.status))
        return res.json({
          success: true,
          status: "complete",
          stage: "done",
          stageIndex: STAGES.length,
          message: "Course generation complete",
          course,
        });
      return res.json({
        success: true,
        status: "error",
        message: "Course generation was interrupted. Start it again to retry.",
      });
    }
    return res.json({ success: true, ...state });
  } catch (error) {
    console.error("Error fetching course generation status:", error);
    return res
      .status(500)
      .json({ success: false, error: "Unable to fetch generation status" });
  }
});

// ── GET /lessons/:lessonId — full lesson content ────────────────────────
router.get("/lessons/:lessonId", [validatedRequest], async (req, res) => {
  try {
    const userId = res.locals.user?.id;
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });

    const lessonId = Number(req.params.lessonId);
    if (!Number.isInteger(lessonId)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid lessonId" });
    }

    const student = await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
    if (!student) {
      return res
        .status(404)
        .json({ success: false, error: "Student profile not found" });
    }

    const lesson = await prisma.course_lessons.findUnique({
      where: { id: lessonId },
      include: {
        module: { include: { course: true } },
        progress: { where: { studentId: student.id } },
      },
    });

    if (!lesson) {
      return res
        .status(404)
        .json({ success: false, error: "Lesson not found" });
    }

    // Ownership check: the lesson's course must belong to a course this
    // student is actually enrolled in.
    const enrolled = await prisma.student_courses.findFirst({
      where: { studentId: student.id, courseId: lesson.module.course.id },
    });
    if (!enrolled) {
      return res
        .status(403)
        .json({ success: false, error: "Not enrolled in this course" });
    }

    res.json({
      success: true,
      lesson: {
        id: lesson.id,
        title: lesson.title,
        contentMd: lesson.contentMd,
        durationMin: lesson.durationMin,
        moduleId: lesson.moduleId,
        moduleTitle: lesson.module.title,
        courseId: lesson.module.course.id,
        subject: lesson.module.course.subject,
        done: lesson.progress.length > 0 && lesson.progress[0].done,
      },
    });
  } catch (err) {
    console.error("Error fetching lesson:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

// ── POST /lessons/:lessonId/complete — mark a lesson done ───────────────
router.post(
  "/lessons/:lessonId/complete",
  [validatedRequest],
  async (req, res) => {
    try {
      const userId = res.locals.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });

      const lessonId = Number(req.params.lessonId);
      if (!Number.isInteger(lessonId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid lessonId" });
      }

      const student = await prisma.students.findFirst({
        where: { user_id: Number(userId) },
      });
      if (!student) {
        return res
          .status(404)
          .json({ success: false, error: "Student profile not found" });
      }

      const lesson = await prisma.course_lessons.findUnique({
        where: { id: lessonId },
        include: { module: { include: { course: true } } },
      });
      if (!lesson) {
        return res
          .status(404)
          .json({ success: false, error: "Lesson not found" });
      }

      const enrolled = await prisma.student_courses.findFirst({
        where: { studentId: student.id, courseId: lesson.module.course.id },
      });
      if (!enrolled) {
        return res
          .status(403)
          .json({ success: false, error: "Not enrolled in this course" });
      }

      const existingProgress = await prisma.student_lesson_progress.findUnique({
        where: { studentId_lessonId: { studentId: student.id, lessonId } },
      });
      if (existingProgress?.done) return res.json({ success: true });

      await prisma.student_lesson_progress.upsert({
        where: { studentId_lessonId: { studentId: student.id, lessonId } },
        update: { done: true, doneAt: new Date() },
        create: {
          studentId: student.id,
          lessonId,
          done: true,
          doneAt: new Date(),
        },
      });

      res.json({ success: true });
    } catch (err) {
      console.error("Error marking lesson complete:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// ── GET /assignments/:assignmentId — full assignment detail ─────────────
router.get(
  "/assignments/:assignmentId",
  [validatedRequest],
  async (req, res) => {
    try {
      const userId = res.locals.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });

      const assignmentId = Number(req.params.assignmentId);
      if (!Number.isInteger(assignmentId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid assignmentId" });
      }

      const student = await prisma.students.findFirst({
        where: { user_id: Number(userId) },
      });
      if (!student) {
        return res
          .status(404)
          .json({ success: false, error: "Student profile not found" });
      }

      const assignment = await prisma.course_assignments.findUnique({
        where: { id: assignmentId },
        include: {
          module: { include: { course: true } },
          submissions: { where: { studentId: student.id } },
        },
      });
      if (!assignment) {
        return res
          .status(404)
          .json({ success: false, error: "Assignment not found" });
      }

      const enrolled = await prisma.student_courses.findFirst({
        where: { studentId: student.id, courseId: assignment.module.course.id },
      });
      if (!enrolled) {
        return res
          .status(403)
          .json({ success: false, error: "Not enrolled in this course" });
      }

      const submission = assignment.submissions[0] || null;

      res.json({
        success: true,
        assignment: {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          steps: assignment.stepsJson,
          etaHours: assignment.etaHours,
          moduleId: assignment.moduleId,
          status: submission?.status || "not_started",
          submissionLink: submission?.submissionLink || null,
          feedback: submission?.feedback || null,
        },
      });
    } catch (err) {
      console.error("Error fetching assignment:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// ── POST /assignments/:assignmentId/submit — submit work ────────────────
router.post(
  "/assignments/:assignmentId/submit",
  [validatedRequest],
  async (req, res) => {
    try {
      const userId = res.locals.user?.id;
      if (!userId)
        return res.status(401).json({ success: false, error: "Unauthorized" });

      const assignmentId = Number(req.params.assignmentId);
      const { submissionLink } = req.body;
      const operationId = clientOperationId(req);
      if (!Number.isInteger(assignmentId)) {
        return res
          .status(400)
          .json({ success: false, error: "Invalid assignmentId" });
      }
      if (!submissionLink) {
        return res
          .status(400)
          .json({ success: false, error: "submissionLink is required" });
      }

      const student = await prisma.students.findFirst({
        where: { user_id: Number(userId) },
      });
      if (!student) {
        return res
          .status(404)
          .json({ success: false, error: "Student profile not found" });
      }

      const assignment = await prisma.course_assignments.findUnique({
        where: { id: assignmentId },
        include: { module: { include: { course: true } } },
      });
      if (!assignment) {
        return res
          .status(404)
          .json({ success: false, error: "Assignment not found" });
      }

      const enrolled = await prisma.student_courses.findFirst({
        where: { studentId: student.id, courseId: assignment.module.course.id },
      });
      if (!enrolled) {
        return res
          .status(403)
          .json({ success: false, error: "Not enrolled in this course" });
      }

      const existing = await prisma.student_assignment_submissions.findFirst({
        where: { studentId: student.id, assignmentId },
      });

      if (operationId && existing?.lastClientOperationId === operationId) {
        return res.json({ success: true, submission: existing });
      }
      if (existing?.gradedAt && existing.status !== "needs_revision") {
        return res
          .status(409)
          .json({ success: false, error: "This work has already been graded" });
      }

      const now = new Date();
      const submission = await prisma.student_assignment_submissions.upsert({
        where: {
          assignmentId_studentId: { assignmentId, studentId: student.id },
        },
        update: {
          submissionLink,
          status: "submitted",
          firstSubmittedAt: existing?.firstSubmittedAt || now,
          submittedAt: now,
          scorePoints: null,
          feedback: null,
          gradedAt: null,
          gradedByTeacherId: null,
          lastClientOperationId: operationId,
        },
        create: {
          studentId: student.id,
          assignmentId,
          submissionLink,
          status: "submitted",
          firstSubmittedAt: now,
          submittedAt: now,
          lastClientOperationId: operationId,
        },
      });

      res.json({ success: true, submission });
    } catch (err) {
      console.error("Error submitting assignment:", err);
      res.status(500).json({ success: false, error: "Internal server error" });
    }
  }
);

// Same in-memory progress pattern as /generate and /status, scoped by moduleId.
const moduleGenState = new Map();
function moduleStateKey(moduleId) {
  return `module:${moduleId}`;
}

// ── POST /modules/:moduleId/generate — read-ahead trigger ───────────────
router.post(
  "/modules/:moduleId/generate",
  [validatedRequest],
  async (req, res) => {
    const userId = res.locals.user?.id;
    const moduleId = Number(req.params.moduleId);
    if (!userId)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!Number.isInteger(moduleId))
      return res
        .status(400)
        .json({ success: false, error: "Invalid moduleId" });

    const student = await prisma.students.findFirst({
      where: { user_id: Number(userId) },
    });
    if (!student)
      return res
        .status(404)
        .json({ success: false, error: "Student profile not found" });

    const dbModule = await prisma.course_modules.findUnique({
      where: { id: moduleId },
    });
    if (!dbModule)
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });

    const enrolled = await prisma.student_courses.findFirst({
      where: { studentId: student.id, courseId: dbModule.courseId },
    });
    if (!enrolled)
      return res
        .status(403)
        .json({ success: false, error: "Not enrolled in this course" });

    if (dbModule.status !== "not_started") {
      return res.json({
        success: true,
        status: dbModule.status,
        alreadyTriggered: true,
      });
    }

    moduleGenState.set(moduleStateKey(moduleId), {
      status: "generating",
      message: "Preparing next module…",
    });
    res.json({ success: true, status: "generating" });

    const {
      generateNextModule,
    } = require("../utils/agents/aibitat/plugins/course-gen-core");
    generateNextModule({
      userId,
      courseId: dbModule.courseId,
      onProgress: (msg) =>
        moduleGenState.set(moduleStateKey(moduleId), {
          status: "generating",
          message: msg,
        }),
    })
      .then(() =>
        moduleGenState.set(moduleStateKey(moduleId), {
          status: "ready",
          message: "Ready",
        })
      )
      .catch((err) =>
        moduleGenState.set(moduleStateKey(moduleId), {
          status: "failed",
          message: err.message,
        })
      );
  }
);

// ── GET /modules/:moduleId/status — poll while preparing ────────────────
router.get(
  "/modules/:moduleId/status",
  [validatedRequest],
  async (req, res) => {
    const moduleId = Number(req.params.moduleId);
    const dbModule = await prisma.course_modules.findUnique({
      where: { id: moduleId },
      include: {
        course: { include: { student_enrolments: true } },
        lessons: { orderBy: { position: "asc" } },
        assignments: true,
      },
    });
    if (!dbModule)
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });
    const student = await prisma.students.findFirst({
      where: { user_id: Number(res.locals.user?.id) },
    });
    const enrolled = dbModule.course.student_enrolments.some(
      (enrollment) => enrollment.studentId === student?.id
    );
    if (!enrolled)
      return res
        .status(403)
        .json({ success: false, error: "Not enrolled in this course" });

    // DB status is authoritative; in-memory state just adds a friendly message while generating.
    const live = moduleGenState.get(moduleStateKey(moduleId));
    const { course: _course, ...safeModule } = dbModule;
    res.json({
      success: true,
      status: dbModule.status,
      message: live?.message || null,
      module: dbModule.status === "ready" ? safeModule : null,
    });
  }
);

module.exports = router;

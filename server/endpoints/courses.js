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

const prisma = new PrismaClient();

router.use(validatedRequest, flexUserRoleValid([ROLES.student]));

// ── In-memory progress store, keyed by `${userId}:${subject}` ──────────
// NOTE: this resets if the server restarts, and only works for a single
// server instance. Fine for now — move to Redis/DB if you scale out.
const courseGenState = new Map();
const STAGES = ["planner", "writer", "assignments", "review"];

function stateKey(userId, subject) {
  return `${userId}:${subject}`;
}
function setState(userId, subject, patch) {
  const key = stateKey(userId, subject);
  const prev = courseGenState.get(key) || {};
  courseGenState.set(key, { ...prev, ...patch, updatedAt: Date.now() });
}

// ── Subject catalog per curriculum/academicLevel ───────────────────────
// Centralized here so the frontend never hardcodes subjects. Extend as
// you add more curricula/levels.
const ZIMSEC_PRIMARY_SUBJECTS = [
  { id: "math", name: "Mathematics", icon: "📐" },
  { id: "eng", name: "English Language", icon: "📖" },
  { id: "indigenous", name: "Indigenous Language", icon: "💬" },
  { id: "science-tech", name: "Science and Technology", icon: "🔬" },
  { id: "heritage-social", name: "Heritage-Social Studies", icon: "🏛️" },
  { id: "agriculture", name: "Agriculture", icon: "🌱" },
  { id: "ict", name: "Information Technology", icon: "💻" },
  { id: "pe-arts", name: "Physical Education and Arts", icon: "🎨" },
];

const ZIMSEC_SECONDARY_SUBJECTS = [
  { id: "math", name: "Mathematics", icon: "📐" },
  { id: "eng", name: "English Language", icon: "📖" },
  { id: "shona", name: "Shona", icon: "💬" },
  { id: "ndebele", name: "Ndebele", icon: "💬" },
  { id: "geo", name: "Geography", icon: "🌍" },
  { id: "history", name: "History", icon: "🏛️" },
  { id: "heritage", name: "Heritage Studies", icon: "🇿🇼" },
  { id: "bio", name: "Biology", icon: "🧬" },
  { id: "chem", name: "Chemistry", icon: "⚗️" },
  { id: "physics", name: "Physics", icon: "⚛️" },
  { id: "combined-science", name: "Combined Science", icon: "🔬" },
  { id: "agriculture", name: "Agriculture", icon: "🌱" },
  { id: "commerce", name: "Commerce", icon: "🛒" },
  { id: "accounts", name: "Principles of Accounting", icon: "🧾" },
  { id: "business", name: "Business Enterprise Skills", icon: "💼" },
  { id: "computer-science", name: "Computer Science", icon: "💻" },
  { id: "literature", name: "Literature in English", icon: "📚" },
  { id: "frs", name: "Family and Religious Studies", icon: "🤝" },
  { id: "food-tech", name: "Food Technology and Design", icon: "🍲" },
  { id: "art-design", name: "Art and Design", icon: "🎨" },
  { id: "pe", name: "Physical Education, Sport and Mass Displays", icon: "🏃" },
];

const ZIMSEC_ADVANCED_SUBJECTS = [
  { id: "pure-math", name: "Pure Mathematics", icon: "📐" },
  { id: "statistics", name: "Statistics", icon: "📊" },
  { id: "eng-lit", name: "English Literature", icon: "📚" },
  { id: "geo", name: "Geography", icon: "🌍" },
  { id: "history", name: "History", icon: "🏛️" },
  { id: "heritage", name: "Heritage Studies", icon: "🇿🇼" },
  { id: "bio", name: "Biology", icon: "🧬" },
  { id: "chem", name: "Chemistry", icon: "⚗️" },
  { id: "physics", name: "Physics", icon: "⚛️" },
  { id: "agriculture", name: "Agriculture", icon: "🌱" },
  { id: "business", name: "Business Studies", icon: "💼" },
  { id: "accounts", name: "Accounting", icon: "🧾" },
  { id: "economics", name: "Economics", icon: "📈" },
  { id: "computer-science", name: "Computer Science", icon: "💻" },
  { id: "sociology", name: "Sociology", icon: "👥" },
  { id: "frs", name: "Family and Religious Studies", icon: "🤝" },
];

const CAMBRIDGE_PRIMARY_SUBJECTS = [
  { id: "math", name: "Mathematics", icon: "📐" },
  { id: "eng", name: "English", icon: "📖" },
  { id: "science", name: "Science", icon: "🔬" },
  { id: "computing", name: "Computing", icon: "💻" },
  { id: "global-perspectives", name: "Global Perspectives", icon: "🌍" },
];

const CAMBRIDGE_SECONDARY_SUBJECTS = [
  { id: "math", name: "Mathematics", icon: "📐" },
  { id: "eng", name: "English Language", icon: "📖" },
  { id: "literature", name: "Literature in English", icon: "📚" },
  { id: "geo", name: "Geography", icon: "🌍" },
  { id: "history", name: "History", icon: "🏛️" },
  { id: "bio", name: "Biology", icon: "🧬" },
  { id: "chem", name: "Chemistry", icon: "⚗️" },
  { id: "physics", name: "Physics", icon: "⚛️" },
  { id: "combined-science", name: "Combined Science", icon: "🔬" },
  { id: "agriculture", name: "Agriculture", icon: "🌱" },
  { id: "business", name: "Business Studies", icon: "💼" },
  { id: "accounts", name: "Accounting", icon: "🧾" },
  { id: "economics", name: "Economics", icon: "📈" },
  { id: "computer-science", name: "Computer Science", icon: "💻" },
  { id: "ict", name: "Information and Communication Technology", icon: "🖥️" },
  { id: "environment", name: "Environmental Management", icon: "🌿" },
  { id: "global-perspectives", name: "Global Perspectives", icon: "🌐" },
  { id: "art-design", name: "Art and Design", icon: "🎨" },
  { id: "pe", name: "Physical Education", icon: "🏃" },
];

const CAMBRIDGE_ADVANCED_SUBJECTS = [
  { id: "math", name: "Mathematics", icon: "📐" },
  { id: "further-math", name: "Further Mathematics", icon: "➗" },
  { id: "eng-lit", name: "Literature in English", icon: "📚" },
  { id: "geo", name: "Geography", icon: "🌍" },
  { id: "history", name: "History", icon: "🏛️" },
  { id: "bio", name: "Biology", icon: "🧬" },
  { id: "chem", name: "Chemistry", icon: "⚗️" },
  { id: "physics", name: "Physics", icon: "⚛️" },
  { id: "business", name: "Business", icon: "💼" },
  { id: "accounts", name: "Accounting", icon: "🧾" },
  { id: "economics", name: "Economics", icon: "📈" },
  { id: "computer-science", name: "Computer Science", icon: "💻" },
  { id: "sociology", name: "Sociology", icon: "👥" },
  { id: "psychology", name: "Psychology", icon: "🧠" },
  {
    id: "global-perspectives",
    name: "Global Perspectives and Research",
    icon: "🌐",
  },
];

const SUBJECT_CATALOG = {
  ZIMSEC: {
    "Grade 1": ZIMSEC_PRIMARY_SUBJECTS,
    "Grade 2": ZIMSEC_PRIMARY_SUBJECTS,
    "Grade 3": ZIMSEC_PRIMARY_SUBJECTS,
    "Grade 4": ZIMSEC_PRIMARY_SUBJECTS,
    "Grade 5": ZIMSEC_PRIMARY_SUBJECTS,
    "Grade 6": ZIMSEC_PRIMARY_SUBJECTS,
    "Grade 7": ZIMSEC_PRIMARY_SUBJECTS,
    "Form 1": ZIMSEC_SECONDARY_SUBJECTS,
    "Form 2": ZIMSEC_SECONDARY_SUBJECTS,
    "Form 3": ZIMSEC_SECONDARY_SUBJECTS,
    "Form 4": ZIMSEC_SECONDARY_SUBJECTS,
    "Lower 6": ZIMSEC_ADVANCED_SUBJECTS,
    "Upper 6": ZIMSEC_ADVANCED_SUBJECTS,
  },
  Cambridge: {
    "Grade 1": CAMBRIDGE_PRIMARY_SUBJECTS,
    "Grade 2": CAMBRIDGE_PRIMARY_SUBJECTS,
    "Grade 3": CAMBRIDGE_PRIMARY_SUBJECTS,
    "Grade 4": CAMBRIDGE_PRIMARY_SUBJECTS,
    "Grade 5": CAMBRIDGE_PRIMARY_SUBJECTS,
    "Grade 6": CAMBRIDGE_PRIMARY_SUBJECTS,
    "Grade 7": CAMBRIDGE_PRIMARY_SUBJECTS,
    "Form 1": CAMBRIDGE_SECONDARY_SUBJECTS,
    "Form 2": CAMBRIDGE_SECONDARY_SUBJECTS,
    "Form 3": CAMBRIDGE_SECONDARY_SUBJECTS,
    "Form 4": CAMBRIDGE_SECONDARY_SUBJECTS,
    "Lower 6": CAMBRIDGE_ADVANCED_SUBJECTS,
    "Upper 6": CAMBRIDGE_ADVANCED_SUBJECTS,
  },
};

function getSubjectsFor(curriculum, grade) {
  return SUBJECT_CATALOG[curriculum]?.[grade] || [];
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

      const submission = existing
        ? await prisma.student_assignment_submissions.update({
            where: { id: existing.id },
            data: {
              submissionLink,
              status: "submitted",
              submittedAt: new Date(),
            },
          })
        : await prisma.student_assignment_submissions.create({
            data: {
              studentId: student.id,
              assignmentId,
              submissionLink,
              status: "submitted",
              submittedAt: new Date(),
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
      include: { lessons: { orderBy: { position: "asc" } }, assignments: true },
    });
    if (!dbModule)
      return res
        .status(404)
        .json({ success: false, error: "Module not found" });

    // DB status is authoritative; in-memory state just adds a friendly message while generating.
    const live = moduleGenState.get(moduleStateKey(moduleId));
    res.json({
      success: true,
      status: dbModule.status,
      message: live?.message || null,
      module: dbModule.status === "ready" ? dbModule : null,
    });
  }
);

module.exports = router;

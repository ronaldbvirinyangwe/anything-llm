const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");

router.use(validatedRequest, flexUserRoleValid([ROLES.teacher, ROLES.student]));

const VALID_WORKFLOW_STATUSES = new Set(["returned", "needs_revision"]);

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validHttpUrl(value) {
  if (!value) return true;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function clientOperationId(request) {
  const value = String(request.get("Idempotency-Key") || "").trim();
  return value && value.length <= 100 ? value : null;
}

function displayStatus(submission, assignment, now = new Date()) {
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

async function teacherFor(userId) {
  return prisma.teachers.findFirst({ where: { user_id: Number(userId) } });
}

async function studentFor(userId) {
  return prisma.students.findFirst({ where: { user_id: Number(userId) } });
}

async function teacherAudiences(teacherId) {
  const [classLinks, legacyLinks] = await Promise.all([
    prisma.class_teachers.findMany({
      where: { teacherId, class: { active: true } },
      include: {
        class: {
          include: {
            students: {
              where: { status: "active", leftAt: null },
              include: { student: true },
            },
          },
        },
      },
      orderBy: { class: { name: "asc" } },
    }),
    prisma.teacher_students.findMany({
      where: { teacherId },
      include: { student: true },
      orderBy: { student: { name: "asc" } },
    }),
  ]);

  const formalStudentIds = new Set(
    classLinks.flatMap(({ class: educationClass }) =>
      educationClass.students.map(({ studentId }) => studentId)
    )
  );
  const formal = classLinks.map(({ class: educationClass }) => ({
    key: `class:${educationClass.id}`,
    id: educationClass.id,
    name: educationClass.name,
    subject: educationClass.subject || "General",
    grade: educationClass.grade,
    type: "class",
    students: educationClass.students.map(({ student }) => ({
      id: student.id,
      name: student.name,
      grade: student.grade,
    })),
  }));

  const legacyGroups = new Map();
  for (const link of legacyLinks) {
    if (formalStudentIds.has(link.studentId)) continue;
    const subject = link.subject?.trim() || "General";
    if (!legacyGroups.has(subject)) legacyGroups.set(subject, []);
    legacyGroups.get(subject).push({
      id: link.student.id,
      name: link.student.name,
      grade: link.student.grade,
    });
  }
  const legacy = [...legacyGroups.entries()].map(([subject, students]) => ({
    key: `legacy:${subject}`,
    id: null,
    name: `${subject} class`,
    subject,
    grade: null,
    type: "legacy",
    students,
  }));
  return [...formal, ...legacy];
}

async function resolveRecipients(teacherId, audienceKeys) {
  const audiences = await teacherAudiences(teacherId);
  const requested = new Set(audienceKeys);
  const selected = audiences.filter(({ key }) => requested.has(key));
  if (selected.length !== requested.size) throw new Error("INVALID_AUDIENCE");
  const recipients = new Map();
  for (const audience of selected) {
    for (const student of audience.students) {
      if (!recipients.has(student.id))
        recipients.set(student.id, {
          studentId: student.id,
          sourceClassId: audience.type === "class" ? audience.id : null,
        });
    }
  }
  return { selected, recipients: [...recipients.values()] };
}

function assignmentSummary(assignment) {
  const statuses = (assignment.submissions || []).map((submission) =>
    displayStatus(submission, assignment)
  );
  return {
    id: assignment.id,
    title: assignment.title,
    description: assignment.description,
    subject: assignment.subject,
    assignmentType: assignment.assignmentType,
    status: assignment.status,
    maxPoints: assignment.maxPoints,
    dueAt: assignment.dueAt,
    publishedAt: assignment.publishedAt,
    submissionModes: assignment.submissionModes || ["text", "link"],
    recipients: statuses.length,
    submitted: statuses.filter((status) =>
      ["submitted", "late", "graded", "graded_late", "needs_revision"].includes(
        status
      )
    ).length,
    graded: statuses.filter((status) =>
      ["graded", "graded_late"].includes(status)
    ).length,
    missing: statuses.filter((status) => status === "missing").length,
  };
}

router.get("/audiences", async (_request, response) => {
  try {
    const teacher = await teacherFor(response.locals.user?.id);
    if (!teacher)
      return response.status(403).json({ error: "Teacher profile required" });
    return response.json({
      success: true,
      audiences: await teacherAudiences(teacher.id),
    });
  } catch (error) {
    console.error("Assignment audiences error:", error);
    return response.status(500).json({ error: "Unable to load classes" });
  }
});

router.get("/teacher", async (_request, response) => {
  try {
    const teacher = await teacherFor(response.locals.user?.id);
    if (!teacher)
      return response.status(403).json({ error: "Teacher profile required" });
    const assignments = await prisma.course_assignments.findMany({
      where: { teacherId: teacher.id },
      include: { submissions: true, classes: { include: { class: true } } },
      orderBy: { createdAt: "desc" },
    });
    return response.json({
      success: true,
      assignments: assignments.map((assignment) => ({
        ...assignmentSummary(assignment),
        classes: assignment.classes.map(({ class: item }) => ({
          id: item.id,
          name: item.name,
        })),
      })),
    });
  } catch (error) {
    console.error("Teacher assignments error:", error);
    return response.status(500).json({ error: "Unable to load assignments" });
  }
});

router.post("/", async (request, response) => {
  try {
    const teacher = await teacherFor(response.locals.user?.id);
    if (!teacher)
      return response.status(403).json({ error: "Teacher profile required" });
    const title = String(request.body?.title || "").trim();
    const description = String(request.body?.description || "").trim();
    const subject = String(request.body?.subject || "").trim();
    const maxPoints = Number(request.body?.maxPoints);
    const dueAt = request.body?.dueAt ? new Date(request.body.dueAt) : null;
    const audienceKeys = Array.isArray(request.body?.audienceKeys)
      ? [...new Set(request.body.audienceKeys.map(String))]
      : [];
    const modes = Array.isArray(request.body?.submissionModes)
      ? [...new Set(request.body.submissionModes)]
      : ["text", "link"];
    if (
      title.length < 3 ||
      title.length > 160 ||
      description.length > 5000 ||
      !subject ||
      subject.length > 100 ||
      !Number.isFinite(maxPoints) ||
      maxPoints <= 0 ||
      maxPoints > 1000 ||
      (dueAt && Number.isNaN(dueAt.getTime())) ||
      audienceKeys.length < 1 ||
      audienceKeys.length > 20 ||
      modes.length < 1 ||
      modes.some((mode) => !["text", "link"].includes(mode))
    )
      return response.status(400).json({ error: "Invalid assignment details" });

    const { selected, recipients } = await resolveRecipients(
      teacher.id,
      audienceKeys
    );
    if (!recipients.length)
      return response.status(400).json({ error: "Selected classes are empty" });
    const publish = request.body?.publish === true;
    const assignment = await prisma.$transaction(async (transaction) => {
      const created = await transaction.course_assignments.create({
        data: {
          teacherId: teacher.id,
          title,
          description: description || null,
          subject,
          assignmentType: "homework",
          status: publish ? "published" : "draft",
          maxPoints,
          dueAt,
          publishedAt: publish ? new Date() : null,
          submissionModes: modes,
        },
      });
      const formalClassIds = selected
        .filter(({ type }) => type === "class")
        .map(({ id }) => id);
      if (formalClassIds.length)
        await transaction.assignment_classes.createMany({
          data: formalClassIds.map((classId) => ({
            assignmentId: created.id,
            classId,
          })),
        });
      await transaction.student_assignment_submissions.createMany({
        data: recipients.map((recipient) => ({
          assignmentId: created.id,
          ...recipient,
          status: "assigned",
        })),
      });
      if (publish) {
        const students = await transaction.students.findMany({
          where: { id: { in: recipients.map(({ studentId }) => studentId) } },
          select: { user_id: true },
        });
        await transaction.notifications.createMany({
          data: students.map(({ user_id }) => ({
            userId: user_id,
            type: "assignment_assigned",
            message: `${teacher.name} assigned: ${title}`,
            link: `/student/assignments?focus=${created.id}`,
          })),
        });
      }
      return created;
    });
    return response.status(201).json({
      success: true,
      assignment: { ...assignment, recipients: recipients.length },
    });
  } catch (error) {
    if (error.message === "INVALID_AUDIENCE")
      return response.status(403).json({ error: "Invalid class selection" });
    console.error("Assignment create error:", error);
    return response.status(500).json({ error: "Unable to create assignment" });
  }
});

router.post("/teacher/:id/publish", async (request, response) => {
  try {
    const teacher = await teacherFor(response.locals.user?.id);
    const id = numericId(request.params.id);
    if (!teacher || !id)
      return response.status(404).json({ error: "Assignment not found" });
    const assignment = await prisma.course_assignments.findFirst({
      where: { id, teacherId: teacher.id },
      include: {
        submissions: { include: { student: { select: { user_id: true } } } },
      },
    });
    if (!assignment)
      return response.status(404).json({ error: "Assignment not found" });
    if (assignment.status === "published")
      return response.json({
        success: true,
        assignment: assignmentSummary(assignment),
      });
    const published = await prisma.$transaction(async (transaction) => {
      const updated = await transaction.course_assignments.update({
        where: { id },
        data: { status: "published", publishedAt: new Date() },
      });
      await transaction.notifications.createMany({
        data: assignment.submissions.map(({ student }) => ({
          userId: student.user_id,
          type: "assignment_assigned",
          message: `${teacher.name} assigned: ${assignment.title}`,
          link: `/student/assignments?focus=${assignment.id}`,
        })),
      });
      return updated;
    });
    return response.json({ success: true, assignment: published });
  } catch (error) {
    console.error("Assignment publish error:", error);
    return response.status(500).json({ error: "Unable to publish assignment" });
  }
});

router.get("/teacher/:id/submissions", async (request, response) => {
  try {
    const teacher = await teacherFor(response.locals.user?.id);
    const id = numericId(request.params.id);
    const assignment = teacher
      ? await prisma.course_assignments.findFirst({
          where: { id, teacherId: teacher.id },
          include: {
            submissions: {
              include: { student: true, gradedBy: { select: { name: true } } },
              orderBy: { student: { name: "asc" } },
            },
            classes: { include: { class: true } },
          },
        })
      : null;
    if (!assignment)
      return response.status(404).json({ error: "Assignment not found" });
    return response.json({
      success: true,
      assignment: assignmentSummary(assignment),
      classes: assignment.classes.map(({ class: item }) => ({
        id: item.id,
        name: item.name,
      })),
      submissions: assignment.submissions.map((submission) => ({
        id: submission.id,
        student: {
          id: submission.student.id,
          name: submission.student.name,
          grade: submission.student.grade,
        },
        submissionText: submission.submissionText,
        submissionLink: submission.submissionLink,
        submittedAt: submission.submittedAt,
        status: displayStatus(submission, assignment),
        scorePoints: submission.scorePoints,
        feedback: submission.feedback,
        gradedAt: submission.gradedAt,
        gradedBy: submission.gradedBy?.name || null,
      })),
    });
  } catch (error) {
    console.error("Assignment submissions error:", error);
    return response.status(500).json({ error: "Unable to load submissions" });
  }
});

router.patch(
  "/teacher/:id/submissions/:studentId",
  async (request, response) => {
    try {
      const teacher = await teacherFor(response.locals.user?.id);
      const id = numericId(request.params.id);
      const studentId = numericId(request.params.studentId);
      const assignment = teacher
        ? await prisma.course_assignments.findFirst({
            where: { id, teacherId: teacher.id },
          })
        : null;
      if (!assignment || !studentId)
        return response.status(404).json({ error: "Submission not found" });
      const scorePoints = Number(request.body?.scorePoints);
      const feedback = String(request.body?.feedback || "").trim();
      const workflowStatus = String(request.body?.status || "returned");
      if (
        !Number.isFinite(scorePoints) ||
        scorePoints < 0 ||
        scorePoints > assignment.maxPoints ||
        feedback.length > 5000 ||
        !VALID_WORKFLOW_STATUSES.has(workflowStatus)
      )
        return response
          .status(400)
          .json({ error: "Invalid grade or feedback" });
      const submission = await prisma.student_assignment_submissions.update({
        where: { assignmentId_studentId: { assignmentId: id, studentId } },
        data: {
          scorePoints,
          feedback: feedback || null,
          status: workflowStatus,
          gradedAt: new Date(),
          gradedByTeacherId: teacher.id,
        },
        include: { student: { select: { user_id: true } } },
      });
      await prisma.notifications.create({
        data: {
          userId: submission.student.user_id,
          type:
            workflowStatus === "needs_revision"
              ? "assignment_revision_requested"
              : "assignment_returned",
          message: `${teacher.name} returned feedback for ${assignment.title}`,
          link: `/student/assignments?focus=${assignment.id}`,
        },
      });
      return response.json({ success: true, submission });
    } catch (error) {
      if (error.code === "P2025")
        return response.status(404).json({ error: "Submission not found" });
      console.error("Assignment grading error:", error);
      return response.status(500).json({ error: "Unable to save grade" });
    }
  }
);

router.get("/gradebook", async (request, response) => {
  try {
    const teacher = await teacherFor(response.locals.user?.id);
    const audienceKey = String(request.query?.audienceKey || "");
    if (!teacher || !audienceKey)
      return response.status(400).json({ error: "Class is required" });
    const audiences = await teacherAudiences(teacher.id);
    const audience = audiences.find(({ key }) => key === audienceKey);
    if (!audience)
      return response.status(403).json({ error: "Class is not available" });
    const assignments = await prisma.course_assignments.findMany({
      where: {
        teacherId: teacher.id,
        status: "published",
        ...(audience.type === "class"
          ? { classes: { some: { classId: audience.id } } }
          : { subject: audience.subject }),
      },
      include: { submissions: true },
      orderBy: { dueAt: "asc" },
    });
    const cells = {};
    for (const student of audience.students) {
      cells[student.id] = {};
      for (const assignment of assignments) {
        const submission = assignment.submissions.find(
          ({ studentId }) => studentId === student.id
        );
        if (!submission) continue;
        cells[student.id][assignment.id] = {
          status: displayStatus(submission, assignment),
          scorePoints: submission.scorePoints,
          maxPoints: assignment.maxPoints,
          percent:
            submission.scorePoints === null || !assignment.maxPoints
              ? null
              : Math.round(
                  (submission.scorePoints / assignment.maxPoints) * 100
                ),
        };
      }
    }
    return response.json({
      success: true,
      audience: {
        key: audience.key,
        name: audience.name,
        subject: audience.subject,
      },
      students: audience.students,
      assignments: assignments.map(assignmentSummary),
      cells,
    });
  } catch (error) {
    console.error("Gradebook error:", error);
    return response.status(500).json({ error: "Unable to load gradebook" });
  }
});

router.get("/me", async (_request, response) => {
  try {
    const student = await studentFor(response.locals.user?.id);
    if (!student)
      return response.status(403).json({ error: "Student profile required" });
    const submissions = await prisma.student_assignment_submissions.findMany({
      where: { studentId: student.id, assignment: { status: "published" } },
      include: { assignment: { include: { teacher: true } } },
      orderBy: [{ assignment: { dueAt: "asc" } }, { assignedAt: "desc" }],
    });
    return response.json({
      success: true,
      assignments: submissions.map((submission) => ({
        ...assignmentSummary({
          ...submission.assignment,
          submissions: [submission],
        }),
        teacherName: submission.assignment.teacher?.name || "Teacher",
        studentStatus: displayStatus(submission, submission.assignment),
        scorePoints: submission.scorePoints,
        feedback: submission.feedback,
      })),
    });
  } catch (error) {
    console.error("Student assignments error:", error);
    return response.status(500).json({ error: "Unable to load assignments" });
  }
});

router.get("/me/:id", async (request, response) => {
  try {
    const student = await studentFor(response.locals.user?.id);
    const id = numericId(request.params.id);
    const submission = student
      ? await prisma.student_assignment_submissions.findUnique({
          where: {
            assignmentId_studentId: { assignmentId: id, studentId: student.id },
          },
          include: { assignment: { include: { teacher: true } } },
        })
      : null;
    if (!submission || submission.assignment.status !== "published")
      return response.status(404).json({ error: "Assignment not found" });
    return response.json({
      success: true,
      assignment: {
        ...assignmentSummary({
          ...submission.assignment,
          submissions: [submission],
        }),
        teacherName: submission.assignment.teacher?.name || "Teacher",
        studentStatus: displayStatus(submission, submission.assignment),
        submissionText: submission.submissionText,
        submissionLink: submission.submissionLink,
        submittedAt: submission.submittedAt,
        scorePoints: submission.scorePoints,
        feedback: submission.feedback,
      },
    });
  } catch (error) {
    console.error("Student assignment detail error:", error);
    return response.status(500).json({ error: "Unable to load assignment" });
  }
});

router.put("/me/:id/submission", async (request, response) => {
  try {
    const student = await studentFor(response.locals.user?.id);
    const id = numericId(request.params.id);
    const submissionText = String(request.body?.submissionText || "").trim();
    const submissionLink = String(request.body?.submissionLink || "").trim();
    const operationId = clientOperationId(request);
    const current = student
      ? await prisma.student_assignment_submissions.findUnique({
          where: {
            assignmentId_studentId: { assignmentId: id, studentId: student.id },
          },
          include: { assignment: true },
        })
      : null;
    if (!current || current.assignment.status !== "published")
      return response.status(404).json({ error: "Assignment not found" });
    if (operationId && current.lastClientOperationId === operationId) {
      return response.json({ success: true, submission: current });
    }
    const modes = current.assignment.submissionModes || ["text", "link"];
    if (
      (!submissionText && !submissionLink) ||
      submissionText.length > 10000 ||
      submissionLink.length > 2000 ||
      !validHttpUrl(submissionLink) ||
      (submissionText && !modes.includes("text")) ||
      (submissionLink && !modes.includes("link"))
    )
      return response.status(400).json({ error: "Invalid submission" });
    if (current.gradedAt && current.status !== "needs_revision")
      return response
        .status(409)
        .json({ error: "This work has already been graded" });
    const now = new Date();
    const updated = await prisma.student_assignment_submissions.update({
      where: {
        assignmentId_studentId: { assignmentId: id, studentId: student.id },
      },
      data: {
        submissionText: submissionText || null,
        submissionLink: submissionLink || null,
        status: "submitted",
        firstSubmittedAt: current.firstSubmittedAt || now,
        submittedAt: now,
        scorePoints: null,
        feedback: null,
        gradedAt: null,
        gradedByTeacherId: null,
        lastClientOperationId: operationId,
      },
    });
    return response.json({ success: true, submission: updated });
  } catch (error) {
    console.error("Student assignment submit error:", error);
    return response.status(500).json({ error: "Unable to submit assignment" });
  }
});

module.exports = router;

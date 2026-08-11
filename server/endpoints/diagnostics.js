const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const { getSubjectsFor } = require("../utils/subjects/catalog");
const {
  QUESTION_COUNT,
  generateDiagnostic,
  gradeDiagnostic,
  publicAssessment,
} = require("../utils/diagnostics");
const { seedReviewItem } = require("../utils/review");

router.use(validatedRequest, flexUserRoleValid([ROLES.student]));

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function studentFor(userId) {
  return prisma.students.findFirst({ where: { user_id: Number(userId) } });
}

router.get("/", async (_request, response) => {
  try {
    const userId = Number(response.locals.user?.id);
    const student = await studentFor(userId);
    if (!student)
      return response.status(404).json({ error: "Student profile not found" });
    const assessments = await prisma.diagnostic_assessments.findMany({
      where: {
        user_id: userId,
        OR: [
          { status: "submitted" },
          { status: "ready", expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    return response.json({
      success: true,
      profile: {
        curriculum: student.curriculum,
        grade: student.grade,
        academicLevel: student.academicLevel,
      },
      subjects: getSubjectsFor(student.curriculum, student.grade),
      assessments: assessments.map(publicAssessment),
    });
  } catch (error) {
    console.error("Diagnostic list error:", error);
    return response.status(500).json({ error: "Unable to load diagnostics" });
  }
});

router.post("/", async (request, response) => {
  const userId = Number(response.locals.user?.id);
  const requestedSubject = String(request.body?.subject || "").trim();
  let assessment;
  try {
    const student = await studentFor(userId);
    if (!student)
      return response.status(404).json({ error: "Student profile not found" });
    const subject = getSubjectsFor(student.curriculum, student.grade).find(
      ({ name }) => name === requestedSubject
    );
    if (!subject)
      return response.status(400).json({ error: "Subject is not available" });

    const now = new Date();
    const existing = await prisma.diagnostic_assessments.findFirst({
      where: {
        user_id: userId,
        subject: subject.name,
        status: "ready",
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: "desc" },
    });
    if (existing)
      return response.json({
        success: true,
        reused: true,
        assessment: publicAssessment(existing),
      });

    const generating = await prisma.diagnostic_assessments.findFirst({
      where: {
        user_id: userId,
        subject: subject.name,
        status: "generating",
        createdAt: { gte: new Date(now.getTime() - 5 * 60 * 1000) },
      },
    });
    if (generating)
      return response.status(409).json({
        error: "This diagnostic is already being prepared. Try again shortly.",
      });

    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentStarts = await prisma.diagnostic_assessments.count({
      where: {
        user_id: userId,
        status: { not: "failed" },
        createdAt: { gte: dayAgo },
      },
    });
    if (recentStarts >= 3)
      return response.status(429).json({
        error: "You can start up to three diagnostic assessments per day.",
      });

    assessment = await prisma.diagnostic_assessments.create({
      data: {
        user_id: userId,
        subject: subject.name,
        curriculum: student.curriculum,
        academicLevel: student.academicLevel,
        grade: student.grade,
        status: "generating",
        questionCount: QUESTION_COUNT,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      },
    });

    const course = await prisma.courses.findFirst({
      where: {
        subject: subject.name,
        curriculum: student.curriculum,
        academicLevel: student.academicLevel,
        grade: student.grade,
      },
      select: {
        modules: { orderBy: { position: "asc" }, select: { title: true } },
      },
    });
    const courseTopics = (course?.modules || [])
      .map(({ title }) => title)
      .filter(Boolean);
    const preferredTopics =
      courseTopics.length >= 4 ? courseTopics.slice(0, 4) : [];
    const generated = await generateDiagnostic({
      student,
      subject: subject.name,
      preferredTopics,
    });
    const ready = await prisma.diagnostic_assessments.update({
      where: { id: assessment.id },
      data: {
        status: "ready",
        questions: generated.diagnostic,
        provider: generated.provider,
        model: generated.model,
      },
    });
    return response.status(201).json({
      success: true,
      assessment: publicAssessment(ready),
    });
  } catch (error) {
    if (assessment?.id)
      await prisma.diagnostic_assessments
        .update({ where: { id: assessment.id }, data: { status: "failed" } })
        .catch(() => {});
    console.error("Diagnostic generation error:", error);
    return response
      .status(502)
      .json({ error: "Unable to generate this diagnostic right now" });
  }
});

router.get("/:id", async (request, response) => {
  try {
    if (!UUID.test(request.params.id))
      return response.status(404).json({ error: "Diagnostic not found" });
    const assessment = await prisma.diagnostic_assessments.findFirst({
      where: {
        id: request.params.id,
        user_id: Number(response.locals.user?.id),
      },
    });
    if (!assessment)
      return response.status(404).json({ error: "Diagnostic not found" });
    if (assessment.status === "ready" && assessment.expiresAt <= new Date()) {
      await prisma.diagnostic_assessments.update({
        where: { id: assessment.id },
        data: { status: "expired" },
      });
      return response
        .status(410)
        .json({ error: "This diagnostic has expired" });
    }
    return response.json({
      success: true,
      assessment: publicAssessment(assessment),
    });
  } catch (error) {
    console.error("Diagnostic read error:", error);
    return response.status(500).json({ error: "Unable to load diagnostic" });
  }
});

router.post("/:id/submit", async (request, response) => {
  try {
    const userId = Number(response.locals.user?.id);
    if (!UUID.test(request.params.id))
      return response.status(404).json({ error: "Diagnostic not found" });
    const assessment = await prisma.diagnostic_assessments.findFirst({
      where: { id: request.params.id, user_id: userId },
    });
    if (!assessment)
      return response.status(404).json({ error: "Diagnostic not found" });
    if (assessment.status === "submitted")
      return response.json({
        success: true,
        assessment: publicAssessment(assessment),
      });
    if (assessment.status !== "ready" || assessment.expiresAt <= new Date())
      return response
        .status(409)
        .json({ error: "Diagnostic is not available" });

    const answers = request.body?.answers;
    if (!Array.isArray(answers) || answers.length > assessment.questionCount)
      return response.status(400).json({ error: "Invalid diagnostic answers" });
    const questionIds = new Set(
      assessment.questions.questions.map(({ id }) => id)
    );
    const seen = new Set();
    const normalizedAnswers = answers.map((answer) => {
      const questionId = String(answer?.questionId || "");
      const optionId = String(answer?.optionId || "").toUpperCase();
      if (
        !questionIds.has(questionId) ||
        seen.has(questionId) ||
        !["A", "B", "C", "D"].includes(optionId)
      )
        throw new Error("INVALID_ANSWERS");
      seen.add(questionId);
      return { questionId, optionId };
    });
    const report = gradeDiagnostic(assessment, normalizedAnswers);

    const submitted = await prisma.$transaction(async (transaction) => {
      const claim = await transaction.diagnostic_assessments.updateMany({
        where: { id: assessment.id, user_id: userId, status: "ready" },
        data: {
          status: "submitted",
          responses: normalizedAnswers,
          report,
          overallScore: report.overallScore,
          submittedAt: new Date(),
        },
      });
      if (claim.count === 0)
        return transaction.diagnostic_assessments.findUnique({
          where: { id: assessment.id },
        });

      for (const topic of report.topics) {
        await transaction.quiz_results.create({
          data: {
            user_id: userId,
            subject: assessment.subject,
            topic: topic.name,
            score: topic.score,
            total_questions: topic.total,
            correct_answers: topic.correct,
            detailed_feedback: topic.questions,
            diagnostic_assessment_id: assessment.id,
          },
        });
      }
      for (const question of report.questions.filter(({ isCorrect }) => !isCorrect)) {
        await seedReviewItem(transaction, {
          userId,
          sourceType: "diagnostic",
          sourceId: assessment.id,
          sourceQuestionKey: question.questionId,
          subject: assessment.subject,
          topic: question.topic,
          prompt: question.prompt,
          options: question.options,
          correctOption: question.correctOption,
          explanation: question.explanation,
          occurredAt: new Date(),
        });
      }
      return transaction.diagnostic_assessments.findUnique({
        where: { id: assessment.id },
      });
    });
    return response.json({
      success: true,
      assessment: publicAssessment(submitted),
    });
  } catch (error) {
    if (error.message === "INVALID_ANSWERS")
      return response.status(400).json({ error: "Invalid diagnostic answers" });
    console.error("Diagnostic submission error:", error);
    return response.status(500).json({ error: "Unable to submit diagnostic" });
  }
});

module.exports = router;

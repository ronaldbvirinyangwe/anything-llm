const express = require("express");
const prisma = require("../utils/prisma");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  flexUserRoleValid,
  ROLES,
} = require("../utils/middleware/multiUserProtected");
const {
  CORRECT_INTERVALS,
  addDays,
  dateOnly,
  publicReviewItem,
} = require("../utils/review");

const router = express.Router();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.use(validatedRequest, flexUserRoleValid([ROLES.student]));

function timezoneOffset(request) {
  const value = Number(request.query.timezoneOffset ?? request.body?.timezoneOffset ?? 0);
  return Number.isFinite(value) && value >= -840 && value <= 840 ? value : 0;
}

router.get("/today", async (request, response) => {
  try {
    const userId = Number(response.locals.user?.id);
    const today = dateOnly(new Date(), timezoneOffset(request));
    const subject = String(request.query.subject || "").trim();
    const topic = String(request.query.topic || "").trim();
    const itemWhere = {
      userId,
      status: "active",
      dueOn: { lte: today },
      ...(subject ? { subject: { equals: subject, mode: "insensitive" } } : {}),
      ...(topic ? { topic: { equals: topic, mode: "insensitive" } } : {}),
    };
    const [items, active, mastered, attempts] = await Promise.all([
      prisma.review_items.findMany({
        where: itemWhere,
        orderBy: [
          { dueOn: "asc" },
          { subject: "asc" },
          { topic: "asc" },
          { id: "asc" },
        ],
        take: 20,
      }),
      prisma.review_items.count({ where: { userId, status: "active" } }),
      prisma.review_items.count({ where: { userId, status: "mastered" } }),
      prisma.review_attempts.findMany({
        where: { userId, evidenceApplied: true },
        select: { correct: true },
      }),
    ]);
    const correct = attempts.filter((attempt) => attempt.correct).length;
    return response.json({
      success: true,
      date: today.toISOString().slice(0, 10),
      summary: {
        due: items.length,
        overdue: items.filter((item) => item.dueOn < today).length,
        active,
        mastered,
        retentionPercent: attempts.length
          ? Math.round((correct / attempts.length) * 100)
          : null,
      },
      items: items.map((item) => publicReviewItem(item, today)),
    });
  } catch (error) {
    console.error("Review queue error:", error);
    return response.status(500).json({ error: "Unable to load review queue" });
  }
});

router.post("/:id/attempt", async (request, response) => {
  const userId = Number(response.locals.user?.id);
  const operationId = String(request.get("Idempotency-Key") || "").trim();
  const selectedOption = String(request.body?.selectedOption || "").toUpperCase();
  const attemptedAt = new Date(request.body?.attemptedAt);
  if (!UUID.test(request.params.id))
    return response.status(404).json({ error: "Review item not found" });
  if (!UUID.test(operationId))
    return response.status(400).json({ error: "Idempotency-Key is required" });
  if (!["A", "B", "C", "D"].includes(selectedOption))
    return response.status(400).json({ error: "Select a valid answer" });
  if (
    Number.isNaN(attemptedAt.getTime()) ||
    attemptedAt > new Date(Date.now() + 5 * 60_000)
  )
    return response.status(400).json({ error: "Invalid attempt time" });

  try {
    const replay = await prisma.review_attempts.findUnique({
      where: {
        userId_clientOperationId: { userId, clientOperationId: operationId },
      },
      include: { item: true },
    });
    if (replay) {
      if (replay.reviewItemId !== request.params.id)
        return response.status(409).json({ error: "Idempotency key reused" });
      return response.json({
        success: true,
        idempotentReplay: true,
        attempt: replay,
        item: replay.item,
      });
    }

    const result = await prisma.$transaction(async (transaction) => {
      const item = await transaction.review_items.findFirst({
        where: { id: request.params.id, userId },
      });
      if (!item) throw new Error("NOT_FOUND");
      const attemptedOn = dateOnly(attemptedAt, timezoneOffset(request));
      const correct = selectedOption === item.correctOption;
      const evidenceApplied = item.status === "active" && attemptedOn >= item.dueOn;
      const disposition = evidenceApplied
        ? "evidence"
        : item.status === "mastered"
          ? "already_mastered"
          : "not_due";
      let stepAfter = item.step;
      let dueOnAfter = item.dueOn;
      let statusAfter = item.status;
      let masteredAt = item.masteredAt;

      if (evidenceApplied && !correct) {
        stepAfter = 0;
        dueOnAfter = addDays(attemptedOn, 1);
        statusAfter = "active";
        masteredAt = null;
      } else if (evidenceApplied && item.step < CORRECT_INTERVALS.length) {
        dueOnAfter = addDays(attemptedOn, CORRECT_INTERVALS[item.step]);
        stepAfter = item.step + 1;
      } else if (evidenceApplied) {
        statusAfter = "mastered";
        dueOnAfter = null;
        masteredAt = attemptedAt;
      }

      const attempt = await transaction.review_attempts.create({
        data: {
          userId,
          reviewItemId: item.id,
          clientOperationId: operationId,
          selectedOption,
          correct,
          evidenceApplied,
          disposition,
          stepBefore: item.step,
          stepAfter,
          dueOnAfter,
          attemptedAt,
        },
      });
      const updated = evidenceApplied
        ? await transaction.review_items.update({
            where: { id: item.id },
            data: {
              step: stepAfter,
              dueOn: dueOnAfter,
              status: statusAfter,
              masteredAt,
            },
          })
        : item;
      return { attempt, item: updated, correctOption: item.correctOption, explanation: item.explanation };
    });
    return response.status(201).json({
      success: true,
      idempotentReplay: false,
      ...result,
    });
  } catch (error) {
    if (error.message === "NOT_FOUND")
      return response.status(404).json({ error: "Review item not found" });
    console.error("Review attempt error:", error);
    return response.status(500).json({ error: "Unable to save review attempt" });
  }
});

module.exports = router;

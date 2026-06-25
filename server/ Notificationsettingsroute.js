// routes/parentNotificationSettings.js

const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticateToken } = require("../middleware/auth");

// GET /api/system/parent/notification-settings/:childId
router.get("/notification-settings/:childId", authenticateToken, async (req, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user.id;

    const parentRecord = await prisma.parents.findFirst({
      where: { user_id: userId },
    });

    if (!parentRecord) {
      return res.status(404).json({ success: false, error: "Parent record not found" });
    }

    const settings = await prisma.parentNotificationSettings.findFirst({
      where: { parentId: parentRecord.id, studentId: parseInt(childId) },
    });

    res.json({
      success: true,
      settings: settings || {
        weeklyDigest: true,
        alertsEnabled: true,
        alertThreshold: 40,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

// POST /api/system/parent/notification-settings
router.get("/notification-settings/:childId", authenticateToken, async (req, res) => {
  try {
    const { childId } = req.params;
    const userId = req.user.id;

    const parentRecord = await prisma.parents.findFirst({
      where: { user_id: userId },
    });

    if (!parentRecord) {
      return res.status(404).json({ success: false, error: "Parent record not found" });
    }

    const settings = await prisma.parentNotificationSettings.findFirst({
      where: { parentId: parentRecord.id, studentId: parseInt(childId) },
    });

    res.json({
      success: true,
      settings: settings || {
        weeklyDigest: true,
        alertsEnabled: true,
        alertThreshold: 40,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});
module.exports = router;

// ─────────────────────────────────────────────────────────────────
// WIRE INTO QUIZ SUBMISSION — add to your existing quiz submit handler
// ─────────────────────────────────────────────────────────────────
/*
const { sendLowScoreAlert } = require("../utils/parentNotifications");

// Inside your quiz submission route, after saving the result:
router.post("/quiz/submit", authenticateToken, async (req, res) => {
  const { quizId, answers } = req.body;
  const studentId = req.user.id;

  // ... your existing grading logic ...
  const score = calculateScore(answers);

  // Save result
  const result = await prisma.quizResult.create({
    data: { studentId, quizId, score, ... }
  });

  // Get child info for the alert
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: { quiz: { select: { subject: true } } }
  });

  // Fire low score alert — non-blocking, won't affect the response
  sendLowScoreAlert({
    childId: studentId,
    childName: student.name,
    subject: student.quiz?.subject || "General",
    score: Math.round(score),
    quizId,
  }).catch(console.error);

  res.json({ success: true, score, resultId: result.id });
});
*/
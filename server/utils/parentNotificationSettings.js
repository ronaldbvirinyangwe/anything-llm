const express = require("express");
const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const { authenticateToken } = require("./middleware/auth");

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

router.post("/notification-settings", authenticateToken, async (req, res) => {
  try {
    const { childId, weeklyDigest, alertsEnabled, alertThreshold } = req.body;
    const userId = req.user.id;

    const parentRecord = await prisma.parents.findFirst({
      where: { user_id: userId },
    });

    if (!parentRecord) {
      return res.status(404).json({ success: false, error: "Parent record not found" });
    }

    const parentId = parentRecord.id;

    const settings = await prisma.parentNotificationSettings.upsert({
      where: {
        parentId_studentId: { parentId, studentId: parseInt(childId) },
      },
      update: { weeklyDigest, alertsEnabled, alertThreshold },
      create: { parentId, studentId: parseInt(childId), weeklyDigest, alertsEnabled, alertThreshold },
    });

    res.json({ success: true, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

router.post("/parent-contact", authenticateToken, async (req, res) => {
  try {
    const { email } = req.body;
    const userId = Number(req.user.id);

    if (!email || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "Invalid email" });
    }

    const user = await prisma.users.findUnique({ where: { id: userId } });

    const result = await prisma.parents.upsert({
      where: { user_id: userId },
      update: { email },
      create: {
        user_id: userId,
        email,
        name: user?.username || user?.name || "Parent",
      },
    });

    res.json({ success: true, parent: result });
  } catch (err) {
    console.error("update-email error:", err);
    res.status(500).json({ success: false, error: "Failed to update email" });
  }
});
module.exports = router;


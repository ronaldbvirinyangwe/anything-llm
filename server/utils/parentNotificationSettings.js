const express = require("express");
const router = express.Router();
const prisma = require("./prisma");
const { validatedRequest } = require("./middleware/validatedRequest");
const { flexUserRoleValid, ROLES } = require("./middleware/multiUserProtected");

const parentOnly = [validatedRequest, flexUserRoleValid([ROLES.parent])];

router.get("/notification-settings/:childId", parentOnly, async (req, res) => {
  try {
    const childId = Number(req.params.childId);
    const userId = res.locals.user?.id;
    if (!Number.isInteger(childId) || !userId)
      return res
        .status(400)
        .json({ success: false, error: "Invalid child ID" });

    const parentRecord = await prisma.parents.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!parentRecord) {
      return res
        .status(404)
        .json({ success: false, error: "Parent record not found" });
    }

    const link = await prisma.parent_students.findFirst({
      where: { parentId: parentRecord.id, studentId: childId },
      select: { id: true },
    });
    if (!link)
      return res
        .status(403)
        .json({ success: false, error: "Child access denied" });

    const settings = await prisma.parentNotificationSettings.findFirst({
      where: { parentId: parentRecord.id, studentId: childId },
    });

    res.json({
      success: true,
      settings: settings || {
        weeklyDigest: true,
        alertsEnabled: true,
        alertThreshold: 70,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

router.post("/notification-settings", parentOnly, async (req, res) => {
  try {
    const { childId, weeklyDigest, alertsEnabled, alertThreshold } = req.body;
    const studentId = Number(childId);
    const threshold = Number(alertThreshold);
    const userId = res.locals.user?.id;
    if (
      !userId ||
      !Number.isInteger(studentId) ||
      typeof weeklyDigest !== "boolean" ||
      typeof alertsEnabled !== "boolean" ||
      !Number.isInteger(threshold) ||
      threshold < 0 ||
      threshold > 100
    )
      return res
        .status(400)
        .json({ success: false, error: "Invalid settings" });

    const parentRecord = await prisma.parents.findFirst({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!parentRecord) {
      return res
        .status(404)
        .json({ success: false, error: "Parent record not found" });
    }

    const parentId = parentRecord.id;
    const link = await prisma.parent_students.findFirst({
      where: { parentId, studentId },
      select: { id: true },
    });
    if (!link)
      return res
        .status(403)
        .json({ success: false, error: "Child access denied" });

    const settings = await prisma.parentNotificationSettings.upsert({
      where: {
        parentId_studentId: { parentId, studentId },
      },
      update: { weeklyDigest, alertsEnabled, alertThreshold: threshold },
      create: {
        parentId,
        studentId,
        weeklyDigest,
        alertsEnabled,
        alertThreshold: threshold,
      },
    });

    res.json({ success: true, settings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

router.post("/parent-contact", parentOnly, async (req, res) => {
  try {
    const { email } = req.body;
    const userId = res.locals.user?.id;

    if (
      !userId ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      return res.status(400).json({ success: false, error: "Invalid email" });
    }

    const result = await prisma.parents.updateMany({
      where: { user_id: userId },
      data: { email: email.trim() },
    });
    if (result.count === 0)
      return res
        .status(404)
        .json({ success: false, error: "Parent record not found" });

    res.json({ success: true });
  } catch (err) {
    console.error("update-email error:", err);
    res.status(500).json({ success: false, error: "Failed to update email" });
  }
});
module.exports = router;

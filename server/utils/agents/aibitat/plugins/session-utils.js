/**
 * session-utils.js
 *
 * Shared helpers for study session tracking.
 * Used by both study-context and study-tracker plugins.
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS = {
  PENDING: "pending",
  COMPLETE: "complete",
  MISSED: "missed",
  RESCHEDULED: "rescheduled",
};

// ─── Get the student's active study plan ─────────────────────────────────────
async function getActivePlan(userId, workspaceId) {
  if (!userId) return null;
  try {
    return await prisma.study_plans.findFirst({
      where: {
        user_id: Number(userId),
        workspace_id: Number(workspaceId),
        status: "active",
        exam_date: { gte: new Date() },
      },
      orderBy: { created_at: "desc" },
    });
  } catch (e) {
    console.error("[SessionUtils] getActivePlan failed:", e.message);
    return null;
  }
}

// ─── Parse sessions JSON safely ───────────────────────────────────────────────
function parseSessions(plan) {
  if (!plan) return [];
  try {
    if (Array.isArray(plan.sessions)) return plan.sessions;
    if (typeof plan.sessions === "string") return JSON.parse(plan.sessions);
    return [];
  } catch {
    return [];
  }
}

// ─── Get today's date as YYYY-MM-DD ──────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().split("T")[0];
}

// ─── Get YYYY-MM-DD N days from today ────────────────────────────────────────
function futureDateStr(daysAhead) {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split("T")[0];
}

// ─── Check if a date string is in the past ───────────────────────────────────
function isPast(dateStr) {
  return dateStr < todayStr();
}

// ─── Build initial sessions from plan_content ─────────────────────────────────
// Parses the generated plan text to extract scheduled topics per date.
// Falls back to evenly distributing topics across available days.
function buildInitialSessions(plan) {
  const sessions = [];
  const topics = Array.isArray(plan.topics) ? plan.topics : [];
  const daysOff = Array.isArray(plan.days_off) ? plan.days_off.map((d) => d.toLowerCase()) : [];

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const exam = new Date(plan.exam_date);
  exam.setHours(0, 0, 0, 0);

  // Collect all available study days between now and exam
  const studyDays = [];
  const cursor = new Date(start);
  while (cursor < exam) {
    const dayName = cursor.toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
    if (!daysOff.includes(dayName)) {
      studyDays.push(cursor.toISOString().split("T")[0]);
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  if (studyDays.length === 0 || topics.length === 0) return [];

  // Distribute topics evenly across available days
  const topicsPerDay = Math.ceil(topics.length / studyDays.length);
  let topicIdx = 0;

  for (const date of studyDays) {
    const dayTopics = topics.slice(topicIdx, topicIdx + topicsPerDay);
    topicIdx += topicsPerDay;
    for (const topic of dayTopics) {
      sessions.push({
        date,
        topic,
        status: STATUS.PENDING,
        completed_at: null,
        rescheduled_to: null,
        detected_from: null,
      });
    }
    if (topicIdx >= topics.length) break;
  }

  return sessions;
}

// ─── Find next available study day after a given date ────────────────────────
function nextStudyDay(afterDate, daysOff, examDate, existingSessions) {
  const daysOffLower = (daysOff || []).map((d) => d.toLowerCase());
  const exam = new Date(examDate);
  const cursor = new Date(afterDate);
  cursor.setDate(cursor.getDate() + 1);

  while (cursor < exam) {
    const dayName = cursor.toLocaleDateString("en-GB", { weekday: "long" }).toLowerCase();
    if (!daysOffLower.includes(dayName)) {
      return cursor.toISOString().split("T")[0];
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return null; // No room before exam
}

// ─── Detect missed sessions ───────────────────────────────────────────────────
// A session is missed if:
//   (a) its date has passed and status is still pending, OR
//   (b) last_active is >24h ago and the session was scheduled for yesterday
function detectMissed(sessions, lastActive) {
  const today = todayStr();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const inactiveOver24h =
    lastActive
      ? (Date.now() - new Date(lastActive).getTime()) > 24 * 60 * 60 * 1000
      : false;

  return sessions.filter((s) => {
    if (s.status !== STATUS.PENDING) return false;
    if (s.date < today) return true; // day passed
    if (s.date === yesterdayStr && inactiveOver24h) return true; // 24h inactive
    return false;
  });
}

// ─── Reschedule missed sessions ───────────────────────────────────────────────
function rescheduleMissed(sessions, daysOff, examDate) {
  const updated = [...sessions];
  const missed = updated.filter((s) => s.status === STATUS.MISSED);

  for (const session of missed) {
    // Find the last date currently in use
    const usedDates = updated.map((s) => s.rescheduled_to || s.date).sort();
    const lastDate = usedDates[usedDates.length - 1] || todayStr();
    const newDate = nextStudyDay(lastDate, daysOff, examDate, updated);

    const idx = updated.findIndex(
      (s) => s.date === session.date && s.topic === session.topic
    );
    if (idx !== -1) {
      updated[idx] = {
        ...updated[idx],
        status: STATUS.RESCHEDULED,
        rescheduled_to: newDate,
      };

      if (newDate) {
        updated.push({
          date: newDate,
          topic: session.topic,
          status: STATUS.PENDING,
          completed_at: null,
          rescheduled_to: null,
          detected_from: `rescheduled from ${session.date}`,
        });
      }
    }
  }

  return updated;
}

// ─── Save sessions back to DB ─────────────────────────────────────────────────
async function saveSessions(planId, sessions, extra = {}) {
  try {
    await prisma.study_plans.update({
      where: { id: planId },
      data: {
        sessions,
        last_active: new Date(),
        ...extra,
      },
    });
  } catch (e) {
    console.error("[SessionUtils] saveSessions failed:", e.message);
  }
}

// ─── Send AnythingLLM notification ────────────────────────────────────────────
async function sendNotification(userId, message) {
  try {
    await prisma.notifications.create({
      data: {
        message,
        read: false,
        created_at: new Date(),
        user: {
          connect: { id: Number(userId) }  // ← use relation connect
        }
      },
    });
    console.log(`[SessionUtils] Notification sent to user ${userId}: ${message}`);
  } catch (e) {
    console.error("[SessionUtils] sendNotification failed:", e.message);
  }
}

module.exports = {
  STATUS,
  getActivePlan,
  parseSessions,
  buildInitialSessions,
  detectMissed,
  rescheduleMissed,
  nextStudyDay,
  saveSessions,
  sendNotification,
  todayStr,
  futureDateStr,
  isPast,
};
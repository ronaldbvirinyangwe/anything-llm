// utils/parentNotifications.js
// Handles all parent-facing push notifications and weekly digest emails
// Requires: expo-server-sdk, @prisma/client, resend (npm install resend)

const { Expo } = require("expo-server-sdk");
const { Resend } = require("resend");
const { PrismaClient } = require("@prisma/client");

const expo = new Expo();
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const prisma = new PrismaClient();

const parentReportPath = (childId) => `/parent/reports/${childId}`;
const parentReportUrl = (childId) =>
  `${(process.env.APP_URL || "https://chikoro-ai.com").replace(/\/+$/, "")}${parentReportPath(childId)}`;

// ─────────────────────────────────────────────────────────────────
// 1. SEND PUSH TO PARENT
// ─────────────────────────────────────────────────────────────────
async function sendParentPush(parentUserId, { title, body, data }) {
  const tokens = await prisma.pushToken.findMany({
    where: { userId: parentUserId },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const messages = tokens
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => ({
      to: t.token,
      sound: "default",
      title,
      body,
      data,
      channelId: "parent_alerts",
    }));

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.status === "error") {
          console.error("Parent push error:", receipt.message);
          if (receipt.details?.error === "DeviceNotRegistered") {
            await prisma.pushToken.deleteMany({
              where: { token: receipt.details?.expoPushToken },
            });
          }
        }
      }
    } catch (err) {
      console.error("Parent push send error:", err);
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// 2. LOW SCORE ALERT
//    Call this from your quiz submission handler immediately
//    after saving a quiz result
//
//    Usage:
//    await sendLowScoreAlert({ childId, childName, subject, score, quizId })
// ─────────────────────────────────────────────────────────────────
async function sendLowScoreAlert({
  childId,
  childName,
  subject,
  score,
  quizId,
}) {
  const settings = await prisma.parentNotificationSettings.findMany({
    where: {
      studentId: childId,
      alertsEnabled: true,
      alertThreshold: { gte: score },
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          user_id: true,
          email: true, // ✅ included so we can send email alerts
        },
      },
    },
  });

  if (settings.length === 0) {
    console.log("No matching parent notification settings found.");
    return;
  }

  for (const setting of settings) {
    const { parent } = setting;

    // Push notification
    await sendParentPush(parent.user_id, {
      title: `⚠️ ${childName} needs support`,
      body: `${childName} scored ${score}% on a ${subject} quiz. Tap to view the report.`,
      data: {
        type: "low_score_alert",
        childId,
        quizId,
        link: parentReportPath(childId),
      },
    });

    // Email alert — only if parent has an email saved
    if (parent.email && resend) {
      try {
        await resend.emails.send({
          from: "Chikoro AI <alerts@chikoro-ai.com>",
          to: parent.email,
          subject: `⚠️ ${childName} scored ${score}% on a ${subject} quiz`,
          html: buildLowScoreEmailHtml({
            parentName: parent.name,
            childName,
            subject,
            score,
            threshold: setting.alertThreshold,
            childId,
          }),
        });
        console.log(
          `✅ Low score email sent to ${parent.email} for ${childName}`
        );
      } catch (err) {
        console.error(
          `❌ Failed to send low score email to ${parent.email}:`,
          err
        );
      }
    } else if (!parent.email) {
      console.log(`⚠️ No email for parent ${parent.name} — push only`);
    } else {
      console.log("⚠️ RESEND_API_KEY is not configured — push only");
    }

    console.log(
      `✅ Push sent to parent ${parent.name} (user_id: ${parent.user_id}) for ${childName}`
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// 3. WEEKLY DIGEST
//    Call this from a cron job every Sunday morning
//
//    Usage: await sendWeeklyDigestToAllParents()
// ─────────────────────────────────────────────────────────────────
async function sendWeeklyDigestToAllParents() {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Get all parents who have weekly digest enabled
  const settings = await prisma.parentNotificationSettings.findMany({
    where: { weeklyDigest: true },
    include: {
      parent: {
        select: {
          id: true,
          email: true,
          name: true,
          user_id: true, // ✅ needed for sendParentPush (PushToken references users.id)
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          grade: true,
          user_id: true,
        },
      },
    },
  });

  for (const setting of settings) {
    const { parent, student: child } = setting;
    const quizzes = await prisma.quiz_results.findMany({
      where: { user_id: child.user_id, submitted_at: { gte: weekAgo } },
      orderBy: { submitted_at: "desc" },
      select: { score: true, subject: true, submitted_at: true },
    });

    if (quizzes.length === 0) {
      // No activity this week — send a gentle nudge instead
      await sendParentPush(parent.user_id, {
        // ✅ was parent.id — fixed to parent.user_id
        title: `📚 ${child.name} hasn't been active this week`,
        body: "Encourage them to complete a quiz or flashcard session today.",
        data: {
          type: "weekly_nudge",
          childId: child.id,
          link: parentReportPath(child.id),
        },
      });
      continue;
    }

    // Compute weekly stats
    const avgScore = (
      quizzes.reduce((sum, q) => sum + parseFloat(q.score), 0) / quizzes.length
    ).toFixed(1);

    const subjectBreakdown = {};
    quizzes.forEach((q) => {
      const subj = q.subject || "General";
      if (!subjectBreakdown[subj])
        subjectBreakdown[subj] = { total: 0, count: 0 };
      subjectBreakdown[subj].total += parseFloat(q.score);
      subjectBreakdown[subj].count += 1;
    });

    const weakSubjects = Object.entries(subjectBreakdown)
      .map(([subj, data]) => ({ subj, avg: data.total / data.count }))
      .filter((s) => s.avg < 60)
      .map((s) => s.subj);

    const trend = computeTrend(quizzes);

    // Push notification summary
    await sendParentPush(parent.user_id, {
      // ✅ was parent.id — fixed to parent.user_id
      title: `📊 ${child.name}'s weekly report is ready`,
      body: `Average score this week: ${avgScore}%. Tap to view the full report.`,
      data: {
        type: "weekly_digest",
        childId: child.id,
        link: parentReportPath(child.id),
      },
    });

    // Weekly digest email — only if parent has an email saved
    if (parent.email && resend) {
      try {
        await resend.emails.send({
          from: "Chikoro AI <weekly@chikoro-ai.com>",
          to: parent.email,
          subject: `📊 ${child.name}'s Weekly Learning Report`,
          html: buildWeeklyDigestEmailHtml({
            parentName: parent.name,
            childName: child.name,
            grade: child.grade,
            quizCount: quizzes.length,
            avgScore,
            subjectBreakdown,
            weakSubjects,
            trend,
            childId: child.id,
          }),
        });
        console.log(
          `✅ Weekly digest sent to ${parent.email} for ${child.name}`
        );
      } catch (err) {
        console.error(
          `❌ Failed to send weekly digest to ${parent.email}:`,
          err
        );
      }
    } else if (parent.email) {
      console.log("⚠️ RESEND_API_KEY is not configured — push only");
    } else {
      console.log(
        `⚠️ No email for parent ${parent.name} — push sent, digest email skipped`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function computeTrend(quizzes) {
  if (quizzes.length < 2) return "stable";
  const recent = quizzes.slice(0, 3);
  const older = quizzes.slice(-3);
  const recentAvg =
    recent.reduce((s, q) => s + parseFloat(q.score), 0) / recent.length;
  const olderAvg =
    older.reduce((s, q) => s + parseFloat(q.score), 0) / older.length;
  if (recentAvg > olderAvg + 5) return "improving 📈";
  if (recentAvg < olderAvg - 5) return "declining 📉";
  return "stable ➡️";
}

function buildLowScoreEmailHtml({
  parentName,
  childName,
  subject,
  score,
  threshold,
  childId,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4f46e5);padding:32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Chikoro AI</h1>
      <p style="color:#c7d2fe;margin:6px 0 0;font-size:14px;">Parent Alert</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#334155;font-size:16px;margin:0 0 16px;">Hi ${parentName},</p>
      <p style="color:#334155;font-size:16px;line-height:1.6;margin:0 0 24px;">
        <strong>${childName}</strong> just completed a <strong>${subject}</strong> quiz and scored 
        <span style="color:#dc2626;font-weight:700;font-size:20px;">${score}%</span>.
        This is below your alert threshold of ${threshold}%.
      </p>

      <!-- Score card -->
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;font-weight:800;color:#dc2626;">${score}%</div>
        <div style="color:#64748b;font-size:14px;margin-top:4px;">${subject} · Below threshold</div>
      </div>

      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        This is a good time to check in with ${childName} about this subject and encourage them to review the material or try again.
      </p>

      <a href="${parentReportUrl(childId)}"
        style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;">
        View Full Report →
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
        You're receiving this because you enabled low score alerts in Chikoro AI.<br>
        <a href="https://chikoro-ai.com" style="color:#6366f1;">Manage notification preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function buildWeeklyDigestEmailHtml({
  parentName,
  childName,
  grade,
  quizCount,
  avgScore,
  subjectBreakdown,
  weakSubjects,
  trend,
  childId,
}) {
  const subjectRows = Object.entries(subjectBreakdown)
    .map(([subj, data]) => {
      const avg = (data.total / data.count).toFixed(1);
      const color = avg >= 70 ? "#16a34a" : avg >= 50 ? "#d97706" : "#dc2626";
      return `
        <tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155;">${subj}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:700;color:${color};text-align:right;">${avg}%</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#94a3b8;text-align:right;">${data.count} quiz${data.count > 1 ? "zes" : ""}</td>
        </tr>`;
    })
    .join("");

  const weakSection =
    weakSubjects.length > 0
      ? `<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:10px;padding:16px;margin:20px 0;">
        <strong style="color:#92400e;">⚠️ Needs attention:</strong>
        <span style="color:#78350f;"> ${weakSubjects.join(", ")}</span>
      </div>`
      : `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;margin:20px 0;">
        <strong style="color:#15803d;">✅ Strong week across all subjects!</strong>
      </div>`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,system-ui,sans-serif;">
  <div style="max-width:560px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e1b4b,#4f46e5);padding:32px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">Chikoro AI</h1>
      <p style="color:#c7d2fe;margin:6px 0 0;font-size:14px;">${childName}'s Weekly Learning Report</p>
    </div>

    <!-- Body -->
    <div style="padding:32px;">
      <p style="color:#334155;font-size:16px;margin:0 0 8px;">Hi ${parentName},</p>
      <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;">
        Here's how <strong>${childName}</strong> (${grade}) performed this week on Chikoro AI.
      </p>

      <!-- Top stats -->
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:24px;">
        <div style="background:#eff6ff;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#2563eb;">${avgScore}%</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Avg Score</div>
        </div>
        <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:800;color:#16a34a;">${quizCount}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Quizzes Done</div>
        </div>
        <div style="background:#faf5ff;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#7c3aed;">${trend}</div>
          <div style="font-size:12px;color:#64748b;margin-top:2px;">Trend</div>
        </div>
      </div>

      <!-- Subject breakdown -->
      <h3 style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 10px;">Subject Breakdown</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 14px;text-align:left;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Subject</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Average</th>
            <th style="padding:10px 14px;text-align:right;font-size:12px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Activity</th>
          </tr>
        </thead>
        <tbody>${subjectRows}</tbody>
      </table>

      ${weakSection}

      <a href="${parentReportUrl(childId)}"
        style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px;margin-top:8px;">
        View Full Report →
      </a>
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;text-align:center;">
        Sent every Sunday · Chikoro AI · chikoro-ai.com<br>
        <a href="${process.env.APP_URL}/parent/settings" style="color:#6366f1;">Unsubscribe or manage preferences</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

module.exports = {
  sendParentPush,
  sendLowScoreAlert,
  sendWeeklyDigestToAllParents,
};

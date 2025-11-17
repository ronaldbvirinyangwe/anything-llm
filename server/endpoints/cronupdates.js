const path = require("path");
require("dotenv").config({
  path: path.resolve(__dirname, "../.env.development"),
});
const { PrismaClient, SubscriptionStatus } = require("@prisma/client");
const prisma = new PrismaClient();
const { Paynow } = require("paynow");
const cron = require("node-cron");
const { connectedClients } = require("../utils/websocket");

// Helper to create Paynow
function makePaynow() {
  const paynow = new Paynow(
    process.env.PAYNOW_INTEGRATION_ID,
    process.env.PAYNOW_INTEGRATION_KEY
  );
  paynow.resultUrl = process.env.PAYNOW_RESULT_URL || "http://localhost:3000";
  paynow.returnUrl =
    process.env.PAYNOW_RETURN_URL ||
    "http://example.com/return?gateway=paynow";
  return paynow;
}

/**
 * Send WebSocket notification to a student
 */
function notifyStudent(userId, payload) {
  const ws = connectedClients.get(userId);
  if (ws && ws.readyState === 1) { // 1 = WebSocket.OPEN
    try {
      ws.send(JSON.stringify(payload));
      console.log(`✅ Sent notification to user ${userId}:`, payload.type);
    } catch (err) {
      console.error(`❌ Failed to send WS to user ${userId}:`, err.message);
    }
  } else {
    console.log(`⚠️ User ${userId} not connected via WebSocket`);
  }
}

/**
 * CRON JOB: Runs every hour
 * 1. Expire paid subscriptions that are past their expiration date
 * 2. Poll pending payments to check if they've been completed
 * 3. Notify users about their subscription status
 */
cron.schedule("0 * * * *", async () => { // Runs every hour
  const now = new Date();
  console.log(`⏰ Running subscription check at ${now.toISOString()}`);

  try {
    // ========================================
    // 1️⃣ EXPIRE PAID SUBSCRIPTIONS
    // ========================================
    const expiredStudents = await prisma.students.findMany({
      where: {
        subscription_status: SubscriptionStatus.paid,
        subscription_expiration_date: { lt: now },
      },
    });

    if (expiredStudents.length > 0) {
      console.log(`⏰ Found ${expiredStudents.length} expired subscriptions`);

      // Update all expired students to 'none'
      await prisma.students.updateMany({
        where: {
          subscription_status: SubscriptionStatus.paid,
          subscription_expiration_date: { lt: now },
        },
        data: {
          subscription_status: SubscriptionStatus.none,
        },
      });

      // Notify each expired student via WebSocket
      expiredStudents.forEach((student) => {
        notifyStudent(student.user_id, {
          type: "subscription_status",
          status: "expired",
          redirect: "/payment",
          message: "Your subscription has expired. Please renew to continue using Chikoro AI.",
        });
      });

      console.log(`✅ Expired ${expiredStudents.length} subscriptions`);
    }

    // ========================================
    // 2️⃣ POLL PENDING PAYMENTS
    // ========================================
    const pendingStudents = await prisma.students.findMany({
      where: {
        subscription_status: SubscriptionStatus.pending,
        subscription_payment_poll_url: { not: null },
      },
    });

    if (pendingStudents.length > 0) {
      console.log(`💳 Polling ${pendingStudents.length} pending payments`);
    }

    for (const student of pendingStudents) {
      const paynow = makePaynow();
      try {
        const status = await paynow.pollTransaction(
          student.subscription_payment_poll_url
        );

        if (status && status.status === "paid") {
          // ✅ Payment successful - activate subscription
          const THIRTY_DAYS_MS = 1000 * 60 * 60 * 24 * 30;
          const expirationDate = new Date(Date.now() + THIRTY_DAYS_MS);

          await prisma.students.update({
            where: { id: student.id },
            data: {
              subscription_status: SubscriptionStatus.paid,
              subscription_expiration_date: expirationDate,
              subscription_payment_poll_url: null,
            },
          });

          notifyStudent(student.user_id, {
            type: "subscription_status",
            status: "paid",
            redirect: null,
            message: "🎉 Payment confirmed! Your subscription is now active.",
          });

          console.log(`✅ Activated subscription for student ${student.id}`);
        } else if (status && status.status === "cancelled") {
          // ❌ Payment cancelled - reset to none
          await prisma.students.update({
            where: { id: student.id },
            data: {
              subscription_status: SubscriptionStatus.none,
              subscription_payment_poll_url: null,
            },
          });

          notifyStudent(student.user_id, {
            type: "subscription_status",
            status: "cancelled",
            redirect: "/payment",
            message: "Your payment was cancelled. Please try again to activate your subscription.",
          });

          console.log(`❌ Payment cancelled for student ${student.id}`);
        } else {
          // ⏳ Still pending - send reminder
          notifyStudent(student.user_id, {
            type: "subscription_status",
            status: "pending",
            redirect: "/payment",
            message: "Payment pending. Please complete your payment via Paynow.",
          });
        }
      } catch (err) {
        console.error(`❌ Error polling for student ${student.id}:`, err.message);
        
        // If polling fails, notify the user
        notifyStudent(student.user_id, {
          type: "subscription_status",
          status: "error",
          redirect: "/payment",
          message: "Unable to verify payment status. Please contact support if you've already paid.",
        });
      }
    }

    // ========================================
    // 3️⃣ REMIND STUDENTS WITH NO SUBSCRIPTION
    // ========================================
    const unsubscribedStudents = await prisma.students.findMany({
      where: {
        subscription_status: SubscriptionStatus.none,
      },
    });

    if (unsubscribedStudents.length > 0) {
      console.log(`📢 Found ${unsubscribedStudents.length} unsubscribed students`);

      unsubscribedStudents.forEach((student) => {
        notifyStudent(student.user_id, {
          type: "subscription_status",
          status: "none",
          redirect: "/payment",
          message: "You need an active subscription to use Chikoro AI. Subscribe now!",
        });
      });
    }

    console.log(`✅ Subscription check completed at ${new Date().toISOString()}`);
  } catch (err) {
    console.error("❌ Cron job error:", err.message);
    console.error(err);
  }
});

console.log("✅ Subscription cron job initialized (runs every hour)");
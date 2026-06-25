// cron/weeklyDigest.js
// Run this file with node-cron inside your Express server,
// OR as a standalone script triggered by a GitHub Action / crontab

// ─── Option A: node-cron (add to your server.js or app.js) ───────
const cron = require("node-cron");
const { sendWeeklyDigestToAllParents } = require("../utils/Parentnotifications");

// Every Sunday at 7:00 AM CAT (UTC+2 = 5:00 AM UTC)
cron.schedule("0 5 * * 0", async () => {
  console.log("📬 Running weekly digest job...");
  try {
    await sendWeeklyDigestToAllParents();
    console.log("✅ Weekly digest complete");
  } catch (err) {
    console.error("❌ Weekly digest failed:", err);
  }
});

console.log("⏰ Weekly digest cron registered — fires every Sunday 7am CAT");


// ─── Option B: Standalone script (run via crontab or GitHub Action) ─
// Uncomment below and run with: node cron/weeklyDigest.js
//
// const { sendWeeklyDigestToAllParents } = require("../utils/parentNotifications");
// sendWeeklyDigestToAllParents()
//   .then(() => { console.log("Done"); process.exit(0); })
//   .catch((err) => { console.error(err); process.exit(1); });
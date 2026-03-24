const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function sendPushNotification(userId, { title, body, data }) {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });

  if (tokens.length === 0) return;

  const messages = tokens
    .filter(t => Expo.isExpoPushToken(t.token))
    .map(t => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data,
      channelId: 'assignments',
    }));

  const chunks = expo.chunkPushNotifications(messages);
  const receiptIds = [];

  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      for (const receipt of receipts) {
        if (receipt.id) receiptIds.push(receipt.id);
      }
    } catch (err) {
      console.error('Push send error:', err);
    }
  }

  // Check receipts and clean up dead tokens
  if (receiptIds.length > 0) {
    const receiptChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
    for (const chunk of receiptChunks) {
      try {
        const receiptsById = await expo.getPushNotificationReceiptsAsync(chunk);
        for (const [id, receipt] of Object.entries(receiptsById)) {
          if (receipt.status === 'error') {
            console.error(`Push receipt error for ${id}:`, receipt.message);
            if (receipt.details?.error === 'DeviceNotRegistered') {
              // Token is dead — find and delete it
              const msg = messages.find(m => m.to === receipt.details?.expoPushToken);
              if (msg?.to) {
                await prisma.pushToken.deleteMany({ where: { token: msg.to } });
                console.log('🗑️ Removed stale token:', msg.to);
              }
            }
          }
        }
      } catch (err) {
        console.error('Receipt check error:', err);
      }
    }
  }
}

module.exports = { sendPushNotification };

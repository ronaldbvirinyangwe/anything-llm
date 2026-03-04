// utils/pushNotifications.js
const { Expo } = require('expo-server-sdk');
const expo = new Expo();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function sendPushNotification(userId, { title, body, data }) {
  // Get all push tokens for this user
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
      data, // passes through to the app when tapped
      channelId: 'assignments', // Android channel
    }));

  // Expo recommends sending in chunks
  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    try {
      const receipts = await expo.sendPushNotificationsAsync(chunk);
      console.log('📤 Push sent:', receipts);
    } catch (err) {
      console.error('Push send error:', err);
    }
  }
}

module.exports = { sendPushNotification };
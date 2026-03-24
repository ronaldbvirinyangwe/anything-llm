// test-push.js (run from your backend folder)
const { PrismaClient } = require('@prisma/client');
const { sendPushNotification } = require('../utils/pushNotifications');

const prisma = new PrismaClient();

async function test() {
  // Replace with your actual user ID from the PushToken table
  const userId = 3; 

  console.log('🔍 Looking up tokens for user', userId);
  const tokens = await prisma.pushToken.findMany({ where: { userId } });
  console.log('📱 Found tokens:', tokens);

  if (tokens.length === 0) {
    console.log('❌ No push tokens found. Open the app on a real device first.');
    return;
  }

  await sendPushNotification(userId, {
    title: '🧪 Test Notification',
    body: 'If you see this, push notifications work!',
    data: { type: 'quiz_assigned', link: '/student/quiz/TEST123' },
  });

  console.log('✅ Push sent! Check your phone.');
}

test().catch(console.error);
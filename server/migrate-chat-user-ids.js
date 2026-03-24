/**
 * REVERT script: restore workspace_chats.user_id to pre-migration state
 *
 * The previous migration scripts changed user_id values to use users.id.
 * This script reverses that — setting user_id back to profile.id
 * (students.id / teachers.id / parents.id), which is what the app was
 * using before the validatedRequest.js bug fix.
 *
 * Run once:  node server/migrate-chat-user-ids.js
 */

"use strict";

const prisma = require("./utils/prisma");

async function revert() {
  console.log("Reverting workspace_chats.user_id to original profile-id state...\n");

  const workspaceUsers = await prisma.workspace_users.findMany();

  let totalReverted = 0;
  let totalWorkspaces = 0;

  for (const wu of workspaceUsers) {
    const usersId = wu.user_id;
    const workspaceId = wu.workspace_id;

    const user = await prisma.users.findUnique({ where: { id: usersId } });
    if (!user) continue;

    let profile = null;
    if (user.role === "student") {
      profile = await prisma.students.findFirst({ where: { user_id: usersId } });
    } else if (user.role === "teacher") {
      profile = await prisma.teachers.findFirst({ where: { user_id: usersId } });
    } else if (user.role === "parent") {
      profile = await prisma.parents.findFirst({ where: { user_id: usersId } });
    }

    // Only revert if profile exists and its id differs from users.id
    if (!profile || profile.id === usersId) continue;

    const result = await prisma.workspace_chats.updateMany({
      where: { workspaceId, user_id: usersId },
      data: { user_id: profile.id },
    });

    if (result.count > 0) {
      totalWorkspaces++;
      console.log(
        `workspace ${workspaceId} (users.id=${usersId} → profile.id=${profile.id}, ${user.role} "${profile.name}") — reverted ${result.count} chat(s)`
      );
      totalReverted += result.count;
    }
  }

  console.log(
    `\nDone. Reverted ${totalReverted} chat(s) across ${totalWorkspaces} workspace(s).`
  );
  await prisma.$disconnect();
}

revert().catch((err) => {
  console.error("Revert failed:", err);
  prisma.$disconnect();
  process.exit(1);
});

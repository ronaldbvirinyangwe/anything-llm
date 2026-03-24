/**
 * Fixes bulk-enrolled students whose role was left as "default" instead of "student".
 * Run: node fix-bulk-roles.js
 */

const prisma = require("./utils/prisma");

async function main() {
  // Find all users who have a students record but role is "default" (not admin/manager/teacher/student)
  const wrongRoleUsers = await prisma.users.findMany({
    where: {
      role: "default",
      students: { some: {} },
    },
    select: { id: true, username: true, role: true },
  });

  console.log(`Found ${wrongRoleUsers.length} enrolled students with wrong role:\n`);

  let fixed = 0;
  for (const u of wrongRoleUsers) {
    console.log(`  fixing ${u.username} (role: ${u.role} → student)`);
    await prisma.users.update({
      where: { id: u.id },
      data: { role: "student" },
    });
    fixed++;
  }

  console.log(`\nDone. Fixed ${fixed} users.`);
  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await prisma.$disconnect();
  process.exit(1);
});

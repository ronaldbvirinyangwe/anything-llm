const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function debugIdentity() {
  console.log("🕵️  IDENTITY INVESTIGATION\n");

  // ─── 1. Does users.id = 136 exist? ───────────────────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 1: users WHERE id = 136");
  const user136 = await prisma.users.findUnique({ where: { id: 136 } });
  console.log(user136 ? `  ✅ Found: ${JSON.stringify(user136)}` : "  ❌ No row.");

  // ─── 2. Does users.id = 199 exist? ───────────────────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 2: users WHERE id = 199");
  const user199 = await prisma.users.findUnique({ where: { id: 199 } });
  console.log(user199 ? `  ✅ Found: ${JSON.stringify(user199)}` : "  ❌ No row.");

  // ─── 3. students row where students.id = 136 ─────────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 3: students WHERE id = 136");
  const student136 = await prisma.students.findUnique({ where: { id: 136 } });
  console.log(student136 ? `  ✅ Found: ${JSON.stringify(student136)}` : "  ❌ No row.");

  // ─── 4. students row where students.user_id = 199 ────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 4: students WHERE user_id = 199");
  const studentOfUser199 = await prisma.students.findFirst({ where: { user_id: 199 } });
  console.log(studentOfUser199 ? `  ✅ Found: ${JSON.stringify(studentOfUser199)}` : "  ❌ No row.");

  // ─── 5. students row where students.user_id = 136 ────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 5: students WHERE user_id = 136");
  const studentOfUser136 = await prisma.students.findFirst({ where: { user_id: 136 } });
  console.log(studentOfUser136 ? `  ✅ Found: ${JSON.stringify(studentOfUser136)}` : "  ❌ No row.");

  // ─── 6. workspace_users referencing 136 or 199 ───────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 6: workspace_users WHERE user_id IN (136, 199)");
  const wsUsers = await prisma.workspace_users.findMany({
    where: { user_id: { in: [136, 199] } },
  });
  console.log(wsUsers.length ? `  ✅ Found: ${JSON.stringify(wsUsers)}` : "  ❌ No rows.");

  // ─── 7. All students — show id vs user_id mapping ────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 7: ALL students (id → user_id mapping)");
  const allStudents = await prisma.students.findMany({
    select: { id: true, user_id: true, name: true },
  });
  console.log(JSON.stringify(allStudents, null, 2));

  // ─── 8. All users — show the full users table ────────────────────
  console.log("--------------------------------------------------");
  console.log("CHECK 8: ALL users");
  const allUsers = await prisma.users.findMany({
    select: { id: true, username: true, role: true },
  });
  console.log(JSON.stringify(allUsers, null, 2));

  console.log("--------------------------------------------------\n");
}

debugIdentity()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
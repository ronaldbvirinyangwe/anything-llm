/**
 * Bulk student enrolment script.
 * Mirrors the logic in POST /system/enrol/student.
 * Run from the server/ directory: node bulk-enrol-students.js
 */

const prisma = require("./utils/prisma");
const { Workspace } = require("./models/workspace");

// curriculum assumed ZIMSEC for all; adjust if needed
const CURRICULUM = "ZIMSEC";
const ACADEMIC_LEVEL = "secondary";

const students = [
  // username, display name, grade, age
  // ── Form 1 ──────────────────────────────
  { username: "parakletos",     name: "Parakletos",      grade: "Form 1", age: 13 },
  { username: "timukudzei",     name: "Timukudzei",      grade: "Form 1", age: 13 },
  { username: "izwirashe",      name: "Izwirashe",       grade: "Form 1", age: 13 },
  { username: "victory",        name: "Victory",         grade: "Form 1", age: 13 },
  { username: "andrea",         name: "Andrea",          grade: "Form 1", age: 13 },
  { username: "michael",        name: "Michael",         grade: "Form 1", age: 13 },
  { username: "kiara",          name: "Kiara",           grade: "Form 1", age: 13 },
  { username: "jemima",         name: "Jemima",          grade: "Form 1", age: 13 },
  { username: "shamiso",        name: "Shamiso",         grade: "Form 1", age: 13 },

  // ── Form 2 ──────────────────────────────
  { username: "chipo",          name: "Chipo",           grade: "Form 2", age: 14 },
  { username: "nelisiwe",       name: "Nelisiwe",        grade: "Form 2", age: 14 },
  { username: "ruvarashe",      name: "Ruvarashe",       grade: "Form 2", age: 14 },
  { username: "resegofetse",    name: "Resegofetse",     grade: "Form 2", age: 14 },
  { username: "ropafadzo",      name: "Ropafadzo",       grade: "Form 2", age: 14 },
  { username: "tariro",         name: "Tariro",          grade: "Form 2", age: 14 },
  { username: "nicole",         name: "Nicole",          grade: "Form 2", age: 14 },
  { username: "lynn",           name: "Lynn",            grade: "Form 2", age: 14 },
  { username: "humaira",        name: "Humaira",         grade: "Form 2", age: 14 },
  { username: "annabelle",      name: "Annabelle",       grade: "Form 2", age: 14 },
  { username: "jacob",          name: "Jacob",           grade: "Form 2", age: 14 },
  { username: "miguel",         name: "Miguel",          grade: "Form 2", age: 14 },
  { username: "brayden",        name: "Brayden",         grade: "Form 2", age: 14 },
  { username: "panashe",        name: "Panashe",         grade: "Form 2", age: 14 },
  { username: "darren",         name: "Darren",          grade: "Form 2", age: 14 },

  // ── Form 3 ──────────────────────────────
  { username: "lexie",          name: "Lexie",           grade: "Form 3", age: 15 },
  { username: "claire",         name: "Claire",          grade: "Form 3", age: 15 },
  { username: "charmilla",      name: "Charmilla",       grade: "Form 3", age: 15 },
  { username: "gladys",         name: "Gladys",          grade: "Form 3", age: 15 },
  { username: "kayla",          name: "Kayla",           grade: "Form 3", age: 15 },
  { username: "glory",          name: "Glory",           grade: "Form 3", age: 15 },
  { username: "tavonga",        name: "Tavonga",         grade: "Form 3", age: 15 },
  { username: "anna",           name: "Anna",            grade: "Form 3", age: 15 },
  { username: "unathi",         name: "Unathi",          grade: "Form 3", age: 15 },
  { username: "charmainem",     name: "Charmaine",       grade: "Form 3", age: 15 },
  { username: "russel",         name: "Russel",          grade: "Form 3", age: 15 },
  { username: "emmanuel",       name: "Emmanuel",        grade: "Form 3", age: 15 },
  { username: "tafara",         name: "Tafara",          grade: "Form 3", age: 15 },
  { username: "mike",           name: "Mike",            grade: "Form 3", age: 15 },
  { username: "darryl",         name: "Darryl",          grade: "Form 3", age: 15 },
  { username: "prince",         name: "Prince",          grade: "Form 3", age: 15 },
  { username: "tamiriraishe",   name: "Tamiriraishe",    grade: "Form 3", age: 15 },

  // ── Form 4 ──────────────────────────────
  { username: "hailey",         name: "Hailey",          grade: "Form 4", age: 16 },
  { username: "matidaishe",     name: "Matidaishe",      grade: "Form 4", age: 16 },
  { username: "chloe",          name: "Chloe",           grade: "Form 4", age: 16 },
  { username: "ruvarashem",     name: "Ruvarashe",       grade: "Form 4", age: 16 },
  { username: "charmaine",      name: "Charmaine",       grade: "Form 4", age: 16 },
  { username: "keyshia",        name: "Keyshia",         grade: "Form 4", age: 16 },
  { username: "anotida",        name: "Anotida",         grade: "Form 4", age: 16 },
  { username: "jada",           name: "Jada",            grade: "Form 4", age: 16 },
  { username: "rejoice",        name: "Rejoice",         grade: "Form 4", age: 16 },
  { username: "heather",        name: "Heather",         grade: "Form 4", age: 16 },
  { username: "tawananyasha",   name: "Tawananyasha",    grade: "Form 4", age: 16 },
  { username: "zuvarashe",      name: "Zuvarashe",       grade: "Form 4", age: 16 },
  { username: "michealstation", name: "Micheal Station", grade: "Form 4", age: 16 },
  { username: "michealsongore", name: "MichealSongore",  grade: "Form 4", age: 16 },
  { username: "panashe1",       name: "Panashe",         grade: "Form 4", age: 16 },
  { username: "kudashe",        name: "Kudashe",         grade: "Form 4", age: 16 },
  { username: "donelle",        name: "Donelle",         grade: "Form 4", age: 16 },
  { username: "abraar",         name: "Abraar",          grade: "Form 4", age: 16 },
  { username: "tavimbanashe",   name: "Tavimbanashe",    grade: "Form 4", age: 16 },
  { username: "leone",          name: "Leone",           grade: "Form 4", age: 16 },
  { username: "munashe",        name: "Munashe",         grade: "Form 4", age: 16 },
  { username: "emmanuelmutasa", name: "Emmanuel",        grade: "Form 4", age: 16 },

  // ── U6 (Upper 6) ────────────────────────
  { username: "rutendo",        name: "Rutendo",         grade: "Upper 6", age: 18 },
  { username: "thabani",        name: "Thabani",         grade: "Upper 6", age: 18 },
  { username: "ethan",          name: "Ethan",           grade: "Upper 6", age: 18 },
  { username: "makanaka",       name: "Makanaka",        grade: "Upper 6", age: 18 },
  { username: "charles",        name: "Charles",         grade: "Upper 6", age: 18 },
  { username: "ayanda",         name: "Ayanda",          grade: "Upper 6", age: 18 },
  { username: "tongai",         name: "Tongai",          grade: "Upper 6", age: 18 },
  { username: "bongiwe",        name: "Bongiwe",         grade: "Upper 6", age: 18 },
  { username: "anopa",          name: "Anopa",           grade: "Upper 6", age: 18 },
  { username: "alicia",         name: "Alicia",          grade: "Upper 6", age: 18 },
  { username: "khanyisile",     name: "Khanyisile",      grade: "Upper 6", age: 18 },
  { username: "emmanuelsongore",name: "EmmanuelSongore", grade: "Upper 6", age: 18 },
  { username: "danbanda",       name: "Dan",             grade: "Upper 6", age: 18 },
];

async function main() {
  console.log(`Enrolling ${students.length} students...\n`);

  const results = { enrolled: [], skipped: [], failed: [] };

  for (const s of students) {
    try {
      // 1. Find the user account
      const user = await prisma.users.findFirst({ where: { username: s.username } });
      if (!user) {
        console.log(`  ? ${s.username} — user account not found`);
        results.failed.push({ username: s.username, error: "User not found" });
        continue;
      }

      // 2. Skip if already enrolled
      const existing = await prisma.students.findFirst({ where: { user_id: user.id } });
      if (existing) {
        console.log(`  ~ ${s.username} — already enrolled, skipping`);
        results.skipped.push(s.username);
        continue;
      }

      // 3. Create student record
      await prisma.students.create({
        data: {
          user_id: user.id,
          name: s.name,
          age: s.age,
          academicLevel: ACADEMIC_LEVEL,
          curriculum: CURRICULUM,
          grade: s.grade,
        },
      });

      // 4. Update user role to student
      await prisma.users.update({
        where: { id: user.id },
        data: { role: "default" }, // keeps existing role logic; change to "student" if your schema uses that
      });

      // 5. Auto-create "Study" workspace (same as endpoint)
      const { workspace: studyWorkspace } = await Workspace.new("Study", user.id);
      if (studyWorkspace) {
        await Workspace.update(studyWorkspace.id, { slug: `study-${user.id}` });
      }

      console.log(`  ✓  ${s.username} (${s.name}) → ${s.grade}`);
      results.enrolled.push(s.username);
    } catch (err) {
      console.log(`  ✗  ${s.username} — ${err.message}`);
      results.failed.push({ username: s.username, error: err.message });
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`Enrolled : ${results.enrolled.length}`);
  console.log(`Skipped  : ${results.skipped.length}`);
  console.log(`Failed   : ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log("\nFailed:");
    results.failed.forEach(({ username, error }) =>
      console.log(`  ${username}: ${error}`)
    );
  }

  await prisma.$disconnect();
  process.exit(0);
}

main().catch(async (err) => {
  console.error("Fatal error:", err);
  await prisma.$disconnect();
  process.exit(1);
});

/**
 * Bulk create accounts + enrol teachers.
 * Run from the server/ directory: node bulk-enrol-teachers.js
 */

const { User } = require("./models/user");
const prisma = require("./utils/prisma");

const SCHOOL = "Greengables College";

const teachers = [
  { name: "Mugawa J.",        username: "mugawaj",        password: "James#21"        },
  { name: "Msindazi T.",      username: "msindazit",      password: "Msindazi@25"     },
  { name: "Masotsha N.",      username: "masotshan",      password: "Masotsha$2"      },
  { name: "Bhebhe R.",        username: "bhebher",        password: "Bhebhe@324"      },
  { name: "Mbvundula G.",     username: "mbvundular",     password: "Mbvundula#4"     },
  { name: "Chireshe N.",      username: "chireshen",      password: "Chireshe#12"     },
  { name: "Mpofu I.",         username: "mpofui",         password: "Mpofu#232"       },
  { name: "Muganyi R.",       username: "muganyir",       password: "Muganyi$234"     },
  { name: "Chinyakuza P.",    username: "chinyakuzap",    password: "Chinyakuza#21"   },
  { name: "Pedzisai L.",      username: "pedzisail",      password: "Pedzisai@1"      },
  { name: "Nyanguwo T.",      username: "nyanguwot",      password: "Nyanguwo$32"     },
  { name: "Dube G.",          username: "dubeg",          password: "Dube@4532"       },
  { name: "Sibanda P.",       username: "sibandap",       password: "Sibanda@32"      },
  { name: "Masavanyawo N.",   username: "masavanyawon",   password: "Masavanyawo#56"  },
  { name: "Ndlovu M.",        username: "ndlovum",        password: "Ndlovu$13"       },
  { name: "Ndlovu S.",        username: "ndlovus",        password: "SNdlovu@7"       },
  { name: "Bosha L.",         username: "boshal",         password: "Bosha$231"       },
  { name: "Mungate V.",       username: "mungatev",       password: "Mungate@15"      },
  { name: "Maphosa L.",       username: "maphosal",       password: "Maphosa#34"      },
  { name: "Ngwenya T.",       username: "ngwenyat",       password: "Ngwenya#74"      },
  { name: "Tichawanda S.",    username: "tichawandas",    password: "Tichawanda$21"   },
  { name: "Mukarati B.",      username: "mukaratib",      password: "Mukarati$24"     },
  { name: "Makore R.",        username: "makorer",        password: "Makore@13"       },
];

async function main() {
  console.log(`Processing ${teachers.length} teachers (create + enrol)...\n`);

  const results = {
    created: [], accountExists: [],
    enrolled: [], alreadyEnrolled: [],
    failed: [],
  };

  for (const t of teachers) {
    // ── Step 1: Find or create user account ─────────────────────────
    let userId;
    const existing = await prisma.users.findFirst({ where: { username: t.username } });

    if (existing) {
      console.log(`  ~ ${t.username} — account already exists`);
      results.accountExists.push(t.username);
      userId = existing.id;
    } else {
      const { user, error } = await User.create({
        username: t.username,
        password: t.password,
        role: "default",
        bio: "Teacher",
      });

      if (!user) {
        console.log(`  ✗  ${t.username} — account creation failed: ${error}`);
        results.failed.push({ username: t.username, step: "create", error });
        continue;
      }

      userId = user.id;
      results.created.push(t.username);
    }

    // ── Step 2: Enrol as teacher ─────────────────────────────────────
    try {
      const existingTeacher = await prisma.teachers.findFirst({ where: { user_id: userId } });

      if (existingTeacher) {
        console.log(`  ~ ${t.username} — already enrolled, skipping`);
        results.alreadyEnrolled.push(t.username);
        continue;
      }

      await prisma.teachers.create({
        data: {
          name:    t.name,
          school:  SCHOOL,
          user_id: userId,
        },
      });

      console.log(`  ✓  ${t.username} (${t.name}) → ${SCHOOL}`);
      results.enrolled.push(t.username);
    } catch (err) {
      console.log(`  ✗  ${t.username} — enrol failed: ${err.message}`);
      results.failed.push({ username: t.username, step: "enrol", error: err.message });
    }
  }

  console.log(`\n─── Summary ───────────────────────────────`);
  console.log(`Accounts created : ${results.created.length}`);
  console.log(`Accounts existed : ${results.accountExists.length}`);
  console.log(`Enrolled         : ${results.enrolled.length}`);
  console.log(`Already enrolled : ${results.alreadyEnrolled.length}`);
  console.log(`Failed           : ${results.failed.length}`);

  if (results.failed.length > 0) {
    console.log("\nFailed entries:");
    results.failed.forEach(({ username, step, error }) =>
      console.log(`  [${step}] ${username}: ${error}`)
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

/**
 * Bulk user creation script for all students and teachers.
 * Run from the server/ directory: node bulk-create-users.js
 */

const { User } = require("./models/user");

const students = [
  // // Form 1
  // { username: "parakletos",     password: "Parakletos@26",       bio: "Form 1" },
  // { username: "timukudzei",     password: "Timukudzei#26",       bio: "Form 1" },
  // { username: "izwirashe",      password: "Izwirashe@26",        bio: "Form 1" },
  // { username: "victory",        password: "Victory@26",          bio: "Form 1" },
  // { username: "andrea",         password: "Andrea#26",           bio: "Form 1" },
  // { username: "michael",        password: "Michael$26",          bio: "Form 1" },
  // { username: "kiara",          password: "Kiara@26",            bio: "Form 1" },
  // { username: "jemima",         password: "Jemima%26",           bio: "Form 1" },
  // { username: "shamiso",        password: "Shamiso&26",          bio: "Form 1" },

  // // Form 2
  // { username: "chipo",          password: "Chipo@26",            bio: "Form 2" },
  // { username: "nelisiwe",       password: "Nelisiwe@26",         bio: "Form 2" },
  // { username: "ruvarashe",      password: "Ruvarashe@26",        bio: "Form 2" },
  // { username: "resegofetse",    password: "Resegofetse@26",      bio: "Form 2" },
  // { username: "ropafadzo",      password: "Ropafadzo@26",        bio: "Form 2" },
  // { username: "tariro",         password: "Tariro@26",           bio: "Form 2" },
  // { username: "nicole",         password: "Nicole@26",           bio: "Form 2" },
  // { username: "lynn",           password: "Lynn@265",            bio: "Form 2" },
  // { username: "humaira",        password: "Humaira@26",          bio: "Form 2" },
  // { username: "annabelle",      password: "Annabelle@26",        bio: "Form 2" },
  // { username: "jacob",          password: "Jacob@26",            bio: "Form 2" },
  // { username: "miguel",         password: "Miguel@26",           bio: "Form 2" },
  // { username: "brayden",        password: "Brayden@26",          bio: "Form 2" },
  // { username: "panashe",        password: "Panashe@26",          bio: "Form 2" },
  // { username: "darren",         password: "Darren@26",           bio: "Form 2" },

  // // Form 3
  // { username: "lexie",          password: "Lexie@26",            bio: "Form 3" },
  // { username: "claire",         password: "Claire@26",           bio: "Form 3" },
  // { username: "charmilla",      password: "Charmilla@26",        bio: "Form 3" },
  // { username: "gladys",         password: "Gladys@26",           bio: "Form 3" },
  // { username: "kayla",          password: "Kayla@26",            bio: "Form 3" },
  // { username: "glory",          password: "Glory@26",            bio: "Form 3" },
  // { username: "tavonga",        password: "Tavonga@26",          bio: "Form 3" },
  // { username: "anna",           password: "AnnaChagachirere@26", bio: "Form 3" },
  // { username: "unathi",         password: "Unathi@26",           bio: "Form 3" },
  // { username: "charmainem",     password: "Charmaine@26",        bio: "Form 3" },
  // { username: "russel",         password: "Russel@26",           bio: "Form 3" },
  // { username: "emmanuel",       password: "Emmanuel@26",         bio: "Form 3" },
  // { username: "tafara",         password: "Tafara@26",           bio: "Form 3" },
  // { username: "mike",           password: "Mike@265",            bio: "Form 3" },
  // { username: "darryl",         password: "Darryl@26",           bio: "Form 3" },
  // { username: "prince",         password: "Prince@26",           bio: "Form 3" },
  // { username: "tamiriraishe",   password: "Tamiriraishe@26",     bio: "Form 3" },

  // // Form 4
  // { username: "hailey",         password: "Hailey@26",           bio: "Form 4" },
  // { username: "matidaishe",     password: "Matidaishe@26",       bio: "Form 4" },
  // { username: "chloe",          password: "Chloe@26",            bio: "Form 4" },
  // { username: "ruvarashem",     password: "RuvarasheM@26",       bio: "Form 4" },
  // { username: "charmaine",      password: "Charmaine@26",        bio: "Form 4" },
  // { username: "keyshia",        password: "Keyshia@26",          bio: "Form 4" },
  // { username: "anotida",        password: "Anotida@26",          bio: "Form 4" },
  // { username: "jada",           password: "Jada@265",            bio: "Form 4" },
  // { username: "rejoice",        password: "Rejoice@26",          bio: "Form 4" },
  // { username: "heather",        password: "Heather@26",          bio: "Form 4" },
  // { username: "tawananyasha",   password: "Tawananyasha@26",     bio: "Form 4" },
  // { username: "zuvarashe",      password: "Zuvarashe@26",        bio: "Form 4" },
  // { username: "michealstation", password: "MichealStation@26",   bio: "Form 4" },
  // { username: "michealsongore", password: "MichealSongore@26",   bio: "Form 4" },
  // { username: "panashe1",       password: "Panashe@26",          bio: "Form 4" },
  // { username: "kudashe",        password: "Kudashe@26",          bio: "Form 4" },
  // { username: "donelle",        password: "Donelle@26",          bio: "Form 4" },
  // { username: "abraar",         password: "Abraar@26",           bio: "Form 4" },
  // { username: "tavimbanashe",   password: "Tavimbanashe@26",     bio: "Form 4" },
  // { username: "leone",          password: "Leone@26",            bio: "Form 4" },
  // { username: "munashe",        password: "Munashe@26",          bio: "Form 4" },
  // { username: "emmanuelmutasa", password: "Emmanuel@26",         bio: "Form 4" },

  // // U6
  // { username: "rutendo",        password: "Rutendo@26",          bio: "U6" },
  // { username: "thabani",        password: "Thabani@26",          bio: "U6" },
  // { username: "ethan",          password: "Ethan@26",            bio: "U6" },
  // { username: "makanaka",       password: "Makanaka@26",         bio: "U6" },
  // { username: "charles",        password: "Charles@26",          bio: "U6" },
  // { username: "ayanda",         password: "Ayanda@26",           bio: "U6" },
  // { username: "tongai",         password: "Tongai@26",           bio: "U6" },
  // { username: "bongiwe",        password: "Bongiwe@26",          bio: "U6" },
  // { username: "anopa",          password: "Anopa@26",            bio: "U6" },
  // { username: "alicia",         password: "Alicia@26",           bio: "U6" },
  // { username: "khanyisile",     password: "Khanyisile@26",       bio: "U6" },
  // { username: "emmanuelsongore",password: "EmmanuelSongore@26",  bio: "U6" },
  // { username: "danbanda",       password: "DanBanda@26",         bio: "U6" },
];

const teachers = [
  { username: "mugawaj",        password: "James#21",            bio: "Teacher" },
  { username: "msindazit",      password: "Msindazi@25",         bio: "Teacher" },
  { username: "masotshan",      password: "Masotsha$2",          bio: "Teacher" },
  { username: "bhebher",        password: "Bhebhe@324",          bio: "Teacher" },
  { username: "mbvundular",     password: "Mbvundula#4",         bio: "Teacher" },
  { username: "chireshen",      password: "Chireshe#12",         bio: "Teacher" },
  { username: "mpofui",         password: "Mpofu#232",           bio: "Teacher" },
  { username: "muganyir",       password: "Muganyi$234",         bio: "Teacher" },
  { username: "chinyakuzap",    password: "Chinyakuza#21",       bio: "Teacher" },
  { username: "pedzisail",      password: "Pedzisai@1",          bio: "Teacher" },
  { username: "nyanguwot",      password: "Nyanguwo$32",         bio: "Teacher" },
  { username: "dubeg",          password: "Dube@4532",           bio: "Teacher" },
  { username: "sibandap",       password: "Sibanda@32",          bio: "Teacher" },
  { username: "masavanyawon",   password: "Masavanyawo#56",      bio: "Teacher" },
  { username: "ndlovum",        password: "Ndlovu$13",           bio: "Teacher" },
  { username: "ndlovus",        password: "SNdlovu@7",           bio: "Teacher" },
  { username: "boshal",         password: "Bosha$231",           bio: "Teacher" },
  { username: "mungatev",       password: "Mungate@15",          bio: "Teacher" },
  { username: "maphosal",       password: "Maphosa#34",          bio: "Teacher" },
  { username: "ngwenyat",       password: "Ngwenya#74",          bio: "Teacher" },
  { username: "tichawandas",    password: "Tichawanda$21",       bio: "Teacher" },
  { username: "mukaratib",      password: "Mukarati$24",         bio: "Teacher" },
  { username: "makorer",        password: "Makore@13",           bio: "Teacher" },
    { username: "mufarog",   password: "Mufaro@26",     bio: "Form 3" },
  { username: "caitlyn",   password: "Caitlyn@26",     bio: "Form 3" },
];

async function createUsers(users, role) {
  const results = { created: [], failed: [] };

  for (const user of users) {
    const { user: created, error } = await User.create({ ...user, role });
    if (created) {
      console.log(`  ✓  ${user.username} (${user.bio})`);
      results.created.push(user.username);
    } else {
      console.log(`  ✗  ${user.username} — ${error}`);
      results.failed.push({ username: user.username, error });
    }
  }

  return results;
}

async function main() {
  console.log(`Creating ${students.length} student accounts...\n`);
  const studentResults = await createUsers(students, "default");

  console.log(`\nCreating ${teachers.length} teacher accounts...\n`);
  const teacherResults = await createUsers(teachers, "default");

  const totalCreated = studentResults.created.length + teacherResults.created.length;
  const totalFailed  = studentResults.failed.length  + teacherResults.failed.length;

  console.log(`\n--- Summary ---`);
  console.log(`Students created : ${studentResults.created.length}`);
  console.log(`Teachers created : ${teacherResults.created.length}`);
  console.log(`Total created    : ${totalCreated}`);
  console.log(`Total failed     : ${totalFailed}`);

  const allFailed = [...studentResults.failed, ...teacherResults.failed];
  if (allFailed.length > 0) {
    console.log("\nFailed accounts:");
    allFailed.forEach(({ username, error }) =>
      console.log(`  ${username}: ${error}`)
    );
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
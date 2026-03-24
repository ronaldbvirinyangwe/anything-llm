/**
 * Bulk create accounts + enrol students (batch 2).
 * Run from the server/ directory: node bulk-create-enrol-batch2.js
 *
 * Notes on usernames with capital letters in the original list:
 *   nyamandiVnevimbonashe → nyamandivnevimbonashe
 *   dhodhoVnashe          → dhodhovnashe
 *   mVsisibusiso          → mvsisibusiso
 *   muzondoVnashe         → muzondovnashe
 *   mpofuchrisVana        → mpofuchrisvana
 *   Tnotendafusire        → tnotendafusire
 *   learnmoregwaTda       → learnmoregwatda
 *   karenchiTyo           → karenchityo
 *   Tchafarakaronga       → tchafarakaronga
 */

const { User } = require("./models/user");
const prisma = require("./utils/prisma");
const { Workspace } = require("./models/workspace");

const CURRICULUM = "ZIMSEC";
const ACADEMIC_LEVEL = "secondary";

const students = [
  // ── Form 1 (age 13) ─────────────────────────────────────────────────
  { name: "Chimunye Faith",           username: "chimunyefaith",        password: "Faith#90",          grade: "Form 1", age: 13 },
  { name: "Dube Natalie J.",          username: "dubenatalie",          password: "Na@y107@",          grade: "Form 1", age: 13 },
  { name: "Dhliwayo Samukeliso",      username: "dhliwayosamukeliso",   password: "Samukeliso#23",     grade: "Form 1", age: 13 },
  { name: "Chishaya Kayla",           username: "chishayakayla",        password: "Kayla$823",         grade: "Form 1", age: 13 },
  { name: "Ndou Mbalenhle",           username: "ndoumbalenhle",        password: "Mbalenhle@64",      grade: "Form 1", age: 13 },
  { name: "Karikeka Tanaka",          username: "karikekatanaka",       password: "Tanaka&21",         grade: "Form 1", age: 13 },
  { name: "Mugurani Grace",           username: "muguranigrace",        password: "Grace231#",         grade: "Form 1", age: 13 },
  { name: "Nyathi Simphiwe",          username: "nyathisimphiwe",       password: "Simphiwe@443",      grade: "Form 1", age: 13 },
  { name: "Ndlovu Kayla",             username: "ndlovukayla",          password: "Kayla%659",         grade: "Form 1", age: 13 },
  { name: "Maphosa Bernice",          username: "maphosabernice",       password: "Bernice98&",        grade: "Form 1", age: 13 },
  { name: "Smith Skyla",              username: "smithskyla",           password: "Skyla238#",         grade: "Form 1", age: 13 },
  { name: "Nyamandi Tinevimbonashe",  username: "nyamanditinevimbonashe",password: "Tinevimbonashe&11", grade: "Form 1", age: 13 },
  { name: "Nkomo Kupa Kayla",         username: "nkomokayla",           password: "Kupa@90912",        grade: "Form 1", age: 13 },
  { name: "Thebe Gabriella",          username: "thebegabriella",       password: "Gabriella92$",      grade: "Form 1", age: 13 },
  { name: "Ngalu Christabel",         username: "ngaluchristabel",      password: "Christabel@32",     grade: "Form 1", age: 13 },
  { name: "Zimani Vanessa",           username: "zimanivanessa",        password: "Vanessa%658",       grade: "Form 1", age: 13 },
  { name: "Dube Lindokuhle",          username: "dubelindokuhle",       password: "Lindokuhle#34",     grade: "Form 1", age: 13 },
  { name: "Chingozho Allan",          username: "chingozhoallan",       password: "Allan@9148",        grade: "Form 1", age: 13 },
  { name: "Muleya Nigel",             username: "muleyanigel",          password: "Nigel$9029",        grade: "Form 1", age: 13 },
  { name: "Mkandla Emmanuel",         username: "mkandlaemmanuel",      password: "Emmanuel83@",       grade: "Form 1", age: 13 },
  { name: "Ndoro Tokudzashe",         username: "ndorotokudzashe",      password: "Tokudzashe&152",    grade: "Form 1", age: 13 },
  { name: "Mbedzi Tumahole",          username: "mbedzitumahole",       password: "Tumahole@65",       grade: "Form 1", age: 13 },
  { name: "Chimuka Mufaro",           username: "chimukamufaro",        password: "Mufaro$22",         grade: "Form 1", age: 13 },
  { name: "Bothlale Yandiswa",        username: "bothlaleyandiswa",     password: "Yandiswa#90",       grade: "Form 1", age: 13 },
  { name: "Madzukwa Thelma",          username: "madzukwathelma",       password: "Thelma%54",         grade: "Form 1", age: 13 },
  { name: "Mashanga Anashe",          username: "mashangaanashe",       password: "Anashe76@",         grade: "Form 1", age: 13 },
  { name: "Mugawa Prominence",        username: "mugawaprominence",     password: "Prominence@090",    grade: "Form 1", age: 13 },
  { name: "Mukahiwa Thiell",          username: "mukahiwathiell",       password: "Thiell#22",         grade: "Form 1", age: 13 },
  { name: "Moyo Victoria",            username: "moyovictoria",         password: "Victoria@19",       grade: "Form 1", age: 13 },
  { name: "Kasvosve Blessing",        username: "kasvosveblessing",     password: "Blessing&24",       grade: "Form 1", age: 13 },
  { name: "Mbedzi Tendani",           username: "tendanimbedzi",        password: "Tendani$83",        grade: "Form 1", age: 13 },
  { name: "Mleya Luzibo",             username: "mleyaluzibo",          password: "Luzibo03#",         grade: "Form 1", age: 13 },
  { name: "Nyathi Liana",             username: "nyathiliana",          password: "Liana892$",         grade: "Form 1", age: 13 },
  { name: "Ruwaza Candie",            username: "ruwazacandie",         password: "Candie#231",        grade: "Form 1", age: 13 },
  { name: "Samuriwo Kayla",           username: "samuriwokayla",        password: "Kayla%902",         grade: "Form 1", age: 13 },
  { name: "Chibutu Munyaradzi",       username: "chibutumunyaradzi",    password: "Munyaradzi64%",     grade: "Form 1", age: 13 },
  { name: "Dhodho Tinashe",           username: "dhodhotinashe",         password: "Tinashe%783",       grade: "Form 1", age: 13 },
  { name: "Kanyemba Keith",           username: "kanyembakeith",        password: "Keith#673",         grade: "Form 1", age: 13 },
  { name: "Mhaka Robin",              username: "mhakarobin",           password: "Robin@291",         grade: "Form 1", age: 13 },
  { name: "Mtisi Sibusiso",            username: "mtisisibusiso",         password: "Sibusiso81&",       grade: "Form 1", age: 13 },
  { name: "Mwale Brandon",            username: "mwalebrandon",         password: "Brandon$634",       grade: "Form 1", age: 13 },
  { name: "Zirimah Bryan",            username: "zirimahbryan",         password: "Bryan%782",         grade: "Form 1", age: 13 },
  { name: "Mugawa Providence",        username: "mugawaprovidence",     password: "Providence%09",     grade: "Form 1", age: 13 },
  { name: "Dube Ethan",               username: "dubeethan",            password: "Ethan&658",         grade: "Form 1", age: 13 },
  { name: "Zana Ethan",               username: "zanaethan",            password: "Ethan$003",         grade: "Form 1", age: 13 },
  { name: "Wkanaka Bhasera",          username: "wkanakabhasera",       password: "Wkanaka#723",       grade: "Form 1", age: 13 },
  { name: "Moyo Zinhle",              username: "moyozinhle",           password: "Zinhle&546",        grade: "Form 1", age: 13 },
  { name: "Bhebeh Thobeka",           username: "bhebehthobeka",        password: "Thobeka&201",       grade: "Form 1", age: 13 },
  { name: "Kayla Ziyera",             username: "kaylaziyera",          password: "Kayla?92",          grade: "Form 1", age: 13 },
  { name: "Mahere Clarrieta",         username: "mahereclarrieta",      password: "Clarrieta%095",     grade: "Form 1", age: 13 },
  { name: "Nyoni Megan",              username: "nyonimegan",           password: "Megan24#",          grade: "Form 1", age: 13 },
  { name: "Sibanda Charmaine",        username: "sibandacharmaine",     password: "Charmaine45?",      grade: "Form 1", age: 13 },
  { name: "Bongiwe Mumpande",         username: "bongiwemumpande",      password: "Bongiwe#81",        grade: "Form 1", age: 13 },
  { name: "Baruka Pearl",             username: "barukapearl",          password: "Pearl$674",         grade: "Form 1", age: 13 },
  { name: "Mashinge Gabriella",       username: "mashingegabriella",    password: "Gabriella&23",      grade: "Form 1", age: 13 },
  { name: "Mpofu Christiana",          username: "mpofuchristiana",       password: "ChrisVana@1",       grade: "Form 1", age: 13 },
  { name: "Mudzenda Anaya",           username: "mudzendaanaya",        password: "Anaya26#",          grade: "Form 1", age: 13 },
  { name: "Nyathi Buhlebenkosi",      username: "nyathibuhlebenkosi",   password: "Buhlebenkosi$65",   grade: "Form 1", age: 13 },
  { name: "Nzuma Georgina",           username: "nzumageorgina",        password: "Georgina%04",       grade: "Form 1", age: 13 },
  { name: "Sibanda Faith",            username: "sibandafaith",         password: "Faith#937",         grade: "Form 1", age: 13 },
  { name: "Matematema Lawrence",      username: "lawrencematematema",   password: "Lawrence&263",      grade: "Form 1", age: 13 },
  { name: "Mudenda Eliel",            username: "mudendaeliel",         password: "Eliel@735",         grade: "Form 1", age: 13 },
  { name: "Ncube Mayibongwe",         username: "ncubemayibongwe",      password: "Mayibongwe%102",    grade: "Form 1", age: 13 },
  { name: "Runyowa Praise",           username: "runyowapraise",        password: "Praise$923",        grade: "Form 1", age: 13 },
  { name: "Muzondo Tinashe",          username: "muzondotinashe",        password: "Tinashe?38",        grade: "Form 1", age: 13 },

  // ── Form 2 (age 14) ─────────────────────────────────────────────────
  { name: "Wandile Ncube",            username: "wandilencube",         password: "Wandile#91",        grade: "Form 2", age: 14 },
  { name: "Olothando Mthetwa",        username: "olothandomthetwa",     password: "Olothando%2",       grade: "Form 2", age: 14 },
  { name: "Mayibongwe Ncube",         username: "mayibongwencube",      password: "Mayibongwe&32",     grade: "Form 2", age: 14 },
  { name: "Decent Mabuto",            username: "decentmabuto",         password: "Decent@11",         grade: "Form 2", age: 14 },
  { name: "Wesley Chimunye",          username: "wesleychimunye",       password: "Wesley$21",         grade: "Form 2", age: 14 },
  { name: "Tanaka Zulu",              username: "tanakazulu",           password: "Tanaka02@",         grade: "Form 2", age: 14 },
  { name: "Siyabonga Jiyane",         username: "siyabongajiyane",      password: "Siyabonga573%",     grade: "Form 2", age: 14 },
  { name: "Siyabonga Ncube",          username: "siyabongancube",       password: "Siyabonga&1",       grade: "Form 2", age: 14 },
  { name: "Carl Ngwenya",             username: "carlngwenya",          password: "Carl9891@",         grade: "Form 2", age: 14 },
  { name: "Ephraim Munetsi",          username: "ephraimmunetsi",       password: "Ephraim822#",       grade: "Form 2", age: 14 },
  { name: "Wendel Sibanda",           username: "wendelsibanda",        password: "Wendel$232",        grade: "Form 2", age: 14 },
  { name: "Tinotenda Fusire",         username: "tinotendafusire",       password: "Tinotenda&06",      grade: "Form 2", age: 14 },
  { name: "Kyle Vakira",              username: "kylevakira",           password: "Kyle1021@",         grade: "Form 2", age: 14 },
  { name: "Zvikomborero Shumba",      username: "zvikomboreroshumba",   password: "Zvikomborero@19",   grade: "Form 2", age: 14 },
  { name: "Mtabisi Hlabangana",       username: "mtabisihlabangana",    password: "Hlabangana$32",     grade: "Form 2", age: 14 },
  { name: "Thabiso Tsikira",          username: "thabisotsikira",       password: "Thabiso&43",        grade: "Form 2", age: 14 },
  { name: "Learnmore Tinoonga GwaTda",username: "learnmoregwatida",      password: "Learnmore#04",      grade: "Form 2", age: 14 },
  { name: "Siphamandla Moyo",         username: "siphamandlamoyo",      password: "Siphamandla12?",    grade: "Form 2", age: 14 },
  { name: "Jonas Mapurisa",           username: "jonasmapurisa",        password: "Jonas&91",          grade: "Form 2", age: 14 },
  { name: "Roisin Chirwa",            username: "roisinchirwa",         password: "Roisin14@",         grade: "Form 2", age: 14 },
  { name: "Shantelle Sibanda",        username: "shantellsibanda",      password: "Shantelle58$",      grade: "Form 2", age: 14 },
  { name: "Stephanie Sithole",        username: "stephaniesithole",     password: "Stephanie?97",      grade: "Form 2", age: 14 },
  { name: "Nokutenda Chimbunde",      username: "nokutendachimbunde",   password: "Nokutenda#03",      grade: "Form 2", age: 14 },
  { name: "Nokuthaba Nyathi",         username: "nokuthabanyathi",      password: "Nokuthaba%72",      grade: "Form 2", age: 14 },
  { name: "Bethel Makatendeka Njerere",username: "bethelnjerere",       password: "Bethel@47",         grade: "Form 2", age: 14 },
  { name: "Rutendo Deka",             username: "rutendodeka",          password: "Rutendo&61",        grade: "Form 2", age: 14 },
  { name: "Chantel Nyamuona",         username: "chantelnyamuona",      password: "Chantel$86",        grade: "Form 2", age: 14 },
  { name: "Sibonile T Ngulube",       username: "sibonilengulube",      password: "Sibonile?02",       grade: "Form 2", age: 14 },
  { name: "Karen Chitiyo",             username: "karenchitiyo",          password: "Karen%73",          grade: "Form 2", age: 14 },
  { name: "Melisa Chirambadare",      username: "melisachirambadare",   password: "Melisa@49",         grade: "Form 2", age: 14 },

  // ── Form 3 (age 15) ─────────────────────────────────────────────────
  { name: "Rasim Mushayavanhu",       username: "rasimmushayavanhu",    password: "Rasim#07",          grade: "Form 3", age: 15 },
  { name: "Ryan Gotosa",              username: "ryangotosa",           password: "Ryan&263",          grade: "Form 3", age: 15 },
  { name: "Tawananyasha Mkonto",      username: "tawananyashamkonto",   password: "Tawananyasha21?",   grade: "Form 3", age: 15 },
  { name: "Sithobekile Dliwayo",      username: "sithobekiledliwayo",   password: "Sithobekile$63",    grade: "Form 3", age: 15 },
  { name: "Petra Tafira",             username: "petratafira",          password: "Petra@517",         grade: "Form 3", age: 15 },
  { name: "Nobukhosi Tshuma",         username: "nobukhositshuma",      password: "Nobukhosi#9",       grade: "Form 3", age: 15 },
  { name: "Blessedd Mudyanadzo",      username: "blesseddmudyanadzo",   password: "Blessedd70&",       grade: "Form 3", age: 15 },
  { name: "Peace Nowakhe",            username: "peacenowakhe",         password: "Peace381#",         grade: "Form 3", age: 15 },
  { name: "Unathi Nyathi",            username: "unathinyathi",         password: "Unathi?192",        grade: "Form 3", age: 15 },
  { name: "Muhlekazi Nkomo",          username: "muhlekazinkomo",       password: "Muhlekazi692@",     grade: "Form 3", age: 15 },

  // ── Form 4 (age 16) ─────────────────────────────────────────────────
  { name: "Tavonga Makonese",         username: "tavongamakonese",      password: "Tavonga?77",        grade: "Form 4", age: 16 },
  { name: "Munyaradzi Chimuka",       username: "munyaradzichimuka",    password: "Munyaradzi#12",     grade: "Form 4", age: 16 },
  { name: "Lindukuza Ndlovu",         username: "lindukuzandlovu",      password: "Munyaradzi%83",     grade: "Form 4", age: 16 },
  { name: "Antel Mukahiwa",           username: "antelmukahiwa",        password: "Antel&39",          grade: "Form 4", age: 16 },
  { name: "Craig Munatsi",            username: "craigmunatsi",         password: "Craig@91",          grade: "Form 4", age: 16 },
  { name: "Dumoluhle Ncube",          username: "dumoluhlencube",       password: "Dumoluhle03?",      grade: "Form 4", age: 16 },
  { name: "Lemell Ndoro",             username: "lemellndoro",          password: "Lemell&241",        grade: "Form 4", age: 16 },
  { name: "Natasha Nyathi",           username: "natashanyathi",        password: "Natasha413#",       grade: "Form 4", age: 16 },
  { name: "Nomakhosi Ndebele",        username: "nomakhosindebele",     password: "Nomakhosi%642",     grade: "Form 4", age: 16 },
  { name: "Lobuhle N Sakala",         username: "lobuhlesakala",        password: "Lobuhle@52",        grade: "Form 4", age: 16 },
  { name: "Rumbidzoyashe Deka",       username: "rumbidzoyashedeka",    password: "Rumbidzoyashe&2",   grade: "Form 4", age: 16 },
  { name: "Simisosenkosi Dube",       username: "simisosenkosidube",    password: "Simisosenkosi?84",  grade: "Form 4", age: 16 },
  { name: "Angeline M. Dube",         username: "angelinedube",         password: "Angeline#19",       grade: "Form 4", age: 16 },
  { name: "Nonhlanhla Mkandla",       username: "nonhlanhlamkandla",    password: "Nonhlanhla@72",     grade: "Form 4", age: 16 },
  { name: "Samukeliso Ndlovu",        username: "samukelisondlovu",     password: "Samukeliso42&",     grade: "Form 4", age: 16 },

  // ── Upper 6 (age 18) ────────────────────────────────────────────────
  { name: "Keisha Moyo",              username: "keishamoyo",           password: "Keisha$091",        grade: "Upper 6", age: 18 },
  { name: "Craig Mudimba",            username: "craigmudimba",         password: "Craig%845",         grade: "Upper 6", age: 18 },
  { name: "Tichafara Karonga",        username: "tichafarakaronga",      password: "Tichafara#157",     grade: "Upper 6", age: 18 },
];

async function main() {
  console.log(`Processing ${students.length} students (create + enrol)...\n`);

  const results = {
    created: [], accountExists: [],
    enrolled: [], alreadyEnrolled: [],
    failed: [],
  };

  for (const s of students) {
    // ── Step 1: Create user account ──────────────────────────────────
    let userId;
    const existing = await prisma.users.findFirst({ where: { username: s.username } });

    if (existing) {
      console.log(`  ~ ${s.username} — account already exists`);
      results.accountExists.push(s.username);
      userId = existing.id;
    } else {
      const { user, error } = await User.create({
        username: s.username,
        password: s.password,
        role: "default",
        bio: s.grade,
      });

      if (!user) {
        console.log(`  ✗  ${s.username} — account creation failed: ${error}`);
        results.failed.push({ username: s.username, step: "create", error });
        continue;
      }

      userId = user.id;
      results.created.push(s.username);
    }

    // ── Step 2: Enrol as student ─────────────────────────────────────
    try {
      const existingStudent = await prisma.students.findFirst({ where: { user_id: userId } });

      if (existingStudent) {
        console.log(`  ~ ${s.username} — already enrolled, skipping`);
        results.alreadyEnrolled.push(s.username);
        continue;
      }

      await prisma.students.create({
        data: {
          user_id: userId,
          name: s.name,
          age: s.age,
          academicLevel: ACADEMIC_LEVEL,
          curriculum: CURRICULUM,
          grade: s.grade,
        },
      });

      // Auto-create Study workspace
      const { workspace: studyWorkspace } = await Workspace.new("Study", userId);
      if (studyWorkspace) {
        await Workspace.update(studyWorkspace.id, { slug: `study-${userId}` });
      }

      console.log(`  ✓  ${s.username} (${s.name}) → ${s.grade}`);
      results.enrolled.push(s.username);
    } catch (err) {
      console.log(`  ✗  ${s.username} — enrol failed: ${err.message}`);
      results.failed.push({ username: s.username, step: "enrol", error: err.message });
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

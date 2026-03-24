"use strict";

/**
 * Manual chat ownership fix.
 *
 * Uses a hardcoded map (users.id → profile.id) cross-referenced from:
 *   - The revert script output (authoritative, queried DB directly)
 *   - The forward migration log (reverse-mapped, cascade-affected but mapping valid)
 *
 * Zero conflicts detected between the two sources.
 *
 * For each workspace, finds chats stored at users.id and moves them to the
 * correct profile.id (students.id / teachers.id / parents.id).
 * Safe to run multiple times — no-ops if chats are already at profile.id.
 *
 * Run: node server/fix-chat-owners.js
 */

const prisma = require("./utils/prisma");

// users.id → profile.id  (the correct value for workspace_chats.user_id)
// Verified against revert script DB output + forward migration log (128 entries, no conflicts)
const USER_TO_PROFILE = {
  1:   2,   // Scales (student)
  2:   1,   // Ronny Bviras (student)
  3:   1,   // Calisto Panganayi (teacher)
  14:  8,   // Alex Amed (student)
  15:  2,   // Maponga Kudzanai (teacher)
  19:  12,  // Tinashe Kadiki (student)
  20:  13,  // Mufaro T Dangwa (student)
  21:  3,   // Dr Panganayi (teacher)
  24:  56,  // Timukudzeishe Matavire (student)
  25:  61,  // Izwirashe Shumba (student)
  26:  55,  // Victor chirokote (student)
  27:  63,  // Andre Chidawanyika (student)
  28:  60,  // Michael Raisi (student)
  29:  64,  // Kiara Mumba (student)
  30:  57,  // Jemima (student)
  31:  58,  // Shamiso Arielle Chirashi (student)
  32:  50,  // Chipo K Rwodzi (student)
  33:  39,  // Nelisiwe (student)
  34:  200, // Ruvarashe Kaseke (student)
  35:  37,  // resegofetse (student)
  36:  201, // Ropafadzo Kaseke (student)
  37:  38,  // resegofetse (student)
  38:  40,  // Lynn Muronzi (student)
  39:  36,  // Humaira H. Ibrahim (student)
  40:  41,  // Annabelle Shannen Robertson (student)
  41:  43,  // Jacob (student)
  42:  203, // Panashe (student)
  43:  42,  // Darren Anashe Zvinodavanhu (student)
  44:  26,  // Lexie (student)
  45:  204, // Claire (student)
  46:  25,  // charmilla chirashi (student)
  48:  65,  // Kayla Taruza (student)
  49:  206, // Glory (student)
  50:  207, // Tavonga (student)
  51:  208, // Anna Changachirere (student)
  52:  30,  // Unathi Sibanda (student)
  53:  28,  // charmaine mafurirano (student)
  54:  209, // Russel Nyathi (student)
  55:  27,  // Emmanuel Chademanah (student)
  56:  62,  // Timukudzeishe Matavire (student)
  58:  29,  // Darryl J Panganai (student)
  59:  66,  // Parakletos Manyani (student)
  60:  211, // Tamiriraishe (student)
  61:  19,  // Hailly Machaka (student)
  62:  18,  // Matidaishe Majuru (student)
  63:  47,  // Ruvarashe Muzvidziwa (student)
  64:  15,  // Keyshia Mahovo (student)
  65:  20,  // Anotidaishe Masunda (student)
  69:  215, // Tawananyasha (student)
  70:  46,  // Zuva (student)
  71:  24,  // Michael Station (student)
  73:  217, // Panashe (student)
  74:  218, // Kudashe (student)
  77:  14,  // Tavimbanashe (student)
  79:  221, // Munashe (student)
  81:  34,  // Rutendo Matanga (student)
  82:  222, // Thabani (student)
  83:  223, // Ethan (student)
  87:  32,  // Tongai Murisa (student)
  88:  31,  // Bongiwe (student)
  89:  49,  // Anopa Chiwenga (student)
  92:  226, // Emmanuel Songore (student)
  97:  44,  // Devine Nyapadi (student)
  98:  45,  // Nicole Mavondo (student)
  102: 52,  // Rejoice Mazorodze (student)
  103: 53,  // Miguel Kamwaza (student)
  124: 69,  // Joshua Chademana (student)
  125: 70,  // Brayden Moyo (student)
  126: 71,  // Tikman (student)
  133: 77,  // Chishaya Kayla (student)
  140: 81,  // Nyathi Simphiwe (student)
  146: 87,  // Thebe Gabriella (student)
  147: 88,  // Ngalu Christabel (student)
  148: 89,  // Zimani Vanessa (student)
  156: 97,  // Bothlale Yandiswa (student)
  157: 98,  // Madzukwa Thelma (student)
  161: 102, // Moyo Victoria (student)
  162: 103, // Kasvosve Blessing (student)
  182: 124, // Mahere Clarrieta (student)
  184: 126, // Sibanda Charmaine (student)
  191: 133, // Nzuma Georgina (student)
  197: 140, // Muzondo Tinashe (student)
  202: 141, // Limpo Chiwazo (student)
  204: 143, // Olothando Mthetwa (student)
  207: 146, // Wesley Chimunye (student)
  208: 147, // Tanaka Zulu (student)
  209: 148, // Siyabonga Jiyane (student)
  217: 156, // Thabiso Tsikira (student)
  218: 157, // Learnmore Tinoonga Gwatida (student)
  221: 160, // Roisin Chirwa (student)
  222: 161, // Shantelle Sibanda (student)
  223: 162, // Stephanie Sithole (student)
  226: 165, // Bethel Makatendeka Njerere (student)
  230: 169, // Karen Chitiyo (student)
  236: 175, // Petra Tafira (student)
  240: 179, // Unathi Nyathi (student)
  241: 180, // Muhlekazi Nkomo (student)
  243: 182, // Munyaradzi Chimuka (student)
  244: 183, // Lindukuza Ndlovu (student)
  245: 184, // Antel Mukahiwa (student)
  252: 191, // Rumbidzoyashe Deka (student)
  258: 196, // Keisha Moyo (student)
  259: 197, // Craig Mudimba (student)
  263: 202, // Anesu (student)
  269: 230, // Dephine Simbi (student)
  277: 236, // Dr Panganayi (student)
  281: 21,  // Ms Badza (teacher)
  286: 241, // munana mugayi (student)
  287: 240, // panashe muzvidziwa (student)
  289: 243, // Tasimba (student)
  290: 244, // Karen Bvirinyangwe (student)
  291: 245, // Arnold Bvirinyangwe (student)
  302: 252, // Babongile Nyoni (student)
  306: 24,  // Charles Mavhunga (teacher)
  307: 25,  // Vimbai Chihaka (teacher)
  311: 27,  // Liliosa Padenga (teacher)
  313: 28,  // Emelda (teacher)
  315: 29,  // Kudzai Gotore (teacher)
  316: 31,  // Ndazonakeyi Muradzikwa (teacher)
  317: 32,  // Muroyiwa Michael (teacher)
  318: 33,  // Takunda Rusere (teacher)
  325: 258, // Mindy (student)
  327: 259, // Chiko (student)
  328: 35,  // Fortune Mavhunga (teacher)
};

async function run() {
  console.log("Fixing workspace_chats.user_id → correct profile.id values...\n");

  const workspaceUsers = await prisma.workspace_users.findMany();

  let totalFixed = 0;
  let totalWorkspaces = 0;

  for (const wu of workspaceUsers) {
    const usersId = wu.user_id;
    const workspaceId = wu.workspace_id;

    const profileId = USER_TO_PROFILE[usersId];
    if (!profileId || profileId === usersId) continue;

    const result = await prisma.workspace_chats.updateMany({
      where: { workspaceId, user_id: usersId },
      data: { user_id: profileId },
    });

    if (result.count > 0) {
      totalWorkspaces++;
      totalFixed += result.count;
      console.log(
        `workspace ${workspaceId}: users.id=${usersId} → profile.id=${profileId} — fixed ${result.count} chat(s)`
      );
    }
  }

  console.log(
    `\nDone. Fixed ${totalFixed} chat(s) across ${totalWorkspaces} workspace(s).`
  );
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error("Fix failed:", err);
  prisma.$disconnect();
  process.exit(1);
});

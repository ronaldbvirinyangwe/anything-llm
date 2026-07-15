const { assertEducationDatabase } = require("./education-script-env");
assertEducationDatabase();

const prisma = require("../utils/prisma");

const RELOCATIONS = [
  ["Wisetech College", "Harare", "Northern Central"],
  ["Westlea", "Harare", "Warren Park/Mabelreign"],
  ["Huxton Academy", "Harare", "High Glen"],
  ["Kadzimwenje Secondary School", "Mashonaland Central", "Guruve"],
  ["Seula", "Matabeleland South", "Matobo"],
  ["solid rock", "Mashonaland East", "Goromonzi"],
];

async function inspectRelocations() {
  return Promise.all(
    RELOCATIONS.map(async ([sourceName, provinceName, districtName]) => {
      const source = await prisma.organizations.findFirst({
        where: {
          type: "school",
          active: true,
          code: { startsWith: "LEGACY-SCHOOL-" },
          name: { equals: sourceName, mode: "insensitive" },
        },
        include: { parent: { include: { parent: true } } },
      });
      const districts = await prisma.organizations.findMany({
        where: {
          type: "district",
          active: true,
          name: { equals: districtName, mode: "insensitive" },
          parent: {
            is: {
              type: "province",
              active: true,
              name: { equals: provinceName, mode: "insensitive" },
            },
          },
        },
        include: { parent: true },
      });
      return {
        sourceName,
        provinceName,
        districtName,
        source,
        target: districts.length === 1 ? districts[0] : null,
        targetCount: districts.length,
        alreadyRelocated:
          Boolean(source) &&
          districts.length === 1 &&
          source.parentId === districts[0].id,
      };
    })
  );
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const inspections = await inspectRelocations();
  const unavailable = inspections
    .filter(({ source, target }) => !source || !target)
    .map(({ sourceName, provinceName, districtName, source, targetCount }) => ({
      sourceName,
      provinceName,
      districtName,
      sourceFound: Boolean(source),
      targetCount,
    }));
  if (unavailable.length) {
    console.error(
      JSON.stringify({ error: "Relocation unavailable", unavailable })
    );
    process.exitCode = 1;
    return;
  }

  const pending = inspections.filter(
    ({ alreadyRelocated }) => !alreadyRelocated
  );
  if (!dryRun) {
    for (const { source, target, provinceName, districtName } of pending) {
      await prisma.organizations.update({
        where: { id: source.id },
        data: {
          parentId: target.id,
          metadata: {
            ...(source.metadata || {}),
            geographyMatchStatus: "confirmed",
            geographyConfirmedAt: new Date().toISOString(),
            geographyPreviousDistrictId: source.parentId,
            confirmedProvince: provinceName,
            confirmedDistrict: districtName,
          },
        },
      });
    }
  }

  console.log(
    JSON.stringify({
      dryRun,
      approvedRelocations: inspections.length,
      relocated: dryRun ? 0 : pending.length,
      pending: pending.length,
      alreadyRelocated: inspections.length - pending.length,
      preview: inspections.map(
        ({
          sourceName,
          provinceName,
          districtName,
          source,
          alreadyRelocated,
        }) => ({
          sourceName,
          fromProvince: source.parent?.parent?.name || null,
          fromDistrict: source.parent?.name || null,
          provinceName,
          districtName,
          alreadyRelocated,
        })
      ),
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

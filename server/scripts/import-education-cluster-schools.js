const { assertEducationDatabase } = require("./education-script-env");
assertEducationDatabase();

const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const prisma = require("../utils/prisma");

const SOURCE_URL =
  "https://data.humdata.org/dataset/d51c8412-99bb-4935-a3b4-c2538db49f22/resource/7ce27863-30e6-4de5-ba24-388855f4364b/download/schoolsandtheircoordinates2020.xlsx";
const SOURCE_NAME = "Zimbabwe Education Cluster via OCHA HDX";
const SOURCE_SNAPSHOT = "2020/2021";
const CODE_PREFIX = "ZWE-EDUCLUSTER-";
const REPORT_PATH = path.resolve(
  __dirname,
  "../storage/education-cluster-import-report.json"
);
const DISTRICT_ALIASES = {
  "glen view mufakose": "glenview mufakose",
  hwedza: "wedza",
  "mt darwin": "mount darwin",
};

function argument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function titleCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase())
    .replace(/\bUmp\b/g, "UMP");
}

function diceSimilarity(left, right) {
  if (left === right) return 1;
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = new Map();
  for (let index = 0; index < left.length - 1; index += 1) {
    const pair = left.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  }
  let overlap = 0;
  for (let index = 0; index < right.length - 1; index += 1) {
    const pair = right.slice(index, index + 2);
    const count = pairs.get(pair) || 0;
    if (count > 0) {
      pairs.set(pair, count - 1);
      overlap += 1;
    }
  }
  return (2 * overlap) / (left.length + right.length - 2);
}

async function workbookRows() {
  const file = argument("--file");
  let workbook;
  if (file) {
    workbook = XLSX.readFile(path.resolve(file));
  } else {
    const response = await fetch(SOURCE_URL);
    if (!response.ok)
      throw new Error(`School registry download failed: ${response.status}`);
    workbook = XLSX.read(Buffer.from(await response.arrayBuffer()), {
      type: "buffer",
    });
  }
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils
    .sheet_to_json(worksheet, { defval: null })
    .filter(
      (row) =>
        row.Schoolnumber && row.Name && !String(row.Province).startsWith("#")
    );
}

function registryMetadata(row, existingMetadata = {}, previousName = null) {
  const priorNames = new Set(existingMetadata.priorNames || []);
  if (previousName && normalize(previousName) !== normalize(row.Name))
    priorNames.add(previousName);
  return {
    ...existingMetadata,
    provisional: true,
    registrySource: SOURCE_NAME,
    registrySourceUrl: SOURCE_URL,
    registrySnapshot: SOURCE_SNAPSHOT,
    identifierStatus: "unverified",
    schoolNumber: String(row.Schoolnumber),
    originalName: row.Name,
    schoolLevel: row.SchoolLevel || null,
    grantClass: row.Grant_Class || null,
    latitude: Number.isFinite(Number(row.latitude))
      ? Number(row.latitude)
      : null,
    longitude: Number.isFinite(Number(row.longitude))
      ? Number(row.longitude)
      : null,
    sector: null,
    responsibleAuthority: null,
    priorNames: [...priorNames],
    importedAt: new Date().toISOString(),
  };
}

async function inBatches(items, size, operation) {
  for (let index = 0; index < items.length; index += size) {
    await operation(items.slice(index, index + size));
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = await workbookRows();
  const organizations = await prisma.organizations.findMany({
    where: { type: { in: ["province", "district", "school"] } },
  });
  const provinces = organizations.filter(({ type }) => type === "province");
  const districts = organizations.filter(({ type }) => type === "district");
  const schools = organizations.filter(({ type }) => type === "school");
  const provinceByName = new Map(
    provinces.map((province) => [normalize(province.name), province])
  );
  const districtByProvinceAndName = new Map();
  for (const district of districts) {
    const name =
      DISTRICT_ALIASES[normalize(district.name)] || normalize(district.name);
    districtByProvinceAndName.set(`${district.parentId}:${name}`, district);
  }

  const registryNameCounts = new Map();
  for (const row of rows) {
    const name = normalize(row.Name);
    registryNameCounts.set(name, (registryNameCounts.get(name) || 0) + 1);
  }
  const schoolByCode = new Map(schools.map((school) => [school.code, school]));
  const legacyByName = new Map();
  for (const school of schools.filter(
    ({ metadata, code, active }) =>
      active &&
      metadata?.source === "teachers.school" &&
      !code.startsWith(CODE_PREFIX)
  )) {
    const name = normalize(school.name);
    if (!legacyByName.has(name)) legacyByName.set(name, []);
    legacyByName.get(name).push(school);
  }

  const creates = [];
  const legacyUpdates = [];
  const registryUpdates = [];
  const skippedExisting = [];
  const unmappedDistricts = [];
  const registryCandidates = [];

  for (const row of rows) {
    const province = provinceByName.get(normalize(row.Province));
    const datasetDistrictName =
      DISTRICT_ALIASES[normalize(row.District)] || normalize(row.District);
    const district = province
      ? districtByProvinceAndName.get(`${province.id}:${datasetDistrictName}`)
      : null;
    if (!province || !district) {
      unmappedDistricts.push({
        province: row.Province,
        district: row.District,
        school: row.Name,
      });
      continue;
    }

    const code = `${CODE_PREFIX}${row.Schoolnumber}`;
    const displayName = titleCase(row.Name);
    const existing = schoolByCode.get(code);
    if (existing) {
      skippedExisting.push(code);
      const confirmedName =
        existing.metadata?.chikoroMatchStatus === "confirmed";
      if (
        (!confirmedName && existing.name !== displayName) ||
        existing.parentId !== district.id
      ) {
        registryUpdates.push({
          id: existing.id,
          name: confirmedName ? existing.name : displayName,
          parentId: district.id,
        });
      }
      registryCandidates.push({
        ...row,
        code,
        organizationId: existing.id,
        districtId: district.id,
      });
      continue;
    }

    const normalizedName = normalize(row.Name);
    const legacyMatches = legacyByName.get(normalizedName) || [];
    const uniqueExactMatch =
      registryNameCounts.get(normalizedName) === 1 &&
      legacyMatches.length === 1;
    if (uniqueExactMatch) {
      const legacy = legacyMatches[0];
      legacyUpdates.push({
        id: legacy.id,
        code,
        name: displayName,
        parentId: district.id,
        metadata: registryMetadata(row, legacy.metadata || {}, legacy.name),
      });
      legacyByName.delete(normalizedName);
      registryCandidates.push({
        ...row,
        code,
        organizationId: legacy.id,
        districtId: district.id,
      });
      continue;
    }

    creates.push({
      code,
      name: displayName,
      type: "school",
      parentId: district.id,
      active: true,
      metadata: registryMetadata(row),
    });
    registryCandidates.push({
      ...row,
      code,
      organizationId: null,
      districtId: district.id,
    });
  }

  if (!dryRun) {
    await inBatches(creates, 500, (data) =>
      prisma.organizations.createMany({ data, skipDuplicates: true })
    );
    await inBatches(legacyUpdates, 25, (batch) =>
      prisma.$transaction(
        batch.map((school) =>
          prisma.organizations.update({
            where: { id: school.id },
            data: {
              code: school.code,
              name: school.name,
              parentId: school.parentId,
              metadata: school.metadata,
            },
          })
        )
      )
    );
    await inBatches(registryUpdates, 100, (batch) =>
      prisma.$transaction(
        batch.map((school) =>
          prisma.organizations.update({
            where: { id: school.id },
            data: { name: school.name, parentId: school.parentId },
          })
        )
      )
    );
  }

  const unresolvedLegacy = [...legacyByName.values()].flat();
  const suggestions = unresolvedLegacy.map((legacy) => {
    const legacyName = normalize(legacy.name);
    return {
      organizationId: legacy.id,
      currentName: legacy.name,
      suggestions: registryCandidates
        .map((candidate) => ({
          schoolNumber: String(candidate.Schoolnumber),
          name: titleCase(candidate.Name),
          province: candidate.Province,
          district: candidate.District,
          score:
            Math.round(
              diceSimilarity(legacyName, normalize(candidate.Name)) * 1000
            ) / 1000,
        }))
        .filter(({ score }) => score >= 0.65)
        .sort((left, right) => right.score - left.score)
        .slice(0, 3),
    };
  });

  const registrySchoolsPresent = dryRun
    ? skippedExisting.length + creates.length + legacyUpdates.length
    : await prisma.organizations.count({
        where: { type: "school", code: { startsWith: CODE_PREFIX } },
      });
  const matchedChikoroSchoolsPresent = dryRun
    ? schools.filter(
        ({ code, metadata }) =>
          code.startsWith(CODE_PREFIX) && metadata?.source === "teachers.school"
      ).length + legacyUpdates.length
    : await prisma.organizations.count({
        where: {
          type: "school",
          code: { startsWith: CODE_PREFIX },
          metadata: { path: ["source"], equals: "teachers.school" },
        },
      });
  const report = {
    source: SOURCE_NAME,
    sourceUrl: SOURCE_URL,
    snapshot: SOURCE_SNAPSHOT,
    identifierWarning:
      "Schoolnumber is not confirmed as the current official EMIS identifier.",
    dryRun,
    generatedAt: new Date().toISOString(),
    rowsRead: rows.length,
    schoolsCreated: creates.length,
    existingRegistrySchoolsSkipped: skippedExisting.length,
    existingChikoroSchoolsMatched: legacyUpdates.length,
    registrySchoolsPresent,
    matchedChikoroSchoolsPresent,
    registrySchoolsUpdated: registryUpdates.length,
    unresolvedExistingSchools: unresolvedLegacy.length,
    unmappedRows: unmappedDistricts.length,
    unmappedDistricts: [
      ...new Map(
        unmappedDistricts.map((item) => [
          `${item.province}:${item.district}`,
          item,
        ])
      ).values(),
    ],
    suggestions,
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      ...report,
      suggestions: undefined,
      reportPath: REPORT_PATH,
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

const { assertEducationDatabase } = require("./education-script-env");
assertEducationDatabase();

const fs = require("fs");
const path = require("path");
const prisma = require("../utils/prisma");

const MATCHES = [
  ["Greengables College", "18014", "Green Gables High School"],
  ["Lorn Farm Primary", "2818", "Lorn Farm Primary School"],
  ["Millerite International", "1707", "Millerite International School"],
  ["Tropical Vineyayrd", "18025", "Tropical Vineyard College"],
  ["Mukaro High School", "10006", "Mukaro High School"],
  ["Chimowa secondary", "6227", "Chimowa Secondary School"],
  ["Whitewater High", "14203", "Whitewater Secondary School"],
  ["Mdubiwa Secondary", "16237", "Mdubiwa Secondary School"],
  ["Nyamanyora secondary", "7129", "Nyamanyora Secondary School"],
  ["Thornhill High", "16769", "Thornhill High School"],
  ["Mbizo high school", "16756", "Mbizo High School"],
  ["Batanai Zisco High", "16341", "Batanai Zisco High School"],
  ["Chikwidibe Sec", "5241", "Chikwidibe Secondary School"],
  ["AMR Convent High school", "12979", "AMR Convent Secondary School"],
  ["Horse shoe Secondary School", "5243", "Horseshoe Secondary School"],
  ["Gota Secondary", "5000", "Gota Secondary School"],
  ["Chifamba High", "4019", "Chifamba Secondary School"],
  ["Kazozo Secondary School", "2136", "Kazozo Secondary School"],
  ["Manzimnyama Secondary", "16251", "Manzimnyama Secondary School"],
  ["Muhlanguleni High", "10130", "Muhlanguleni (Mukai) High School"],
];
const CODE_PREFIX = "ZWE-EDUCLUSTER-";
const REPORT_PATH = path.resolve(
  __dirname,
  "../storage/confirmed-school-matches-report.json"
);

async function inspectMatches() {
  const inspections = [];
  for (const [sourceName, schoolNumber, canonicalName] of MATCHES) {
    const target = await prisma.organizations.findUnique({
      where: { code: `${CODE_PREFIX}${schoolNumber}` },
      include: {
        parent: { include: { parent: true } },
        _count: { select: { classes: true, memberships: true } },
      },
    });
    let source = await prisma.organizations.findFirst({
      where: {
        type: "school",
        active: true,
        code: { startsWith: "LEGACY-SCHOOL-" },
        name: { equals: sourceName, mode: "insensitive" },
      },
      include: { _count: { select: { classes: true, memberships: true } } },
    });
    if (!source && target) {
      source = await prisma.organizations.findFirst({
        where: {
          type: "school",
          active: false,
          name: { equals: sourceName, mode: "insensitive" },
          metadata: { path: ["mergedIntoCode"], equals: target.code },
        },
        include: { _count: { select: { classes: true, memberships: true } } },
      });
    }
    inspections.push({
      sourceName,
      schoolNumber,
      canonicalName,
      source,
      target,
      alreadyMerged: Boolean(source && !source.active),
    });
  }
  return inspections;
}

async function mergeSchool({
  sourceName,
  schoolNumber,
  canonicalName,
  source,
  target,
}) {
  if (!source || !target) return null;
  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const activeMemberships = await tx.organization_memberships.findMany({
      where: {
        organizationId: source.id,
        OR: [{ validTo: null }, { validTo: { gt: now } }],
      },
    });
    const teacherUserIds = activeMemberships
      .filter(({ role }) => role === "teacher")
      .map(({ userId }) => userId);

    for (const membership of activeMemberships) {
      const existing = await tx.organization_memberships.findUnique({
        where: {
          organizationId_userId_role: {
            organizationId: target.id,
            userId: membership.userId,
            role: membership.role,
          },
        },
      });
      if (existing) {
        await tx.organization_memberships.update({
          where: { id: existing.id },
          data: {
            validTo: null,
            canViewPii: existing.canViewPii || membership.canViewPii,
          },
        });
      } else {
        await tx.organization_memberships.create({
          data: {
            organizationId: target.id,
            userId: membership.userId,
            role: membership.role,
            canViewPii: membership.canViewPii,
            validFrom: membership.validFrom,
          },
        });
      }
      await tx.organization_memberships.update({
        where: { id: membership.id },
        data: { validTo: now },
      });
    }

    const movedClasses = await tx.education_classes.updateMany({
      where: { schoolId: source.id },
      data: { schoolId: target.id },
    });
    if (teacherUserIds.length) {
      await tx.teachers.updateMany({
        where: { user_id: { in: teacherUserIds } },
        data: { school: canonicalName },
      });
    }

    const targetMetadata = target.metadata || {};
    const aliases = new Set(targetMetadata.priorNames || []);
    aliases.add(target.name);
    aliases.add(source.name);
    await tx.organizations.update({
      where: { id: target.id },
      data: {
        name: canonicalName,
        metadata: {
          ...targetMetadata,
          priorNames: [...aliases],
          chikoroMatchStatus: "confirmed",
          chikoroMatchConfirmedAt: now.toISOString(),
          chikoroMatchSourceOrganizationId: source.id,
        },
      },
    });
    await tx.organizations.update({
      where: { id: source.id },
      data: {
        active: false,
        metadata: {
          ...(source.metadata || {}),
          mergedIntoOrganizationId: target.id,
          mergedIntoCode: target.code,
          mergeConfirmedAt: now.toISOString(),
        },
      },
    });

    return {
      sourceName,
      sourceOrganizationId: source.id,
      targetOrganizationId: target.id,
      canonicalName,
      schoolNumber,
      province: target.parent?.parent?.name || null,
      district: target.parent?.name || null,
      classesMoved: movedClasses.count,
      membershipsMoved: activeMemberships.length,
    };
  });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const inspections = await inspectMatches();
  const missing = inspections
    .filter(({ source, target }) => !source || !target)
    .map(({ sourceName, schoolNumber, canonicalName, source, target }) => ({
      sourceName,
      schoolNumber,
      sourceFound: Boolean(source),
      targetFound: Boolean(target),
    }));
  if (missing.length) {
    console.error(
      JSON.stringify({
        error: "Some approved matches are unavailable",
        missing,
      })
    );
    process.exitCode = 1;
    return;
  }

  const merged = [];
  const alreadyMerged = inspections.filter(
    (inspection) => inspection.alreadyMerged
  );
  if (!dryRun) {
    for (const inspection of inspections.filter(
      (inspection) => !inspection.alreadyMerged
    )) {
      merged.push(await mergeSchool(inspection));
    }
  }
  const report = {
    dryRun,
    generatedAt: new Date().toISOString(),
    approvedMatches: MATCHES.length,
    mergedMatches: merged.length,
    alreadyMergedMatches: alreadyMerged.length,
    preview: inspections.map(
      ({ sourceName, schoolNumber, canonicalName, source, target }) => ({
        sourceName,
        sourceOrganizationId: source.id,
        schoolNumber,
        canonicalName,
        targetOrganizationId: target.id,
        province: target.parent?.parent?.name || null,
        district: target.parent?.name || null,
        classesToMove: source._count.classes,
        membershipsToMove: source._count.memberships,
      })
    ),
    merged,
  };
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    JSON.stringify({
      ...report,
      preview: undefined,
      merged: undefined,
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

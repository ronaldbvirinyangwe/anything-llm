const { assertEducationDatabase } = require("./education-script-env");
assertEducationDatabase();

const crypto = require("crypto");
const prisma = require("../utils/prisma");

const provinces = [
  [
    "BUL",
    "Bulawayo",
    ["Bulawayo Central", "Khami", "Reigate", "Mzilikazi", "Imbizo"],
  ],
  [
    "HAR",
    "Harare",
    [
      "Mabvuku/Tafara",
      "High Glen",
      "Glen View/Mufakose",
      "Mbare/Hatfield",
      "Northern Central",
      "Chitungwiza",
      "Warren Park/Mabelreign",
    ],
  ],
  [
    "MAN",
    "Manicaland",
    [
      "Buhera",
      "Chimanimani",
      "Chipinge",
      "Makoni",
      "Mutare",
      "Mutasa",
      "Nyanga",
    ],
  ],
  [
    "MEC",
    "Mashonaland East",
    [
      "Chikomba",
      "Goromonzi",
      "Marondera",
      "Mudzi",
      "Murehwa",
      "Mutoko",
      "Seke",
      "UMP",
      "Wedza",
    ],
  ],
  [
    "MWC",
    "Mashonaland West",
    [
      "Chegutu",
      "Hurungwe",
      "Kariba",
      "Makonde",
      "Mhondoro-Ngezi",
      "Sanyati",
      "Zvimba",
    ],
  ],
  [
    "MCC",
    "Mashonaland Central",
    [
      "Bindura",
      "Guruve",
      "Mazowe",
      "Mbire",
      "Mount Darwin",
      "Muzarabani",
      "Rushinga",
      "Shamva",
    ],
  ],
  [
    "MAS",
    "Masvingo",
    ["Bikita", "Chiredzi", "Chivi", "Gutu", "Masvingo", "Mwenezi", "Zaka"],
  ],
  [
    "MNO",
    "Matabeleland North",
    ["Binga", "Bubi", "Hwange", "Lupane", "Nkayi", "Tsholotsho", "Umguza"],
  ],
  [
    "MSO",
    "Matabeleland South",
    [
      "Beitbridge",
      "Bulilima",
      "Gwanda",
      "Insiza",
      "Mangwe",
      "Matobo",
      "Umzingwane",
    ],
  ],
  [
    "MID",
    "Midlands",
    [
      "Chirumanzu",
      "Gokwe North",
      "Gokwe South",
      "Gweru",
      "Kwekwe",
      "Mberengwa",
      "Shurugwi",
      "Zvishavane",
    ],
  ],
];

const departments = [
  [
    "PSNE",
    "Primary, Secondary and Non-Formal Education",
    "curriculum_delivery",
  ],
  [
    "CDTS",
    "Curriculum Development and Technical Services",
    "curriculum_content",
  ],
  [
    "SPPRS",
    "Strategic Policy Planning, Research and Statistics",
    "policy_statistics",
  ],
  ["LEPS", "Learner Welfare and Psychological Services", "learner_welfare"],
  ["HRD", "Human Resources and Discipline", "workforce"],
  ["FAD", "Finance and Development", "finance_operations"],
  ["PMU", "Procurement Management Unit", "procurement"],
  ["COMMS", "Communications and Advocacy", "communications"],
  ["LEGAL", "Legal Services", "legal_compliance"],
  ["GIW", "Gender Mainstreaming, Inclusivity and Wellness", "equity_inclusion"],
  ["NLDS", "National Library and Documentation Service", "learning_resources"],
];

function stableCode(prefix, value) {
  const digest = crypto
    .createHash("sha1")
    .update(value)
    .digest("hex")
    .slice(0, 10);
  return `${prefix}-${digest}`;
}

async function upsertOrganization({
  code,
  name,
  type,
  parentId = null,
  metadata = null,
}) {
  return prisma.organizations.upsert({
    where: { code },
    update: { name, type, parentId, active: true, metadata },
    create: { code, name, type, parentId, metadata },
  });
}

async function main() {
  const ministry = await upsertOrganization({
    code: "ZWE-MOPSE",
    name: "Ministry of Primary and Secondary Education",
    type: "ministry",
  });

  for (const [departmentCode, departmentName, portfolio] of departments) {
    await upsertOrganization({
      code: `ZWE-MOPSE-${departmentCode}`,
      name: departmentName,
      type: "department",
      parentId: ministry.id,
      metadata: { portfolio },
    });
  }

  for (const [provinceCode, provinceName, districts] of provinces) {
    const province = await upsertOrganization({
      code: `ZWE-${provinceCode}`,
      name: provinceName,
      type: "province",
      parentId: ministry.id,
    });

    for (const districtName of districts) {
      await upsertOrganization({
        code: stableCode(`ZWE-${provinceCode}`, districtName),
        name: districtName,
        type: "district",
        parentId: province.id,
      });
    }
  }

  const unassignedProvince = await upsertOrganization({
    code: "ZWE-UNASSIGNED",
    name: "Unassigned Province",
    type: "province",
    parentId: ministry.id,
    metadata: { provisional: true },
  });
  const unassignedDistrict = await upsertOrganization({
    code: "ZWE-UNASSIGNED-DISTRICT",
    name: "Unassigned District",
    type: "district",
    parentId: unassignedProvince.id,
    metadata: { provisional: true },
  });

  const period = await prisma.academic_periods.upsert({
    where: { code: "2026" },
    update: { active: true },
    create: {
      code: "2026",
      name: "2026 Academic Year",
      year: 2026,
      startsAt: new Date("2026-01-01T00:00:00.000Z"),
      endsAt: new Date("2026-12-31T23:59:59.999Z"),
    },
  });

  const teachers = await prisma.teachers.findMany({
    include: { teacher_students: true },
  });
  const schoolMemberships = await prisma.organization_memberships.findMany({
    where: {
      userId: { in: teachers.map(({ user_id }) => user_id) },
      role: "teacher",
      validTo: null,
      organization: { type: "school", active: true },
    },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  const schoolByTeacherUserId = new Map();
  for (const membership of schoolMemberships) {
    if (!schoolByTeacherUserId.has(membership.userId))
      schoolByTeacherUserId.set(membership.userId, membership.organization);
  }
  let schoolCount = 0;
  let classCount = 0;
  let enrollmentCount = 0;

  for (const teacher of teachers) {
    const schoolName = teacher.school.trim() || "Unspecified School";
    const school =
      schoolByTeacherUserId.get(teacher.user_id) ||
      (await upsertOrganization({
        code: stableCode("LEGACY-SCHOOL", schoolName.toLowerCase()),
        name: schoolName,
        type: "school",
        parentId: unassignedDistrict.id,
        metadata: { provisional: true, source: "teachers.school" },
      }));
    schoolCount += 1;

    await prisma.organization_memberships.upsert({
      where: {
        organizationId_userId_role: {
          organizationId: school.id,
          userId: teacher.user_id,
          role: "teacher",
        },
      },
      update: { validTo: null },
      create: {
        organizationId: school.id,
        userId: teacher.user_id,
        role: "teacher",
      },
    });

    const linksBySubject = new Map();
    for (const link of teacher.teacher_students) {
      const subject = link.subject?.trim() || "General";
      if (!linksBySubject.has(subject)) linksBySubject.set(subject, []);
      linksBySubject.get(subject).push(link);
    }

    for (const [subject, links] of linksBySubject) {
      const educationClass = await prisma.education_classes.upsert({
        where: {
          code: stableCode(`LEGACY-CLASS-${teacher.id}`, subject.toLowerCase()),
        },
        update: { schoolId: school.id, subject, active: true },
        create: {
          code: stableCode(`LEGACY-CLASS-${teacher.id}`, subject.toLowerCase()),
          schoolId: school.id,
          academicPeriodId: period.id,
          name: `${subject} - ${teacher.name}`,
          subject,
          active: true,
        },
      });
      classCount += 1;

      await prisma.class_teachers.upsert({
        where: {
          classId_teacherId_subject: {
            classId: educationClass.id,
            teacherId: teacher.id,
            subject,
          },
        },
        update: { role: "teacher" },
        create: { classId: educationClass.id, teacherId: teacher.id, subject },
      });

      for (const link of links) {
        await prisma.class_students.upsert({
          where: {
            classId_studentId: {
              classId: educationClass.id,
              studentId: link.studentId,
            },
          },
          update: { status: "active", leftAt: null },
          create: { classId: educationClass.id, studentId: link.studentId },
        });
        enrollmentCount += 1;
      }
    }
  }

  const organizationCount = await prisma.organizations.count();
  console.log(
    JSON.stringify({
      organizationCount,
      schoolCount,
      classCount,
      enrollmentCount,
    })
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

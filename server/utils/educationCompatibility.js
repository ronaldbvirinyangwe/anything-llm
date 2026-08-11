const crypto = require("crypto");
const prisma = require("./prisma");

function stableCode(prefix, value) {
  const digest = crypto
    .createHash("sha1")
    .update(String(value))
    .digest("hex")
    .slice(0, 10);
  return `${prefix}-${digest}`;
}

async function ensureProvisionalSchool(teacher) {
  const existingMembership = await prisma.organization_memberships.findFirst({
    where: {
      userId: teacher.user_id,
      validTo: null,
      organization: { type: "school", active: true },
    },
    include: { organization: true },
  });
  if (existingMembership) return existingMembership.organization;

  const ministry = await prisma.organizations.upsert({
    where: { code: "ZWE-MOPSE" },
    update: { active: true },
    create: {
      code: "ZWE-MOPSE",
      name: "Ministry of Primary and Secondary Education",
      type: "ministry",
    },
  });
  const province = await prisma.organizations.upsert({
    where: { code: "ZWE-UNASSIGNED" },
    update: { parentId: ministry.id, active: true },
    create: {
      code: "ZWE-UNASSIGNED",
      name: "Unassigned Province",
      type: "province",
      parentId: ministry.id,
      metadata: { provisional: true },
    },
  });
  const district = await prisma.organizations.upsert({
    where: { code: "ZWE-UNASSIGNED-DISTRICT" },
    update: { parentId: province.id, active: true },
    create: {
      code: "ZWE-UNASSIGNED-DISTRICT",
      name: "Unassigned District",
      type: "district",
      parentId: province.id,
      metadata: { provisional: true },
    },
  });
  const schoolName = teacher.school?.trim() || "Unspecified School";
  const school = await prisma.organizations.upsert({
    where: { code: stableCode("LEGACY-SCHOOL", schoolName.toLowerCase()) },
    update: { name: schoolName, active: true },
    create: {
      code: stableCode("LEGACY-SCHOOL", schoolName.toLowerCase()),
      name: schoolName,
      type: "school",
      parentId: district.id,
      metadata: { provisional: true, source: "teachers.school" },
    },
  });
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
  return school;
}

async function ensureAcademicPeriod() {
  const year = new Date().getUTCFullYear();
  return prisma.academic_periods.upsert({
    where: { code: String(year) },
    update: { active: true },
    create: {
      code: String(year),
      name: `${year} Academic Year`,
      year,
      startsAt: new Date(`${year}-01-01T00:00:00.000Z`),
      endsAt: new Date(`${year}-12-31T23:59:59.999Z`),
    },
  });
}

async function syncTeacherStudentToEducationClass({
  teacherId,
  studentId,
  subject,
}) {
  const teacher = await prisma.teachers.findUnique({
    where: { id: teacherId },
  });
  if (!teacher) return null;
  const normalizedSubject = subject?.trim() || "General";
  const [school, period] = await Promise.all([
    ensureProvisionalSchool(teacher),
    ensureAcademicPeriod(),
  ]);
  const code = stableCode(
    `LEGACY-CLASS-${teacher.id}`,
    normalizedSubject.toLowerCase()
  );
  const educationClass = await prisma.education_classes.upsert({
    where: { code },
    update: { schoolId: school.id, subject: normalizedSubject, active: true },
    create: {
      code,
      schoolId: school.id,
      academicPeriodId: period.id,
      name: `${normalizedSubject} - ${teacher.name}`,
      subject: normalizedSubject,
    },
  });
  await Promise.all([
    prisma.class_teachers.upsert({
      where: {
        classId_teacherId_subject: {
          classId: educationClass.id,
          teacherId,
          subject: normalizedSubject,
        },
      },
      update: { role: "teacher" },
      create: {
        classId: educationClass.id,
        teacherId,
        subject: normalizedSubject,
      },
    }),
    prisma.class_students.upsert({
      where: { classId_studentId: { classId: educationClass.id, studentId } },
      update: { status: "active", leftAt: null },
      create: { classId: educationClass.id, studentId },
    }),
  ]);
  return educationClass;
}

module.exports = { ensureProvisionalSchool, syncTeacherStudentToEducationClass };

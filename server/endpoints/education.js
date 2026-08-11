const prisma = require("../utils/prisma");
const { EventLogs } = require("../models/eventLogs");
const { validatedRequest } = require("../utils/middleware/validatedRequest");
const {
  ensureProvisionalSchool,
} = require("../utils/educationCompatibility");
const {
  ORGANIZATION_TYPES,
  accessCapabilities,
  buildEducationAccess,
  canListOrganizationChildren,
  canViewClass,
  canViewOrganization,
  descendantIds,
  validateClassDepartment,
  validateMembershipRole,
  validateOrganizationParent,
} = require("../utils/educationAccess");
const SCHOOL_LEVELS = new Set([
  "ecd",
  "infant",
  "primary",
  "secondary",
  "combined",
  "special",
]);
const SCHOOL_SECTORS = new Set(["public", "private"]);
const RESPONSIBLE_AUTHORITIES = new Set([
  "government",
  "local_authority",
  "mission_church",
  "trust_company",
  "community",
  "other",
  "unknown",
]);
const SCHOOL_VERIFICATION_ROLES = [
  "school_admin",
  "headmaster",
  "deputy_head",
  "teacher",
];

function numericId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function dateFilter(from, to) {
  const submittedAt = {};
  if (from && !Number.isNaN(new Date(from).getTime()))
    submittedAt.gte = new Date(from);
  if (to && !Number.isNaN(new Date(to).getTime()))
    submittedAt.lte = new Date(to);
  return Object.keys(submittedAt).length ? submittedAt : undefined;
}

async function organizationGraph() {
  return prisma.organizations.findMany({
    where: { active: true },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

async function accessContext(user) {
  const organizations = await organizationGraph();
  if (user.role === "admin") {
    return buildEducationAccess({
      user,
      organizations,
      memberships: [],
    });
  }

  const now = new Date();
  const memberships = await prisma.organization_memberships.findMany({
    where: {
      userId: user.id,
      validFrom: { lte: now },
      OR: [{ validTo: null }, { validTo: { gt: now } }],
    },
    include: { organization: true },
  });
  const teacherClassIds = memberships.some(({ role }) => role === "teacher")
    ? (
        await prisma.class_teachers.findMany({
          where: { teacher: { user_id: user.id } },
          select: { classId: true },
        })
      ).map(({ classId }) => classId)
    : [];
  return buildEducationAccess({
    user,
    organizations,
    memberships,
    teacherClassIds,
    now,
  });
}

async function classRoster(classIds, grade) {
  if (!classIds.length) return [];
  return prisma.class_students.findMany({
    where: {
      classId: { in: classIds },
      status: "active",
      leftAt: null,
      ...(grade ? { student: { grade } } : {}),
    },
    select: {
      classId: true,
      student: {
        select: { id: true, user_id: true, grade: true, curriculum: true },
      },
    },
  });
}

function emptySummary() {
  return {
    registeredLearners: 0,
    activeLearners: 0,
    assessmentAttempts: 0,
    participatingLearners: 0,
    assessmentParticipation: 0,
    averageScore: null,
    learnersNeedingSupport: 0,
    subjects: [],
    trend: [],
  };
}

async function summarizeClasses(classIds, filters = {}) {
  const roster = await classRoster(classIds, filters.grade);
  const students = [
    ...new Map(roster.map(({ student }) => [student.id, student])).values(),
  ];
  const userIds = students.map(({ user_id }) => user_id);
  if (!userIds.length) {
    return emptySummary();
  }

  const submittedAt = dateFilter(filters.from, filters.to);
  const results = await prisma.quiz_results.findMany({
    where: {
      user_id: { in: userIds },
      ...(filters.subject ? { subject: filters.subject } : {}),
      ...(submittedAt ? { submitted_at: submittedAt } : {}),
    },
    select: { user_id: true, subject: true, score: true, submitted_at: true },
  });

  const activeSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentResults, recentChats] = await Promise.all([
    prisma.quiz_results.findMany({
      where: { user_id: { in: userIds }, submitted_at: { gte: activeSince } },
      distinct: ["user_id"],
      select: { user_id: true },
    }),
    prisma.workspace_chats.findMany({
      where: { user_id: { in: userIds }, createdAt: { gte: activeSince } },
      distinct: ["user_id"],
      select: { user_id: true },
    }),
  ]);
  const activeUsers = new Set([
    ...recentResults.map(({ user_id }) => user_id),
    ...recentChats.map(({ user_id }) => user_id),
  ]);
  const participants = new Set(results.map(({ user_id }) => user_id));
  const learnerScores = new Map();
  const subjectScores = new Map();
  const trendScores = new Map();

  for (const result of results) {
    if (!learnerScores.has(result.user_id))
      learnerScores.set(result.user_id, []);
    learnerScores.get(result.user_id).push(result.score);

    const subject = result.subject || "General";
    if (!subjectScores.has(subject)) subjectScores.set(subject, []);
    subjectScores.get(subject).push(result.score);

    const month = result.submitted_at.toISOString().slice(0, 7);
    if (!trendScores.has(month)) trendScores.set(month, []);
    trendScores.get(month).push(result.score);
  }

  const average = (values) =>
    values.length
      ? Math.round(
          (values.reduce((sum, value) => sum + Number(value), 0) /
            values.length) *
            10
        ) / 10
      : null;
  const learnersNeedingSupport = [...learnerScores.values()].filter(
    (scores) => average(scores) < 50
  ).length;

  return {
    registeredLearners: students.length,
    activeLearners: activeUsers.size,
    assessmentAttempts: results.length,
    participatingLearners: participants.size,
    assessmentParticipation:
      Math.round((participants.size / students.length) * 1000) / 10,
    averageScore: average(results.map(({ score }) => score)),
    learnersNeedingSupport,
    subjects: [...subjectScores.entries()]
      .map(([subject, scores]) => ({
        subject,
        averageScore: average(scores),
        attempts: scores.length,
      }))
      .sort((a, b) => b.attempts - a.attempts),
    trend: [...trendScores.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, scores]) => ({
        period,
        averageScore: average(scores),
        attempts: scores.length,
      })),
  };
}

async function organizationClassIds(organizations, organizationId) {
  const organization = organizations.find(({ id }) => id === organizationId);
  if (!organization) return [];
  if (organization.type === "school_department") {
    const classes = await prisma.education_classes.findMany({
      where: {
        departmentId: organizationId,
        schoolId: organization.parentId,
        active: true,
      },
      select: { id: true },
    });
    return classes.map(({ id }) => id);
  }
  const scopeIds = descendantIds(organizations, organizationId);
  const schoolIds = organizations
    .filter(
      ({ id, type }) =>
        type === "school" && (id === organizationId || scopeIds.includes(id))
    )
    .map(({ id }) => id);
  if (!schoolIds.length) return [];
  const classes = await prisma.education_classes.findMany({
    where: { schoolId: { in: schoolIds }, active: true },
    select: { id: true },
  });
  return classes.map(({ id }) => id);
}

function educationEndpoints(app) {
  app.get(
    "/education/admin/access-control",
    [validatedRequest],
    async (_request, response) => {
      try {
        const user = response.locals.user;
        if (user?.role !== "admin")
          return response.status(403).json({ error: "Admin access required" });
        const now = new Date();
        const [organizations, classes, memberships, schoolVerifications] =
          await Promise.all([
            prisma.organizations.findMany({
              where: { active: true },
              orderBy: [{ type: "asc" }, { name: "asc" }],
            }),
            prisma.education_classes.findMany({
              where: { active: true },
              select: {
                id: true,
                code: true,
                name: true,
                grade: true,
                schoolId: true,
                departmentId: true,
                school: { select: { id: true, name: true } },
                department: { select: { id: true, name: true } },
              },
              orderBy: [{ schoolId: "asc" }, { name: "asc" }],
            }),
            prisma.organization_memberships.findMany({
              where: { OR: [{ validTo: null }, { validTo: { gt: now } }] },
              include: {
                organization: true,
                user: { select: { id: true, username: true, role: true } },
              },
              orderBy: { createdAt: "desc" },
            }),
            prisma.school_verification_submissions.findMany({
              where: { status: "pending" },
              include: {
                school: true,
                submitter: { select: { id: true, username: true, role: true } },
              },
              orderBy: { createdAt: "asc" },
            }),
          ]);
        return response.json({
          success: true,
          organizations,
          classes,
          memberships,
          schoolVerifications,
        });
      } catch (error) {
        console.error("Education access-control error:", error);
        return response
          .status(500)
          .json({ error: "Failed to load education access control" });
      }
    }
  );

  app.delete(
    "/education/memberships/:id",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = response.locals.user;
        if (user?.role !== "admin")
          return response.status(403).json({ error: "Admin access required" });
        const membershipId = numericId(request.params.id);
        if (!membershipId)
          return response.status(400).json({ error: "Invalid membership" });
        const existing = await prisma.organization_memberships.findUnique({
          where: { id: membershipId },
        });
        if (!existing)
          return response.status(404).json({ error: "Membership not found" });
        await prisma.organization_memberships.update({
          where: { id: membershipId },
          data: { validTo: new Date() },
        });
        await EventLogs.logEvent(
          "education_membership_revoked",
          {
            membershipId,
            organizationId: existing.organizationId,
            targetUserId: existing.userId,
            role: existing.role,
          },
          user.id
        );
        return response.json({ success: true });
      } catch (error) {
        console.error("Revoke education membership error:", error);
        return response
          .status(500)
          .json({ error: "Failed to revoke education access" });
      }
    }
  );

  app.get(
    "/education/access",
    [validatedRequest],
    async (_request, response) => {
      try {
        const user = response.locals.user;
        if (!user?.id)
          return response.status(401).json({ error: "Unauthorized" });
        const context = await accessContext(user);
        const roots = context.organizations.filter(
          ({ parentId, id }) => !parentId && context.organizationIds.has(id)
        );
        const membershipOrganizations = context.memberships
          .map(({ organization }) => organization)
          .filter(
            (organization) =>
              organization && context.organizationIds.has(organization.id)
          );
        const defaultOrganization =
          roots[0] || membershipOrganizations[0] || null;
        const defaultClassId =
          context.teacherClassIds.values().next().value || null;
        const capabilities = accessCapabilities(context);
        return response.json({
          success: true,
          enabled:
            context.isGlobalAdmin ||
            context.organizationIds.size > 0 ||
            context.teacherClassIds.size > 0,
          defaultOrganization,
          defaultClassId,
          defaultScope: defaultOrganization
            ? { type: "organization", id: defaultOrganization.id }
            : defaultClassId
              ? { type: "class", id: defaultClassId }
              : null,
          capabilities,
          memberships: context.memberships.map(
            ({ organization, ...membership }) => ({
              ...membership,
              organization,
            })
          ),
        });
      } catch (error) {
        console.error("Education access error:", error);
        return response
          .status(500)
          .json({ error: "Failed to load education access" });
      }
    }
  );

  app.get(
    "/education/school-verification/context",
    [validatedRequest],
    async (_request, response) => {
      try {
        const user = response.locals.user;
        if (!user?.id)
          return response.status(401).json({ error: "Unauthorized" });
        const now = new Date();
        let memberships = await prisma.organization_memberships.findMany({
          where: {
            userId: user.id,
            validFrom: { lte: now },
            OR: [{ validTo: null }, { validTo: { gt: now } }],
            role: { in: SCHOOL_VERIFICATION_ROLES },
            organization: { type: "school", active: true },
          },
          include: {
            organization: {
              include: { parent: { include: { parent: true } } },
            },
          },
        });
        if (memberships.length === 0 && user.role === "teacher") {
          const teacher = await prisma.teachers.findFirst({
            where: { user_id: user.id },
          });
          if (teacher) {
            await ensureProvisionalSchool(teacher);
            memberships = await prisma.organization_memberships.findMany({
              where: {
                userId: user.id,
                validFrom: { lte: now },
                OR: [{ validTo: null }, { validTo: { gt: now } }],
                role: { in: SCHOOL_VERIFICATION_ROLES },
                organization: { type: "school", active: true },
              },
              include: {
                organization: {
                  include: { parent: { include: { parent: true } } },
                },
              },
            });
          }
        }
        const schoolIds = memberships.map(
          ({ organizationId }) => organizationId
        );
        const pending = schoolIds.length
          ? await prisma.school_verification_submissions.findMany({
              where: { schoolId: { in: schoolIds }, status: "pending" },
              select: { schoolId: true },
            })
          : [];
        const pendingSchoolIds = new Set(
          pending.map(({ schoolId }) => schoolId)
        );
        const schools = memberships
          .map(({ organization }) => organization)
          .filter(
            (school) =>
              school.metadata?.verificationStatus !== "confirmed_by_school" &&
              !pendingSchoolIds.has(school.id)
          )
          .map((school) => ({
            id: school.id,
            name: school.name,
            schoolLevel: school.metadata?.schoolLevel?.toLowerCase() || "",
            sector: school.metadata?.sector || "",
            responsibleAuthority:
              school.metadata?.responsibleAuthority || "unknown",
            address: school.metadata?.address || "",
            districtId:
              school.parent?.type === "district" ? school.parent.id : null,
            provinceId:
              school.parent?.parent?.type === "province"
                ? school.parent.parent.id
                : null,
          }));
        const organizations = await prisma.organizations.findMany({
          where: { active: true, type: { in: ["province", "district"] } },
          orderBy: [{ type: "asc" }, { name: "asc" }],
        });
        return response.json({ success: true, schools, organizations });
      } catch (error) {
        console.error("School verification context error:", error);
        return response
          .status(500)
          .json({ error: "Failed to load school verification" });
      }
    }
  );

  app.post(
    "/education/school-verification",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = response.locals.user;
        const schoolId = numericId(request.body?.schoolId);
        const provinceId = numericId(request.body?.provinceId);
        const districtId = numericId(request.body?.districtId);
        const proposedName = String(request.body?.proposedName || "").trim();
        const schoolLevel = String(
          request.body?.schoolLevel || ""
        ).toLowerCase();
        const sector = String(request.body?.sector || "").toLowerCase();
        const responsibleAuthority = String(
          request.body?.responsibleAuthority || ""
        ).toLowerCase();
        const address = String(request.body?.address || "").trim();
        const notes = String(request.body?.notes || "").trim();
        if (!user?.id || !schoolId || !provinceId || !districtId)
          return response.status(400).json({ error: "Invalid submission" });
        if (
          !SCHOOL_LEVELS.has(schoolLevel) ||
          !SCHOOL_SECTORS.has(sector) ||
          !RESPONSIBLE_AUTHORITIES.has(responsibleAuthority)
        ) {
          return response
            .status(400)
            .json({ error: "Invalid school classification" });
        }
        if (
          proposedName.length > 200 ||
          address.length > 500 ||
          notes.length > 1000
        )
          return response.status(400).json({ error: "Submission is too long" });
        const membership = await prisma.organization_memberships.findFirst({
          where: {
            organizationId: schoolId,
            userId: user.id,
            validFrom: { lte: new Date() },
            OR: [{ validTo: null }, { validTo: { gt: new Date() } }],
            role: { in: SCHOOL_VERIFICATION_ROLES },
            organization: { type: "school", active: true },
          },
        });
        if (!membership && user.role !== "admin")
          return response.status(403).json({ error: "Forbidden" });
        const district = await prisma.organizations.findFirst({
          where: {
            id: districtId,
            type: "district",
            active: true,
            parentId: provinceId,
          },
        });
        if (!district)
          return response
            .status(400)
            .json({ error: "District does not belong to province" });
        const existing = await prisma.school_verification_submissions.findFirst(
          {
            where: { schoolId, status: "pending" },
          }
        );
        if (existing)
          return response
            .status(409)
            .json({ error: "This school already has a pending verification" });
        const submission = await prisma.school_verification_submissions.create({
          data: {
            schoolId,
            submittedBy: user.id,
            proposedName: proposedName || null,
            schoolLevel,
            provinceId,
            districtId,
            sector,
            responsibleAuthority,
            address: address || null,
            notes: notes || null,
          },
        });
        await EventLogs.logEvent(
          "education_school_verification_submitted",
          {
            submissionId: submission.id,
            schoolId,
            provinceId,
            districtId,
          },
          user.id
        );
        return response.status(201).json({ success: true, submission });
      } catch (error) {
        console.error("School verification submission error:", error);
        return response
          .status(500)
          .json({ error: "Failed to submit school verification" });
      }
    }
  );

  app.post(
    "/education/admin/school-verifications/:id/review",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = response.locals.user;
        if (user?.role !== "admin")
          return response.status(403).json({ error: "Admin access required" });
        const submissionId = numericId(request.params.id);
        const decision = request.body?.decision;
        const reviewNotes = String(request.body?.reviewNotes || "").trim();
        if (!submissionId || !["approved", "rejected"].includes(decision))
          return response.status(400).json({ error: "Invalid review" });
        const submission =
          await prisma.school_verification_submissions.findUnique({
            where: { id: submissionId },
            include: { school: true },
          });
        if (!submission || submission.status !== "pending")
          return response
            .status(404)
            .json({ error: "Pending verification not found" });
        const reviewedAt = new Date();
        await prisma.$transaction(async (tx) => {
          if (decision === "approved") {
            const metadata = submission.school.metadata || {};
            await tx.organizations.update({
              where: { id: submission.schoolId },
              data: {
                name: submission.proposedName || submission.school.name,
                parentId: submission.districtId,
                metadata: {
                  ...metadata,
                  schoolLevel: submission.schoolLevel,
                  sector: submission.sector,
                  responsibleAuthority: submission.responsibleAuthority,
                  address: submission.address,
                  provisional: false,
                  verificationStatus: "confirmed_by_school",
                  verifiedAt: reviewedAt.toISOString(),
                  verifiedSubmissionId: submission.id,
                },
              },
            });
          }
          await tx.school_verification_submissions.update({
            where: { id: submission.id },
            data: {
              status: decision,
              reviewedBy: user.id,
              reviewedAt,
              reviewNotes: reviewNotes || null,
            },
          });
        });
        await EventLogs.logEvent(
          "education_school_verification_reviewed",
          {
            submissionId: submission.id,
            schoolId: submission.schoolId,
            decision,
          },
          user.id
        );
        return response.json({ success: true, decision });
      } catch (error) {
        console.error("School verification review error:", error);
        return response
          .status(500)
          .json({ error: "Failed to review school verification" });
      }
    }
  );

  app.get(
    "/education/organizations/:id/dashboard",
    [validatedRequest],
    async (request, response) => {
      try {
        const organizationId = numericId(request.params.id);
        const user = response.locals.user;
        if (!organizationId || !user?.id)
          return response.status(400).json({ error: "Invalid organization" });
        const context = await accessContext(user);
        if (!canViewOrganization(context, organizationId))
          return response.status(403).json({ error: "Forbidden" });
        const organization = context.organizations.find(
          ({ id }) => id === organizationId
        );
        if (!organization)
          return response.status(404).json({ error: "Organization not found" });
        const parent =
          organization.parentId &&
          context.organizationIds.has(organization.parentId)
            ? context.organizations.find(
                ({ id }) => id === organization.parentId
              ) || null
            : null;
        const filters = request.query;
        const classIds = await organizationClassIds(
          context.organizations,
          organizationId
        );
        const metrics = await summarizeClasses(classIds, filters);
        let children = [];

        if (organization.type === "department") {
          children = [];
        } else if (
          organization.type === "school" &&
          canListOrganizationChildren(context, organization)
        ) {
          const classes = await prisma.education_classes.findMany({
            where: {
              schoolId: organization.id,
              departmentId: null,
              active: true,
            },
            orderBy: { name: "asc" },
          });
          const departments = context.organizations.filter(
            ({ parentId, type }) =>
              parentId === organization.id && type === "school_department"
          );
          const departmentChildren = await Promise.all(
            departments.map(async (department) => ({
              ...department,
              metrics: await summarizeClasses(
                await organizationClassIds(
                  context.organizations,
                  department.id
                ),
                filters
              ),
            }))
          );
          const classChildren = await Promise.all(
            classes.map(async (educationClass) => ({
              id: educationClass.id,
              code: educationClass.code,
              name: educationClass.name,
              type: "class",
              metrics: await summarizeClasses([educationClass.id], filters),
            }))
          );
          children = [...departmentChildren, ...classChildren];
        } else if (organization.type === "school_department") {
          const classes = await prisma.education_classes.findMany({
            where: {
              departmentId: organization.id,
              schoolId: organization.parentId,
              active: true,
            },
            orderBy: { name: "asc" },
          });
          children = await Promise.all(
            classes
              .filter((educationClass) => canViewClass(context, educationClass))
              .map(async (educationClass) => ({
                id: educationClass.id,
                code: educationClass.code,
                name: educationClass.name,
                type: "class",
                metrics: await summarizeClasses([educationClass.id], filters),
              }))
          );
        } else if (canListOrganizationChildren(context, organization)) {
          const directChildren = context.organizations.filter(
            ({ id, parentId, type }) =>
              parentId === organization.id &&
              context.organizationIds.has(id) &&
              (organization.type !== "ministry" || type === "province")
          );
          if (directChildren.every(({ type }) => type === "school")) {
            const classes = await prisma.education_classes.findMany({
              where: {
                schoolId: { in: directChildren.map(({ id }) => id) },
                active: true,
              },
              select: { id: true, schoolId: true },
            });
            const classIdsBySchool = new Map();
            for (const educationClass of classes) {
              if (!classIdsBySchool.has(educationClass.schoolId))
                classIdsBySchool.set(educationClass.schoolId, []);
              classIdsBySchool
                .get(educationClass.schoolId)
                .push(educationClass.id);
            }
            children = await Promise.all(
              directChildren.map(async (child) => {
                const childClassIds = classIdsBySchool.get(child.id) || [];
                return {
                  ...child,
                  metrics: childClassIds.length
                    ? await summarizeClasses(childClassIds, filters)
                    : emptySummary(),
                };
              })
            );
          } else {
            children = await Promise.all(
              directChildren.map(async (child) => {
                const childClassIds = await organizationClassIds(
                  context.organizations,
                  child.type === "department" ? organization.id : child.id
                );
                return {
                  ...child,
                  metrics: await summarizeClasses(childClassIds, filters),
                };
              })
            );
          }
        }

        await EventLogs.logEvent(
          "education_dashboard_read",
          {
            scopeType: "organization",
            organizationType: organization.type,
            scopeId: organizationId,
          },
          user.id
        );
        return response.json({
          success: true,
          scope: organization,
          parent,
          metrics,
          subjects: metrics.subjects,
          trend: metrics.trend,
          children,
          access: accessCapabilities(context),
          dataFreshness: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Education dashboard error:", error);
        return response
          .status(500)
          .json({ error: "Failed to load education dashboard" });
      }
    }
  );

  app.get(
    "/education/classes/:id/dashboard",
    [validatedRequest],
    async (request, response) => {
      try {
        const classId = numericId(request.params.id);
        const user = response.locals.user;
        if (!classId || !user?.id)
          return response.status(400).json({ error: "Invalid class" });
        const educationClass = await prisma.education_classes.findUnique({
          where: { id: classId },
          include: {
            school: true,
            department: true,
            academicPeriod: true,
          },
        });
        if (!educationClass)
          return response.status(404).json({ error: "Class not found" });
        const context = await accessContext(user);
        if (!canViewClass(context, educationClass))
          return response.status(403).json({ error: "Forbidden" });
        const metrics = await summarizeClasses([classId], request.query);
        const parent =
          educationClass.department &&
          canViewOrganization(context, educationClass.department.id)
            ? educationClass.department
            : canViewOrganization(context, educationClass.school.id)
              ? educationClass.school
              : null;
        await EventLogs.logEvent(
          "education_dashboard_read",
          { scopeType: "class", scopeId: classId },
          user.id
        );
        return response.json({
          success: true,
          scope: { ...educationClass, type: "class" },
          parent,
          department: educationClass.department,
          metrics,
          subjects: metrics.subjects,
          trend: metrics.trend,
          children: [],
          access: accessCapabilities(context),
          dataFreshness: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Class dashboard error:", error);
        return response
          .status(500)
          .json({ error: "Failed to load class dashboard" });
      }
    }
  );

  app.patch(
    "/education/classes/:id/department",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = response.locals.user;
        if (user?.role !== "admin")
          return response.status(403).json({ error: "Admin access required" });
        const classId = numericId(request.params.id);
        const requestedDepartmentId = request.body?.departmentId;
        const departmentId =
          requestedDepartmentId == null || requestedDepartmentId === ""
            ? null
            : numericId(requestedDepartmentId);
        if (
          !classId ||
          (requestedDepartmentId != null &&
            requestedDepartmentId !== "" &&
            !departmentId)
        ) {
          return response
            .status(400)
            .json({ error: "Invalid class or department" });
        }
        const educationClass = await prisma.education_classes.findUnique({
          where: { id: classId },
        });
        if (!educationClass)
          return response.status(404).json({ error: "Class not found" });
        const department = departmentId
          ? await prisma.organizations.findUnique({
              where: { id: departmentId },
            })
          : null;
        if (departmentId && !department)
          return response.status(404).json({ error: "Department not found" });
        const departmentError = validateClassDepartment(
          educationClass.schoolId,
          department
        );
        if (departmentError)
          return response.status(400).json({ error: departmentError });
        const updatedClass = await prisma.education_classes.update({
          where: { id: classId },
          data: { departmentId },
          include: { department: true },
        });
        await EventLogs.logEvent(
          "education_class_department_changed",
          {
            classId,
            schoolId: educationClass.schoolId,
            previousDepartmentId: educationClass.departmentId,
            departmentId,
          },
          user.id
        );
        return response.json({ success: true, class: updatedClass });
      } catch (error) {
        console.error("Assign class department error:", error);
        return response
          .status(500)
          .json({ error: "Failed to assign class department" });
      }
    }
  );

  app.post(
    "/education/organizations",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = response.locals.user;
        if (user?.role !== "admin")
          return response.status(403).json({ error: "Admin access required" });
        const {
          code: requestedCode,
          name: requestedName,
          type,
          parentId: requestedParentId = null,
          metadata = null,
        } = request.body || {};
        const code =
          typeof requestedCode === "string" ? requestedCode.trim() : "";
        const name =
          typeof requestedName === "string" ? requestedName.trim() : "";
        const hasParent =
          requestedParentId !== null && requestedParentId !== "";
        const parentId = hasParent ? numericId(requestedParentId) : null;
        if (!code || !name || !ORGANIZATION_TYPES.has(type)) {
          return response
            .status(400)
            .json({ error: "code, name and a valid type are required" });
        }
        if (hasParent && !parentId)
          return response.status(400).json({ error: "Invalid parent" });
        const parent = parentId
          ? await prisma.organizations.findUnique({
              where: { id: parentId },
              select: { id: true, type: true, active: true },
            })
          : null;
        if (parentId && !parent)
          return response.status(400).json({ error: "Parent not found" });
        const parentError = validateOrganizationParent(type, parent);
        if (parentError)
          return response.status(400).json({ error: parentError });
        const organization = await prisma.organizations.create({
          data: {
            code: code.trim(),
            name,
            type,
            parentId,
            metadata,
          },
        });
        await EventLogs.logEvent(
          "education_organization_created",
          {
            organizationId: organization.id,
            organizationType: organization.type,
            parentId: organization.parentId,
          },
          user.id
        );
        return response.status(201).json({ success: true, organization });
      } catch (error) {
        if (error?.code === "P2002")
          return response
            .status(409)
            .json({ error: "Organization code already exists" });
        console.error("Create organization error:", error);
        return response
          .status(500)
          .json({ error: "Failed to create organization" });
      }
    }
  );

  app.post(
    "/education/organizations/:id/memberships",
    [validatedRequest],
    async (request, response) => {
      try {
        const user = response.locals.user;
        if (user?.role !== "admin")
          return response.status(403).json({ error: "Admin access required" });
        const organizationId = numericId(request.params.id);
        const userId = numericId(request.body?.userId);
        const { role, canViewPii = false } = request.body || {};
        if (!organizationId || !userId || !role) {
          return response
            .status(400)
            .json({ error: "Valid organization, user and role are required" });
        }
        const organization = await prisma.organizations.findUnique({
          where: { id: organizationId },
          select: { type: true },
        });
        if (!organization)
          return response.status(404).json({ error: "Organization not found" });
        const roleError = validateMembershipRole(role, organization.type);
        if (roleError) return response.status(400).json({ error: roleError });
        const membership = await prisma.organization_memberships.upsert({
          where: {
            organizationId_userId_role: { organizationId, userId, role },
          },
          update: { canViewPii: Boolean(canViewPii), validTo: null },
          create: {
            organizationId,
            userId,
            role,
            canViewPii: Boolean(canViewPii),
          },
        });
        await EventLogs.logEvent(
          "education_membership_granted",
          {
            membershipId: membership.id,
            organizationId,
            targetUserId: userId,
            role,
            canViewPii: membership.canViewPii,
          },
          user.id
        );
        return response.status(201).json({ success: true, membership });
      } catch (error) {
        console.error("Create membership error:", error);
        return response
          .status(500)
          .json({ error: "Failed to create membership" });
      }
    }
  );
}

module.exports = { educationEndpoints };

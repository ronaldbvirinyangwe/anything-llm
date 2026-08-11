const ORGANIZATION_TYPES = new Set([
  "ministry",
  "department",
  "province",
  "district",
  "school",
  "school_department",
]);

const ROLE_SCOPE_TYPES = {
  ministry_admin: ["ministry"],
  ministry_analyst: ["ministry"],
  department_admin: ["department"],
  department_analyst: ["department"],
  province_admin: ["province"],
  district_admin: ["district"],
  school_admin: ["school"],
  headmaster: ["school"],
  deputy_head: ["school"],
  hod: ["school_department"],
  teacher: ["school"],
  student_support: ["school"],
  viewer: [
    "ministry",
    "department",
    "province",
    "district",
    "school",
    "school_department",
  ],
};

const MEMBERSHIP_ROLES = new Set(Object.keys(ROLE_SCOPE_TYPES));
const REPORTING_ROLES = new Set([
  "ministry_admin",
  "ministry_analyst",
  "department_admin",
  "department_analyst",
  "province_admin",
  "district_admin",
]);
const SCHOOL_LEADERSHIP_ROLES = new Set([
  "school_admin",
  "headmaster",
  "deputy_head",
]);

const PARENT_TYPES = {
  ministry: [null],
  department: ["ministry"],
  province: ["ministry"],
  district: ["province"],
  school: ["district"],
  school_department: ["school"],
};

function descendantIds(organizations, rootId) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const organization of organizations) {
      if (
        organization.parentId &&
        ids.has(organization.parentId) &&
        !ids.has(organization.id)
      ) {
        ids.add(organization.id);
        changed = true;
      }
    }
  }
  return [...ids];
}

function isActiveMembership(membership, now = new Date()) {
  const validFrom = new Date(membership.validFrom);
  const validTo = membership.validTo ? new Date(membership.validTo) : null;
  return validFrom <= now && (!validTo || validTo > now);
}

function validateOrganizationParent(type, parent) {
  if (!ORGANIZATION_TYPES.has(type)) return "Invalid organization type";
  const allowedParents = PARENT_TYPES[type];
  const parentType = parent?.type || null;
  if (!allowedParents.includes(parentType)) {
    const expected = allowedParents[0] || "no parent";
    return `${type} must have ${expected} as its parent`;
  }
  if (parent && !parent.active) return "Parent organization is inactive";
  return null;
}

function validateMembershipRole(role, organizationType) {
  if (!MEMBERSHIP_ROLES.has(role)) return "Invalid membership role";
  if (!ROLE_SCOPE_TYPES[role].includes(organizationType)) {
    return `${role} cannot be assigned at ${organizationType} level`;
  }
  return null;
}

function buildEducationAccess({
  user,
  organizations,
  memberships,
  teacherClassIds = [],
  now = new Date(),
}) {
  const isGlobalAdmin = user?.role === "admin";
  const organizationById = new Map(
    organizations.map((organization) => [organization.id, organization])
  );
  const activeMemberships = memberships.filter((membership) => {
    const organization = organizationById.get(membership.organizationId);
    return (
      organization &&
      isActiveMembership(membership, now) &&
      !validateMembershipRole(membership.role, organization.type)
    );
  });
  const organizationIds = new Set();

  if (isGlobalAdmin) {
    for (const organization of organizations)
      organizationIds.add(organization.id);
  } else {
    for (const membership of activeMemberships) {
      if (REPORTING_ROLES.has(membership.role)) {
        for (const id of descendantIds(
          organizations,
          membership.organizationId
        ))
          organizationIds.add(id);
      } else if (SCHOOL_LEADERSHIP_ROLES.has(membership.role)) {
        organizationIds.add(membership.organizationId);
        for (const organization of organizations) {
          if (
            organization.type === "school_department" &&
            organization.parentId === membership.organizationId
          )
            organizationIds.add(organization.id);
        }
      } else if (membership.role !== "teacher") {
        // HOD, student support, and viewer access is limited to the explicit scope.
        organizationIds.add(membership.organizationId);
      }
    }
  }

  return {
    isGlobalAdmin,
    organizations,
    memberships: activeMemberships,
    organizationIds,
    teacherClassIds: new Set(
      activeMemberships.some(({ role }) => role === "teacher")
        ? teacherClassIds
        : []
    ),
  };
}

function membershipsFor(context, role, organizationId) {
  return context.memberships.filter(
    (membership) =>
      membership.role === role && membership.organizationId === organizationId
  );
}

function canViewOrganization(context, organizationId) {
  return context.organizationIds.has(organizationId);
}

function validateClassDepartment(schoolId, department) {
  if (!department) return null;
  if (department.type !== "school_department") {
    return "Class department must be a school_department";
  }
  if (!department.active) return "Class department is inactive";
  if (department.parentId !== schoolId) {
    return "Class department must belong to the class school";
  }
  return null;
}

function canViewClass(context, educationClass) {
  if (context.isGlobalAdmin) return true;
  if (
    context.teacherClassIds.has(educationClass.id) &&
    membershipsFor(context, "teacher", educationClass.schoolId).length
  )
    return true;

  for (const membership of context.memberships) {
    if (REPORTING_ROLES.has(membership.role)) {
      const scope = new Set(
        descendantIds(context.organizations, membership.organizationId)
      );
      if (scope.has(educationClass.schoolId)) return true;
    }
    if (
      SCHOOL_LEADERSHIP_ROLES.has(membership.role) &&
      membership.organizationId === educationClass.schoolId
    )
      return true;
    if (
      membership.role === "hod" &&
      membership.organizationId === educationClass.departmentId
    ) {
      const department = context.organizations.find(
        ({ id }) => id === membership.organizationId
      );
      if (department?.parentId === educationClass.schoolId) return true;
    }
  }
  return false;
}

function canListOrganizationChildren(context, organization) {
  if (context.isGlobalAdmin) return true;
  for (const membership of context.memberships) {
    if (
      REPORTING_ROLES.has(membership.role) &&
      descendantIds(context.organizations, membership.organizationId).includes(
        organization.id
      )
    )
      return true;
  }
  return context.memberships.some(
    (membership) =>
      SCHOOL_LEADERSHIP_ROLES.has(membership.role) &&
      membership.organizationId === organization.id
  );
}

function accessCapabilities(context) {
  const roles = [...new Set(context.memberships.map(({ role }) => role))];
  return {
    isGlobalAdmin: context.isGlobalAdmin,
    roles: context.isGlobalAdmin ? ["global_admin"] : roles,
    canManageEducation: context.isGlobalAdmin,
    canViewSchoolAggregate:
      context.isGlobalAdmin ||
      roles.some((role) =>
        [
          ...REPORTING_ROLES,
          ...SCHOOL_LEADERSHIP_ROLES,
          "student_support",
          "viewer",
        ].includes(role)
      ),
    canViewDepartment:
      context.isGlobalAdmin ||
      roles.includes("hod") ||
      roles.some((role) => SCHOOL_LEADERSHIP_ROLES.has(role)),
    canViewClass:
      context.isGlobalAdmin ||
      context.teacherClassIds.size > 0 ||
      roles.includes("hod") ||
      roles.some(
        (role) => REPORTING_ROLES.has(role) || SCHOOL_LEADERSHIP_ROLES.has(role)
      ),
  };
}

module.exports = {
  MEMBERSHIP_ROLES,
  ORGANIZATION_TYPES,
  ROLE_SCOPE_TYPES,
  accessCapabilities,
  buildEducationAccess,
  canListOrganizationChildren,
  canViewClass,
  canViewOrganization,
  descendantIds,
  isActiveMembership,
  membershipsFor,
  validateClassDepartment,
  validateMembershipRole,
  validateOrganizationParent,
};

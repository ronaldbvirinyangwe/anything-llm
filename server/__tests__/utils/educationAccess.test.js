const {
  buildEducationAccess,
  canListOrganizationChildren,
  canViewClass,
  canViewOrganization,
  validateClassDepartment,
  validateMembershipRole,
  validateOrganizationParent,
} = require("../../utils/educationAccess");

const organizations = [
  { id: 1, type: "ministry", parentId: null, active: true },
  { id: 2, type: "province", parentId: 1, active: true },
  { id: 3, type: "district", parentId: 2, active: true },
  { id: 10, type: "school", parentId: 3, active: true },
  { id: 11, type: "school_department", parentId: 10, active: true },
  { id: 12, type: "school_department", parentId: 10, active: true },
  { id: 20, type: "school", parentId: 3, active: true },
  { id: 21, type: "school_department", parentId: 20, active: true },
  { id: 30, type: "province", parentId: 1, active: true },
  { id: 31, type: "district", parentId: 30, active: true },
  { id: 32, type: "school", parentId: 31, active: true },
];

const activeMembership = (organizationId, role) => ({
  organizationId,
  role,
  validFrom: new Date("2026-01-01T00:00:00.000Z"),
  validTo: null,
});

function access(memberships, teacherClassIds = []) {
  return buildEducationAccess({
    user: { id: 7, role: "default" },
    organizations,
    memberships,
    teacherClassIds,
    now: new Date("2026-08-10T00:00:00.000Z"),
  });
}

describe("education access scopes", () => {
  test("school leadership cannot cross school boundaries", () => {
    const context = access([activeMembership(10, "headmaster")]);

    expect(canViewOrganization(context, 10)).toBe(true);
    expect(canViewOrganization(context, 11)).toBe(true);
    expect(canViewOrganization(context, 20)).toBe(false);
    expect(
      canViewClass(context, { id: 100, schoolId: 20, departmentId: 21 })
    ).toBe(false);
  });

  test("HOD only sees their department and its classes", () => {
    const context = access([activeMembership(11, "hod")]);

    expect(canViewOrganization(context, 11)).toBe(true);
    expect(canViewOrganization(context, 10)).toBe(false);
    expect(
      canViewClass(context, { id: 100, schoolId: 10, departmentId: 11 })
    ).toBe(true);
    expect(
      canViewClass(context, { id: 101, schoolId: 10, departmentId: 12 })
    ).toBe(false);
    expect(
      canViewClass(context, { id: 102, schoolId: 20, departmentId: 11 })
    ).toBe(false);
  });

  test("teacher only sees explicitly assigned classes in their school", () => {
    const context = access([activeMembership(10, "teacher")], [100]);

    expect(canViewOrganization(context, 10)).toBe(false);
    expect(
      canViewClass(context, { id: 100, schoolId: 10, departmentId: 11 })
    ).toBe(true);
    expect(
      canViewClass(context, { id: 101, schoolId: 10, departmentId: 11 })
    ).toBe(false);
    expect(
      canViewClass(context, { id: 100, schoolId: 20, departmentId: 21 })
    ).toBe(false);
  });

  test("expired membership denies stale teacher assignments", () => {
    const context = access(
      [
        {
          ...activeMembership(10, "teacher"),
          validTo: new Date("2026-08-09T00:00:00.000Z"),
        },
      ],
      [100]
    );

    expect(
      canViewClass(context, { id: 100, schoolId: 10, departmentId: 11 })
    ).toBe(false);
  });

  test("reporting access cannot elevate an unrelated viewer scope", () => {
    const context = access([
      activeMembership(2, "province_admin"),
      activeMembership(32, "viewer"),
    ]);

    expect(canViewOrganization(context, 32)).toBe(true);
    expect(canListOrganizationChildren(context, organizations[10])).toBe(false);
  });
});

describe("education hierarchy validation", () => {
  test("rejects invalid membership role and organization combinations", () => {
    expect(validateMembershipRole("hod", "school")).toBe(
      "hod cannot be assigned at school level"
    );
    expect(validateMembershipRole("headmaster", "school_department")).toBe(
      "headmaster cannot be assigned at school_department level"
    );
    expect(validateMembershipRole("unknown", "school")).toBe(
      "Invalid membership role"
    );
  });

  test("rejects a class department from another school", () => {
    expect(validateClassDepartment(10, organizations[7])).toBe(
      "Class department must belong to the class school"
    );
    expect(validateClassDepartment(10, organizations[4])).toBeNull();
  });

  test("school departments must have an active school parent", () => {
    expect(
      validateOrganizationParent("school_department", {
        type: "school",
        active: true,
      })
    ).toBeNull();
    expect(
      validateOrganizationParent("school_department", {
        type: "district",
        active: true,
      })
    ).toBe("school_department must have school as its parent");
  });
});

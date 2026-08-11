const mockPrisma = {
  organizations: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  organization_memberships: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  education_classes: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  class_students: { findMany: jest.fn() },
  class_teachers: { findMany: jest.fn() },
  school_verification_submissions: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock("../../utils/prisma", () => mockPrisma);
jest.mock("../../utils/middleware/validatedRequest", () => ({
  validatedRequest: jest.fn(),
}));
jest.mock("../../models/eventLogs", () => ({
  EventLogs: { logEvent: jest.fn() },
}));

const { EventLogs } = require("../../models/eventLogs");
const { educationEndpoints } = require("../../endpoints/education");
const prisma = mockPrisma;

function registeredRoutes() {
  const routes = {};
  const app = {};
  for (const method of ["get", "post", "patch", "delete"]) {
    app[method] = (path, _middleware, handler) => {
      routes[`${method.toUpperCase()} ${path}`] = handler;
    };
  }
  educationEndpoints(app);
  return routes;
}

function mockResponse(user) {
  return {
    locals: { user },
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
}

const routes = registeredRoutes();

describe("education endpoints", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organizations.findMany.mockResolvedValue([]);
    prisma.organization_memberships.findMany.mockResolvedValue([]);
    prisma.education_classes.findMany.mockResolvedValue([]);
    prisma.school_verification_submissions.findMany.mockResolvedValue([]);
    prisma.school_verification_submissions.findFirst.mockResolvedValue(null);
    prisma.class_students.findMany.mockResolvedValue([]);
    EventLogs.logEvent.mockResolvedValue({ eventLog: {} });
  });

  test("admin access control includes active classes for assignment", async () => {
    const classes = [
      { id: 41, name: "Form 4A", schoolId: 10, departmentId: null },
    ];
    prisma.education_classes.findMany.mockResolvedValue(classes);
    const response = mockResponse({ id: 1, role: "admin" });

    await routes["GET /education/admin/access-control"]({}, response);

    expect(prisma.education_classes.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { active: true } })
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, classes })
    );
  });

  test("logs school verification submission after it is created", async () => {
    prisma.organization_memberships.findFirst.mockResolvedValue(null);
    prisma.organizations.findFirst.mockResolvedValue({ id: 3 });
    prisma.school_verification_submissions.findMany.mockResolvedValue([]);
    prisma.school_verification_submissions.create.mockResolvedValue({ id: 91 });
    const response = mockResponse({ id: 1, role: "admin" });

    await routes["POST /education/school-verification"](
      {
        body: {
          schoolId: 10,
          provinceId: 2,
          districtId: 3,
          proposedName: "Test School",
          schoolLevel: "secondary",
          sector: "public",
          responsibleAuthority: "government",
        },
      },
      response
    );

    expect(EventLogs.logEvent).toHaveBeenCalledWith(
      "education_school_verification_submitted",
      {
        submissionId: 91,
        schoolId: 10,
        provinceId: 2,
        districtId: 3,
      },
      1
    );
    expect(response.status).toHaveBeenCalledWith(201);
  });

  test("logs school verification review after the transaction", async () => {
    const submission = {
      id: 91,
      schoolId: 10,
      status: "pending",
      school: { id: 10, name: "Test School", metadata: {} },
    };
    prisma.school_verification_submissions.findUnique.mockResolvedValue(
      submission
    );
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        organizations: { update: jest.fn() },
        school_verification_submissions: { update: jest.fn() },
      })
    );
    const response = mockResponse({ id: 1, role: "admin" });

    await routes["POST /education/admin/school-verifications/:id/review"](
      { params: { id: "91" }, body: { decision: "rejected" } },
      response
    );

    expect(EventLogs.logEvent).toHaveBeenCalledWith(
      "education_school_verification_reviewed",
      { submissionId: 91, schoolId: 10, decision: "rejected" },
      1
    );
    expect(response.json).toHaveBeenCalledWith({
      success: true,
      decision: "rejected",
    });
  });

  test("logs a successful class dashboard read", async () => {
    prisma.education_classes.findUnique.mockResolvedValue({
      id: 41,
      schoolId: 10,
      departmentId: null,
      school: { id: 10 },
      department: null,
    });
    const response = mockResponse({ id: 1, role: "admin" });

    await routes["GET /education/classes/:id/dashboard"](
      { params: { id: "41" }, query: {} },
      response
    );

    expect(EventLogs.logEvent).toHaveBeenCalledWith(
      "education_dashboard_read",
      { scopeType: "class", scopeId: 41 },
      1
    );
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  test("denies a dashboard read outside school scope without auditing success", async () => {
    const school10 = {
      id: 10,
      type: "school",
      parentId: 3,
      active: true,
    };
    prisma.organizations.findMany.mockResolvedValue([
      school10,
      { id: 20, type: "school", parentId: 3, active: true },
    ]);
    prisma.organization_memberships.findMany.mockResolvedValue([
      {
        organizationId: 10,
        role: "headmaster",
        validFrom: new Date("2026-01-01T00:00:00.000Z"),
        validTo: null,
        organization: school10,
      },
    ]);
    prisma.education_classes.findUnique.mockResolvedValue({
      id: 41,
      schoolId: 20,
      departmentId: null,
      school: { id: 20 },
      department: null,
    });
    const response = mockResponse({ id: 7, role: "default" });

    await routes["GET /education/classes/:id/dashboard"](
      { params: { id: "41" }, query: {} },
      response
    );

    expect(response.status).toHaveBeenCalledWith(403);
    expect(EventLogs.logEvent).not.toHaveBeenCalled();
    expect(prisma.class_students.findMany).not.toHaveBeenCalled();
  });
});

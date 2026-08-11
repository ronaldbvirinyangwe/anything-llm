const {
  EducationalContextBuilder,
} = require("../../../utils/educationalContext");

const NOW = new Date("2026-08-02T12:00:00.000Z");

function mockPrisma(overrides = {}) {
  return {
    users: { findUnique: jest.fn().mockResolvedValue(null) },
    students: { findFirst: jest.fn().mockResolvedValue(null) },
    quiz_results: { findMany: jest.fn().mockResolvedValue([]) },
    weakAreaCard: { findMany: jest.fn().mockResolvedValue([]) },
    study_plans: { findFirst: jest.fn().mockResolvedValue(null) },
    ...overrides,
  };
}

function builder(prismaClient) {
  return new EducationalContextBuilder({
    prismaClient,
    now: () => new Date(NOW),
  });
}

describe("EducationalContextBuilder", () => {
  it("returns the stable empty context when the user is absent", async () => {
    const prismaClient = mockPrisma();

    const context = await builder(prismaClient).build({
      userId: 999,
      workspaceId: 4,
    });

    expect(context).toEqual({
      learner: {
        userId: null,
        studentId: null,
        username: null,
        name: null,
        age: null,
      },
      education: {
        academicLevel: null,
        curriculum: null,
        grade: null,
        studyPlan: null,
      },
      performance: {
        quizAttempts: 0,
        averageScore: null,
        weakSubjects: [],
        weakAreas: [],
        recentQuizzes: [],
      },
      session: {
        workspaceId: 4,
        activeStudyPlanId: null,
        today: [],
        upcoming: [],
        completed: [],
        missed: [],
        lastActiveAt: null,
      },
      permissions: {
        role: null,
        isAuthenticated: false,
        isSuspended: false,
        canLearn: false,
        canTeach: false,
        canManageEducation: false,
      },
    });
    expect(prismaClient.students.findFirst).not.toHaveBeenCalled();
    expect(prismaClient.quiz_results.findMany).not.toHaveBeenCalled();
    expect(prismaClient.study_plans.findFirst).not.toHaveBeenCalled();
  });

  it("builds a normalized context from profile, quizzes, and study plan", async () => {
    const prismaClient = mockPrisma({
      users: {
        findUnique: jest.fn().mockResolvedValue({
          id: 7,
          username: "tariro",
          role: "student",
          suspended: 0,
        }),
      },
      students: {
        findFirst: jest.fn().mockResolvedValue({
          id: 17,
          name: "Tariro",
          age: 15,
          academicLevel: "O-Level",
          curriculum: "ZIMSEC",
          grade: "10",
        }),
      },
      quiz_results: {
        findMany: jest.fn().mockResolvedValue([
          {
            subject: "Mathematics",
            score: 50,
            total_questions: 10,
            correct_answers: 5,
            submitted_at: new Date("2026-08-01T09:00:00.000Z"),
            quiz_code: "MATH-1",
          },
          {
            subject: "Biology",
            score: 80,
            total_questions: 10,
            correct_answers: 8,
            submitted_at: new Date("2026-07-31T09:00:00.000Z"),
            quiz_code: null,
          },
        ]),
      },
      weakAreaCard: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 9,
            subject: "Mathematics",
            question: "Solve 2x + 3 = 9",
            correctAnswer: "x = 3",
            explanation: "Subtract 3, then divide by 2.",
            timesWrong: 2,
            lastWrongAt: new Date("2026-08-01T10:00:00.000Z"),
          },
        ]),
      },
      study_plans: {
        findFirst: jest.fn().mockResolvedValue({
          id: 27,
          subject: "Mathematics",
          exam_date: new Date("2026-09-01T00:00:00.000Z"),
          topics: ["Algebra", "Geometry"],
          study_hours: 2,
          days_off: ["Sunday"],
          status: "active",
          last_active: new Date("2026-08-01T12:00:00.000Z"),
          sessions: [
            { date: "2026-08-02", topic: "Algebra", status: "pending" },
            { date: "2026-08-03", topic: "Geometry", status: "pending" },
            {
              date: "2026-08-01",
              topic: "Equations",
              status: "complete",
              completed_at: "2026-08-01T15:00:00.000Z",
            },
            {
              date: "2026-07-31",
              topic: "Fractions",
              status: "rescheduled",
              rescheduled_to: "2026-08-04",
            },
          ],
        }),
      },
    });

    const context = await builder(prismaClient).build({
      userId: "7",
      workspaceId: "4",
    });

    expect(context.learner).toEqual({
      userId: 7,
      studentId: 17,
      username: "tariro",
      name: "Tariro",
      age: 15,
    });
    expect(context.education).toEqual({
      academicLevel: "O-Level",
      curriculum: "ZIMSEC",
      grade: "10",
      studyPlan: {
        id: 27,
        subject: "Mathematics",
        examDate: "2026-09-01T00:00:00.000Z",
        topics: ["Algebra", "Geometry"],
        studyHours: 2,
        daysOff: ["Sunday"],
        status: "active",
      },
    });
    expect(context.performance).toEqual({
      quizAttempts: 2,
      averageScore: 65,
      weakSubjects: [{ subject: "Mathematics", averageScore: 50, attempts: 1 }],
      weakAreas: [
        {
          id: 9,
          subject: "Mathematics",
          question: "Solve 2x + 3 = 9",
          correctAnswer: "x = 3",
          explanation: "Subtract 3, then divide by 2.",
          timesWrong: 2,
          lastWrongAt: "2026-08-01T10:00:00.000Z",
        },
      ],
      recentQuizzes: [
        {
          subject: "Mathematics",
          score: 50,
          totalQuestions: 10,
          correctAnswers: 5,
          submittedAt: "2026-08-01T09:00:00.000Z",
          quizCode: "MATH-1",
        },
        {
          subject: "Biology",
          score: 80,
          totalQuestions: 10,
          correctAnswers: 8,
          submittedAt: "2026-07-31T09:00:00.000Z",
          quizCode: null,
        },
      ],
    });
    expect(context.session.today).toHaveLength(1);
    expect(context.session.upcoming).toHaveLength(1);
    expect(context.session.completed).toHaveLength(1);
    expect(context.session.missed).toHaveLength(1);
    expect(context.permissions).toEqual({
      role: "student",
      isAuthenticated: true,
      isSuspended: false,
      canLearn: true,
      canTeach: false,
      canManageEducation: false,
    });
    expect(prismaClient.quiz_results.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 })
    );
    expect(prismaClient.study_plans.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          user_id: 7,
          workspace_id: 4,
          status: "active",
        }),
      })
    );
  });

  it("keeps the full contract when the student profile is absent", async () => {
    const prismaClient = mockPrisma({
      users: {
        findUnique: jest.fn().mockResolvedValue({
          id: 8,
          username: "new-user",
          role: "student",
          suspended: 0,
        }),
      },
    });

    const context = await builder(prismaClient).build({ userId: 8 });

    expect(context.learner).toEqual({
      userId: 8,
      studentId: null,
      username: "new-user",
      name: "new-user",
      age: null,
    });
    expect(context.education).toEqual({
      academicLevel: null,
      curriculum: null,
      grade: null,
      studyPlan: null,
    });
    expect(context.performance.quizAttempts).toBe(0);
    expect(context.permissions.canLearn).toBe(true);
  });

  it("tolerates malformed optional plan data", async () => {
    const prismaClient = mockPrisma({
      users: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          username: null,
          role: "default",
          suspended: 0,
        }),
      },
      study_plans: {
        findFirst: jest.fn().mockResolvedValue({
          id: 29,
          subject: null,
          exam_date: null,
          topics: null,
          study_hours: null,
          days_off: null,
          status: "active",
          sessions: "not-json",
          last_active: "not-a-date",
        }),
      },
    });

    await expect(
      builder(prismaClient).build({ userId: 9 })
    ).resolves.toMatchObject({
      education: {
        studyPlan: {
          id: 29,
          examDate: null,
          topics: [],
          daysOff: [],
        },
      },
      session: {
        activeStudyPlanId: 29,
        today: [],
        upcoming: [],
        completed: [],
        missed: [],
        lastActiveAt: null,
      },
    });
  });

  it("isolates optional retrieval failures instead of rejecting", async () => {
    const prismaClient = mockPrisma({
      users: {
        findUnique: jest.fn().mockResolvedValue({
          id: 10,
          username: "teacher-one",
          role: "teacher",
          suspended: 0,
        }),
      },
      students: {
        findFirst: jest
          .fn()
          .mockRejectedValue(new Error("profile unavailable")),
      },
      quiz_results: {
        findMany: jest.fn().mockRejectedValue(new Error("quiz unavailable")),
      },
      study_plans: {
        findFirst: jest.fn().mockRejectedValue(new Error("plan unavailable")),
      },
    });

    const context = await builder(prismaClient).build({ userId: 10 });

    expect(context.education.studyPlan).toBeNull();
    expect(context.performance).toEqual({
      quizAttempts: 0,
      averageScore: null,
      weakSubjects: [],
      weakAreas: [],
      recentQuizzes: [],
    });
    expect(context.session.activeStudyPlanId).toBeNull();
    expect(context.permissions.canTeach).toBe(true);
  });
});

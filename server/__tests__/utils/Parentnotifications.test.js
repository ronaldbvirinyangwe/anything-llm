const mockSendPushNotificationsAsync = jest.fn();
const mockSendEmail = jest.fn();
const mockPrisma = {
  pushToken: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  parentNotificationSettings: {
    findMany: jest.fn(),
  },
  quiz_results: {
    findMany: jest.fn(),
  },
};

jest.mock("expo-server-sdk", () => ({
  Expo: class Expo {
    static isExpoPushToken() {
      return true;
    }

    chunkPushNotifications(messages) {
      return [messages];
    }

    sendPushNotificationsAsync(messages) {
      mockSendPushNotificationsAsync(messages);
      return Promise.resolve(messages.map(() => ({ status: "ok" })));
    }
  },
}));

jest.mock("resend", () => ({
  Resend: class Resend {
    emails = { send: mockSendEmail };
  },
}));

jest.mock("@prisma/client", () => ({
  PrismaClient: class PrismaClient {
    constructor() {
      return mockPrisma;
    }
  },
}));

describe("parent notification report links", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.APP_URL = "https://example.com/";
    process.env.RESEND_API_KEY = "test-key";
    mockPrisma.pushToken.findMany.mockResolvedValue([
      { token: "ExponentPushToken[test]" },
    ]);
    mockSendEmail.mockResolvedValue({});
  });

  afterAll(() => {
    delete process.env.APP_URL;
    delete process.env.RESEND_API_KEY;
  });

  test("uses the registered plural report route for low-score push and email links", async () => {
    mockPrisma.parentNotificationSettings.findMany.mockResolvedValue([
      {
        alertThreshold: 70,
        parent: {
          name: "Parent",
          user_id: 10,
          email: "parent@example.com",
        },
      },
    ]);

    const { sendLowScoreAlert } = require("../../utils/Parentnotifications");
    await sendLowScoreAlert({
      childId: 42,
      childName: "Student",
      subject: "Maths",
      score: 35,
      quizId: 9,
    });

    expect(mockSendPushNotificationsAsync.mock.calls[0][0][0].data.link).toBe(
      "/parent/reports/42"
    );
    expect(mockSendEmail.mock.calls[0][0].html).toContain(
      'href="https://example.com/parent/reports/42"'
    );
    expect(mockSendEmail.mock.calls[0][0].html).not.toContain(
      "/parent/report/"
    );
  });

  test("uses the plural report route for weekly nudge and digest links", async () => {
    mockPrisma.parentNotificationSettings.findMany.mockResolvedValue([
      {
        parent: { name: "Parent", user_id: 10, email: null },
        student: { id: 42, name: "Inactive", grade: "5", user_id: 20 },
      },
      {
        parent: {
          name: "Parent",
          user_id: 10,
          email: "parent@example.com",
        },
        student: { id: 43, name: "Active", grade: "6", user_id: 21 },
      },
    ]);
    mockPrisma.quiz_results.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { score: 80, subject: "Science", submitted_at: new Date() },
      ]);

    const {
      sendWeeklyDigestToAllParents,
    } = require("../../utils/Parentnotifications");
    await sendWeeklyDigestToAllParents();

    const links = mockSendPushNotificationsAsync.mock.calls.map(
      ([messages]) => messages[0].data.link
    );
    expect(links).toEqual(["/parent/reports/42", "/parent/reports/43"]);
    expect(mockSendEmail.mock.calls[0][0].html).toContain(
      'href="https://example.com/parent/reports/43"'
    );
  });
});

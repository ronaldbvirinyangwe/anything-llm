const {
  ROLES,
  flexUserRoleValid,
  strictMultiUserRoleValid,
} = require("../../../utils/middleware/multiUserProtected");

function responseFor(role, multiUserMode = true) {
  return {
    locals: { multiUserMode, user: { id: 1, role } },
    sendStatus: jest.fn().mockReturnThis(),
    end: jest.fn().mockReturnThis(),
  };
}

describe("multi-user role middleware", () => {
  test.each([ROLES.admin, ROLES.manager])(
    "default flexible access permits %s",
    async (role) => {
      const response = responseFor(role);
      const next = jest.fn();

      await flexUserRoleValid()({}, response, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(response.sendStatus).not.toHaveBeenCalled();
    }
  );

  test.each([ROLES.teacher, ROLES.parent, ROLES.student, ROLES.default])(
    "default flexible access denies %s",
    async (role) => {
      const response = responseFor(role);
      const next = jest.fn();

      await flexUserRoleValid()({}, response, next);

      expect(next).not.toHaveBeenCalled();
      expect(response.sendStatus).toHaveBeenCalledWith(401);
    }
  );

  test("flexible checks are bypassed in single-user mode", async () => {
    const response = responseFor(ROLES.default, false);
    const next = jest.fn();

    await flexUserRoleValid([ROLES.teacher])({}, response, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test("strict checks do not bypass single-user mode", async () => {
    const response = responseFor(ROLES.teacher, false);
    const next = jest.fn();

    await strictMultiUserRoleValid([ROLES.teacher])({}, response, next);

    expect(next).not.toHaveBeenCalled();
    expect(response.sendStatus).toHaveBeenCalledWith(401);
  });
});

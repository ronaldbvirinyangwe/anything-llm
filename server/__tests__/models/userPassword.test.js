const { User } = require("../../models/user");

describe("User password complexity", () => {
  const passwordVariables = [
    "PASSWORDMINCHAR",
    "PASSWORDMAXCHAR",
    "PASSWORDLOWERCASE",
    "PASSWORDUPPERCASE",
    "PASSWORDNUMERIC",
    "PASSWORDSYMBOL",
    "PASSWORDREQUIREMENTS",
  ];
  const originalValues = Object.fromEntries(
    passwordVariables.map((key) => [key, process.env[key]])
  );

  beforeEach(() => {
    process.env.PASSWORDMINCHAR = "12";
    process.env.PASSWORDMAXCHAR = "128";
    process.env.PASSWORDLOWERCASE = "1";
    process.env.PASSWORDUPPERCASE = "1";
    process.env.PASSWORDNUMERIC = "1";
    process.env.PASSWORDSYMBOL = "1";
    process.env.PASSWORDREQUIREMENTS = "4";
  });

  afterAll(() => {
    for (const key of passwordVariables) {
      if (originalValues[key] === undefined) delete process.env[key];
      else process.env[key] = originalValues[key];
    }
  });

  test("rejects passwords that do not satisfy production requirements", () => {
    expect(User.checkPasswordComplexity("weakpassword").checkedOK).toBe(false);
  });

  test("accepts passwords that satisfy production requirements", () => {
    expect(User.checkPasswordComplexity("StrongPass1!").checkedOK).toBe(true);
  });
});

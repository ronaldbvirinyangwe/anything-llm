const { positiveInteger } = require("../../utils/security");

describe("security configuration", () => {
  test("accepts positive integer limits", () => {
    expect(positiveInteger("25", 10)).toBe(25);
  });

  test.each([undefined, "", "0", "-1", "1.5", "invalid"])(
    "falls back for invalid limit %p",
    (value) => {
      expect(positiveInteger(value, 10)).toBe(10);
    }
  );
});

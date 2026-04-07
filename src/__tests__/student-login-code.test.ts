import { describe, expect, it } from "vitest";

import {
  generateStudentLoginCode,
  getStudentLoginCodeVariants,
  LEGACY_STUDENT_LOGIN_CODE_LENGTH,
  STUDENT_LOGIN_CODE_LENGTH,
} from "@/lib/student-login-code";

describe("student login code helper", () => {
  it("exports the supported legacy and current login code lengths", () => {
    expect(LEGACY_STUDENT_LOGIN_CODE_LENGTH).toBe(6);
    expect(STUDENT_LOGIN_CODE_LENGTH).toBe(12);
  });

  it("generates current login codes using the configured default length", () => {
    const code = generateStudentLoginCode();

    expect(code).toHaveLength(STUDENT_LOGIN_CODE_LENGTH);
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]+$/);
  });

  it("builds lookup variants for legacy lowercase and current uppercase codes", () => {
    expect(getStudentLoginCodeVariants(" CmnBsF5sX000 ")).toEqual([
      "CmnBsF5sX000",
      "CMNBSF5SX000",
      "cmnbsf5sx000",
    ]);
  });
});

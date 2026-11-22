import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentUpdateMany = vi.fn();
const mockRevalidatePath = vi.fn();
const mockConsumeRateLimitWithStore = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findUnique: mockStudentFindUnique,
      updateMany: mockStudentUpdateMany,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/lib/auth/student-access-session", () => ({
  getStudentAccessSession: vi.fn().mockResolvedValue({ studentId: "student-1" }),
}));

vi.mock("@/lib/security/rate-limit", () => ({
  buildRateLimitKey: (...parts: string[]) => parts.join(":"),
  consumeRateLimitWithStore: mockConsumeRateLimitWithStore,
  digestRateLimitIdentifier: (value: string) => `digest:${value}`,
}));

describe("joinClassroom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockConsumeRateLimitWithStore.mockResolvedValue({ allowed: true, retryAfterSeconds: 60 });
  });

  it(
    "blocks taking over a student record already linked to another account",
    async () => {
      mockStudentFindUnique.mockResolvedValue({
        id: "student-1",
        userId: "other-user",
        classroom: { name: "Class A" },
      });

      const { joinClassroom } = await import("@/app/student/student-actions");
      const result = await joinClassroom("abcd1234");

      expect(result).toEqual({
        error: {
          code: "LOGIN_CODE_ALREADY_LINKED",
          message: "This classroom code is already linked to another account",
        },
      });
      expect(mockStudentUpdateMany).not.toHaveBeenCalled();
    },
    30_000
  );

  it("links an unclaimed student record to the current authenticated user", async () => {
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      userId: null,
      classroom: { name: "Class A" },
    });

    const { joinClassroom } = await import("@/app/student/student-actions");
    const result = await joinClassroom("abcd1234");

    expect(result).toEqual({
      success: true,
      className: "Class A",
    });
    expect(mockStudentUpdateMany).toHaveBeenCalledWith({
      where: { id: "student-1", userId: null },
      data: { userId: "user-1" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/student/home");
  });

  it("uses an atomic claim so concurrent account linking cannot take over the record", async () => {
    mockStudentFindUnique.mockResolvedValue({
      id: "student-1",
      userId: null,
      classroom: { name: "Class A" },
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 0 });

    const { joinClassroom } = await import("@/app/student/student-actions");
    const result = await joinClassroom("access");

    expect(result).toEqual({
      error: {
        code: "LOGIN_CODE_ALREADY_LINKED",
        message: "This classroom code is already linked to another account",
      },
    });
  });
});

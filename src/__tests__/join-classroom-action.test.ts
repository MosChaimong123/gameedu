import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentUpdate = vi.fn();
const mockRevalidatePath = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
      update: mockStudentUpdate,
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

describe("joinClassroom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockStudentUpdate.mockResolvedValue(undefined);
  });

  it(
    "blocks taking over a student record already linked to another account",
    async () => {
      mockStudentFindFirst.mockResolvedValue({
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
      expect(mockStudentUpdate).not.toHaveBeenCalled();
    },
    30_000
  );

  it("links an unclaimed student record to the current authenticated user", async () => {
    mockStudentFindFirst.mockResolvedValue({
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
    expect(mockStudentUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { userId: "user-1" },
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/student/home");
  });

  it("finds legacy lowercase login codes even when the student enters uppercase", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-legacy",
      userId: null,
      classroom: { name: "Legacy Class" },
    });

    const { joinClassroom } = await import("@/app/student/student-actions");
    const result = await joinClassroom("CMNBSF5SX000");

    expect(result).toEqual({
      success: true,
      className: "Legacy Class",
    });
    expect(mockStudentFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { loginCode: "CMNBSF5SX000" },
          { loginCode: "cmnbsf5sx000" },
        ],
      },
      include: { classroom: true },
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockStudentUpdate = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
      update: mockStudentUpdate,
    },
  },
}));

describe("student checkin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found via app error payload when the student is missing", async () => {
    mockStudentFindFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/student/[code]/checkin/route");
    const response = await POST({} as Request, {
      params: Promise.resolve({ code: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Student not found",
      },
    });
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });

  it("returns alreadyDone without updating when student already checked in today", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      lastCheckIn: new Date("2026-04-07T01:00:00.000Z"),
      streak: 3,
      negamonSkills: [],
      classroom: {
        gamifiedSettings: {},
      },
    });

    vi.setSystemTime(new Date("2026-04-07T08:00:00.000Z"));

    const { POST } = await import("@/app/api/student/[code]/checkin/route");
    const response = await POST({} as Request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ alreadyDone: true });
    expect(mockStudentUpdate).not.toHaveBeenCalled();
  });
});

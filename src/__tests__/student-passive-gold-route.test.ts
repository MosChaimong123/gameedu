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

describe("student passive gold route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards passive gold based on elapsed time and updates balance", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      gold: 10,
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      lastGoldAt: new Date("2026-04-05T08:00:00.000Z"),
      negamonSkills: ["gold_flow"],
      classroom: {
        levelConfig: [{ name: "Bronze", minScore: 0, goldRate: 3 }],
        assignments: [],
      },
      submissions: [],
    });
    mockStudentUpdate.mockResolvedValue({
      gold: 20,
      lastGoldAt: new Date("2026-04-05T10:00:00.000Z"),
    });

    const { POST } = await import("@/app/api/student/[code]/claim-passive-gold/route");
    const RealDate = Date;
    vi.setSystemTime(new RealDate("2026-04-05T10:00:00.000Z"));

    const response = await POST({} as Request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      alreadyClaimed: false,
      goldEarned: 10,
      goldRate: 5,
      newGold: 20,
    });
    expect(mockStudentUpdate).toHaveBeenCalledTimes(1);
  });

  it("returns not found when the student code does not exist", async () => {
    mockStudentFindFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/student/[code]/claim-passive-gold/route");
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
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockPointHistoryFindMany = vi.fn();
const mockEconomyTransactionFindMany = vi.fn();
const mockBattleSessionFindMany = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: { findUnique: mockClassroomFindUnique },
    pointHistory: { findMany: mockPointHistoryFindMany },
    economyTransaction: { findMany: mockEconomyTransactionFindMany },
    battleSession: { findMany: mockBattleSessionFindMany },
  },
}));

describe("classroom Negamon balance route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      gamifiedSettings: { negamon: { balance: { expMultiplier: 1.25 } } },
      students: [
        { id: "student-1", name: "Ada", nickname: "A", behaviorPoints: 12, gold: 30 },
      ],
    });
    mockPointHistoryFindMany.mockResolvedValue([
      { studentId: "student-1", value: 3, reason: "negamon_level_up:2" },
    ]);
    mockEconomyTransactionFindMany.mockResolvedValue([]);
    mockBattleSessionFindMany.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/balance/route");

    const response = await GET({} as Request, { params: Promise.resolve({ id: "class-1" }) });

    expect(response.status).toBe(401);
    expect(mockClassroomFindUnique).not.toHaveBeenCalled();
  });

  it("returns teacher balance summary, guardrails, settings, and catalog preview", async () => {
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/balance/route");

    const response = await GET({} as Request, { params: Promise.resolve({ id: "class-1" }) });

    expect(response.status).toBe(200);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-1", teacherId: "teacher-1" },
      select: expect.objectContaining({
        gamifiedSettings: true,
        students: expect.any(Object),
      }),
    });
    const body = await response.json();
    expect(body.balanceSettings).toEqual({ expMultiplier: 1.25 });
    expect(body.guardrails.length).toBeGreaterThan(0);
    expect(body.summary).toMatchObject({
      studentCount: 1,
      levelUpCount: 1,
    });
    expect(body.catalogPreview.monsterCount).toBeGreaterThan(0);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockEconomyTransactionFindMany = vi.fn();
const mockPointHistoryFindMany = vi.fn();
const mockBattleSessionFindMany = vi.fn();
const mockStudentFindMany = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    economyTransaction: {
      findMany: mockEconomyTransactionFindMany,
    },
    pointHistory: {
      findMany: mockPointHistoryFindMany,
    },
    battleSession: {
      findMany: mockBattleSessionFindMany,
    },
    student: {
      findMany: mockStudentFindMany,
    },
  },
}));

describe("classroom Negamon reward visibility route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockEconomyTransactionFindMany.mockResolvedValue([]);
    mockPointHistoryFindMany.mockResolvedValue([]);
    mockBattleSessionFindMany.mockResolvedValue([]);
    mockStudentFindMany.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-visibility/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-visibility") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockClassroomFindUnique).not.toHaveBeenCalled();
  });

  it("requires the classroom to belong to the teacher", async () => {
    mockClassroomFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-visibility/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-visibility") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-1", teacherId: "teacher-1" },
      select: { id: true },
    });
  });

  it("summarizes reward, progression, level-up, and skill unlock events", async () => {
    mockEconomyTransactionFindMany.mockResolvedValue([
      {
        id: "tx-1",
        studentId: "student-1",
        source: "battle",
        amount: 30,
        sourceRefId: "session-1",
        metadata: {
          expReward: 25,
          reward: {
            exp: 25,
            levelUps: [{ fromLevel: 1, toLevel: 2 }],
            unlockedSkillIds: ["shadow-jab"],
          },
        },
        createdAt: new Date("2026-05-24T01:00:00.000Z"),
        student: { name: "Alice", nickname: "A" },
      },
      {
        id: "tx-2",
        studentId: "student-1",
        source: "quest",
        amount: 10,
        sourceRefId: "quest-1",
        metadata: { expReward: 12, reward: { exp: 12 } },
        createdAt: new Date("2026-05-24T00:50:00.000Z"),
        student: { name: "Alice", nickname: "A" },
      },
    ]);
    mockPointHistoryFindMany.mockResolvedValue([
      {
        id: "history-1",
        studentId: "student-1",
        value: 0,
        reason: "negamon_level_up:2",
        timestamp: new Date("2026-05-24T01:01:00.000Z"),
        student: { name: "Alice", nickname: "A" },
      },
      {
        id: "history-2",
        studentId: "student-1",
        value: 0,
        reason: "negamon_skill_unlocked:shadow-jab",
        timestamp: new Date("2026-05-24T01:02:00.000Z"),
        student: { name: "Alice", nickname: "A" },
      },
    ]);

    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-visibility/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-visibility?limit=10") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockEconomyTransactionFindMany).toHaveBeenCalledWith({
      where: {
        classId: "class-1",
        source: { in: ["battle", "quest", "checkin"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: expect.objectContaining({
        metadata: true,
        student: { select: { name: true, nickname: true } },
      }),
    });
    expect(mockPointHistoryFindMany).toHaveBeenCalledWith({
      where: {
        reason: { startsWith: "negamon_" },
        student: { classId: "class-1" },
      },
      orderBy: { timestamp: "desc" },
      take: 10,
      select: expect.objectContaining({
        reason: true,
        student: { select: { name: true, nickname: true } },
      }),
    });

    const body = await response.json();
    expect(body.summary).toMatchObject({
      eventCount: 4,
      rewardEventCount: 2,
      blockedEventCount: 0,
      totalGold: 40,
      totalExp: 37,
      levelUpCount: 2,
      skillUnlockCount: 2,
      byEventType: {
        battle: 1,
        quest: 1,
        level_up: 1,
        skill_unlock: 1,
      },
    });
    expect(body.events[0]).toMatchObject({
      kind: "skill_unlock",
      source: "history",
      studentName: "Alice (A)",
    });
  });

  it("filters blocked reward events and returns readable blocked reason copy", async () => {
    mockBattleSessionFindMany.mockResolvedValue([
      {
        id: "session-1",
        challengerId: "student-1",
        defenderId: "student-2",
        winnerId: "student-1",
        goldReward: 0,
        result: {
          mode: "negamon_lite",
          status: "finished",
          winnerId: "student-1",
          goldReward: 0,
          rewardBlockedReason: "daily_cap",
          reward: { gold: 0, exp: 25, levelUps: [], unlockedSkillIds: [] },
        },
        createdAt: new Date("2026-05-24T01:00:00.000Z"),
      },
    ]);
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", name: "Alice", nickname: null },
      { id: "student-2", name: "Bob", nickname: null },
    ]);

    const { GET } = await import("@/app/api/classrooms/[id]/negamon/reward-visibility/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/negamon/reward-visibility?eventType=blocked") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.filters.eventType).toBe("blocked");
    expect(body.summary).toMatchObject({
      eventCount: 1,
      blockedEventCount: 1,
      totalExp: 25,
      byBlockedReason: { daily_cap: 1 },
    });
    expect(body.events[0]).toMatchObject({
      kind: "battle",
      source: "battle_session",
      studentName: "Alice",
      blockedReason: "daily_cap",
      blockedReasonLabel: "Daily reward cap reached",
    });
  });
});

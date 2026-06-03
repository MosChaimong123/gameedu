import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindFirst = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentFindMany = vi.fn();
const mockBattleSessionFindMany = vi.fn();
const mockBattleSessionFindFirst = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findFirst: mockClassroomFindFirst,
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findFirst: mockStudentFindFirst,
      findMany: mockStudentFindMany,
    },
    battleSession: {
      findMany: mockBattleSessionFindMany,
      findFirst: mockBattleSessionFindFirst,
    },
  },
}));

vi.mock("@/lib/classroom-utils", () => ({
  getNegamonSettings: vi.fn(() => ({
    enabled: true,
    studentMonsters: {
      "student-1": "naga",
      "student-2": "garuda",
    },
  })),
  getStudentMonsterState: vi.fn((studentId: string) => ({
    studentId,
    form: { icon: "x", name: "Rank 1" },
    rankIndex: 1,
  })),
}));

describe("battle read route auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue(null);
  });

  it("rejects battle history reads without a student code or teacher session", async () => {
    const { GET } = await import("@/app/api/classrooms/[id]/battle/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle?studentId=student-1") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "AUTH_REQUIRED" });
    expect(mockBattleSessionFindMany).not.toHaveBeenCalled();
  });

  it("rejects battle history reads when the student code does not match that classroom student", async () => {
    mockStudentFindFirst.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/battle/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle?studentId=student-1&studentCode=wrong") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "FORBIDDEN" });
    expect(mockBattleSessionFindMany).not.toHaveBeenCalled();
  });

  it("returns battle history when the student code matches the requesting student", async () => {
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
    mockBattleSessionFindMany.mockResolvedValue([
      {
        id: "battle-1",
        classId: "class-1",
        challengerId: "student-1",
        defenderId: "student-2",
        winnerId: "student-1",
        goldReward: 30,
        interactivePending: false,
        stateVersion: 3,
        result: {
          mode: "negamon_battle_v4",
          engineVersion: "negamon_v4_showdown_adapter",
          status: "finished",
          choiceRequestId: "battle-1:v4:3:2",
          state: { choices: { player: [], opponent: [] } },
          winnerId: "student-1",
          requestedGoldReward: 30,
          goldReward: 30,
          rewardBlockedReason: null,
          progression: {
            expDelta: 54,
            behaviorPointDelta: 9,
            nextBehaviorPoints: 33,
            nextNegamonSkills: ["pyronox-hellfall"],
            shouldPersist: true,
          },
        },
        createdAt: new Date("2026-04-07T10:00:00.000Z"),
      },
    ]);
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", name: "Alice" },
      { id: "student-2", name: "Bob" },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/battle/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle?studentId=student-1&studentCode=abc123") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessions: [
        {
          id: "battle-1",
          classId: "class-1",
          challengerId: "student-1",
          defenderId: "student-2",
          winnerId: "student-1",
          goldReward: 30,
        },
      ],
      studentNames: {
        "student-1": "Alice",
        "student-2": "Bob",
      },
      battleViews: [
        {
          mode: "negamon_battle_v4",
          engineVersion: "negamon_v4_showdown_adapter",
          sessionId: "battle-1",
          status: "finished",
          final: {
            winnerId: "student-1",
            requestedGoldReward: 30,
            goldReward: 30,
            rewardBlockedReason: null,
            progression: {
              expDelta: 54,
              behaviorPointDelta: 9,
              nextBehaviorPoints: 33,
              nextNegamonSkills: ["pyronox-hellfall"],
              shouldPersist: true,
            },
          },
        },
      ],
      gameHistory: [
        {
          id: "game-history:negamon:battle_finished:student-1:battle-1",
          gameKind: "negamon",
          kind: "battle_finished",
          studentId: "student-1",
          opponentId: "student-2",
          winnerId: "student-1",
          outcome: "win",
          goldDelta: 30,
          sourceRefId: "battle-1",
        },
      ],
      gameHistoryAnalytics: {
        totalEvents: 1,
        wins: 1,
        losses: 0,
        goldEarned: 30,
        goldSpent: 0,
        itemsGranted: 0,
        byGameKind: { negamon: 1 },
        byStudent: { "student-1": 1 },
      },
    });
    expect(mockBattleSessionFindMany).toHaveBeenCalledWith({
      where: {
        classId: "class-1",
        winnerId: { not: null },
        OR: [{ challengerId: "student-1" }, { defenderId: "student-1" }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: expect.any(Object),
    });
  });

  it("returns opponents only after student code authorization", async () => {
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
    mockClassroomFindUnique.mockResolvedValue({
      gamifiedSettings: {},
      levelConfig: [],
    });
    mockStudentFindMany.mockResolvedValue([
      { id: "student-2", name: "Bob", behaviorPoints: 10 },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/battle/opponents/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle/opponents?studentId=student-1&studentCode=abc123") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: "student-2",
        name: "Bob",
        formIcon: "x",
        formName: "Rank 1",
        rankIndex: 1,
      },
    ]);
  });

  it("returns the latest V4 session view with diagnostics for an authorized student", async () => {
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
    mockBattleSessionFindFirst.mockResolvedValue({
      id: "battle-1",
      classId: "class-1",
      challengerId: "student-1",
      defenderId: "student-2",
      winnerId: null,
      goldReward: 0,
      interactivePending: true,
      stateVersion: 5,
      createdAt: new Date("2026-05-31T10:00:00.000Z"),
      result: {
        mode: "negamon_battle_v4",
        engineVersion: "negamon_v4_showdown_adapter",
        status: "active",
        choiceRequestId: "battle-1:v4:5:3",
        state: {
          battleId: "battle-1",
          engineVersion: "negamon_v4_showdown_adapter",
          adapterKind: "showdown",
          phase: "choosing",
          turn: 3,
          stateVersion: 5,
          seed: 123,
          choiceRequestId: "battle-1:v4:5:3",
          sides: {
            player: { name: "Alice", fainted: false },
            opponent: { name: "Bob", fainted: false },
          },
          choices: {
            player: [{ actionId: "player:basic-attack", kind: "move", label: "Basic", enabled: true, moveId: "basic-attack" }],
            opponent: [],
          },
          queue: [],
          events: [],
          metadata: {
            showdown: {
              choiceDiagnostics: {
                player: {
                  side: "player",
                  requestMissing: false,
                  allChoicesUnavailable: false,
                  usedFallbackBasicChoice: false,
                  enabledChoiceCount: 1,
                },
                opponent: {
                  side: "opponent",
                  requestMissing: false,
                  allChoicesUnavailable: false,
                  usedFallbackBasicChoice: false,
                  enabledChoiceCount: 0,
                },
              },
            },
          },
        },
      },
    });
    const { GET } = await import("@/app/api/classrooms/[id]/battle/v4/session/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle/v4/session?sessionId=battle-1&studentId=student-1&studentCode=abc123") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      mode: "negamon_battle_v4",
      sessionId: "battle-1",
      choiceRequestId: "battle-1:v4:5:3",
      validChoices: [{ moveId: "basic-attack", enabled: true }],
      diagnostics: {
        side: "player",
        enabledChoiceCount: 1,
      },
      final: null,
    });
  });
});

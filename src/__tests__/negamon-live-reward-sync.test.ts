import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";

const mocks = vi.hoisted(() => {
  const studentFindMany = vi.fn();
  const rewardClaimCreate = vi.fn();
  const studentUpdate = vi.fn();
  const transaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
    fn({
      negamonLiveBattleRewardClaim: {
        create: rewardClaimCreate,
      },
      student: {
        update: studentUpdate,
      },
    })
  );

  return {
    classroomFindFirst: vi.fn(),
    studentFindMany,
    rewardClaimCreate,
    studentUpdate,
    transaction,
    listRecentAuditEvents: vi.fn(),
    logAuditEvent: vi.fn(),
    notifyNegamonRankUpIfNeeded: vi.fn(),
    sendNotification: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findFirst: mocks.classroomFindFirst,
    },
    student: {
      findMany: mocks.studentFindMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/classroom-utils", () => ({
  calcAssignmentEXP: vi.fn((score: number) => score),
  getNegamonSettings: vi.fn(() => ({
    enabled: true,
    expPerPoint: 1,
  })),
}));

vi.mock("@/lib/negamon-battle-tuning", () => ({
  resolveNegamonTuning: vi.fn(() => ({ startHp: 100 })),
}));

vi.mock("@/lib/negamon/negamon-rank-notify", () => ({
  notifyNegamonRankUpIfNeeded: mocks.notifyNegamonRankUpIfNeeded,
}));

vi.mock("@/lib/notifications", () => ({
  sendNotification: mocks.sendNotification,
}));

vi.mock("@/lib/security/audit-log", () => ({
  listRecentAuditEvents: mocks.listRecentAuditEvents,
  logAuditEvent: mocks.logAuditEvent,
}));

function makeGame(): AbstractGameEngine {
  return {
    gameMode: "NEGAMON_BATTLE",
    pin: "123456",
    hostId: "teacher-1",
    setId: "set-1",
    settings: {
      negamonRewardClassroomId: "class-1",
      negamonBattle: { startHp: 100 },
    },
    players: [
      {
        id: "socket-a",
        name: "Alice",
        isConnected: true,
        score: 80,
        correctAnswers: 1,
        incorrectAnswers: 0,
        battleHp: 80,
        maxHp: 100,
        eliminated: false,
      },
    ],
  } as unknown as AbstractGameEngine;
}

describe("syncNegamonBattleRewardsToClassroom", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.studentFindMany.mockReset();
    mocks.rewardClaimCreate.mockReset();
    mocks.studentUpdate.mockReset();
    mocks.listRecentAuditEvents.mockReset();
    mocks.classroomFindFirst.mockResolvedValue({
      id: "class-1",
      gamifiedSettings: {},
      levelConfig: [],
    });
  });

  it("awards live battle EXP with a game-pin idempotency reason", async () => {
    mocks.studentFindMany
      .mockResolvedValueOnce([
        {
          id: "student-1",
          name: "Alice",
          nickname: null,
          behaviorPoints: 10,
          loginCode: "alice-code",
        },
      ])
      .mockResolvedValueOnce([
        { id: "student-1", behaviorPoints: 10, loginCode: "alice-code" },
      ])
      .mockResolvedValueOnce([
        { id: "student-1", behaviorPoints: 90, loginCode: "alice-code" },
      ]);
    mocks.rewardClaimCreate.mockResolvedValue({});
    mocks.studentUpdate.mockResolvedValue({});

    const { syncNegamonBattleRewardsToClassroom } = await import("@/lib/negamon/sync-negamon-battle-rewards");

    await syncNegamonBattleRewardsToClassroom(makeGame());

    expect(mocks.rewardClaimCreate).toHaveBeenCalledWith({
      data: {
        studentId: "student-1",
        classId: "class-1",
        gamePin: "123456",
        reason: "negamon-live-v2|123456|1|80|100",
        idempotencyKey: "student-1:negamon-live-v2|123456|1|80|100",
        exp: 80,
        rank: 1,
        finalScore: 80,
      },
    });
    expect(mocks.studentUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: {
        behaviorPoints: { increment: 80 },
        history: {
          create: {
            value: 80,
            reason: "negamon-live-v2|123456|1|80|100",
          },
        },
      },
    });
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.negamon_battle.rewards_applied",
        metadata: expect.objectContaining({
          recipientCount: 1,
          linkedIdentityCount: 0,
          nameFallbackCount: 1,
          appliedLinkedIdentityCount: 0,
          appliedNameFallbackCount: 1,
          skippedDuplicateCount: 0,
          skippedPlayerCount: 0,
          totalExp: 80,
        }),
      })
    );
  });

  it("skips students that already have the same live battle reward history row", async () => {
    mocks.studentFindMany
      .mockResolvedValueOnce([
        {
          id: "student-1",
          name: "Alice",
          nickname: null,
          behaviorPoints: 10,
          loginCode: "alice-code",
        },
      ])
      .mockResolvedValueOnce([{ id: "student-1", behaviorPoints: 10, loginCode: "alice-code" }]);
    mocks.rewardClaimCreate.mockRejectedValueOnce({ code: "P2002" });

    const { syncNegamonBattleRewardsToClassroom } = await import("@/lib/negamon/sync-negamon-battle-rewards");

    await syncNegamonBattleRewardsToClassroom(makeGame());

    expect(mocks.transaction).toHaveBeenCalled();
    expect(mocks.studentUpdate).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.negamon_battle.rewards_skipped",
        status: "success",
        metadata: expect.objectContaining({
          reason: "claim_already_exists",
          matchedCount: 1,
          skippedDuplicateCount: 1,
          skippedPlayerCount: 0,
        }),
      })
    );
  });

  it("skips the EXP update when the live battle reward claim already exists concurrently", async () => {
    mocks.studentFindMany
      .mockResolvedValueOnce([
        {
          id: "student-1",
          name: "Alice",
          nickname: null,
          behaviorPoints: 10,
          loginCode: "alice-code",
        },
      ])
      .mockResolvedValueOnce([{ id: "student-1", behaviorPoints: 10, loginCode: "alice-code" }]);
    mocks.rewardClaimCreate.mockRejectedValueOnce({ code: "P2002" });

    const { syncNegamonBattleRewardsToClassroom } = await import("@/lib/negamon/sync-negamon-battle-rewards");

    await syncNegamonBattleRewardsToClassroom(makeGame());

    expect(mocks.transaction).toHaveBeenCalled();
    expect(mocks.studentUpdate).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.negamon_battle.rewards_skipped",
        status: "success",
        metadata: expect.objectContaining({
          reason: "claim_already_exists",
          matchedCount: 1,
          skippedDuplicateCount: 1,
        }),
      })
    );
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("does not award EXP when a player name matches multiple students", async () => {
    mocks.studentFindMany.mockResolvedValueOnce([
      {
        id: "student-1",
        name: "Alice",
        nickname: null,
        behaviorPoints: 10,
        loginCode: "alice-1",
      },
      {
        id: "student-2",
        name: "alice",
        nickname: null,
        behaviorPoints: 20,
        loginCode: "alice-2",
      },
    ]);

    const { syncNegamonBattleRewardsToClassroom } = await import("@/lib/negamon/sync-negamon-battle-rewards");

    await syncNegamonBattleRewardsToClassroom(makeGame());

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.studentUpdate).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.negamon_battle.rewards_skipped",
        status: "success",
        metadata: expect.objectContaining({
          reason: "no_awards",
          skippedAmbiguousNameCount: 1,
          skippedPlayerCount: 1,
          skippedPlayers: [
            expect.objectContaining({
              name: "Alice",
              reason: "ambiguous_name",
            }),
          ],
        }),
      })
    );
  });

  it("uses verified studentId before falling back to duplicate display names", async () => {
    mocks.studentFindMany
      .mockResolvedValueOnce([
        {
          id: "student-1",
          name: "Alice",
          nickname: null,
          behaviorPoints: 10,
          loginCode: "alice-1",
        },
        {
          id: "student-2",
          name: "alice",
          nickname: null,
          behaviorPoints: 20,
          loginCode: "alice-2",
        },
      ])
      .mockResolvedValueOnce([{ id: "student-2", behaviorPoints: 20, loginCode: "alice-2" }])
      .mockResolvedValueOnce([{ id: "student-2", behaviorPoints: 100, loginCode: "alice-2" }]);
    mocks.rewardClaimCreate.mockResolvedValue({});
    mocks.studentUpdate.mockResolvedValue({});

    const game = makeGame();
    game.players = [
      {
        ...(game.players[0] as object),
        name: "Alice",
        studentId: "student-2",
      },
    ] as typeof game.players;

    const { syncNegamonBattleRewardsToClassroom } = await import("@/lib/negamon/sync-negamon-battle-rewards");

    await syncNegamonBattleRewardsToClassroom(game);

    expect(mocks.rewardClaimCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-2",
        idempotencyKey: "student-2:negamon-live-v2|123456|1|80|100",
      }),
    });
    expect(mocks.studentUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "student-2" },
      })
    );
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.negamon_battle.rewards_applied",
        metadata: expect.objectContaining({
          linkedIdentityCount: 1,
          nameFallbackCount: 0,
          appliedLinkedIdentityCount: 1,
          appliedNameFallbackCount: 0,
        }),
      })
    );
  });

  it("re-syncs skipped audit players after roster identity fixes", async () => {
    mocks.listRecentAuditEvents.mockResolvedValue([
      {
        action: "classroom.negamon_battle.rewards_applied",
        category: "classroom",
        reason: null,
        status: "success",
        targetType: "classroom",
        targetId: "class-1",
        metadata: {
          gamePin: "123456",
          setId: "set-1",
          startHp: 100,
          skippedPlayers: [
            {
              name: "Alice Prime",
              rank: 1,
              reason: "no_match",
              finalScore: 80,
              exp: 80,
            },
          ],
        },
        timestamp: new Date("2026-04-30T00:00:00.000Z"),
      },
    ]);
    mocks.studentFindMany
      .mockResolvedValueOnce([
        {
          id: "student-1",
          name: "Alice Prime",
          nickname: null,
          behaviorPoints: 10,
          loginCode: "alice-code",
        },
      ])
      .mockResolvedValueOnce([{ id: "student-1", behaviorPoints: 10, loginCode: "alice-code" }])
      .mockResolvedValueOnce([{ id: "student-1", behaviorPoints: 90, loginCode: "alice-code" }]);
    mocks.rewardClaimCreate.mockResolvedValue({});
    mocks.studentUpdate.mockResolvedValue({});

    const { resyncNegamonBattleRewardsForGamePin } = await import("@/lib/negamon/sync-negamon-battle-rewards");

    const result = await resyncNegamonBattleRewardsForGamePin({
      classroomId: "class-1",
      teacherId: "teacher-1",
      gamePin: "123456",
    });

    expect(result).toMatchObject({
      gamePin: "123456",
      appliedCount: 1,
      skippedCount: 0,
      unresolvedCount: 0,
      reason: "applied",
    });
    expect(mocks.rewardClaimCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        gamePin: "123456",
        exp: 80,
      }),
    });
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.negamon_battle.rewards_applied",
        metadata: expect.objectContaining({
          trigger: "manual_resync",
          recipientCount: 1,
        }),
      })
    );
  });

  it("skips re-sync when audit snapshots do not contain enough data to rebuild the reward", async () => {
    mocks.listRecentAuditEvents.mockResolvedValue([
      {
        action: "classroom.negamon_battle.rewards_skipped",
        category: "classroom",
        reason: "no_awards",
        status: "success",
        targetType: "classroom",
        targetId: "class-1",
        metadata: {
          gamePin: "123456",
          startHp: 100,
          skippedPlayers: [
            {
              name: "Alice",
              rank: 1,
              reason: "no_match",
            },
          ],
        },
        timestamp: new Date("2026-04-30T00:00:00.000Z"),
      },
    ]);
    mocks.studentFindMany.mockResolvedValue([]);

    const { resyncNegamonBattleRewardsForGamePin } = await import("@/lib/negamon/sync-negamon-battle-rewards");

    const result = await resyncNegamonBattleRewardsForGamePin({
      classroomId: "class-1",
      teacherId: "teacher-1",
      gamePin: "123456",
    });

    expect(result).toMatchObject({
      gamePin: "123456",
      appliedCount: 0,
      unresolvedCount: 1,
      reason: "snapshot_missing",
    });
    expect(mocks.rewardClaimCreate).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.negamon_battle.rewards_skipped",
        metadata: expect.objectContaining({
          trigger: "manual_resync",
          reason: "snapshot_missing",
        }),
      })
    );
  });
});

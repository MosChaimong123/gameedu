import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";

const mocks = vi.hoisted(() => {
  const studentFindMany = vi.fn();
  const rewardClaimCreate = vi.fn();
  const studentUpdate = vi.fn();
  const transaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
    fn({
      arQuestRewardClaim: {
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
  })),
}));

vi.mock("@/lib/negamon/negamon-rank-notify", () => ({
  notifyNegamonRankUpIfNeeded: mocks.notifyNegamonRankUpIfNeeded,
}));

vi.mock("@/lib/notifications", () => ({
  sendNotification: mocks.sendNotification,
}));

vi.mock("@/lib/security/audit-log", () => ({
  logAuditEvent: mocks.logAuditEvent,
}));

function makeGame(): AbstractGameEngine {
  return {
    gameMode: "AR_QUEST",
    pin: "654321",
    hostId: "teacher-1",
    setId: "set-1",
    settings: {
      arQuestRewardClassroomId: "class-1",
    },
    players: [
      {
        id: "socket-a",
        name: "Alice",
        isConnected: true,
        score: 100,
        arScore: 100,
        streak: 1,
        correctAnswers: 1,
        incorrectAnswers: 0,
      },
    ],
  } as unknown as AbstractGameEngine;
}

describe("syncArQuestRewardsToClassroom", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.studentFindMany.mockReset();
    mocks.rewardClaimCreate.mockReset();
    mocks.studentUpdate.mockReset();
    mocks.classroomFindFirst.mockResolvedValue({
      id: "class-1",
      gamifiedSettings: {},
      levelConfig: [],
    });
  });

  it("does not touch classroom data when classroom games are retired", async () => {
    vi.stubEnv("CLASSROOM_GAME_SYSTEM_ENABLED", "false");
    const { syncArQuestRewardsToClassroom } = await import("@/lib/ar-quest/sync-ar-quest-rewards");

    await syncArQuestRewardsToClassroom(makeGame());

    expect(mocks.classroomFindFirst).not.toHaveBeenCalled();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("awards AR Quest EXP with a game-pin idempotency reason", async () => {
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
      .mockResolvedValueOnce([{ id: "student-1", behaviorPoints: 10 }])
      .mockResolvedValueOnce([{ id: "student-1", behaviorPoints: 110, loginCode: "alice-code" }]);
    mocks.rewardClaimCreate.mockResolvedValue({});
    mocks.studentUpdate.mockResolvedValue({});

    const { syncArQuestRewardsToClassroom } = await import("@/lib/ar-quest/sync-ar-quest-rewards");

    await syncArQuestRewardsToClassroom(makeGame());

    expect(mocks.rewardClaimCreate).toHaveBeenCalledWith({
      data: {
        studentId: "student-1",
        classId: "class-1",
        gamePin: "654321",
        reason: "ar-quest-live-v1|654321|1|100",
        idempotencyKey: "student-1:ar-quest-live-v1|654321|1|100",
        exp: 100,
        rank: 1,
        finalScore: 100,
      },
    });
    expect(mocks.studentUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: {
        behaviorPoints: { increment: 100 },
        history: {
          create: {
            value: 100,
            reason: "ar-quest-live-v1|654321|1|100",
          },
        },
      },
    });
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.ar_quest.rewards_applied",
        metadata: expect.objectContaining({
          recipientCount: 1,
          totalExp: 100,
          nameFallbackCount: 1,
        }),
      })
    );
  });

  it("skips duplicate AR Quest reward claims", async () => {
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
      .mockResolvedValueOnce([{ id: "student-1", behaviorPoints: 10 }]);
    mocks.rewardClaimCreate.mockRejectedValueOnce({ code: "P2002" });

    const { syncArQuestRewardsToClassroom } = await import("@/lib/ar-quest/sync-ar-quest-rewards");

    await syncArQuestRewardsToClassroom(makeGame());

    expect(mocks.studentUpdate).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.ar_quest.rewards_skipped",
        metadata: expect.objectContaining({
          reason: "claim_already_exists",
          matchedCount: 1,
        }),
      })
    );
  });

  it("does not award when a player name is ambiguous", async () => {
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

    const { syncArQuestRewardsToClassroom } = await import("@/lib/ar-quest/sync-ar-quest-rewards");

    await syncArQuestRewardsToClassroom(makeGame());

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.studentUpdate).not.toHaveBeenCalled();
    expect(mocks.logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "classroom.ar_quest.rewards_skipped",
        metadata: expect.objectContaining({
          reason: "no_awards",
          skippedAmbiguousNameCount: 1,
          skippedPlayerCount: 1,
        }),
      })
    );
  });
});

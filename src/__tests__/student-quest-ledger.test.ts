import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultNegamonSettings } from "@/lib/negamon-species";

const mockStudentFindFirst = vi.fn();
const mockStudentUpdateMany = vi.fn();
const mockStudentFindUniqueOrThrow = vi.fn();
const mockStudentUpdate = vi.fn();
const mockEconomyTransactionCreate = vi.fn();
const mockPointHistoryCreateMany = vi.fn();
const mockTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
  fn({
    student: {
      updateMany: mockStudentUpdateMany,
      findUniqueOrThrow: mockStudentFindUniqueOrThrow,
      update: mockStudentUpdate,
    },
    pointHistory: {
      createMany: mockPointHistoryCreateMany,
    },
    economyTransaction: {
      create: mockEconomyTransactionCreate,
    },
  })
);

vi.mock("@/lib/db", () => ({
  db: {
    $transaction: mockTransaction,
    student: {
      findFirst: mockStudentFindFirst,
    },
  },
}));

describe("student quest ledger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.setSystemTime(new Date("2026-04-07T08:00:00.000Z"));
  });

  it("claims a daily quest with an atomic gold increment and ledger row", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Student One",
      loginCode: "abc123",
      streak: 1,
      lastCheckIn: null,
      gold: 10,
      behaviorPoints: 0,
      negamonSkills: [],
      inventory: [],
      dailyQuestsClaimed: null,
      weeklyQuestsClaimed: null,
      challengeQuestsClaimed: null,
      classroom: {
        gamifiedSettings: {},
        levelConfig: [],
      },
      submissions: [],
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({ gold: 15, behaviorPoints: 0, negamonSkills: [] });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    const { POST } = await import("@/app/api/student/[code]/daily-quests/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        questType: "daily",
        questId: "quest_login",
      }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      newGold: 15,
      goldEarned: 5,
      reward: { gold: 5, exp: 0 },
      progression: null,
      gameState: { gold: 15 },
    });
    expect(mockStudentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "student-1",
        OR: [
          { dailyQuestsClaimed: { equals: null } },
          { dailyQuestsClaimed: { isSet: false } },
        ],
      },
      data: {
        gold: { increment: 5 },
        dailyQuestsClaimed: {
          date: "2026-04-07",
          claimed: ["quest_login"],
        },
      },
    });
    expect(mockEconomyTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        classId: "class-1",
        type: "earn",
        source: "quest",
        amount: 5,
        balanceBefore: 10,
        balanceAfter: 15,
        idempotencyKey: "quest:student-1:daily:2026-04-07:quest_login",
        metadata: expect.objectContaining({
          questType: "daily",
          questId: "quest_login",
          baseReward: 5,
          eventMultiplier: 1,
          date: "2026-04-07",
        }),
      }),
    });
  });

  it("records the quest ledger from the latest balance when passive gold races the claim", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Student One",
      loginCode: "abc123",
      streak: 1,
      lastCheckIn: null,
      gold: 10,
      behaviorPoints: 0,
      negamonSkills: [],
      inventory: [],
      dailyQuestsClaimed: null,
      weeklyQuestsClaimed: null,
      challengeQuestsClaimed: null,
      classroom: {
        gamifiedSettings: {},
        levelConfig: [],
      },
      submissions: [],
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({ gold: 115, behaviorPoints: 0, negamonSkills: [] });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    const { POST } = await import("@/app/api/student/[code]/daily-quests/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        questType: "daily",
        questId: "quest_login",
      }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      newGold: 115,
      goldEarned: 5,
      reward: { gold: 5, exp: 0 },
      progression: null,
      gameState: { gold: 115 },
    });
    expect(mockEconomyTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        amount: 5,
        balanceBefore: 110,
        balanceAfter: 115,
      }),
    });
  });

  it("maps quest gold to Negamon progression when a monster is configured", async () => {
    const negamon = createDefaultNegamonSettings();
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Student One",
      loginCode: "abc123",
      streak: 1,
      lastCheckIn: null,
      gold: 10,
      behaviorPoints: 4,
      negamonSkills: ["basic-attack"],
      inventory: [],
      dailyQuestsClaimed: null,
      weeklyQuestsClaimed: null,
      challengeQuestsClaimed: null,
      classroom: {
        gamifiedSettings: {
          negamon: {
            ...negamon,
            enabled: true,
            studentMonsters: { "student-1": negamon.species[0].id },
          },
        },
        levelConfig: [
          { name: "Common", minScore: 0 },
          { name: "Uncommon", minScore: 5 },
        ],
      },
      submissions: [],
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({
      gold: 15,
      behaviorPoints: 4,
      negamonSkills: ["basic-attack"],
    });
    mockStudentUpdate.mockResolvedValue({
      behaviorPoints: 5,
      negamonSkills: ["basic-attack"],
    });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    const { POST } = await import("@/app/api/student/[code]/daily-quests/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        questType: "daily",
        questId: "quest_login",
      }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ code: "abc123" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reward).toMatchObject({
      gold: 5,
      exp: 5,
      idempotencyKey:
        "game:negamon:daily:quest_login:quest:student-1:daily:2026-04-07:quest_login:student-1:quest-progression",
    });
    expect(body.progression).toMatchObject({
      expDelta: 5,
      behaviorPointDelta: 1,
      behaviorPointsBefore: 4,
      behaviorPointsAfter: 5,
    });
    expect(mockStudentUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { behaviorPoints: { increment: 1 } },
      select: { behaviorPoints: true, negamonSkills: true },
    });
    expect(mockPointHistoryCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          studentId: "student-1",
          value: 1,
          reason: "negamon_quest_reward:daily:quest_login:quest:student-1:daily:2026-04-07:quest_login",
        }),
      ]),
    });
  });

  it("still claims a quest when ledger recording fails", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      name: "Student One",
      loginCode: "abc123",
      streak: 1,
      lastCheckIn: null,
      gold: 10,
      behaviorPoints: 0,
      negamonSkills: [],
      inventory: [],
      dailyQuestsClaimed: null,
      weeklyQuestsClaimed: null,
      challengeQuestsClaimed: null,
      classroom: {
        gamifiedSettings: {},
        levelConfig: [],
      },
      submissions: [],
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({ gold: 15, behaviorPoints: 0, negamonSkills: [] });
    mockEconomyTransactionCreate.mockRejectedValue(new Error("LEDGER_DOWN"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { POST } = await import("@/app/api/student/[code]/daily-quests/route");
    const request = {
      json: vi.fn().mockResolvedValue({
        questType: "daily",
        questId: "quest_login",
      }),
    } as unknown as NextRequest;

    const response = await POST(request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      newGold: 15,
      goldEarned: 5,
      reward: { gold: 5, exp: 0 },
      progression: null,
      gameState: { gold: 15 },
    });
    expect(consoleError).toHaveBeenCalledWith(
      "[daily-quests] failed to record quest ledger",
      expect.any(Error)
    );
    consoleError.mockRestore();
  });
});

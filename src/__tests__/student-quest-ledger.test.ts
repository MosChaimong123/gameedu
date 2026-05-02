import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockStudentUpdateMany = vi.fn();
const mockStudentFindUniqueOrThrow = vi.fn();
const mockEconomyTransactionCreate = vi.fn();
const mockTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
  fn({
    student: {
      updateMany: mockStudentUpdateMany,
      findUniqueOrThrow: mockStudentFindUniqueOrThrow,
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
      loginCode: "abc123",
      streak: 1,
      lastCheckIn: null,
      gold: 10,
      inventory: [],
      dailyQuestsClaimed: null,
      weeklyQuestsClaimed: null,
      challengeQuestsClaimed: null,
      classroom: {
        gamifiedSettings: {},
      },
      submissions: [],
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({ gold: 15 });
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
    await expect(response.json()).resolves.toEqual({
      ok: true,
      newGold: 15,
      goldEarned: 5,
    });
    expect(mockStudentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "student-1",
        dailyQuestsClaimed: { equals: null },
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
});

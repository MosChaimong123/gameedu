import { beforeEach, describe, expect, it, vi } from "vitest";

const mockStudentFindFirst = vi.fn();
const mockStudentUpdateMany = vi.fn();
const mockStudentFindUnique = vi.fn();
const mockStudentFindUniqueOrThrow = vi.fn();
const mockEconomyTransactionCreate = vi.fn();
const mockTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
  fn({
    student: {
      updateMany: mockStudentUpdateMany,
      findUnique: mockStudentFindUnique,
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

describe("student passive gold route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("awards passive gold based on elapsed time and updates balance", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 10,
      equippedFrame: null,
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      lastGoldAt: new Date("2026-04-05T08:00:00.000Z"),
      classroom: {
        levelConfig: [{ name: "Bronze", minScore: 0, goldRate: 3 }],
        gamifiedSettings: {},
        assignments: [],
      },
      submissions: [],
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({
      gold: 16,
      lastGoldAt: new Date("2026-04-05T10:00:00.000Z"),
    });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

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
      goldEarned: 6,
      goldRate: 3,
      newGold: 16,
    });
    expect(mockStudentUpdateMany).toHaveBeenCalledTimes(1);
    expect(mockEconomyTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        classId: "class-1",
        type: "earn",
        source: "passive_gold",
        amount: 6,
        balanceBefore: 10,
        balanceAfter: 16,
      }),
    });
  });

  it("does not write a ledger row when a duplicate passive claim loses the lastGoldAt race", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 10,
      equippedFrame: null,
      createdAt: new Date("2026-04-05T00:00:00.000Z"),
      lastGoldAt: new Date("2026-04-05T08:00:00.000Z"),
      classroom: {
        levelConfig: [{ name: "Bronze", minScore: 0, goldRate: 3 }],
        gamifiedSettings: {},
        assignments: [],
      },
      submissions: [],
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 0 });
    mockStudentFindUnique.mockResolvedValue({
      gold: 16,
      lastGoldAt: new Date("2026-04-05T10:00:00.000Z"),
    });

    const { POST } = await import("@/app/api/student/[code]/claim-passive-gold/route");
    vi.setSystemTime(new Date("2026-04-05T10:00:00.000Z"));

    const response = await POST({} as Request, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      alreadyClaimed: true,
      goldEarned: 0,
      newGold: 16,
      lastGoldAt: "2026-04-05T10:00:00.000Z",
    });
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
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
    expect(mockStudentUpdateMany).not.toHaveBeenCalled();
  });
});

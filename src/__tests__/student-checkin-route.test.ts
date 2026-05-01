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

describe("student checkin route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns not found via app error payload when the student is missing", async () => {
    mockStudentFindFirst.mockResolvedValue(null);

    const { POST } = await import("@/app/api/student/[code]/checkin/route");
    const response = await POST({} as NextRequest, {
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

  it("returns alreadyDone without updating when student already checked in today", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 20,
      lastCheckIn: new Date("2026-04-07T01:00:00.000Z"),
      streak: 3,
      classroom: {
        gamifiedSettings: {},
      },
    });

    vi.setSystemTime(new Date("2026-04-07T08:00:00.000Z"));

    const { POST } = await import("@/app/api/student/[code]/checkin/route");
    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ alreadyDone: true });
    expect(mockStudentUpdateMany).not.toHaveBeenCalled();
  });

  it("records a check-in ledger row when awarding gold", async () => {
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 20,
      lastCheckIn: new Date("2026-04-06T01:00:00.000Z"),
      streak: 1,
      classroom: {
        gamifiedSettings: {},
      },
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({ gold: 30, streak: 2 });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    vi.setSystemTime(new Date("2026-04-07T08:00:00.000Z"));

    const { POST } = await import("@/app/api/student/[code]/checkin/route");
    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      success: true,
      goldEarned: 10,
      streak: 2,
      newGold: 30,
    });
    expect(mockEconomyTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        classId: "class-1",
        type: "earn",
        source: "checkin",
        amount: 10,
        balanceBefore: 20,
        balanceAfter: 30,
        idempotencyKey: "checkin:student-1:2026-04-07",
      }),
    });
  });

  it("continues streak across Bangkok midnight even when less than 24 hours passed", async () => {
    const now = new Date("2026-04-06T17:10:00.000Z"); // 2026-04-07 00:10 Bangkok
    const lastCheckIn = new Date("2026-04-06T16:50:00.000Z"); // 2026-04-06 23:50 Bangkok
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      gold: 20,
      lastCheckIn,
      streak: 1,
      classroom: {
        gamifiedSettings: {},
      },
    });
    mockStudentUpdateMany.mockResolvedValue({ count: 1 });
    mockStudentFindUniqueOrThrow.mockResolvedValue({ gold: 30, streak: 2 });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "ledger-1" });

    vi.setSystemTime(now);

    const { POST } = await import("@/app/api/student/[code]/checkin/route");
    const response = await POST({} as NextRequest, {
      params: Promise.resolve({ code: "abc123" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      success: true,
      goldEarned: 10,
      streak: 2,
      newGold: 30,
    });
    expect(mockStudentUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "student-1",
        lastCheckIn,
      },
      data: {
        lastCheckIn: now,
        streak: 2,
        gold: { increment: 10 },
      },
    });
    expect(mockEconomyTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        source: "checkin",
        amount: 10,
        idempotencyKey: "checkin:student-1:2026-04-07",
        metadata: expect.objectContaining({
          streak: 2,
          checkInDate: "2026-04-07",
        }),
      }),
    });
  });
});

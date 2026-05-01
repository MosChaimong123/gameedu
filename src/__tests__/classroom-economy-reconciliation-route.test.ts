import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockEconomyTransactionFindMany = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findMany: mockStudentFindMany,
    },
    economyTransaction: {
      findMany: mockEconomyTransactionFindMany,
    },
  },
}));

describe("classroom economy reconciliation route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockStudentFindMany.mockResolvedValue([]);
    mockEconomyTransactionFindMany.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/economy/reconciliation/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/reconciliation") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockStudentFindMany).not.toHaveBeenCalled();
    expect(mockEconomyTransactionFindMany).not.toHaveBeenCalled();
  });

  it("returns per-student balance reconciliation issues", async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: "student-ok", name: "Alice", nickname: null, gold: 130 },
      { id: "student-gap", name: "Bob", nickname: "B", gold: 90 },
      { id: "student-missing", name: "Cara", nickname: null, gold: 25 },
    ]);
    mockEconomyTransactionFindMany.mockResolvedValue([
      {
        id: "tx-1",
        studentId: "student-ok",
        type: "earn",
        source: "battle",
        amount: 30,
        balanceBefore: 100,
        balanceAfter: 130,
        idempotencyKey: "battle:1",
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
      {
        id: "tx-2",
        studentId: "student-gap",
        type: "earn",
        source: "quest",
        amount: 10,
        balanceBefore: 50,
        balanceAfter: 60,
        idempotencyKey: "quest:1",
        createdAt: new Date("2026-04-01T00:00:00.000Z"),
      },
      {
        id: "tx-3",
        studentId: "student-gap",
        type: "spend",
        source: "shop",
        amount: -5,
        balanceBefore: 80,
        balanceAfter: 75,
        idempotencyKey: "shop:1",
        createdAt: new Date("2026-04-02T00:00:00.000Z"),
      },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/economy/reconciliation/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/reconciliation") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-1", teacherId: "teacher-1" },
      select: { id: true },
    });
    expect(mockStudentFindMany).toHaveBeenCalledWith({
      where: { classId: "class-1" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, nickname: true, gold: true },
    });
    expect(mockEconomyTransactionFindMany).toHaveBeenCalledWith({
      where: { classId: "class-1" },
      orderBy: [{ studentId: "asc" }, { createdAt: "asc" }],
      select: expect.objectContaining({
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
      }),
    });

    const body = await response.json();
    expect(body.summary).toMatchObject({
      studentCount: 3,
      okCount: 1,
      warningCount: 1,
      mismatchCount: 1,
      issueCount: 3,
      transactionCount: 3,
      currentGoldTotal: 245,
      expectedGoldTotal: 205,
      unreconciledGoldTotal: 25,
    });
    expect(body.summary.byIssueType).toMatchObject({
      ledger_chain_gap: 1,
      current_balance_mismatch: 1,
      missing_ledger: 1,
    });
    expect(body.students[0]).toMatchObject({
      studentId: "student-gap",
      status: "mismatch",
      expectedGold: 75,
      issues: expect.arrayContaining([
        expect.objectContaining({ type: "ledger_chain_gap" }),
        expect.objectContaining({ type: "current_balance_mismatch" }),
      ]),
    });
  });
});

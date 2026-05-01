import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindMany = vi.fn();
const mockStudentUpdate = vi.fn();
const mockEconomyTransactionCreate = vi.fn();
const mockTransaction = vi.fn(async (fn: (tx: unknown) => unknown) =>
  fn({
    student: {
      findMany: mockStudentFindMany,
      update: mockStudentUpdate,
    },
    economyTransaction: {
      create: mockEconomyTransactionCreate,
    },
  })
);

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findUnique: mockClassroomFindUnique,
    },
    $transaction: mockTransaction,
  },
}));

describe("classroom economy adjustment route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockStudentFindMany.mockResolvedValue([]);
  });

  it("rejects invalid adjustment payloads", async () => {
    const { POST } = await import("@/app/api/classrooms/[id]/economy/adjust/route");
    const response = await POST(
      new Request("http://localhost/api/classrooms/class-1/economy/adjust", {
        method: "POST",
        body: JSON.stringify({ studentId: "student-1", amount: 0, reason: "noop" }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it("applies teacher gold adjustment and records ledger row", async () => {
    mockStudentFindMany.mockResolvedValue([{
      id: "student-1",
      gold: 100,
      name: "Alice",
    }]);
    mockStudentUpdate.mockResolvedValue({
      id: "student-1",
      gold: 125,
      name: "Alice",
    });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "tx-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/economy/adjust/route");
    const response = await POST(
      new Request("http://localhost/api/classrooms/class-1/economy/adjust", {
        method: "POST",
        body: JSON.stringify({ studentId: "student-1", amount: 25, reason: "manual correction" }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockStudentFindMany).toHaveBeenCalledWith({
      where: { id: { in: ["student-1"] }, classId: "class-1" },
      orderBy: { name: "asc" },
      select: { id: true, gold: true, name: true },
    });
    expect(mockStudentUpdate).toHaveBeenCalledWith({
      where: { id: "student-1" },
      data: { gold: { increment: 25 } },
      select: { id: true, gold: true, name: true },
    });
    expect(mockEconomyTransactionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        studentId: "student-1",
        classId: "class-1",
        type: "adjust",
        source: "admin_adjustment",
        amount: 25,
        balanceBefore: 100,
        balanceAfter: 125,
        metadata: {
          teacherId: "teacher-1",
          reason: "manual correction",
          operationId: expect.stringMatching(/^teacher-adjust:class-1:/),
          scope: "selected",
          studentCount: 1,
        },
      }),
    });
    const body = await response.json();
    expect(body).toMatchObject({
      student: { id: "student-1", gold: 125, name: "Alice" },
      studentCount: 1,
      students: [{ id: "student-1", gold: 125, name: "Alice" }],
    });
  });

  it("prevents adjustments that would make gold negative", async () => {
    mockStudentFindMany.mockResolvedValue([{
      id: "student-1",
      gold: 10,
      name: "Alice",
    }]);

    const { POST } = await import("@/app/api/classrooms/[id]/economy/adjust/route");
    const response = await POST(
      new Request("http://localhost/api/classrooms/class-1/economy/adjust", {
        method: "POST",
        body: JSON.stringify({ studentId: "student-1", amount: -20, reason: "correction" }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(400);
    expect(mockStudentUpdate).not.toHaveBeenCalled();
    expect(mockEconomyTransactionCreate).not.toHaveBeenCalled();
  });

  it("applies an all-class teacher adjustment with one ledger row per student", async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", gold: 100, name: "Alice" },
      { id: "student-2", gold: 40, name: "Bob" },
    ]);
    mockStudentUpdate
      .mockResolvedValueOnce({ id: "student-1", gold: 110, name: "Alice" })
      .mockResolvedValueOnce({ id: "student-2", gold: 50, name: "Bob" });
    mockEconomyTransactionCreate.mockResolvedValue({ id: "tx-1" });

    const { POST } = await import("@/app/api/classrooms/[id]/economy/adjust/route");
    const response = await POST(
      new Request("http://localhost/api/classrooms/class-1/economy/adjust", {
        method: "POST",
        body: JSON.stringify({ scope: "all", amount: 10, reason: "event bonus" }),
      }) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockStudentFindMany).toHaveBeenCalledWith({
      where: { classId: "class-1" },
      orderBy: { name: "asc" },
      select: { id: true, gold: true, name: true },
    });
    expect(mockStudentUpdate).toHaveBeenCalledTimes(2);
    expect(mockEconomyTransactionCreate).toHaveBeenCalledTimes(2);
    expect(mockEconomyTransactionCreate).toHaveBeenNthCalledWith(1, {
      data: expect.objectContaining({
        studentId: "student-1",
        amount: 10,
        balanceBefore: 100,
        balanceAfter: 110,
        metadata: expect.objectContaining({
          teacherId: "teacher-1",
          reason: "event bonus",
          scope: "all",
          studentCount: 2,
        }),
      }),
    });
    expect(mockEconomyTransactionCreate).toHaveBeenNthCalledWith(2, {
      data: expect.objectContaining({
        studentId: "student-2",
        amount: 10,
        balanceBefore: 40,
        balanceAfter: 50,
        metadata: expect.objectContaining({
          scope: "all",
          studentCount: 2,
        }),
      }),
    });
    await expect(response.json()).resolves.toMatchObject({
      studentCount: 2,
      students: [
        { id: "student-1", gold: 110, name: "Alice" },
        { id: "student-2", gold: 50, name: "Bob" },
      ],
    });
  });
});

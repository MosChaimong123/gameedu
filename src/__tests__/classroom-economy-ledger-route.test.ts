import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockEconomyTransactionFindMany = vi.fn();

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
  },
}));

describe("classroom economy ledger route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockEconomyTransactionFindMany.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);

    const { GET } = await import("@/app/api/classrooms/[id]/economy/ledger/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/ledger") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockClassroomFindUnique).not.toHaveBeenCalled();
  });

  it("rejects classrooms outside the teacher scope", async () => {
    mockClassroomFindUnique.mockResolvedValue(null);

    const { GET } = await import("@/app/api/classrooms/[id]/economy/ledger/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/ledger") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(403);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-1", teacherId: "teacher-1" },
      select: { id: true },
    });
  });

  it("returns filtered transactions and summary totals", async () => {
    mockEconomyTransactionFindMany.mockResolvedValue([
      {
        id: "tx-1",
        studentId: "student-1",
        classId: "class-1",
        type: "earn",
        source: "battle",
        amount: 30,
        balanceBefore: 100,
        balanceAfter: 130,
        sourceRefId: "507f1f77bcf86cd799439011",
        idempotencyKey: "battle:507f1f77bcf86cd799439011:reward",
        metadata: { winnerId: "student-1" },
        createdAt: new Date("2026-04-29T03:00:00.000Z"),
        student: { id: "student-1", name: "Alice", nickname: "A" },
      },
      {
        id: "tx-2",
        studentId: "student-1",
        classId: "class-1",
        type: "spend",
        source: "shop",
        amount: -20,
        balanceBefore: 130,
        balanceAfter: 110,
        sourceRefId: null,
        idempotencyKey: "shop:student-1:item-1",
        metadata: { itemId: "item-1" },
        createdAt: new Date("2026-04-29T02:00:00.000Z"),
        student: { id: "student-1", name: "Alice", nickname: "A" },
      },
    ]);

    const { GET } = await import("@/app/api/classrooms/[id]/economy/ledger/route");
    const response = await GET(
      new Request(
        "http://localhost/api/classrooms/class-1/economy/ledger?studentId=student-1&source=battle&type=earn&limit=9999"
      ) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockEconomyTransactionFindMany).toHaveBeenCalledWith({
      where: {
        classId: "class-1",
        studentId: "student-1",
        source: "battle",
        type: "earn",
      },
      orderBy: { createdAt: "desc" },
      take: 500,
      select: expect.objectContaining({
        id: true,
        student: {
          select: {
            id: true,
            name: true,
            nickname: true,
          },
        },
      }),
    });
    const body = await response.json();
    expect(body).toMatchObject({
      filters: {
        classId: "class-1",
        studentId: "student-1",
        source: "battle",
        type: "earn",
        limit: 500,
      },
      summary: {
        rowCount: 2,
        totalEarned: 30,
        totalSpent: 20,
        net: 10,
        bySource: {
          battle: 30,
          shop: -20,
        },
        byType: {
          earn: 30,
          spend: -20,
        },
      },
    });
    expect(body.transactions).toHaveLength(2);
    expect(body.transactions[0]).toMatchObject({
      id: "tx-1",
      createdAt: "2026-04-29T03:00:00.000Z",
      student: { name: "Alice" },
    });
  });
});

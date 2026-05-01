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

describe("classroom economy ledger export route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockEconomyTransactionFindMany.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/economy/ledger/export/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/ledger/export") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
  });

  it("rejects classrooms outside the teacher scope", async () => {
    mockClassroomFindUnique.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/economy/ledger/export/route");
    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/ledger/export") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(403);
  });

  it("exports filtered transactions as csv and sanitizes spreadsheet-like values", async () => {
    mockEconomyTransactionFindMany.mockResolvedValue([
      {
        id: "tx-1",
        studentId: "student-1",
        type: "earn",
        source: "battle",
        amount: 30,
        balanceBefore: 100,
        balanceAfter: 130,
        sourceRefId: '=cmd|"/C calc"!A0',
        idempotencyKey: "battle:reward",
        metadata: { note: "@danger" },
        createdAt: new Date("2026-04-29T03:00:00.000Z"),
        student: {
          name: "Alice",
          nickname: "+A",
        },
      },
    ]);

    const { GET } = await import("@/app/api/classrooms/[id]/economy/ledger/export/route");
    const response = await GET(
      new Request(
        "http://localhost/api/classrooms/class-1/economy/ledger/export?studentId=student-1&source=battle&type=earn&limit=9999"
      ) as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(mockEconomyTransactionFindMany).toHaveBeenCalledWith({
      where: {
        classId: "class-1",
        studentId: "student-1",
        source: "battle",
        type: "earn",
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
      select: expect.objectContaining({
        id: true,
        metadata: true,
      }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toContain("classroom-economy-ledger.csv");
    const csv = await response.text();
    expect(csv).toContain("transactionId");
    expect(csv).toContain(`"'+A"`);
    expect(csv).toContain(`"'=cmd|""/C calc""!A0"`);
    expect(csv).toContain(`"{""note"":""'@danger""}"`);
  });
});

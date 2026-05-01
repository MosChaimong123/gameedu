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

describe("classroom economy analytics route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue({ id: "teacher-1" });
    mockClassroomFindUnique.mockResolvedValue({ id: "class-1" });
    mockEconomyTransactionFindMany.mockResolvedValue([]);
  });

  it("requires an authenticated teacher", async () => {
    mockRequireSessionUser.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/economy/analytics/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/analytics") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    expect(mockEconomyTransactionFindMany).not.toHaveBeenCalled();
  });

  it("summarizes daily economy movement for the teacher classroom", async () => {
    const today = new Date();
    mockEconomyTransactionFindMany.mockResolvedValue([
      {
        studentId: "student-1",
        source: "battle",
        type: "earn",
        amount: 50,
        createdAt: today,
        student: { name: "Alice", nickname: null },
      },
      {
        studentId: "student-1",
        source: "shop",
        type: "spend",
        amount: -20,
        createdAt: today,
        student: { name: "Alice", nickname: null },
      },
      {
        studentId: "student-2",
        source: "quest",
        type: "earn",
        amount: 10,
        createdAt: today,
        student: { name: "Bob", nickname: "B" },
      },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/economy/analytics/route");

    const response = await GET(
      new Request("http://localhost/api/classrooms/class-1/economy/analytics?days=7") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    expect(mockClassroomFindUnique).toHaveBeenCalledWith({
      where: { id: "class-1", teacherId: "teacher-1" },
      select: { id: true },
    });
    expect(mockEconomyTransactionFindMany).toHaveBeenCalledWith({
      where: {
        classId: "class-1",
        createdAt: { gte: expect.any(Date) },
      },
      orderBy: { createdAt: "asc" },
      select: expect.objectContaining({
        amount: true,
        student: { select: { name: true, nickname: true } },
      }),
    });
    const body = await response.json();
    expect(body).toMatchObject({
      days: 7,
      totals: {
        earned: 60,
        spent: 20,
        net: 40,
      },
      bySource: {
        battle: 50,
        shop: -20,
        quest: 10,
      },
      byType: {
        earn: 60,
        spend: -20,
      },
    });
    expect(body.topStudents).toHaveLength(2);
    expect(body.topStudents[0]).toMatchObject({
      studentId: "student-1",
      name: "Alice",
      earned: 50,
      spent: 20,
      net: 30,
    });
  });
});

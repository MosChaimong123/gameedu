import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireSessionUser = vi.fn();
const mockClassroomFindFirst = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockStudentFindMany = vi.fn();
const mockBattleSessionFindMany = vi.fn();

vi.mock("@/lib/auth-guards", () => ({
  requireSessionUser: mockRequireSessionUser,
}));

vi.mock("@/lib/db", () => ({
  db: {
    classroom: {
      findFirst: mockClassroomFindFirst,
      findUnique: mockClassroomFindUnique,
    },
    student: {
      findFirst: mockStudentFindFirst,
      findMany: mockStudentFindMany,
    },
    battleSession: {
      findMany: mockBattleSessionFindMany,
    },
  },
}));

vi.mock("@/lib/classroom-utils", () => ({
  getNegamonSettings: vi.fn(() => ({
    enabled: true,
    studentMonsters: {
      "student-1": "naga",
      "student-2": "garuda",
    },
  })),
  getStudentMonsterState: vi.fn((studentId: string) => ({
    studentId,
    form: { icon: "x", name: "Rank 1" },
    rankIndex: 1,
  })),
}));

describe("battle read route auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireSessionUser.mockResolvedValue(null);
  });

  it("rejects battle history reads without a student code or teacher session", async () => {
    const { GET } = await import("@/app/api/classrooms/[id]/battle/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle?studentId=student-1") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "AUTH_REQUIRED" });
    expect(mockBattleSessionFindMany).not.toHaveBeenCalled();
  });

  it("rejects battle history reads when the student code does not match that classroom student", async () => {
    mockStudentFindFirst.mockResolvedValue(null);
    const { GET } = await import("@/app/api/classrooms/[id]/battle/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle?studentId=student-1&studentCode=wrong") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "FORBIDDEN" });
    expect(mockBattleSessionFindMany).not.toHaveBeenCalled();
  });

  it("returns battle history when the student code matches the requesting student", async () => {
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
    mockBattleSessionFindMany.mockResolvedValue([
      {
        id: "battle-1",
        challengerId: "student-1",
        defenderId: "student-2",
        winnerId: "student-1",
        goldReward: 30,
        createdAt: new Date("2026-04-07T10:00:00.000Z"),
      },
    ]);
    mockStudentFindMany.mockResolvedValue([
      { id: "student-1", name: "Alice" },
      { id: "student-2", name: "Bob" },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/battle/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle?studentId=student-1&studentCode=abc123") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      sessions: [
        {
          id: "battle-1",
          challengerId: "student-1",
          defenderId: "student-2",
          winnerId: "student-1",
          goldReward: 30,
        },
      ],
      studentNames: {
        "student-1": "Alice",
        "student-2": "Bob",
      },
    });
    expect(mockBattleSessionFindMany).toHaveBeenCalledWith({
      where: {
        classId: "class-1",
        winnerId: { not: null },
        OR: [{ challengerId: "student-1" }, { defenderId: "student-1" }],
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: expect.any(Object),
    });
  });

  it("returns opponents only after student code authorization", async () => {
    mockStudentFindFirst.mockResolvedValue({ id: "student-1" });
    mockClassroomFindUnique.mockResolvedValue({
      gamifiedSettings: {},
      levelConfig: [],
    });
    mockStudentFindMany.mockResolvedValue([
      { id: "student-2", name: "Bob", behaviorPoints: 10 },
    ]);
    const { GET } = await import("@/app/api/classrooms/[id]/battle/opponents/route");

    const response = await GET(
      new Request("http://local.test/api/classrooms/class-1/battle/opponents?studentId=student-1&studentCode=abc123") as never,
      { params: Promise.resolve({ id: "class-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      {
        id: "student-2",
        name: "Bob",
        formIcon: "x",
        formName: "Rank 1",
        rankIndex: 1,
      },
    ]);
  });
});

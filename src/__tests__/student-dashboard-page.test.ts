import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockStudentFindFirst = vi.fn();
const mockUserFindUnique = vi.fn();
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findFirst: mockStudentFindFirst,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("@/components/student/StudentDashboardClient", () => ({
  StudentDashboardClient: () => null,
}));

vi.mock("@/lib/classroom-utils", () => ({
  getThemeBgStyle: () => ({}),
  getRankEntry: () => ({ key: "rank-1", label: "Rank 1" }),
}));

describe("student dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "student-user-1",
      },
    });
    mockStudentFindFirst.mockResolvedValue({
      id: "student-1",
      classId: "class-1",
      loginCode: "ABC123XYZ789",
      name: "Student One",
      nickname: "One",
      avatar: "seed-1",
      userId: "student-user-1",
      behaviorPoints: 25,
      gold: 50,
      lastCheckIn: null,
      streak: 2,
      inventory: [],
      battleLoadout: [],
      equippedFrame: null,
      negamonSkills: [],
      classroom: {
        id: "class-1",
        name: "Class 1",
        image: null,
        emoji: null,
        theme: null,
        levelConfig: null,
        gamifiedSettings: null,
        teacherId: "teacher-1",
        assignments: [],
      },
      history: [],
      submissions: [],
      achievements: [],
    });
    mockUserFindUnique.mockResolvedValue({ name: "Teacher One" });
  });

  it("queries the dashboard read model without writing student state during render", async () => {
    const StudentDashboardPage = (await import("@/app/student/[code]/page")).default;

    await StudentDashboardPage({
      params: Promise.resolve({ code: "abc123xyz789" }),
    });

    expect(mockStudentFindFirst).toHaveBeenCalledWith({
      where: {
        OR: [
          { loginCode: "abc123xyz789" },
          { loginCode: "ABC123XYZ789" },
        ],
      },
      select: {
        id: true,
        classId: true,
        loginCode: true,
        name: true,
        nickname: true,
        avatar: true,
        userId: true,
        behaviorPoints: true,
        gold: true,
        lastCheckIn: true,
        streak: true,
        inventory: true,
        battleLoadout: true,
        equippedFrame: true,
        negamonSkills: true,
        classroom: {
          select: {
            id: true,
            name: true,
            image: true,
            emoji: true,
            theme: true,
            levelConfig: true,
            gamifiedSettings: true,
            teacherId: true,
            assignments: {
              orderBy: { order: "asc" },
              select: {
                id: true,
                name: true,
                description: true,
                type: true,
                maxScore: true,
                passScore: true,
                deadline: true,
                checklists: true,
                visible: true,
              },
            },
          },
        },
        history: {
          orderBy: { timestamp: "desc" },
          take: 30,
          select: {
            value: true,
            timestamp: true,
            reason: true,
          },
        },
      submissions: {
          select: {
            assignmentId: true,
            score: true,
            submittedAt: true,
          },
        },
      },
    });

    expect(mockUserFindUnique).toHaveBeenCalledWith({
      where: { id: "teacher-1" },
      select: { name: true },
    });
  });
});

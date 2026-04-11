import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockStudentFindMany = vi.fn();
const mockUserFindMany = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    student: {
      findMany: mockStudentFindMany,
    },
    user: {
      findMany: mockUserFindMany,
    },
  },
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
}));

vi.mock("next/link", () => ({
  default: ({ children }: { children: unknown }) => children,
}));

vi.mock("next/image", () => ({
  default: () => null,
}));

vi.mock("lucide-react", () => ({
  BookOpen: "BookOpenIcon",
  ClipboardList: "ClipboardListIcon",
  PlayCircle: "PlayCircleIcon",
  Star: "StarIcon",
  Trophy: "TrophyIcon",
}));

vi.mock("@/components/student/join-class-dialog", () => ({
  JoinClassDialog: () => null,
}));

vi.mock("@/lib/classroom-utils", () => ({
  getThemeBgStyle: () => ({}),
}));

describe("student home page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({
      user: {
        id: "student-user-1",
        role: "STUDENT",
        name: "Student",
        image: null,
      },
    });
    mockStudentFindMany.mockResolvedValue([]);
    mockUserFindMany.mockResolvedValue([]);
  });

  it("queries only the fields needed for student home cards", async () => {
    const StudentHomePage = (await import("@/app/student/home/page")).default;

    await StudentHomePage();

    expect(mockStudentFindMany).toHaveBeenCalledWith({
      where: { userId: "student-user-1" },
      select: {
        id: true,
        loginCode: true,
        behaviorPoints: true,
        classroom: {
          select: {
            id: true,
            name: true,
            emoji: true,
            theme: true,
            teacherId: true,
            assignments: {
              where: { visible: true },
              select: {
                id: true,
                name: true,
                maxScore: true,
                deadline: true,
                type: true,
                description: true,
              },
            },
          },
        },
        submissions: {
          select: {
            assignmentId: true,
            score: true,
          },
        },
        history: {
          orderBy: { timestamp: "desc" },
          take: 5,
          select: {
            id: true,
            reason: true,
            value: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  });

  it("redirects teacher/admin users back to dashboard", async () => {
    mockAuth.mockResolvedValue({
      user: {
        id: "teacher-1",
        role: "TEACHER",
      },
    });
    const StudentHomePage = (await import("@/app/student/home/page")).default;

    await expect(StudentHomePage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockRedirect = vi.fn(() => {
  throw new Error("NEXT_REDIRECT");
});
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/services/classroom-dashboard/get-classroom-dashboard", () => ({
  getClassroomDashboard: mockClassroomFindUnique,
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect,
  notFound: mockNotFound,
}));

vi.mock("@/components/classroom/classroom-dashboard", () => ({
  ClassroomDashboard: () => null,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: unknown }) => children,
  TabsContent: ({ children }: { children: unknown }) => children,
  TabsList: ({ children }: { children: unknown }) => children,
}));

vi.mock("@/components/classroom/AnalyticsDashboard", () => ({
  AnalyticsDashboard: () => null,
}));

vi.mock("@/components/classroom/attendance-history-tab", () => ({
  AttendanceHistoryTab: () => null,
}));

vi.mock("@/components/classroom/translated-tabs-triggers", () => ({
  TranslatedTabsTriggers: () => null,
}));

vi.mock("@/components/board/ClassBoard", () => ({
  ClassBoard: () => null,
}));

vi.mock("@/app/dashboard/classrooms/[id]/classroom-page-back-link", () => ({
  ClassroomPageBackLink: () => null,
}));

describe("dashboard classroom page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.mockResolvedValue({ user: { id: "teacher-1" } });
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-1",
      name: "Class 1",
      emoji: null,
      image: null,
      theme: null,
      grade: null,
      gamifiedSettings: null,
      levelConfig: null,
      quizReviewMode: null,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      students: [],
      skills: [],
      assignments: [],
    });
  });

  it("queries only the classroom fields needed by the dashboard view", async () => {
    const ClassroomPage = (await import("@/app/dashboard/classrooms/[id]/page")).default;

    await ClassroomPage({
      params: Promise.resolve({ id: "class-1" }),
      searchParams: Promise.resolve({}),
    });

    expect(mockClassroomFindUnique).toHaveBeenCalledWith("class-1");
  });

  it("normalizes valid deep-link query for assignments focus", async () => {
    const { normalizeClassroomPageQuery } = await import(
      "@/app/dashboard/classrooms/[id]/page"
    );
    const result = normalizeClassroomPageQuery({
      tab: "classroom",
      focus: "assignments",
      highlightAssignmentId: "507f1f77bcf86cd799439011",
    });
    expect(result).toEqual({
      defaultTab: "classroom",
      classFocus: "assignments",
      highlightAssignmentId: "507f1f77bcf86cd799439011",
    });
  });

  it("sanitizes unsupported tab/focus/highlight query", async () => {
    const { normalizeClassroomPageQuery } = await import(
      "@/app/dashboard/classrooms/[id]/page"
    );
    const result = normalizeClassroomPageQuery({
      tab: "something-else",
      focus: "other",
      highlightAssignmentId: "bad-id",
    });
    expect(result).toEqual({
      defaultTab: "classroom",
      classFocus: null,
      highlightAssignmentId: null,
    });
  });

  it("redirects away when the classroom is owned by another teacher", async () => {
    mockClassroomFindUnique.mockResolvedValue({
      id: "class-1",
      teacherId: "teacher-2",
      name: "Class 1",
      emoji: null,
      image: null,
      theme: null,
      grade: null,
      gamifiedSettings: null,
      levelConfig: null,
      quizReviewMode: null,
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      students: [],
      skills: [],
      assignments: [],
    });
    const ClassroomPage = (await import("@/app/dashboard/classrooms/[id]/page")).default;

    await expect(
      ClassroomPage({
        params: Promise.resolve({ id: "class-1" }),
        searchParams: Promise.resolve({}),
      })
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard/classrooms");
  });
});

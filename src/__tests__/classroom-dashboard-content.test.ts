import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClassroomDashboardContent } from "@/components/classroom/classroom-dashboard-content";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";

const mockAddStudentDialogSpy = vi.fn();
const mockStudentAvatarSpy = vi.fn();
const mockClassroomTableSpy = vi.fn();
const mockNegamonOverviewSpy = vi.fn();

vi.mock("@/components/classroom/add-student-dialog", () => ({
  AddStudentDialog: (props: unknown) => {
    mockAddStudentDialogSpy(props);
    return React.createElement("div");
  },
}));

vi.mock("@/components/classroom/student-avatar", () => ({
  StudentAvatar: (props: unknown) => {
    mockStudentAvatarSpy(props);
    return React.createElement("div");
  },
}));

vi.mock("@/components/classroom/classroom-table", () => ({
  ClassroomTable: (props: unknown) => {
    mockClassroomTableSpy(props);
    return React.createElement("div");
  },
}));

vi.mock("@/components/negamon/negamon-classroom-overview", () => ({
  NegamonClassroomOverview: (props: unknown) => {
    mockNegamonOverviewSpy(props);
    return React.createElement("div");
  },
}));

const baseClassroom: ClassroomDashboardViewModel = {
  id: "class-1",
  teacherId: "teacher-1",
  name: "Class 1",
  emoji: "🏫",
  image: null,
  theme: "from-sky-500 to-indigo-500",
  grade: "P6",
  gamifiedSettings: {},
  levelConfig: null,
  quizReviewMode: "after_each",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  students: [
    {
      id: "student-1",
      name: "Alice",
      nickname: null,
      avatar: null,
      attendance: "PRESENT",
      behaviorPoints: 12,
      gold: 30,
      lastGoldAt: null,
      lastCheckIn: null,
      streak: 1,
      inventory: [],
      equippedFrame: null,
      negamonSkills: [],
      order: 0,
      classId: "class-1",
      userId: null,
      loginCode: "111111",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      submissions: [],
    },
  ],
  skills: [],
  assignments: [],
};

describe("classroom dashboard content", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders add-student CTA when grid view is empty", () => {
    renderToStaticMarkup(
      React.createElement(ClassroomDashboardContent, {
        t: (key: string) => key,
        classroom: { ...baseClassroom, students: [] },
        viewMode: "grid",
        isAttendanceMode: false,
        isSelectMultiple: false,
        groupFilter: "all",
        visibleStudentIds: [],
        selectedStudentIds: [],
        onStudentClick: vi.fn(),
        onHistoryStudent: vi.fn(),
        onStudentsAdded: vi.fn(),
        onOpenNegamonSettings: vi.fn(),
      })
    );

    expect(mockAddStudentDialogSpy).toHaveBeenCalledTimes(1);
    expect((mockAddStudentDialogSpy.mock.calls[0][0] as { classId: string }).classId).toBe("class-1");
  });

  it("routes populated grid view through student avatar cards", () => {
    renderToStaticMarkup(
      React.createElement(ClassroomDashboardContent, {
        t: (key: string) => key,
        classroom: baseClassroom,
        viewMode: "grid",
        isAttendanceMode: false,
        isSelectMultiple: false,
        groupFilter: "all",
        visibleStudentIds: [],
        selectedStudentIds: [],
        onStudentClick: vi.fn(),
        onHistoryStudent: vi.fn(),
        onStudentsAdded: vi.fn(),
        onOpenNegamonSettings: vi.fn(),
      })
    );

    expect(mockStudentAvatarSpy).toHaveBeenCalledTimes(1);
    expect((mockStudentAvatarSpy.mock.calls[0][0] as { id: string }).id).toBe("student-1");
  });

  it("routes negamon view through the overview component", () => {
    renderToStaticMarkup(
      React.createElement(ClassroomDashboardContent, {
        t: (key: string) => key,
        classroom: baseClassroom,
        viewMode: "negamon",
        isAttendanceMode: false,
        isSelectMultiple: false,
        groupFilter: "all",
        visibleStudentIds: [],
        selectedStudentIds: [],
        onStudentClick: vi.fn(),
        onHistoryStudent: vi.fn(),
        onStudentsAdded: vi.fn(),
        onOpenNegamonSettings: vi.fn(),
      })
    );

    expect(mockNegamonOverviewSpy).toHaveBeenCalledTimes(1);
    expect((mockNegamonOverviewSpy.mock.calls[0][0] as { classroomId: string }).classroomId).toBe("class-1");
  });

  it("routes table view through classroom table", () => {
    renderToStaticMarkup(
      React.createElement(ClassroomDashboardContent, {
        t: (key: string) => key,
        classroom: baseClassroom,
        viewMode: "table",
        isAttendanceMode: false,
        isSelectMultiple: false,
        groupFilter: "all",
        visibleStudentIds: [],
        selectedStudentIds: [],
        onStudentClick: vi.fn(),
        onHistoryStudent: vi.fn(),
        onStudentsAdded: vi.fn(),
        onOpenNegamonSettings: vi.fn(),
      })
    );

    expect(mockClassroomTableSpy).toHaveBeenCalledTimes(1);
    expect((mockClassroomTableSpy.mock.calls[0][0] as { classId: string }).classId).toBe("class-1");
  });
});

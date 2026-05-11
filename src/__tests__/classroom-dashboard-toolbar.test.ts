import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ClassroomDashboardToolbar } from "@/components/classroom/classroom-dashboard-toolbar";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/classroom-dashboard.types";

const mockAddStudentDialogSpy = vi.fn();
const mockRankSettingsSpy = vi.fn();

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => React.createElement("img", props),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: React.ReactNode }) =>
    React.createElement("button", props, children),
}));

vi.mock("@/components/classroom/add-student-dialog", () => ({
  AddStudentDialog: (props: unknown) => {
    mockAddStudentDialogSpy(props);
    return React.createElement("div");
  },
}));

vi.mock("@/components/classroom/student-logins-dialog", () => ({
  StudentLoginsDialog: () => null,
}));

vi.mock("@/components/classroom/EventManagerButton", () => ({
  EventManagerButton: () => null,
}));

vi.mock("@/components/classroom/classroom-rank-settings-dialog", () => ({
  ClassroomRankSettingsDialog: (props: unknown) => {
    mockRankSettingsSpy(props);
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
  students: [],
  skills: [],
  assignments: [],
};

describe("classroom dashboard toolbar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes classroom slices into extracted toolbar dialogs", () => {
    renderToStaticMarkup(
      React.createElement(ClassroomDashboardToolbar, {
        t: (key: string) => key,
        classroom: baseClassroom,
        gamificationToolbarMode: "live",
        isConnected: true,
        viewMode: "table",
        mobileToolbarOpen: true,
        isSelectMultiple: false,
        selectedStudentIds: [],
        onToggleMobileToolbar: vi.fn(),
        onOpenAddAssignment: vi.fn(),
        onSelectViewMode: vi.fn(),
        onOpenTimer: vi.fn(),
        onOpenRandomPicker: vi.fn(),
        onOpenGroupMaker: vi.fn(),
        onStudentsAdded: vi.fn(),
        onOpenStudentManager: vi.fn(),
        onRankSettingsSaved: vi.fn(),
        onOpenNegamonSettings: vi.fn(),
        onEnterAttendanceMode: vi.fn(),
        onToggleSelectMultiple: vi.fn(),
        onOpenSettings: vi.fn(),
      })
    );

    expect(mockAddStudentDialogSpy).toHaveBeenCalled();
    expect((mockAddStudentDialogSpy.mock.calls[0][0] as { classId: string }).classId).toBe("class-1");

    expect(mockRankSettingsSpy).toHaveBeenCalled();
    expect((mockRankSettingsSpy.mock.calls[0][0] as { classroom: { id: string } }).classroom.id).toBe("class-1");
  });

  it("shows coming soon for gamification when mode is comingSoon", () => {
    const html = renderToStaticMarkup(
      React.createElement(ClassroomDashboardToolbar, {
        t: (key: string) => key,
        classroom: baseClassroom,
        gamificationToolbarMode: "comingSoon",
        isConnected: true,
        viewMode: "table",
        mobileToolbarOpen: true,
        isSelectMultiple: false,
        selectedStudentIds: [],
        onToggleMobileToolbar: vi.fn(),
        onOpenAddAssignment: vi.fn(),
        onSelectViewMode: vi.fn(),
        onOpenTimer: vi.fn(),
        onOpenRandomPicker: vi.fn(),
        onOpenGroupMaker: vi.fn(),
        onStudentsAdded: vi.fn(),
        onOpenStudentManager: vi.fn(),
        onRankSettingsSaved: vi.fn(),
        onOpenNegamonSettings: vi.fn(),
        onEnterAttendanceMode: vi.fn(),
        onToggleSelectMultiple: vi.fn(),
        onOpenSettings: vi.fn(),
      })
    );

    expect(html).toContain("hostComingSoon");
    expect(mockRankSettingsSpy).not.toHaveBeenCalled();
  });
});

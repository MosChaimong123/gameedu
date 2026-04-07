import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ClassroomDashboardViewModel } from "@/lib/services/classroom-dashboard/get-classroom-dashboard";

const mockUseLanguage = vi.fn();
const mockUseToast = vi.fn();
const mockUseSocket = vi.fn();
const mockUseSound = vi.fn();

const mockUseDashboardState = vi.fn();
const mockUseUiState = vi.fn();
const mockUseAttendanceFlow = vi.fn();
const mockUsePointsFlow = vi.fn();
const mockUseSelectionFlow = vi.fn();

const toolbarPropsSpy = vi.fn();
const attendanceBannerPropsSpy = vi.fn();
const selectionBannerPropsSpy = vi.fn();

vi.mock("@/components/providers/language-provider", () => ({
  useLanguage: mockUseLanguage,
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: mockUseToast,
}));

vi.mock("@/components/providers/socket-provider", () => ({
  useSocket: mockUseSocket,
}));

vi.mock("use-sound", () => ({
  default: mockUseSound,
}));

vi.mock("@/components/classroom/use-classroom-dashboard-state", () => ({
  useClassroomDashboardState: mockUseDashboardState,
}));

vi.mock("@/components/classroom/use-classroom-dashboard-ui-state", () => ({
  useClassroomDashboardUiState: mockUseUiState,
}));

vi.mock("@/components/classroom/use-classroom-attendance-flow", () => ({
  useClassroomAttendanceFlow: mockUseAttendanceFlow,
}));

vi.mock("@/components/classroom/use-classroom-points-flow", () => ({
  useClassroomPointsFlow: mockUsePointsFlow,
}));

vi.mock("@/components/classroom/use-classroom-selection-flow", () => ({
  useClassroomSelectionFlow: mockUseSelectionFlow,
}));

vi.mock("@/components/classroom/classroom-dashboard-toolbar", () => ({
  ClassroomDashboardToolbar: (props: unknown) => {
    toolbarPropsSpy(props);
    return React.createElement("div", { "data-testid": "toolbar" });
  },
}));

vi.mock("@/components/classroom/classroom-dashboard-banners", () => ({
  ClassroomAttendanceBanner: (props: unknown) => {
    attendanceBannerPropsSpy(props);
    return React.createElement("div", { "data-testid": "attendance-banner" });
  },
  ClassroomSelectionBanner: (props: unknown) => {
    selectionBannerPropsSpy(props);
    return React.createElement("div", { "data-testid": "selection-banner" });
  },
}));

const baseClassroom: ClassroomDashboardViewModel = {
  id: "class-1",
  teacherId: "teacher-1",
  name: "Class 1",
  grade: "P5",
  image: null,
  emoji: "🏫",
  theme: "ocean",
  gamifiedSettings: null,
  levelConfig: null,
  quizReviewMode: "immediate_feedback",
  createdAt: new Date("2026-04-02T00:00:00.000Z"),
  updatedAt: new Date("2026-04-02T00:00:00.000Z"),
  students: [
    {
      id: "student-1",
      classId: "class-1",
      name: "Alice",
      order: 1,
      avatar: null,
      nickname: null,
      userId: null,
      behaviorPoints: 10,
      gold: 0,
      lastGoldAt: null,
      lastCheckIn: null,
      streak: 0,
      inventory: [],
      equippedFrame: null,
      negamonSkills: [],
      loginCode: "111111",
      attendance: "PRESENT",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      submissions: [],
    },
  ],
  skills: [],
  assignments: [],
};

describe("classroom dashboard component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseLanguage.mockReturnValue({
      t: (key: string, params?: Record<string, unknown>) => {
        if (key === "selectedCount" && params?.count) {
          return `Selected ${params.count}`;
        }
        return key;
      },
    });
    mockUseToast.mockReturnValue({ toast: vi.fn() });
    mockUseSocket.mockReturnValue({ socket: {}, isConnected: true });
    mockUseSound.mockReturnValue([vi.fn()]);

    mockUseDashboardState.mockReturnValue({
      classroom: baseClassroom,
      setClassroom: vi.fn(),
      applyUpdatedStudentPoints: vi.fn(),
      updateAssignments: vi.fn(),
      updateStudents: vi.fn(),
      appendStudents: vi.fn(),
      updateSkills: vi.fn(),
      updateClassroomBasics: vi.fn(),
      resetLocalBehaviorPoints: vi.fn(),
    });

    mockUseUiState.mockReturnValue({
      menuOpen: false,
      setMenuOpen: vi.fn(),
      loading: false,
      setLoading: vi.fn(),
      viewMode: "grid",
      setViewMode: vi.fn(),
      showTimer: false,
      setShowTimer: vi.fn(),
      showRandomPicker: false,
      setShowRandomPicker: vi.fn(),
      showGroupMaker: false,
      setShowGroupMaker: vi.fn(),
      showResetConfirm: false,
      setShowResetConfirm: vi.fn(),
      showAddAssignment: false,
      setShowAddAssignment: vi.fn(),
      showStudentManager: false,
      setShowStudentManager: vi.fn(),
      showSettings: false,
      setShowSettings: vi.fn(),
      historyStudentId: null,
      setHistoryStudentId: vi.fn(),
      mobileToolbarOpen: false,
      setMobileToolbarOpen: vi.fn(),
      showNegamonSettings: false,
      setShowNegamonSettings: vi.fn(),
    });

    mockUseAttendanceFlow.mockReturnValue({
      isAttendanceMode: false,
      setIsAttendanceMode: vi.fn(),
      hasChanges: false,
      enterAttendanceMode: vi.fn(),
      cycleStudentAttendance: vi.fn(),
      restoreAttendanceSnapshot: vi.fn(),
      exitAttendanceMode: vi.fn(),
      saveAttendance: vi.fn().mockResolvedValue(true),
    });

    mockUseSelectionFlow.mockReturnValue({
      isSelectMultiple: false,
      setIsSelectMultiple: vi.fn(),
      selectedStudentIds: [],
      setSelectedStudentIds: vi.fn(),
      groupFilter: "all",
      setGroupFilter: vi.fn(),
      savedGroups: [],
      setSavedGroups: vi.fn(),
      visibleStudentIds: ["student-1"],
      toggleStudentSelection: vi.fn(),
      clearSelectionMode: vi.fn(),
    });

    mockUsePointsFlow.mockReturnValue({
      awardPoints: vi.fn(),
      resetPoints: vi.fn(),
    });
  });

  it("wires toolbar, content, and overlays from extracted dashboard sections", async () => {
    const { ClassroomDashboard } = await import("@/components/classroom/classroom-dashboard");

    renderToStaticMarkup(
      React.createElement(ClassroomDashboard, {
        classroom: baseClassroom,
        initialClassFocus: null,
        highlightAssignmentId: "assignment-1",
      })
    );

    expect(toolbarPropsSpy).toHaveBeenCalledTimes(1);
    const toolbarProps = toolbarPropsSpy.mock.calls[0][0] as {
      viewMode: string;
      isConnected: boolean;
      onSelectViewMode: (mode: "grid" | "table" | "negamon") => void;
    };

    expect(toolbarProps.viewMode).toBe("grid");
    expect(toolbarProps.isConnected).toBe(true);

    toolbarProps.onSelectViewMode("table");

    const { setViewMode } = mockUseUiState.mock.results[0].value as {
      setViewMode: ReturnType<typeof vi.fn>;
    };
    const { exitAttendanceMode } = mockUseAttendanceFlow.mock.results[0].value as {
      exitAttendanceMode: ReturnType<typeof vi.fn>;
    };
    const { clearSelectionMode } = mockUseSelectionFlow.mock.results[0].value as {
      clearSelectionMode: ReturnType<typeof vi.fn>;
    };

    expect(setViewMode).toHaveBeenCalledWith("table");
    expect(exitAttendanceMode).toHaveBeenCalled();
    expect(clearSelectionMode).toHaveBeenCalled();
  });

  it("switches to attendance banner and selection summary when those flows are active", async () => {
    mockUseAttendanceFlow.mockReturnValue({
      isAttendanceMode: true,
      setIsAttendanceMode: vi.fn(),
      hasChanges: true,
      enterAttendanceMode: vi.fn(),
      cycleStudentAttendance: vi.fn(),
      restoreAttendanceSnapshot: vi.fn(),
      exitAttendanceMode: vi.fn(),
      saveAttendance: vi.fn().mockResolvedValue(true),
    });

    mockUseSelectionFlow.mockReturnValue({
      isSelectMultiple: true,
      setIsSelectMultiple: vi.fn(),
      selectedStudentIds: ["student-1"],
      setSelectedStudentIds: vi.fn(),
      groupFilter: "all",
      setGroupFilter: vi.fn(),
      savedGroups: [],
      setSavedGroups: vi.fn(),
      visibleStudentIds: ["student-1"],
      toggleStudentSelection: vi.fn(),
      clearSelectionMode: vi.fn(),
    });

    const { ClassroomDashboard } = await import("@/components/classroom/classroom-dashboard");

    renderToStaticMarkup(
      React.createElement(ClassroomDashboard, {
        classroom: baseClassroom,
      })
    );

    expect(toolbarPropsSpy).not.toHaveBeenCalled();
    expect(attendanceBannerPropsSpy).toHaveBeenCalledTimes(1);
    expect(selectionBannerPropsSpy).not.toHaveBeenCalled();

    const attendanceProps = attendanceBannerPropsSpy.mock.calls[0][0] as {
      hasChanges: boolean;
    };
    expect(attendanceProps.hasChanges).toBe(true);
  });
});

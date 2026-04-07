import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { StudentDashboardClientProps } from "@/components/student/StudentDashboardClient";

const mockUseLanguage = vi.fn();
const mockHeaderSpy = vi.fn();
const mockAssignmentsTabSpy = vi.fn();

vi.mock("@/components/providers/language-provider", () => ({
  useLanguage: mockUseLanguage,
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/components/student/student-dashboard-header", () => ({
  StudentDashboardHeader: (props: unknown) => {
    mockHeaderSpy(props);
    return React.createElement("div", { "data-testid": "student-dashboard-header" });
  },
}));

vi.mock("@/components/student/student-dashboard-tab-nav", () => ({
  StudentDashboardTabNav: () => null,
}));

vi.mock("@/components/student/student-dashboard-assignments-tab", () => ({
  StudentDashboardAssignmentsTab: (props: unknown) => {
    mockAssignmentsTabSpy(props);
    return React.createElement("div", { "data-testid": "student-dashboard-assignments-tab" });
  },
}));

vi.mock("@/components/student/student-avatar-section", () => ({
  StudentAvatarSection: () => null,
}));

vi.mock("@/components/student/LeaderboardTab", () => ({
  LeaderboardTab: () => null,
}));

vi.mock("@/components/student/EventBanner", () => ({
  EventBanner: () => null,
}));

vi.mock("@/components/student/sync-account-button", () => ({
  SyncAccountButton: () => null,
}));

vi.mock("@/components/board/ClassBoard", () => ({
  ClassBoard: () => null,
}));

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => children,
  TabsContent: ({ children }: { children: React.ReactNode }) => children,
  TabsList: ({ children }: { children: React.ReactNode }) => children,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => children,
  CardContent: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/progress", () => ({
  Progress: () => null,
}));

vi.mock("@/components/accessibility/AccessibilityControlPanel", () => ({
  AccessibilityControlPanel: () => null,
}));

vi.mock("@/components/negamon/monster-card", () => ({
  MonsterCard: () => null,
}));

vi.mock("@/components/negamon/evolve-animation", () => ({
  useEvolveAnimation: () => ({
    triggerEvolve: vi.fn(),
    node: null,
  }),
}));

vi.mock("@/components/negamon/StarterSelectionModal", () => ({
  StarterSelectionModal: () => null,
}));

vi.mock("@/components/student/DailyQuestPanel", () => ({
  DailyQuestPanel: () => null,
}));

vi.mock("@/components/student/GameHistoryTab", () => ({
  GameHistoryTab: () => null,
}));

vi.mock("@/components/negamon/BattleArena", () => ({
  BattleTab: () => null,
}));

const baseProps: StudentDashboardClientProps = {
  student: {
    id: "student-1",
    classId: "class-1",
    loginCode: "111111",
    name: "Alice",
    nickname: "Al",
    avatar: null,
    userId: undefined,
    behaviorPoints: 12,
    gold: 30,
    streak: 2,
    lastCheckIn: null,
    inventory: [],
    equippedFrame: null,
    negamonSkills: [],
  },
  classroom: {
    id: "class-1",
    name: "Class 1",
    teacher: { name: "Teacher A" },
    gamifiedSettings: {},
    levelConfig: null,
    assignments: [],
  },
  history: [],
  submissions: [],
  academicTotal: 40,
  totalPositive: 50,
  totalNegative: -10,
  rankEntry: {
    name: "Bronze",
    icon: "🥉",
    minPoints: 0,
    color: "#999",
    goldRate: 1,
  },
  themeClass: "from-sky-500 to-indigo-500",
  themeStyle: {},
  classIcon: "🏫",
  isImageIcon: false,
  currentUserId: "user-1",
  code: "ABC123",
};

describe("student dashboard client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLanguage.mockReturnValue({
      t: (key: string) => key,
      language: "en",
    });
  });

  it("passes classroom header state into the extracted header component", async () => {
    const { StudentDashboardClient } = await import("@/components/student/StudentDashboardClient");

    renderToStaticMarkup(React.createElement(StudentDashboardClient, baseProps));

    expect(mockHeaderSpy).toHaveBeenCalledTimes(1);
    const headerProps = mockHeaderSpy.mock.calls[0][0] as {
      code: string;
      mode: string;
      classroom: { id: string };
      student: { id: string };
      currentUserId?: string;
    };

    expect(headerProps.code).toBe("ABC123");
    expect(headerProps.mode).toBe("learn");
    expect(headerProps.classroom.id).toBe("class-1");
    expect(headerProps.student.id).toBe("student-1");
    expect(headerProps.currentUserId).toBe("user-1");

    expect(mockAssignmentsTabSpy).toHaveBeenCalledTimes(1);
    const assignmentsProps = mockAssignmentsTabSpy.mock.calls[0][0] as {
      code: string;
      assignmentFilter: string;
      assignmentSort: string;
    };
    expect(assignmentsProps.code).toBe("ABC123");
    expect(assignmentsProps.assignmentFilter).toBe("all");
    expect(assignmentsProps.assignmentSort).toBe("default");
  });
});

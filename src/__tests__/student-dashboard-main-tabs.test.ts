import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardMainTabs } from "@/components/student/student-dashboard-main-tabs";

const mockAssignmentsTabSpy = vi.fn();
const mockBoardTabSpy = vi.fn();
const mockHistoryTabSpy = vi.fn();
const mockMonsterTabSpy = vi.fn();
const mockGameTabsSpy = vi.fn();

vi.mock("@/components/student/EventBanner", () => ({
    EventBanner: () => null,
}));

vi.mock("@/components/student/student-dashboard-tab-nav", () => ({
    StudentDashboardTabNav: () => null,
}));

vi.mock("@/components/student/student-dashboard-assignments-tab", () => ({
    StudentDashboardAssignmentsTab: (props: unknown) => {
        mockAssignmentsTabSpy(props);
        return React.createElement("div");
    },
}));

vi.mock("@/components/student/student-dashboard-board-tab", () => ({
    StudentDashboardBoardTab: (props: unknown) => {
        mockBoardTabSpy(props);
        return React.createElement("div");
    },
}));

vi.mock("@/components/student/student-dashboard-history-tab", () => ({
    StudentDashboardHistoryTab: (props: unknown) => {
        mockHistoryTabSpy(props);
        return React.createElement("div");
    },
}));

vi.mock("@/components/student/student-dashboard-monster-tab", () => ({
    StudentDashboardMonsterTab: (props: unknown) => {
        mockMonsterTabSpy(props);
        return React.createElement("div");
    },
}));

vi.mock("@/components/student/student-dashboard-game-tabs", () => ({
    StudentDashboardGameTabs: (props: unknown) => {
        mockGameTabsSpy(props);
        return React.createElement("div");
    },
}));

vi.mock("@/components/student/LeaderboardTab", () => ({
    LeaderboardTab: () => null,
}));

vi.mock("@/components/ui/tabs", () => ({
    Tabs: ({ children }: { children: React.ReactNode }) => children,
    TabsContent: ({ children }: { children: React.ReactNode }) => children,
    TabsList: ({ children }: { children: React.ReactNode }) => children,
    TabsTrigger: ({ children }: { children: React.ReactNode }) => children,
}));

describe("student dashboard main tabs", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("passes the expected props into each extracted tab section", () => {
        renderToStaticMarkup(
            React.createElement(StudentDashboardMainTabs, {
                t: (key: string) => key,
                mode: "learn",
                activeTab: "assignments",
                classroom: {
                    id: "class-1",
                    name: "Class 1",
                    teacher: { name: "Teacher A" },
                    gamifiedSettings: {},
                    levelConfig: null,
                    assignments: [],
                },
                student: {
                    id: "student-1",
                    classId: "class-1",
                    loginCode: "111111",
                    name: "Alice",
                    behaviorPoints: 12,
                    gold: 30,
                    streak: 2,
                    lastCheckIn: null,
                    inventory: [],
                    equippedFrame: null,
                    negamonSkills: [],
                },
                code: "ABC123",
                currentUserId: "user-1",
                canAccessBoard: false,
                submissions: [],
                assignmentFilter: "all",
                assignmentSort: "default",
                dateLocale: new Intl.Locale("en-US") as unknown as Locale,
                totalPositive: 50,
                totalNegative: -10,
                history: [],
                groupedHistory: {},
                levelConfigResolved: null,
                negamonSettings: {},
                studentMonsterState: null,
                questGold: undefined,
                onActiveTabChange: vi.fn(),
                onAssignmentFilterChange: vi.fn(),
                onAssignmentSortToggle: vi.fn(),
                onOpenStarterSelection: vi.fn(),
                onGoldChange: vi.fn(),
            })
        );

        expect(mockAssignmentsTabSpy).toHaveBeenCalledTimes(1);
        expect((mockAssignmentsTabSpy.mock.calls[0][0] as { code: string }).code).toBe("ABC123");

        expect(mockBoardTabSpy).toHaveBeenCalledTimes(1);
        expect((mockBoardTabSpy.mock.calls[0][0] as { canAccessBoard: boolean }).canAccessBoard).toBe(false);

        expect(mockHistoryTabSpy).toHaveBeenCalledTimes(1);
        expect((mockHistoryTabSpy.mock.calls[0][0] as { totalPositive: number }).totalPositive).toBe(50);

        expect(mockMonsterTabSpy).toHaveBeenCalledTimes(1);
        const monsterProps = mockMonsterTabSpy.mock.calls[0][0] as { student: { id: string }; code: string };
        expect(monsterProps.student.id).toBe("student-1");
        expect(monsterProps.code).toBe("ABC123");

        expect(mockGameTabsSpy).toHaveBeenCalledTimes(1);
        const gameTabsProps = mockGameTabsSpy.mock.calls[0][0] as {
            classId: string;
            studentId: string;
            loginCode: string;
            currentGold: number;
        };
        expect(gameTabsProps.classId).toBe("class-1");
        expect(gameTabsProps.studentId).toBe("student-1");
        expect(gameTabsProps.loginCode).toBe("111111");
        expect(gameTabsProps.currentGold).toBe(30);
    });
});

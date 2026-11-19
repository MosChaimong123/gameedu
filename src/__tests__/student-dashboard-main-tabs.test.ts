import React from "react";
import { enUS } from "date-fns/locale";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardMainTabs } from "@/components/student/student-dashboard-main-tabs";

const mockAssignmentsTabSpy = vi.fn();
const mockBoardTabSpy = vi.fn();
const mockHistoryTabSpy = vi.fn();

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
                    battleLoadout: [],
                    equippedFrame: null,
                    negamonSkills: [],
                },
                code: "ABC123",
                currentUserId: "user-1",
                canAccessBoard: false,
                submissions: [],
                assignmentFilter: "all",
                assignmentSort: "default",
                dateLocale: enUS,
                totalPositive: 50,
                totalNegative: -10,
                history: [],
                groupedHistory: {},
                onActiveTabChange: vi.fn(),
                onAssignmentFilterChange: vi.fn(),
                onAssignmentSortToggle: vi.fn(),
            })
        );

        expect(mockAssignmentsTabSpy).toHaveBeenCalledTimes(1);
        expect((mockAssignmentsTabSpy.mock.calls[0][0] as { code: string }).code).toBe("ABC123");

        expect(mockBoardTabSpy).toHaveBeenCalledTimes(1);
        expect((mockBoardTabSpy.mock.calls[0][0] as { canAccessBoard: boolean }).canAccessBoard).toBe(false);

        expect(mockHistoryTabSpy).toHaveBeenCalledTimes(1);
        expect((mockHistoryTabSpy.mock.calls[0][0] as { totalPositive: number }).totalPositive).toBe(50);

    });
});

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { StudentDashboardClientProps } from "@/lib/services/student-dashboard/student-dashboard.types";

const mockUseLanguage = vi.fn();
const mockHeaderSpy = vi.fn();
const mockSidebarSpy = vi.fn();
const mockMainTabsSpy = vi.fn();

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

vi.mock("@/components/student/student-dashboard-sidebar", () => ({
    StudentDashboardSidebar: (props: unknown) => {
        mockSidebarSpy(props);
        return React.createElement("div", { "data-testid": "student-dashboard-sidebar" });
    },
}));

vi.mock("@/components/student/student-dashboard-main-tabs", () => ({
    StudentDashboardMainTabs: (props: unknown) => {
        mockMainTabsSpy(props);
        return React.createElement("div", { "data-testid": "student-dashboard-main-tabs" });
    },
}));

vi.mock("@/components/accessibility/AccessibilityControlPanel", () => ({
    AccessibilityControlPanel: () => null,
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

vi.mock("@/lib/classroom-utils", () => ({
    getNegamonSettings: vi.fn(() => ({})),
    getStudentMonsterState: vi.fn(() => null),
    calcMonsterStats: vi.fn(() => ({})),
    getActiveGoldMultiplier: vi.fn(() => 1),
}));

vi.mock("@/lib/negamon-species", () => ({
    findSpeciesById: vi.fn(() => null),
}));

vi.mock("@/lib/negamon-passives", () => ({
    calcGoldRateBonus: vi.fn(() => 0),
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
        icon: "bronze",
        minScore: 0,
        color: "#999",
        goldRate: 1,
    },
    themeClass: "from-sky-500 to-indigo-500",
    themeStyle: {},
    classIcon: "icon",
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

    it("wires header, sidebar, and main tabs with the expected dashboard state", async () => {
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

        expect(mockSidebarSpy).toHaveBeenCalledTimes(1);
        const sidebarProps = mockSidebarSpy.mock.calls[0][0] as {
            classId: string;
            academicTotal: number;
            mode: string;
            student: { id: string };
        };
        expect(sidebarProps.classId).toBe("class-1");
        expect(sidebarProps.academicTotal).toBe(40);
        expect(sidebarProps.mode).toBe("learn");
        expect(sidebarProps.student.id).toBe("student-1");

        expect(mockMainTabsSpy).toHaveBeenCalledTimes(1);
        const mainTabsProps = mockMainTabsSpy.mock.calls[0][0] as {
            code: string;
            mode: string;
            activeTab: string;
            classroom: { id: string };
            student: { id: string };
            canAccessBoard: boolean;
        };
        expect(mainTabsProps.code).toBe("ABC123");
        expect(mainTabsProps.mode).toBe("learn");
        expect(mainTabsProps.activeTab).toBe("assignments");
        expect(mainTabsProps.classroom.id).toBe("class-1");
        expect(mainTabsProps.student.id).toBe("student-1");
        expect(mainTabsProps.canAccessBoard).toBe(false);
    });
});

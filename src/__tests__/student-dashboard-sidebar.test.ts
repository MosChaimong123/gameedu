import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardSidebar } from "@/components/student/student-dashboard-sidebar";

const mockAvatarSectionSpy = vi.fn();

vi.mock("@/components/student/student-avatar-section", () => ({
    StudentAvatarSection: (props: unknown) => {
        mockAvatarSectionSpy(props);
        return React.createElement("div", { "data-testid": "student-avatar-section" });
    },
}));

describe("student dashboard sidebar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("passes the expected student summary props into the avatar section", () => {
        renderToStaticMarkup(
            React.createElement(StudentDashboardSidebar, {
                student: {
                    id: "student-1",
                    classId: "class-1",
                    loginCode: "111111",
                    name: "Alice",
                    nickname: "Al",
                    avatar: null,
                    behaviorPoints: 12,
                    gold: 30,
                    streak: 2,
                    lastCheckIn: null,
                    inventory: [],
                    equippedFrame: null,
                    negamonSkills: [],
                },
                classId: "class-1",
                academicTotal: 40,
                totalGoldRate: 3,
                rankEntry: {
                    name: "Bronze",
                    icon: "bronze",
                    minScore: 0,
                    color: "#999",
                    goldRate: 1,
                },
                totalPositive: 50,
                totalNegative: -10,
                themeClass: "from-sky-500 to-indigo-500",
                themeStyle: {},
                levelConfigResolved: null,
                mode: "learn",
                questGold: 45,
            })
        );

        expect(mockAvatarSectionSpy).toHaveBeenCalledTimes(1);
        const avatarProps = mockAvatarSectionSpy.mock.calls[0][0] as {
            studentId: string;
            classId: string;
            loginCode: string;
            points: number;
            goldRate: number;
            externalGold: number;
            mode: string;
        };

        expect(avatarProps.studentId).toBe("student-1");
        expect(avatarProps.classId).toBe("class-1");
        expect(avatarProps.loginCode).toBe("111111");
        expect(avatarProps.points).toBe(40);
        expect(avatarProps.goldRate).toBe(3);
        expect(avatarProps.externalGold).toBe(45);
        expect(avatarProps.mode).toBe("learn");
    });
});

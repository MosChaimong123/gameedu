import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { StudentDashboardSidebar } from "@/components/student/student-dashboard-sidebar";

const mockAvatarSectionSpy = vi.fn();

vi.mock("@/components/student/student-learning-profile", () => ({
    StudentLearningProfile: (props: unknown) => {
        mockAvatarSectionSpy(props);
        return React.createElement("div", { "data-testid": "student-avatar-section" });
    },
}));

describe("student dashboard sidebar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("passes the expected student summary props into the avatar section", () => {
        const html = renderToStaticMarkup(
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
                battleLoadout: [],
                equippedFrame: null,
                negamonSkills: [],
                },
                classId: "class-1",
                academicTotal: 40,
                totalPositive: 50,
                totalNegative: -10,
            })
        );

        expect(mockAvatarSectionSpy).toHaveBeenCalledTimes(1);
        const avatarProps = mockAvatarSectionSpy.mock.calls[0][0] as {
            studentId: string;
            classId: string;
            loginCode: string;
            academicPoints: number;
            behaviorPoints: number;
        };

        expect(avatarProps.studentId).toBe("student-1");
        expect(avatarProps.classId).toBe("class-1");
        expect(avatarProps.loginCode).toBe("111111");
        expect(avatarProps.academicPoints).toBe(40);
        expect(avatarProps.behaviorPoints).toBe(12);
        expect(html).not.toContain("ทองรอบนี้ยังไม่เข้า");
    });
});

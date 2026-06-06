import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockClassroomFindUnique = vi.fn();
const mockAssignmentFindMany = vi.fn();
const mockDeliveryFindMany = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        classroom: {
            findUnique: mockClassroomFindUnique,
        },
        assignment: {
            findMany: mockAssignmentFindMany,
        },
    },
    getOptionalDbModel: (name: string) =>
        name === "lineAssignmentReminderDelivery"
            ? { findMany: mockDeliveryFindMany }
            : null,
}));

describe("classroom LINE reminder deliveries route", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockClassroomFindUnique.mockResolvedValue({ id: "class-1", teacherId: "teacher-1" });
        mockAssignmentFindMany.mockResolvedValue([{ id: "assignment-1", name: "Homework 1" }]);
        mockDeliveryFindMany.mockResolvedValue([
            {
                id: "delivery-1",
                lineGroupId: "line-group-1",
                classroomId: "class-1",
                assignmentId: "assignment-1",
                reminderKey: "weekly_summary:2026-W23",
                reminderType: "weekly_summary",
                targetCount: 3,
                status: "failed",
                errorMessage: "LINE API failed",
                sentAt: new Date("2026-06-08T02:00:00.000Z"),
            },
        ]);
    });

    it("returns status and error message for reminder delivery history", async () => {
        const { GET } = await import("@/app/api/classrooms/[id]/line-reminder-deliveries/route");
        const response = await GET(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1" }),
        });
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.deliveries[0]).toMatchObject({
            assignmentName: "Homework 1",
            reminderType: "weekly_summary",
            status: "failed",
            errorMessage: "LINE API failed",
        });
    });
});

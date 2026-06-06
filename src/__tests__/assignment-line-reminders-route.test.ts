import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockAssignmentFindUnique = vi.fn();
const mockGetOptionalDbModel = vi.fn();
const mockDeliveryCreate = vi.fn();
const mockBindingFindMany = vi.fn();
const mockBindingUpdate = vi.fn();
const mockPushLineFlex = vi.fn();

vi.mock("@/auth", () => ({
    auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
    db: {
        assignment: {
            findUnique: mockAssignmentFindUnique,
        },
    },
    getOptionalDbModel: mockGetOptionalDbModel,
}));

vi.mock("@/lib/line-bot/client", () => ({
    pushLineFlex: mockPushLineFlex,
}));

describe("POST /api/classrooms/[id]/assignments/[assignmentId]/line-reminders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAuth.mockResolvedValue({ user: { id: "teacher-1", role: "TEACHER" } });
        mockGetOptionalDbModel.mockImplementation((modelName: string) => {
            if (modelName === "lineAssignmentReminderDelivery") {
                return { create: mockDeliveryCreate };
            }
            if (modelName === "lineStudentBinding") {
                return { findMany: mockBindingFindMany, update: mockBindingUpdate };
            }
            return null;
        });
        mockDeliveryCreate.mockResolvedValue({ id: "delivery-1" });
        mockBindingFindMany.mockResolvedValue([]);
        mockBindingUpdate.mockResolvedValue({});
        mockPushLineFlex.mockResolvedValue(undefined);
    });

    it("rejects unauthenticated requests", async () => {
        mockAuth.mockResolvedValue(null);
        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/line-reminders/route");
        const res = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });

        expect(res.status).toBe(401);
        expect(mockAssignmentFindUnique).not.toHaveBeenCalled();
    });

    it("pushes a manual LINE reminder and records delivery state", async () => {
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            name: "Homework 1",
            deadline: new Date("2026-06-05T10:00:00.000Z"),
            classroom: {
                id: "class-1",
                name: "M1/1",
                teacherId: "teacher-1",
                teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                students: [{ id: "student-1" }, { id: "student-2" }],
                lineBotGroups: [{ id: "line-bot-group-1", lineGroupId: "line-group-1" }],
            },
            submissions: [{ studentId: "student-2" }],
        });

        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/line-reminders/route");
        const res = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            lineGroupCount: 1,
            sentCount: 1,
            targetCount: 1,
        });
        expect(mockDeliveryCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                lineBotGroupId: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "class-1",
                assignmentId: "assignment-1",
                reminderType: "manual",
                targetCount: 1,
            }),
        });
        expect(mockPushLineFlex).toHaveBeenCalledWith(
            "line-group-1",
            expect.stringContaining("Homework 1"),
            expect.any(Object)
        );
    });

    it("returns zero sent when the classroom has no bound LINE group", async () => {
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            name: "Homework 1",
            deadline: null,
            classroom: {
                id: "class-1",
                name: "M1/1",
                teacherId: "teacher-1",
                teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                students: [{ id: "student-1" }],
                lineBotGroups: [],
            },
            submissions: [],
        });

        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/line-reminders/route");
        const res = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(200);
        expect(body).toMatchObject({
            success: true,
            lineGroupCount: 0,
            sentCount: 0,
            targetCount: 1,
        });
        expect(mockPushLineFlex).not.toHaveBeenCalled();
    });

    it("blocks manual dashboard LINE reminders on the free plan", async () => {
        mockAssignmentFindUnique.mockResolvedValue({
            id: "assignment-1",
            name: "Homework 1",
            deadline: null,
            classroom: {
                id: "class-1",
                name: "M1/1",
                teacherId: "teacher-1",
                teacher: { role: "TEACHER", plan: "FREE", planStatus: "INACTIVE", planExpiry: null },
                students: [{ id: "student-1" }],
                lineBotGroups: [{ id: "line-bot-group-1", lineGroupId: "line-group-1" }],
            },
            submissions: [],
        });

        const { POST } = await import("@/app/api/classrooms/[id]/assignments/[assignmentId]/line-reminders/route");
        const res = await POST(new Request("http://localhost"), {
            params: Promise.resolve({ id: "class-1", assignmentId: "assignment-1" }),
        });
        const body = await res.json();

        expect(res.status).toBe(403);
        expect(body.error.code).toBe("PLAN_LIMIT_AI_FEATURE");
        expect(mockPushLineFlex).not.toHaveBeenCalled();
    });
});

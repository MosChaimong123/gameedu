import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindManyLineBotGroup = vi.fn();
const mockGetOptionalDbModel = vi.fn();
const mockPushLineFlex = vi.fn();
const mockDeliveryCreate = vi.fn();
const mockDeliveryUpdate = vi.fn();
const mockBindingFindMany = vi.fn();
const mockBindingUpdate = vi.fn();
const mockSettingFindMany = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        lineBotGroup: {
            findMany: mockFindManyLineBotGroup,
        },
    },
    getOptionalDbModel: mockGetOptionalDbModel,
}));

vi.mock("@/lib/line-bot/client", () => ({
    pushLineFlex: mockPushLineFlex,
}));

describe("line auto reminders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetOptionalDbModel.mockImplementation((modelName: string) => {
            if (modelName === "lineAssignmentReminderDelivery") {
                return { create: mockDeliveryCreate, update: mockDeliveryUpdate };
            }
            if (modelName === "lineStudentBinding") {
                return { findMany: mockBindingFindMany, update: mockBindingUpdate };
            }
            if (modelName === "classroomLineReminderSetting") {
                return { findMany: mockSettingFindMany };
            }
            return null;
        });
        mockBindingFindMany.mockResolvedValue([]);
        mockBindingUpdate.mockResolvedValue({});
        mockDeliveryUpdate.mockResolvedValue({});
        mockSettingFindMany.mockResolvedValue([
            {
                classroomId: "classroom-1",
                enabled: true,
                beforeDeadline1d: true,
                dueToday: true,
                overdue1d: true,
                weeklySummary: true,
            },
        ]);
        mockDeliveryCreate.mockResolvedValue({ id: "delivery-1" });
        mockPushLineFlex.mockResolvedValue(undefined);
    });

    it("sends due-today reminders once for missing submissions", async () => {
        mockFindManyLineBotGroup.mockResolvedValue([
            {
                id: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "classroom-1",
                classroom: {
                    id: "classroom-1",
                    name: "M1/1",
                    teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                    students: [{ id: "student-1" }, { id: "student-2" }],
                    assignments: [
                        {
                            id: "assignment-1",
                            name: "Homework 1",
                            deadline: new Date("2026-06-02T16:59:59.999Z"),
                            submissions: [{ studentId: "student-1" }],
                        },
                    ],
                },
            },
        ]);

        const { runLineAutoReminders } = await import("@/lib/line-bot/auto-reminders");
        const result = await runLineAutoReminders({ now: new Date("2026-06-02T02:00:00.000Z") });

        expect(result).toMatchObject({
            scannedGroups: 1,
            candidateCount: 1,
            sentCount: 1,
            skippedDuplicateCount: 0,
            failedCount: 0,
        });
        expect(mockDeliveryCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                assignmentId: "assignment-1",
                lineBotGroupId: "line-bot-group-1",
                reminderKey: "due_today:2026-06-02",
                reminderType: "due_today",
                targetCount: 1,
                status: "pending",
                triggeredBy: "cron",
            }),
        });
        expect(mockDeliveryUpdate).toHaveBeenCalledWith({
            where: { id: "delivery-1" },
            data: { status: "sent", errorCode: null, errorMessage: null },
        });
        expect(mockPushLineFlex).toHaveBeenCalledWith(
            "line-group-1",
            expect.stringContaining("Homework 1"),
            expect.any(Object)
        );
    });

    it("skips duplicate delivery records without pushing again", async () => {
        mockFindManyLineBotGroup.mockResolvedValue([
            {
                id: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "classroom-1",
                classroom: {
                    id: "classroom-1",
                    name: "M1/1",
                    teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                    students: [{ id: "student-1" }],
                    assignments: [
                        {
                            id: "assignment-1",
                            name: "Homework 1",
                            deadline: new Date("2026-06-02T16:59:59.999Z"),
                            submissions: [],
                        },
                    ],
                },
            },
        ]);
        mockDeliveryCreate.mockRejectedValue({ code: "P2002" });

        const { runLineAutoReminders } = await import("@/lib/line-bot/auto-reminders");
        const result = await runLineAutoReminders({ now: new Date("2026-06-02T02:00:00.000Z") });

        expect(result.skippedDuplicateCount).toBe(1);
        expect(result.sentCount).toBe(0);
        expect(mockPushLineFlex).not.toHaveBeenCalled();
    });

    it("does not remind assignments outside the supported reminder windows", async () => {
        mockFindManyLineBotGroup.mockResolvedValue([
            {
                id: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "classroom-1",
                classroom: {
                    id: "classroom-1",
                    name: "M1/1",
                    teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                    students: [{ id: "student-1" }],
                    assignments: [
                        {
                            id: "assignment-1",
                            name: "Homework 1",
                            deadline: new Date("2026-06-08T16:59:59.999Z"),
                            submissions: [],
                        },
                    ],
                },
            },
        ]);

        const { runLineAutoReminders } = await import("@/lib/line-bot/auto-reminders");
        const result = await runLineAutoReminders({ now: new Date("2026-06-02T02:00:00.000Z") });

        expect(result.candidateCount).toBe(0);
        expect(mockDeliveryCreate).not.toHaveBeenCalled();
        expect(mockPushLineFlex).not.toHaveBeenCalled();
    });

    it("skips classrooms that have not enabled auto reminders", async () => {
        mockSettingFindMany.mockResolvedValue([
            {
                classroomId: "classroom-1",
                enabled: false,
                beforeDeadline1d: true,
                dueToday: true,
                overdue1d: true,
                weeklySummary: true,
            },
        ]);
        mockFindManyLineBotGroup.mockResolvedValue([
            {
                id: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "classroom-1",
                classroom: {
                    id: "classroom-1",
                    name: "M1/1",
                    teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                    students: [{ id: "student-1" }],
                    assignments: [
                        {
                            id: "assignment-1",
                            name: "Homework 1",
                            deadline: new Date("2026-06-02T16:59:59.999Z"),
                            submissions: [],
                        },
                    ],
                },
            },
        ]);

        const { runLineAutoReminders } = await import("@/lib/line-bot/auto-reminders");
        const result = await runLineAutoReminders({ now: new Date("2026-06-02T02:00:00.000Z") });

        expect(result.candidateCount).toBe(0);
        expect(mockDeliveryCreate).not.toHaveBeenCalled();
        expect(mockPushLineFlex).not.toHaveBeenCalled();
    });

    it("skips auto reminders for free plan classrooms", async () => {
        mockFindManyLineBotGroup.mockResolvedValue([
            {
                id: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "classroom-1",
                classroom: {
                    id: "classroom-1",
                    name: "M1/1",
                    teacher: { role: "TEACHER", plan: "FREE", planStatus: "INACTIVE", planExpiry: null },
                    students: [{ id: "student-1" }],
                    assignments: [
                        {
                            id: "assignment-1",
                            name: "Homework 1",
                            deadline: new Date("2026-06-02T16:59:59.999Z"),
                            submissions: [],
                        },
                    ],
                },
            },
        ]);

        const { runLineAutoReminders } = await import("@/lib/line-bot/auto-reminders");
        const result = await runLineAutoReminders({ now: new Date("2026-06-02T02:00:00.000Z") });

        expect(result.candidateCount).toBe(0);
        expect(mockDeliveryCreate).not.toHaveBeenCalled();
        expect(mockPushLineFlex).not.toHaveBeenCalled();
    });

    it("sends weekly summary reminders once per Bangkok week for older overdue assignments", async () => {
        mockFindManyLineBotGroup.mockResolvedValue([
            {
                id: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "classroom-1",
                classroom: {
                    id: "classroom-1",
                    name: "M1/1",
                    teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                    students: [{ id: "student-1", name: "Alice" }],
                    assignments: [
                        {
                            id: "assignment-1",
                            name: "Old Homework",
                            deadline: new Date("2026-06-05T16:59:59.999Z"),
                            submissions: [],
                        },
                    ],
                },
            },
        ]);

        const { runLineAutoReminders } = await import("@/lib/line-bot/auto-reminders");
        const result = await runLineAutoReminders({ now: new Date("2026-06-08T02:00:00.000Z") });

        expect(result).toMatchObject({
            candidateCount: 1,
            sentCount: 1,
        });
        expect(mockDeliveryCreate).toHaveBeenCalledWith({
            data: expect.objectContaining({
                reminderKey: "weekly_summary:2026-W24",
                reminderType: "weekly_summary",
                status: "pending",
            }),
        });
    });

    it("records failed delivery status when LINE push fails", async () => {
        mockFindManyLineBotGroup.mockResolvedValue([
            {
                id: "line-bot-group-1",
                lineGroupId: "line-group-1",
                classroomId: "classroom-1",
                classroom: {
                    id: "classroom-1",
                    name: "M1/1",
                    teacher: { role: "TEACHER", plan: "PLUS", planStatus: "ACTIVE", planExpiry: null },
                    students: [{ id: "student-1", name: "Alice" }],
                    assignments: [
                        {
                            id: "assignment-1",
                            name: "Homework 1",
                            deadline: new Date("2026-06-02T16:59:59.999Z"),
                            submissions: [],
                        },
                    ],
                },
            },
        ]);
        mockPushLineFlex.mockRejectedValue(new Error("LINE API failed"));

        const { runLineAutoReminders } = await import("@/lib/line-bot/auto-reminders");
        const result = await runLineAutoReminders({ now: new Date("2026-06-02T02:00:00.000Z") });

        expect(result.failedCount).toBe(1);
        expect(result.sentCount).toBe(0);
        expect(mockDeliveryUpdate).toHaveBeenCalledWith({
            where: { id: "delivery-1" },
            data: { status: "failed", errorCode: "UNKNOWN_ERROR", errorMessage: "LINE API failed" },
        });
    });
});

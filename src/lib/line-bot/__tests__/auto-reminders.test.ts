import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindManyLineBotGroup = vi.fn();
const mockGetOptionalDbModel = vi.fn();
const mockPushLineText = vi.fn();
const mockDeliveryCreate = vi.fn();

vi.mock("@/lib/db", () => ({
    db: {
        lineBotGroup: {
            findMany: mockFindManyLineBotGroup,
        },
    },
    getOptionalDbModel: mockGetOptionalDbModel,
}));

vi.mock("@/lib/line-bot/client", () => ({
    pushLineText: mockPushLineText,
}));

describe("line auto reminders", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetOptionalDbModel.mockReturnValue({ create: mockDeliveryCreate });
        mockDeliveryCreate.mockResolvedValue({});
        mockPushLineText.mockResolvedValue(undefined);
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
            }),
        });
        expect(mockPushLineText).toHaveBeenCalledWith(
            "line-group-1",
            expect.stringContaining("Homework 1")
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
        expect(mockPushLineText).not.toHaveBeenCalled();
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
        expect(mockPushLineText).not.toHaveBeenCalled();
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
        expect(mockPushLineText).not.toHaveBeenCalled();
    });
});

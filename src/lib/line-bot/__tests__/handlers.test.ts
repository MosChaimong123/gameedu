import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBindLineGroupToClassroom = vi.fn();
const mockCreateLineGroupDebt = vi.fn();
const mockGetClassroomReminderSummaryForLineGroup = vi.fn();
const mockGetLineClassroomBindingSecret = vi.fn();
const mockListOpenDebtsForLineGroup = vi.fn();
const mockMarkLineGroupDebtPaid = vi.fn();
const mockUpsertLineBotGroup = vi.fn();

vi.mock("@/lib/line-bot/client", () => ({
    replyLineText: vi.fn(),
}));

vi.mock("@/lib/line-bot/config", () => ({
    getLineClassroomBindingSecret: mockGetLineClassroomBindingSecret,
}));

vi.mock("@/lib/line-bot/repository", () => ({
    bindLineGroupToClassroom: mockBindLineGroupToClassroom,
    createLineGroupDebt: mockCreateLineGroupDebt,
    getClassroomReminderSummaryForLineGroup: mockGetClassroomReminderSummaryForLineGroup,
    listOpenDebtsForLineGroup: mockListOpenDebtsForLineGroup,
    markLineGroupDebtPaid: mockMarkLineGroupDebtPaid,
    upsertLineBotGroup: mockUpsertLineBotGroup,
}));

describe("line-bot handlers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetLineClassroomBindingSecret.mockReturnValue("test-secret");
        mockGetClassroomReminderSummaryForLineGroup.mockResolvedValue(null);
        mockListOpenDebtsForLineGroup.mockResolvedValue([]);
    });

    it("replies with classroom help", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "gring help",
        });

        expect(result).toMatchObject({ handled: true });
        expect(result.replyText).toContain("LINE");
    });

    it("requires classroom binding before summary and remind commands", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");

        const summary = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "gring summary",
        });
        const remind = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "gring remind",
        });

        expect(summary.replyText).toContain("<classroomId> <secret>");
        expect(remind.replyText).toContain("<classroomId> <secret>");
        expect(mockListOpenDebtsForLineGroup).not.toHaveBeenCalled();
    });

    it("rejects bind classroom command when secret is wrong", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "bind classroom 507f1f77bcf86cd799439011 wrong-secret",
        });

        expect(result.replyText).toContain("secret");
        expect(mockBindLineGroupToClassroom).not.toHaveBeenCalled();
    });

    it("binds a LINE group to a classroom when secret is correct", async () => {
        mockBindLineGroupToClassroom.mockResolvedValue({ ok: true, classroomName: "M1/1" });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "bind classroom 507f1f77bcf86cd799439011 test-secret",
        });

        expect(mockBindLineGroupToClassroom).toHaveBeenCalledWith({
            lineGroupId: "line-group-1",
            classroomId: "507f1f77bcf86cd799439011",
        });
        expect(result.replyText).toContain("M1/1");
    });

    it("returns real classroom summary and reminder after binding", async () => {
        mockGetClassroomReminderSummaryForLineGroup.mockResolvedValue({
            classroomName: "M1/1",
            studentCount: 30,
            assignments: [
                {
                    assignmentId: "assignment-1",
                    name: "Quiz 1",
                    type: "QUIZ",
                    deadline: new Date("2026-06-01T12:00:00.000Z"),
                    missingSubmissions: 5,
                    overdue: true,
                    dueSoon: false,
                },
            ],
            totals: {
                visibleAssignments: 1,
                overdueAssignments: 1,
                dueSoonAssignments: 0,
                missingSubmissionSlots: 5,
            },
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const summary = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "gring summary",
        });
        const remind = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "gring remind",
        });

        expect(summary.replyText).toContain("Quiz 1");
        expect(summary.replyText).toContain("5");
        expect(remind.replyText).toContain("Quiz 1");
        expect(remind.replyText).toContain("GameEdu");
    });
});

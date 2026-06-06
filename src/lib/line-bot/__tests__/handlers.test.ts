import { beforeEach, describe, expect, it, vi } from "vitest";

const mockBindLineGroupToClassroom = vi.fn();
const mockBindLineStudentToStudentCode = vi.fn();
const mockCreateAssignmentForLineGroup = vi.fn();
const mockCreateLineGroupDebt = vi.fn();
const mockGetClassroomReminderSummaryForLineGroup = vi.fn();
const mockGetLineMyProgressSummariesForLinkedAccount = vi.fn();
const mockGetLineMyWorkSummariesForLinkedAccount = vi.fn();
const mockGetLineMyWorkSummary = vi.fn();
const mockGetLineClassroomBindingSecret = vi.fn();
const mockListOpenDebtsForLineGroup = vi.fn();
const mockMarkLineGroupDebtPaid = vi.fn();
const mockPushLineText = vi.fn();
const mockReplyLineText = vi.fn();
const mockSubmitTextAssignmentForLineGroup = vi.fn();
const mockSubmitTextAssignmentForLinkedLineAccount = vi.fn();
const mockUpsertLineBotGroup = vi.fn();
const mockConsumeStudentLineLinkCode = vi.fn();

vi.mock("@/lib/line-bot/client", () => ({
    pushLineText: mockPushLineText,
    replyLineText: mockReplyLineText,
}));

vi.mock("@/lib/line-bot/config", () => ({
    getLineClassroomBindingSecret: mockGetLineClassroomBindingSecret,
}));

vi.mock("@/lib/line-bot/student-linking", () => ({
    consumeStudentLineLinkCode: mockConsumeStudentLineLinkCode,
}));

vi.mock("@/lib/line-bot/repository", () => ({
    bindLineGroupToClassroom: mockBindLineGroupToClassroom,
    bindLineStudentToStudentCode: mockBindLineStudentToStudentCode,
    createAssignmentForLineGroup: mockCreateAssignmentForLineGroup,
    createLineGroupDebt: mockCreateLineGroupDebt,
    getClassroomReminderSummaryForLineGroup: mockGetClassroomReminderSummaryForLineGroup,
    getLineMyProgressSummariesForLinkedAccount: mockGetLineMyProgressSummariesForLinkedAccount,
    getLineMyWorkSummariesForLinkedAccount: mockGetLineMyWorkSummariesForLinkedAccount,
    getLineMyWorkSummary: mockGetLineMyWorkSummary,
    listOpenDebtsForLineGroup: mockListOpenDebtsForLineGroup,
    markLineGroupDebtPaid: mockMarkLineGroupDebtPaid,
    submitTextAssignmentForLineGroup: mockSubmitTextAssignmentForLineGroup,
    submitTextAssignmentForLinkedLineAccount: mockSubmitTextAssignmentForLinkedLineAccount,
    upsertLineBotGroup: mockUpsertLineBotGroup,
}));

describe("line-bot handlers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetLineClassroomBindingSecret.mockReturnValue("test-secret");
        mockCreateAssignmentForLineGroup.mockResolvedValue({ ok: false, reason: "UNBOUND" });
        mockBindLineStudentToStudentCode.mockResolvedValue({ ok: false, reason: "UNBOUND" });
        mockGetLineMyWorkSummary.mockResolvedValue({ ok: false, reason: "NOT_BOUND" });
        mockSubmitTextAssignmentForLineGroup.mockResolvedValue({ ok: false, reason: "UNBOUND" });
        mockSubmitTextAssignmentForLinkedLineAccount.mockResolvedValue({ ok: false, reason: "UNBOUND" });
        mockConsumeStudentLineLinkCode.mockResolvedValue({ ok: false, reason: "NOT_FOUND" });
        mockGetClassroomReminderSummaryForLineGroup.mockResolvedValue(null);
        mockGetLineMyProgressSummariesForLinkedAccount.mockResolvedValue({ ok: false, reason: "NOT_BOUND" });
        mockGetLineMyWorkSummariesForLinkedAccount.mockResolvedValue({ ok: false, reason: "NOT_BOUND" });
        mockListOpenDebtsForLineGroup.mockResolvedValue([]);
        mockPushLineText.mockResolvedValue(undefined);
        mockReplyLineText.mockResolvedValue(undefined);
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

    it("links a student account from a private LINE chat", async () => {
        mockConsumeStudentLineLinkCode.mockResolvedValue({
            ok: true,
            link: {
                classroomName: "M1/1",
                studentName: "Somchai",
                linkedAt: "2026-06-03T12:00:00.000Z",
            },
        });

        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "เชื่อม 483921",
        });

        expect(mockConsumeStudentLineLinkCode).toHaveBeenCalledWith({
            lineUserId: "line-user-1",
            code: "483921",
        });
        expect(result.replyText).toContain("Somchai");
        expect(result.replyText).toContain("M1/1");
    });

    it("replies to direct help in a private LINE chat", async () => {
        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "help",
        });

        expect(result.handled).toBe(true);
        expect(result.replyText).toContain("เชื่อม");
    });

    it("returns personal work from a linked private LINE account", async () => {
        mockGetLineMyWorkSummariesForLinkedAccount.mockResolvedValue({
            ok: true,
            summaries: [
                {
                    classroomName: "M1/1",
                    studentName: "Somchai",
                    items: [{ assignmentName: "Homework 1", deadline: null }],
                },
            ],
        });

        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "my assignments",
        });

        expect(mockGetLineMyWorkSummariesForLinkedAccount).toHaveBeenCalledWith({
            lineUserId: "line-user-1",
        });
        expect(result.handled).toBe(true);
        expect(result.replyText).toContain("Homework 1");
        expect(result.replyText).toContain("M1/1");
    });

    it("asks a private LINE user to link first before personal work", async () => {
        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "my assignments",
        });

        expect(result.handled).toBe(true);
        expect(result.replyText).toContain("LINE");
    });

    it("returns personal scores from a linked private LINE account", async () => {
        mockGetLineMyProgressSummariesForLinkedAccount.mockResolvedValue({
            ok: true,
            summaries: [
                {
                    classroomName: "M1/1",
                    studentName: "Somchai",
                    submitted: [
                        {
                            assignmentName: "Homework 1",
                            score: 8,
                            maxScore: 10,
                            submittedAt: new Date("2026-06-03T04:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "my scores",
        });

        expect(mockGetLineMyProgressSummariesForLinkedAccount).toHaveBeenCalledWith({
            lineUserId: "line-user-1",
        });
        expect(result.replyText).toContain("Homework 1");
        expect(result.replyText).toContain("8/10");
    });

    it("returns submitted work from a linked private LINE account", async () => {
        mockGetLineMyProgressSummariesForLinkedAccount.mockResolvedValue({
            ok: true,
            summaries: [
                {
                    classroomName: "M1/1",
                    studentName: "Somchai",
                    submitted: [
                        {
                            assignmentName: "Homework 1",
                            score: 8,
                            maxScore: 10,
                            submittedAt: new Date("2026-06-03T04:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "submitted work",
        });

        expect(result.replyText).toContain("Homework 1");
        expect(result.replyText).toContain("M1/1");
    });

    it("submits text work from a linked private LINE account without student code", async () => {
        mockSubmitTextAssignmentForLinkedLineAccount.mockResolvedValue({
            ok: true,
            submission: {
                assignmentName: "Homework 1",
                classroomName: "M1/1",
                replacedPreviousSubmission: false,
            },
        });

        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "submit A1: My answer",
        });

        expect(mockSubmitTextAssignmentForLinkedLineAccount).toHaveBeenCalledWith({
            lineUserId: "line-user-1",
            assignmentRef: "A1",
            content: "My answer",
        });
        expect(result.replyText).toContain("Homework 1");
        expect(result.replyText).toContain("M1/1");
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

        expect(summary.replyText).toContain("<token>");
        expect(remind.replyText).toContain("<token>");
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

    it("returns group-safe student self-service work after binding", async () => {
        mockGetClassroomReminderSummaryForLineGroup.mockResolvedValue({
            classroomName: "M1/1",
            studentCount: 30,
            assignments: [
                {
                    assignmentId: "assignment-1",
                    name: "Homework 1",
                    type: "score",
                    deadline: null,
                    missingSubmissions: 4,
                    overdue: false,
                    dueSoon: false,
                },
            ],
            totals: {
                visibleAssignments: 1,
                overdueAssignments: 0,
                dueSoonAssignments: 0,
                missingSubmissionSlots: 4,
            },
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "missing work",
        });

        expect(result.replyText).toContain("Homework 1");
        expect(result.replyText).toContain("ไม่แสดงรายชื่อรายคน");
    });

    it("requires classroom binding before student self-service work commands", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "missing work",
        });

        expect(result.replyText).toContain("<token>");
    });

    it("creates a classroom assignment through LINE when group is bound", async () => {
        mockCreateAssignmentForLineGroup.mockResolvedValue({
            ok: true,
            assignment: {
                id: "assignment-1",
                name: "Homework 1",
                classroomName: "M1/1",
                deadline: null,
            },
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "create assignment Homework 1 no due",
        });

        expect(mockCreateAssignmentForLineGroup).toHaveBeenCalledWith({
            lineGroupId: "line-group-1",
            name: "Homework 1",
            deadlineText: null,
        });
        expect(result.replyText).toContain("Homework 1");
        expect(result.replyText).toContain("M1/1");
    });

    it("requires classroom binding before creating assignments", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "create assignment Homework 1 due tomorrow",
        });

        expect(result.replyText).toContain("<token>");
    });

    it("returns a helpful message when assignment deadline cannot be parsed", async () => {
        mockCreateAssignmentForLineGroup.mockResolvedValue({ ok: false, reason: "INVALID_DEADLINE" });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "create assignment Homework 1 due sometime soon",
        });

        expect(result.replyText).toContain("สร้างงาน");
    });

    it("submits text work through LINE when group is bound", async () => {
        mockSubmitTextAssignmentForLineGroup.mockResolvedValue({
            ok: true,
            submission: {
                assignmentName: "Homework 1",
                classroomName: "M1/1",
                replacedPreviousSubmission: false,
            },
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "submit work S123 Homework 1: My answer",
        });

        expect(mockSubmitTextAssignmentForLineGroup).toHaveBeenCalledWith({
            lineGroupId: "line-group-1",
            studentCode: "S123",
            assignmentRef: "Homework 1",
            content: "My answer",
        });
        expect(result.replyText).toContain("Homework 1");
        expect(result.replyText).toContain("M1/1");
    });

    it("requires classroom binding before text submission", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "submit work S123 Homework 1: My answer",
        });

        expect(result.replyText).toContain("<token>");
    });

    it("returns a private binding confirmation for a LINE user student code", async () => {
        mockBindLineStudentToStudentCode.mockResolvedValue({
            ok: true,
            binding: {
                classroomName: "M1/1",
                studentName: "Somchai",
            },
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-user-1",
            text: "bind student S123",
        });

        expect(mockBindLineStudentToStudentCode).toHaveBeenCalledWith({
            lineGroupId: "line-group-1",
            lineUserId: "line-user-1",
            studentCode: "S123",
        });
        expect(result.replyText).not.toContain("Somchai");
        expect(result.privateReply).toEqual({
            toLineUserId: "line-user-1",
            text: expect.stringContaining("Somchai"),
        });
    });

    it("returns personal work as a private reply for a bound LINE student", async () => {
        mockGetLineMyWorkSummary.mockResolvedValue({
            ok: true,
            summary: {
                classroomName: "M1/1",
                studentName: "Somchai",
                items: [{ assignmentName: "Homework 1", deadline: null }],
            },
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-user-1",
            text: "my assignments",
        });

        expect(mockGetLineMyWorkSummary).toHaveBeenCalledWith({
            lineGroupId: "line-group-1",
            lineUserId: "line-user-1",
        });
        expect(result.replyText).not.toContain("Homework 1");
        expect(result.privateReply).toEqual({
            toLineUserId: "line-user-1",
            text: expect.stringContaining("Homework 1"),
        });
    });

    it("returns personal scores as a private reply without leaking to the group", async () => {
        mockGetLineMyProgressSummariesForLinkedAccount.mockResolvedValue({
            ok: true,
            summaries: [
                {
                    classroomName: "M1/1",
                    studentName: "Somchai",
                    submitted: [
                        {
                            assignmentName: "Homework 1",
                            score: 8,
                            maxScore: 10,
                            submittedAt: new Date("2026-06-03T04:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-user-1",
            text: "my scores",
        });

        expect(result.replyText).not.toContain("Homework 1");
        expect(result.privateReply).toEqual({
            toLineUserId: "line-user-1",
            text: expect.stringContaining("8/10"),
        });
    });

    it("returns submitted work as a private reply without leaking to the group", async () => {
        mockGetLineMyProgressSummariesForLinkedAccount.mockResolvedValue({
            ok: true,
            summaries: [
                {
                    classroomName: "M1/1",
                    studentName: "Somchai",
                    submitted: [
                        {
                            assignmentName: "Homework 1",
                            score: 8,
                            maxScore: 10,
                            submittedAt: new Date("2026-06-03T04:00:00.000Z"),
                        },
                    ],
                },
            ],
        });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-user-1",
            text: "submitted work",
        });

        expect(result.replyText).not.toContain("Homework 1");
        expect(result.privateReply).toEqual({
            toLineUserId: "line-user-1",
            text: expect.stringContaining("Homework 1"),
        });
    });

    it("pushes private personal work and replies only with a group acknowledgement", async () => {
        mockGetLineMyWorkSummary.mockResolvedValue({
            ok: true,
            summary: {
                classroomName: "M1/1",
                studentName: "Somchai",
                items: [{ assignmentName: "Homework 1", deadline: null }],
            },
        });

        const { handleLineWebhookEvents } = await import("@/lib/line-bot/handlers");
        await handleLineWebhookEvents([
            {
                type: "message",
                replyToken: "reply-token-1",
                source: {
                    type: "group",
                    groupId: "line-group-1",
                    userId: "line-user-1",
                },
                message: {
                    type: "text",
                    id: "message-1",
                    quoteToken: "quote-token-1",
                    text: "my assignments",
                },
                mode: "active",
                timestamp: 1,
                webhookEventId: "event-1",
                deliveryContext: { isRedelivery: false },
            },
        ]);

        expect(mockPushLineText).toHaveBeenCalledWith("line-user-1", expect.stringContaining("Homework 1"));
        expect(mockReplyLineText).toHaveBeenCalledWith("reply-token-1", expect.not.stringContaining("Homework 1"));
    });

    it("does not leak personal work to the group when private push fails", async () => {
        mockPushLineText.mockRejectedValue(new Error("LINE push failed"));
        mockGetLineMyWorkSummary.mockResolvedValue({
            ok: true,
            summary: {
                classroomName: "M1/1",
                studentName: "Somchai",
                items: [{ assignmentName: "Homework 1", deadline: null }],
            },
        });

        const { handleLineWebhookEvents } = await import("@/lib/line-bot/handlers");
        await handleLineWebhookEvents([
            {
                type: "message",
                replyToken: "reply-token-1",
                source: {
                    type: "group",
                    groupId: "line-group-1",
                    userId: "line-user-1",
                },
                message: {
                    type: "text",
                    id: "message-1",
                    quoteToken: "quote-token-1",
                    text: "my assignments",
                },
                mode: "active",
                timestamp: 1,
                webhookEventId: "event-1",
                deliveryContext: { isRedelivery: false },
            },
        ]);

        expect(mockReplyLineText).toHaveBeenCalledWith("reply-token-1", expect.not.stringContaining("Homework 1"));
        expect(mockReplyLineText).toHaveBeenCalledWith("reply-token-1", expect.stringContaining("เพิ่มบอทเป็นเพื่อน"));
    });
});

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
const mockIsLineGroupMutationsEnabled = vi.fn();
const mockListOpenDebtsForLineGroup = vi.fn();
const mockMarkLineGroupDebtPaid = vi.fn();
const mockPushLineText = vi.fn();
const mockReplyLineText = vi.fn();
const mockReplyLineTextWithQuickActions = vi.fn();
const mockSubmitTextAssignmentForLinkedLineAccount = vi.fn();
const mockUpsertLineBotGroup = vi.fn();
const mockConsumeStudentLineLinkCode = vi.fn();
const mockConsumeTeacherLineLinkCode = vi.fn();
const mockIsLineTeacherAuthorizedForGroup = vi.fn();
const mockBeginLineLinkAttempt = vi.fn();
const mockRecordFailedLineLinkAttempt = vi.fn();

vi.mock("@/lib/line-bot/client", () => ({
    pushLineText: mockPushLineText,
    replyLineText: mockReplyLineText,
    replyLineTextWithQuickActions: mockReplyLineTextWithQuickActions,
}));

vi.mock("@/lib/line-bot/config", () => ({
    getLineClassroomBindingSecret: mockGetLineClassroomBindingSecret,
    isLineGroupMutationsEnabled: mockIsLineGroupMutationsEnabled,
    isLineDirectSubmissionsEnabled: () => true,
}));

vi.mock("@/lib/line-bot/student-linking", () => ({
    consumeStudentLineLinkCode: mockConsumeStudentLineLinkCode,
}));

vi.mock("@/lib/line-bot/teacher-linking", () => ({
    consumeTeacherLineLinkCode: mockConsumeTeacherLineLinkCode,
    isLineTeacherAuthorizedForGroup: mockIsLineTeacherAuthorizedForGroup,
}));

vi.mock("@/lib/line-bot/line-authorization", () => ({
    resolveLineActor: (lineUserId: string) =>
        Promise.resolve({ kind: "teacher", lineUserId, userId: "teacher-1" }),
    authorizeLineCapability: ({
        actor,
        lineGroupId,
    }: {
        actor: { lineUserId: string };
        lineGroupId: string;
    }) =>
        mockIsLineTeacherAuthorizedForGroup({
            lineUserId: actor.lineUserId,
            lineGroupId,
        }),
}));

vi.mock("@/lib/line-bot/link-abuse-protection", () => ({
    beginLineLinkAttempt: mockBeginLineLinkAttempt,
    recordFailedLineLinkAttempt: mockRecordFailedLineLinkAttempt,
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
    submitTextAssignmentForLinkedLineAccount: mockSubmitTextAssignmentForLinkedLineAccount,
    upsertLineBotGroup: mockUpsertLineBotGroup,
}));

describe("line-bot handlers", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetLineClassroomBindingSecret.mockReturnValue("test-secret");
        mockIsLineGroupMutationsEnabled.mockReturnValue(false);
        mockCreateAssignmentForLineGroup.mockResolvedValue({ ok: false, reason: "UNBOUND" });
        mockBindLineStudentToStudentCode.mockResolvedValue({ ok: false, reason: "UNBOUND" });
        mockGetLineMyWorkSummary.mockResolvedValue({ ok: false, reason: "NOT_BOUND" });
        mockSubmitTextAssignmentForLinkedLineAccount.mockResolvedValue({ ok: false, reason: "UNBOUND" });
        mockConsumeStudentLineLinkCode.mockResolvedValue({ ok: false, reason: "NOT_FOUND" });
        mockConsumeTeacherLineLinkCode.mockResolvedValue({ ok: false, reason: "NOT_FOUND" });
        mockIsLineTeacherAuthorizedForGroup.mockResolvedValue(false);
        mockBeginLineLinkAttempt.mockResolvedValue({ allowed: true });
        mockRecordFailedLineLinkAttempt.mockResolvedValue(undefined);
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

    it("blocks the legacy shared-secret classroom binding command", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            text: "bind classroom 507f1f77bcf86cd799439011 wrong-secret",
        });

        expect(result.handled).toBe(false);
        expect(mockBindLineGroupToClassroom).not.toHaveBeenCalled();
    });

    it("links a teacher account from a private LINE chat", async () => {
        mockConsumeTeacherLineLinkCode.mockResolvedValue({
            ok: true,
            teacherName: "Teacher A",
            classroomName: "M1/1",
        });

        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-teacher-1",
            text: "verify teacher abcdefghijklmnopqrstuvwxyz",
        });

        expect(mockConsumeTeacherLineLinkCode).toHaveBeenCalledWith({
            lineUserId: "line-teacher-1",
            code: "abcdefghijklmnopqrstuvwxyz",
        });
        expect(result.replyText).toContain("Teacher A");
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

    it("blocks unsafe group mutations by default during Phase 0 containment", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");

        const [assignment, studentBinding, debt] = await Promise.all([
            processGroupTextCommand({
                lineGroupId: "line-group-1",
                text: "create assignment Homework 1 no due",
            }),
            processGroupTextCommand({
                lineGroupId: "line-group-1",
                createdByLineUserId: "line-user-1",
                text: "bind student S123",
            }),
            processGroupTextCommand({
                lineGroupId: "line-group-1",
                text: "add Somchai 100",
            }),
        ]);

        for (const result of [assignment, studentBinding]) {
            expect(result.handled).toBe(true);
            expect(result.replyText).toContain("ปิดชั่วคราว");
        }
        expect(debt.handled).toBe(false);
        expect(mockCreateAssignmentForLineGroup).not.toHaveBeenCalled();
        expect(mockBindLineStudentToStudentCode).not.toHaveBeenCalled();
        expect(mockCreateLineGroupDebt).not.toHaveBeenCalled();
    });

    it("rejects group mutations from a LINE user without verified teacher access", async () => {
        mockIsLineGroupMutationsEnabled.mockReturnValue(true);
        mockIsLineTeacherAuthorizedForGroup.mockResolvedValue(false);
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-student-1",
            text: "create assignment Homework 1 no due",
        });

        expect(result.handled).toBe(true);
        expect(result.replyText).toContain("เฉพาะครู");
        expect(mockCreateAssignmentForLineGroup).not.toHaveBeenCalled();
        expect(mockIsLineTeacherAuthorizedForGroup).toHaveBeenCalledWith({
            lineUserId: "line-student-1",
            lineGroupId: "line-group-1",
        });
    });

    it("does not consume a link code after abuse protection blocks the attempt", async () => {
        mockBeginLineLinkAttempt.mockResolvedValue({ allowed: false, reason: "LOCKED" });
        const { processDirectTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processDirectTextCommand({
            lineUserId: "line-user-1",
            text: "link 483921",
        });

        expect(result.handled).toBe(true);
        expect(mockConsumeStudentLineLinkCode).not.toHaveBeenCalled();
    });

    it("creates a classroom assignment through LINE when group is bound", async () => {
        mockIsLineGroupMutationsEnabled.mockReturnValue(true);
        mockIsLineTeacherAuthorizedForGroup.mockResolvedValue(true);
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
            createdByLineUserId: "line-teacher-1",
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
        mockIsLineGroupMutationsEnabled.mockReturnValue(true);
        mockIsLineTeacherAuthorizedForGroup.mockResolvedValue(true);
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-teacher-1",
            text: "create assignment Homework 1 due tomorrow",
        });

        expect(result.replyText).toContain("<token>");
    });

    it("returns a helpful message when assignment deadline cannot be parsed", async () => {
        mockIsLineGroupMutationsEnabled.mockReturnValue(true);
        mockIsLineTeacherAuthorizedForGroup.mockResolvedValue(true);
        mockCreateAssignmentForLineGroup.mockResolvedValue({ ok: false, reason: "INVALID_DEADLINE" });

        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-teacher-1",
            text: "create assignment Homework 1 due sometime soon",
        });

        expect(result.replyText).toContain("สร้างงาน");
    });

    it("never accepts legacy student-code submissions in a group", async () => {
        const { processGroupTextCommand } = await import("@/lib/line-bot/handlers");
        const result = await processGroupTextCommand({
            lineGroupId: "line-group-1",
            createdByLineUserId: "line-teacher-1",
            text: "submit work S123 Homework 1: My answer",
        });

        expect(result).toEqual({ handled: false });
        expect(mockSubmitTextAssignmentForLinkedLineAccount).not.toHaveBeenCalled();
    });

    it("returns a private binding confirmation for a LINE user student code", async () => {
        mockIsLineGroupMutationsEnabled.mockReturnValue(true);
        mockIsLineTeacherAuthorizedForGroup.mockResolvedValue(true);
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

    it("handles direct-chat postback actions without parsing arbitrary postback data", async () => {
        mockGetLineMyWorkSummariesForLinkedAccount.mockResolvedValue({
            ok: true,
            summaries: [
                {
                    classroomName: "M1/1",
                    studentName: "Somchai",
                    studentUrl: "https://example.com/student",
                    items: [{ assignmentCode: "A1", assignmentName: "Homework 1", deadline: null }],
                },
            ],
        });
        const { handleLineWebhookEvent } = await import("@/lib/line-bot/handlers");
        await handleLineWebhookEvent({
            type: "postback",
            replyToken: "reply-token-1",
            source: { type: "user", userId: "line-user-1" },
            postback: { data: "cmd=my_work" },
            mode: "active",
            timestamp: 1,
            webhookEventId: "event-postback-1",
            deliveryContext: { isRedelivery: false },
        });
        expect(mockGetLineMyWorkSummariesForLinkedAccount).toHaveBeenCalledWith({
            lineUserId: "line-user-1",
        });
        expect(mockReplyLineText).toHaveBeenCalledWith(
            "reply-token-1",
            expect.stringContaining("[A1]")
        );
    });

    it("does not rerun a completed command when LINE reply delivery fails", async () => {
        mockReplyLineText.mockRejectedValueOnce(new Error("network timeout"));
        const { handleLineWebhookEvent } = await import("@/lib/line-bot/handlers");
        await expect(
            handleLineWebhookEvent({
                type: "message",
                replyToken: "reply-token-1",
                source: { type: "user", userId: "line-user-1" },
                message: {
                    type: "text",
                    id: "message-1",
                    quoteToken: "quote-token-1",
                    text: "ping",
                },
                mode: "active",
                timestamp: 1,
                webhookEventId: "event-1",
                deliveryContext: { isRedelivery: false },
            })
        ).resolves.toBeUndefined();
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

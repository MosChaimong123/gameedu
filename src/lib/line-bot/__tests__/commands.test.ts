import { describe, expect, it } from "vitest";
import {
    formatClassroomBindingFailedMessage,
    formatClassroomBindingRequiredMessage,
    formatClassroomBindingSuccessMessage,
    formatClassroomReminderHelpMessage,
    formatClassroomWorkReminder,
    formatClassroomWorkSummary,
    formatLineAssignmentCreatedMessage,
    formatLineAssignmentCreateFailedMessage,
    formatLineMyWorkMessage,
    formatLineStudentBindingRequiredMessage,
    formatLineStudentBindingSuccessMessage,
    formatLineTextSubmissionFailedMessage,
    formatLineTextSubmissionSuccessMessage,
    formatOpenDebtSummary,
    formatRemindMessage,
    formatStudentSelfServiceWork,
    parseLineDebtCommand,
    type ClassroomReminderSummary,
} from "@/lib/line-bot/commands";

describe("line-bot commands", () => {
    it("parses classroom reminder and assignment commands", () => {
        expect(parseLineDebtCommand("gring help")).toEqual({ type: "classroom_help" });
        expect(parseLineDebtCommand("gring summary")).toEqual({ type: "classroom_summary" });
        expect(parseLineDebtCommand("gring remind")).toEqual({ type: "classroom_remind" });
        expect(parseLineDebtCommand("bind classroom 507f1f77bcf86cd799439011 test-secret")).toEqual({
            type: "bind_classroom",
            classroomId: "507f1f77bcf86cd799439011",
            secret: "test-secret",
        });
        expect(parseLineDebtCommand("create assignment Homework 1 due tomorrow")).toEqual({
            type: "classroom_create_assignment",
            name: "Homework 1",
            deadlineText: "tomorrow",
        });
        expect(parseLineDebtCommand("สร้างงาน แบบฝึกหัด 1 ส่ง พรุ่งนี้")).toEqual({
            type: "classroom_create_assignment",
            name: "แบบฝึกหัด 1",
            deadlineText: "พรุ่งนี้",
        });
        expect(parseLineDebtCommand("สร้างงาน อ่านบทที่ 2 ไม่มีกำหนดส่ง")).toEqual({
            type: "classroom_create_assignment",
            name: "อ่านบทที่ 2",
            deadlineText: null,
        });
        expect(parseLineDebtCommand("งานค้าง")).toEqual({ type: "classroom_student_work", scope: "missing" });
        expect(parseLineDebtCommand("งานวันนี้")).toEqual({ type: "classroom_student_work", scope: "today" });
        expect(parseLineDebtCommand("งานใกล้ส่ง")).toEqual({ type: "classroom_student_work", scope: "soon" });
        expect(parseLineDebtCommand("missing work")).toEqual({ type: "classroom_student_work", scope: "missing" });
        expect(parseLineDebtCommand("bind student S123")).toEqual({
            type: "classroom_bind_student",
            studentCode: "S123",
        });
        expect(parseLineDebtCommand("ผูกนักเรียน S123")).toEqual({
            type: "classroom_bind_student",
            studentCode: "S123",
        });
        expect(parseLineDebtCommand("งานของฉัน")).toEqual({ type: "classroom_my_work" });
        expect(parseLineDebtCommand("my assignments")).toEqual({ type: "classroom_my_work" });
        expect(parseLineDebtCommand("my work")).toEqual({ type: "classroom_my_work" });
        expect(parseLineDebtCommand("submit work S123 Homework 1: My answer")).toEqual({
            type: "classroom_submit_text",
            studentCode: "S123",
            assignmentRef: "Homework 1",
            content: "My answer",
        });
        expect(parseLineDebtCommand("ส่งงาน S123 แบบฝึกหัด 1: คำตอบของฉัน")).toEqual({
            type: "classroom_submit_text",
            studentCode: "S123",
            assignmentRef: "แบบฝึกหัด 1",
            content: "คำตอบของฉัน",
        });
    });

    it("parses legacy add command with optional note", () => {
        expect(parseLineDebtCommand("add Somchai 500 lunch")).toEqual({
            type: "add",
            debtorLabel: "Somchai",
            amountBaht: 500,
            note: "lunch",
        });
    });

    it("parses legacy summary, remind, paid, and ping", () => {
        expect(parseLineDebtCommand("list")).toEqual({ type: "summary" });
        expect(parseLineDebtCommand("remind")).toEqual({ type: "remind" });
        expect(parseLineDebtCommand("จ่ายแล้ว 3")).toEqual({ type: "mark_paid", shortCode: 3 });
        expect(parseLineDebtCommand("ping")).toEqual({ type: "ping" });
    });

    it("returns null for unrelated chat", () => {
        expect(parseLineDebtCommand("hello everyone")).toBeNull();
    });

    it("formats classroom MVP messages", () => {
        expect(formatClassroomReminderHelpMessage()).toContain("LINE");
        expect(formatClassroomReminderHelpMessage()).toContain("สร้างงาน");
        expect(formatClassroomBindingRequiredMessage()).toContain("<classroomId> <secret>");
        expect(formatClassroomBindingSuccessMessage("M1/1")).toContain("M1/1");
        expect(formatClassroomBindingFailedMessage()).toContain("secret");
        expect(formatLineAssignmentCreateFailedMessage()).toContain("สร้างงาน");
        expect(formatLineStudentBindingRequiredMessage()).toContain("ผูกนักเรียน");
        expect(
            formatLineStudentBindingSuccessMessage({
                classroomName: "M1/1",
                studentName: "Somchai",
            })
        ).toContain("Somchai");
        expect(
            formatLineMyWorkMessage({
                classroomName: "M1/1",
                studentName: "Somchai",
                items: [{ assignmentName: "Homework 1", deadline: null }],
            })
        ).toContain("Homework 1");
        expect(formatLineTextSubmissionFailedMessage()).toContain("ส่งงาน");
        expect(
            formatLineAssignmentCreatedMessage({
                id: "assignment-1",
                name: "Homework 1",
                classroomName: "M1/1",
                deadline: null,
            })
        ).toContain("Homework 1");
        expect(
            formatLineTextSubmissionSuccessMessage({
                assignmentName: "Homework 1",
                classroomName: "M1/1",
                replacedPreviousSubmission: false,
                reward: { awarded: true, gold: 10 },
            })
        ).toContain("Homework 1");
        expect(
            formatLineTextSubmissionSuccessMessage({
                assignmentName: "Homework 1",
                classroomName: "M1/1",
                replacedPreviousSubmission: false,
                reward: { awarded: true, gold: 10 },
            })
        ).toContain("+10 Gold");
    });

    it("formats classroom work summary and reminder from real classroom data shape", () => {
        const summary: ClassroomReminderSummary = {
            classroomName: "M1/1",
            studentCount: 30,
            assignments: [
                {
                    assignmentId: "assignment-1",
                    name: "Quiz 1",
                    type: "QUIZ",
                    deadline: new Date("2026-06-01T12:00:00.000Z"),
                    missingSubmissions: 7,
                    overdue: true,
                    dueSoon: false,
                },
                {
                    assignmentId: "assignment-2",
                    name: "Worksheet Today",
                    type: "worksheet",
                    deadline: new Date("2026-06-02T16:59:59.999Z"),
                    missingSubmissions: 3,
                    overdue: false,
                    dueSoon: true,
                },
            ],
            totals: {
                visibleAssignments: 3,
                overdueAssignments: 1,
                dueSoonAssignments: 1,
                missingSubmissionSlots: 10,
            },
        };

        expect(formatClassroomWorkSummary(summary)).toContain("M1/1");
        expect(formatClassroomWorkSummary(summary)).toContain("Quiz 1");
        expect(formatClassroomWorkReminder(summary)).toContain("Quiz 1");
        expect(formatClassroomWorkReminder(summary)).toContain("7");
        expect(formatStudentSelfServiceWork(summary, "missing", new Date("2026-06-02T02:00:00.000Z"))).toContain("Quiz 1");
        expect(formatStudentSelfServiceWork(summary, "today", new Date("2026-06-02T02:00:00.000Z"))).toContain("Worksheet Today");
        expect(formatStudentSelfServiceWork(summary, "today", new Date("2026-06-02T02:00:00.000Z"))).not.toContain("Quiz 1");
    });

    it("formats legacy summary and remind messages", () => {
        const rows = [
            { shortCode: 1, debtorLabel: "Somchai", amountBaht: 500, note: "lunch" },
            { shortCode: 2, debtorLabel: "Min", amountBaht: 200, note: null },
        ];

        expect(formatOpenDebtSummary(rows)).toContain("#1 Somchai - 500");
        expect(formatOpenDebtSummary(rows)).toContain("700");
        expect(formatRemindMessage(rows)).toContain("Somchai 500");
        expect(formatOpenDebtSummary([])).toContain("ไม่มี");
    });
});

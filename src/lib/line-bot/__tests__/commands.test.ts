import { describe, expect, it } from "vitest";
import {
    formatClassroomBindingFailedMessage,
    formatClassroomBindingRequiredMessage,
    formatClassroomBindingSuccessMessage,
    formatClassroomReminderHelpMessage,
    formatClassroomWorkReminder,
    formatClassroomWorkSummary,
    formatOpenDebtSummary,
    formatRemindMessage,
    parseLineDebtCommand,
    type ClassroomReminderSummary,
} from "@/lib/line-bot/commands";

describe("line-bot commands", () => {
    it("parses classroom reminder commands", () => {
        expect(parseLineDebtCommand("gring help")).toEqual({ type: "classroom_help" });
        expect(parseLineDebtCommand("gring summary")).toEqual({ type: "classroom_summary" });
        expect(parseLineDebtCommand("gring remind")).toEqual({ type: "classroom_remind" });
        expect(parseLineDebtCommand("bind classroom 507f1f77bcf86cd799439011 test-secret")).toEqual({
            type: "bind_classroom",
            classroomId: "507f1f77bcf86cd799439011",
            secret: "test-secret",
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

    it("parses legacy summary, remind, and ping", () => {
        expect(parseLineDebtCommand("list")).toEqual({ type: "summary" });
        expect(parseLineDebtCommand("remind")).toEqual({ type: "remind" });
        expect(parseLineDebtCommand("ping")).toEqual({ type: "ping" });
    });

    it("returns null for unrelated chat", () => {
        expect(parseLineDebtCommand("hello everyone")).toBeNull();
    });

    it("formats classroom MVP messages", () => {
        expect(formatClassroomReminderHelpMessage()).toContain("LINE");
        expect(formatClassroomBindingRequiredMessage()).toContain("<classroomId> <secret>");
        expect(formatClassroomBindingSuccessMessage("M1/1")).toContain("M1/1");
        expect(formatClassroomBindingFailedMessage()).toContain("secret");
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
            ],
            totals: {
                visibleAssignments: 2,
                overdueAssignments: 1,
                dueSoonAssignments: 0,
                missingSubmissionSlots: 7,
            },
        };

        expect(formatClassroomWorkSummary(summary)).toContain("M1/1");
        expect(formatClassroomWorkSummary(summary)).toContain("Quiz 1");
        expect(formatClassroomWorkReminder(summary)).toContain("Quiz 1");
        expect(formatClassroomWorkReminder(summary)).toContain("7");
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

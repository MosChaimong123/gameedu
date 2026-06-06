import type { WebhookEvent } from "@line/bot-sdk";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    formatClassroomBindingFailedMessage,
    formatClassroomBindingRequiredMessage,
    formatClassroomBindingSuccessMessage,
    formatClassroomWorkReminder,
    formatClassroomWorkSummary,
    formatClassroomReminderHelpMessage,
    formatLineAssignmentCreatedMessage,
    formatLineAssignmentCreateFailedMessage,
    formatLineDirectHelpMessage,
    formatLineMyWorkMessage,
    formatLineMyWorkListMessage,
    formatLineMyScoresMessage,
    formatLineMySubmissionsMessage,
    formatLineStudentAccountLinkFailedMessage,
    formatLineStudentAccountLinkedMessage,
    formatLinePrivateReplySentMessage,
    formatLinePrivateReplyUnavailableMessage,
    formatLinePlanLimitMessage,
    formatLineStudentBindingFailedMessage,
    formatLineStudentBindingRequiredMessage,
    formatLineStudentBindingSuccessMessage,
    formatLineTextSubmissionFailedMessage,
    formatLineTextSubmissionSuccessMessage,
    formatOpenDebtSummary,
    formatRemindMessage,
    formatStudentSelfServiceWork,
    parseLineDebtCommand,
} from "@/lib/line-bot/commands";
import { pushLineText, replyLineText } from "@/lib/line-bot/client";
import { getLineClassroomBindingSecret } from "@/lib/line-bot/config";
import { decodeLineClassroomBindingToken } from "@/lib/line-bot/classroom-binding-token";
import { consumeStudentLineLinkCode } from "@/lib/line-bot/student-linking";
import {
    bindLineGroupToClassroom,
    bindLineStudentToStudentCode,
    createAssignmentForLineGroup,
    createLineGroupDebt,
    getClassroomReminderSummaryForLineGroup,
    getLineMyProgressSummariesForLinkedAccount,
    getLineMyWorkSummariesForLinkedAccount,
    listOpenDebtsForLineGroup,
    markLineGroupDebtPaid,
    getLineMyWorkSummary,
    submitTextAssignmentForLinkedLineAccount,
    submitTextAssignmentForLineGroup,
    upsertLineBotGroup,
} from "@/lib/line-bot/repository";

export type LineHandlerResult = {
    handled: boolean;
    replyText?: string;
    privateReply?: {
        toLineUserId: string;
        text: string;
    };
};

export async function handleLineWebhookEvents(events: WebhookEvent[]): Promise<void> {
    for (const event of events) {
        await handleLineWebhookEvent(event);
    }
}

async function handleLineWebhookEvent(event: WebhookEvent): Promise<void> {
    if (event.type === "join" && event.source.type === "group" && event.source.groupId) {
        await upsertLineBotGroup(event.source.groupId);
        return;
    }

    if (event.type !== "message" || event.message.type !== "text") {
        return;
    }

    if (event.source.type === "user" && event.source.userId) {
        const result = await processDirectTextCommand({
            lineUserId: event.source.userId,
            text: event.message.text,
        });

        if (!result.handled || !event.replyToken || !result.replyText) {
            return;
        }

        await replyLineText(event.replyToken, result.replyText);
        return;
    }

    if (event.source.type !== "group" || !event.source.groupId) {
        return;
    }

    const result = await processGroupTextCommand({
        lineGroupId: event.source.groupId,
        text: event.message.text,
        createdByLineUserId: event.source.userId,
    });

    if (!result.handled || !event.replyToken) {
        return;
    }

    let replyText = result.replyText;
    if (result.privateReply) {
        try {
            await pushLineText(result.privateReply.toLineUserId, result.privateReply.text);
        } catch {
            replyText = formatLinePrivateReplyUnavailableMessage();
        }
    }

    if (!replyText) {
        return;
    }

    await replyLineText(event.replyToken, replyText);
}

export async function processDirectTextCommand(input: {
    lineUserId: string;
    text: string;
}): Promise<LineHandlerResult> {
    const command = parseLineDebtCommand(input.text);
    if (!command) {
        return { handled: false };
    }

    switch (command.type) {
        case "student_link_account": {
            const result = await consumeStudentLineLinkCode({
                lineUserId: input.lineUserId,
                code: command.code,
            });
            if (!result.ok) {
                logAuditEvent({
                    action: "line.student.account_link",
                    category: "line",
                    status: "rejected",
                    targetType: "LineUser",
                    targetId: input.lineUserId,
                    metadata: { reason: "invalid_code" },
                });
                return {
                    handled: true,
                    replyText: formatLineStudentAccountLinkFailedMessage(),
                };
            }

            logAuditEvent({
                action: "line.student.account_link",
                category: "line",
                status: "success",
                targetType: "LineUser",
                targetId: input.lineUserId,
                metadata: { classroomName: result.link.classroomName },
            });
            return {
                handled: true,
                replyText: formatLineStudentAccountLinkedMessage(result.link),
            };
        }
        case "classroom_my_work":
        case "classroom_student_work": {
            const result = await getLineMyWorkSummariesForLinkedAccount({
                lineUserId: input.lineUserId,
            });
            return {
                handled: true,
                replyText: result.ok
                    ? formatLineMyWorkListMessage(
                        result.summaries,
                        command.type === "classroom_student_work" ? command.scope : "missing"
                    )
                    : formatLineStudentBindingRequiredMessage(),
            };
        }
        case "classroom_my_scores":
        case "classroom_my_submissions": {
            const result = await getLineMyProgressSummariesForLinkedAccount({
                lineUserId: input.lineUserId,
            });
            return {
                handled: true,
                replyText: result.ok
                    ? command.type === "classroom_my_scores"
                        ? formatLineMyScoresMessage(result.summaries)
                        : formatLineMySubmissionsMessage(result.summaries)
                    : formatLineStudentBindingRequiredMessage(),
            };
        }
        case "classroom_submit_text_linked": {
            const result = await submitTextAssignmentForLinkedLineAccount({
                lineUserId: input.lineUserId,
                assignmentRef: command.assignmentRef,
                content: command.content,
            });
            if (!result.ok) {
                logAuditEvent({
                    action: "line.submission.create",
                    category: "line",
                    status: result.reason === "PLAN_LIMIT" ? "rejected" : "error",
                    targetType: "LineUser",
                    targetId: input.lineUserId,
                    metadata: { reason: result.reason, assignmentRef: command.assignmentRef },
                });
                return {
                    handled: true,
                    replyText:
                        result.reason === "PLAN_LIMIT"
                            ? formatLinePlanLimitMessage()
                            : formatLineTextSubmissionFailedMessage(),
                };
            }
            logAuditEvent({
                action: "line.submission.create",
                category: "line",
                status: "success",
                targetType: "LineAssignmentRef",
                targetId: command.assignmentRef,
                metadata: { lineUserId: input.lineUserId, assignmentRef: command.assignmentRef },
            });
            return { handled: true, replyText: formatLineTextSubmissionSuccessMessage(result.submission) };
        }
        case "classroom_help":
        case "help":
            return {
                handled: true,
                replyText: formatLineDirectHelpMessage(),
            };
        case "ping":
            return { handled: true, replyText: "pong - LINE bot พร้อมใช้งาน" };
        default:
            return { handled: false };
    }
}

export async function processGroupTextCommand(input: {
    lineGroupId: string;
    text: string;
    createdByLineUserId?: string;
    createdByLabel?: string;
}): Promise<LineHandlerResult> {
    const command = parseLineDebtCommand(input.text);
    if (!command) {
        return { handled: false };
    }

    switch (command.type) {
        case "classroom_help":
            return { handled: true, replyText: formatClassroomReminderHelpMessage() };
        case "classroom_summary": {
            const summary = await getClassroomReminderSummaryForLineGroup(input.lineGroupId);
            return {
                handled: true,
                replyText: summary ? formatClassroomWorkSummary(summary) : formatClassroomBindingRequiredMessage(),
            };
        }
        case "classroom_remind": {
            const summary = await getClassroomReminderSummaryForLineGroup(input.lineGroupId);
            return {
                handled: true,
                replyText: summary ? formatClassroomWorkReminder(summary) : formatClassroomBindingRequiredMessage(),
            };
        }
        case "classroom_student_work": {
            const summary = await getClassroomReminderSummaryForLineGroup(input.lineGroupId);
            return {
                handled: true,
                replyText: summary
                    ? formatStudentSelfServiceWork(summary, command.scope)
                    : formatClassroomBindingRequiredMessage(),
            };
        }
        case "classroom_bind_student": {
            if (!input.createdByLineUserId) {
                return { handled: true, replyText: formatLineStudentBindingFailedMessage() };
            }
            const result = await bindLineStudentToStudentCode({
                lineGroupId: input.lineGroupId,
                lineUserId: input.createdByLineUserId,
                studentCode: command.studentCode,
            });
            if (!result.ok) {
                logAuditEvent({
                    action: "line.student.bind",
                    category: "line",
                    status: "rejected",
                    targetType: "LineGroup",
                    targetId: input.lineGroupId,
                    metadata: { reason: result.reason, lineUserId: input.createdByLineUserId },
                });
                return {
                    handled: true,
                    replyText:
                        result.reason === "UNBOUND"
                            ? formatClassroomBindingRequiredMessage()
                            : formatLineStudentBindingFailedMessage(),
                };
            }
            logAuditEvent({
                action: "line.student.bind",
                category: "line",
                status: "success",
                targetType: "LineGroup",
                targetId: input.lineGroupId,
                metadata: { lineUserId: input.createdByLineUserId, studentCode: command.studentCode },
            });
            return {
                handled: true,
                replyText: formatLinePrivateReplySentMessage(),
                privateReply: {
                    toLineUserId: input.createdByLineUserId,
                    text: formatLineStudentBindingSuccessMessage(result.binding),
                },
            };
        }
        case "classroom_my_work": {
            if (!input.createdByLineUserId) {
                return { handled: true, replyText: formatLineStudentBindingRequiredMessage() };
            }
            const result = await getLineMyWorkSummary({
                lineGroupId: input.lineGroupId,
                lineUserId: input.createdByLineUserId,
            });
            if (!result.ok) {
                return {
                    handled: true,
                    replyText:
                        result.reason === "UNBOUND"
                            ? formatClassroomBindingRequiredMessage()
                            : formatLineStudentBindingRequiredMessage(),
                };
            }
            return {
                handled: true,
                replyText: formatLinePrivateReplySentMessage(),
                privateReply: {
                    toLineUserId: input.createdByLineUserId,
                    text: formatLineMyWorkMessage(result.summary),
                },
            };
        }
        case "classroom_my_scores":
        case "classroom_my_submissions": {
            if (!input.createdByLineUserId) {
                return { handled: true, replyText: formatLineStudentBindingRequiredMessage() };
            }
            const result = await getLineMyProgressSummariesForLinkedAccount({
                lineUserId: input.createdByLineUserId,
            });
            if (!result.ok) {
                return { handled: true, replyText: formatLineStudentBindingRequiredMessage() };
            }
            return {
                handled: true,
                replyText: formatLinePrivateReplySentMessage(),
                privateReply: {
                    toLineUserId: input.createdByLineUserId,
                    text:
                        command.type === "classroom_my_scores"
                            ? formatLineMyScoresMessage(result.summaries)
                            : formatLineMySubmissionsMessage(result.summaries),
                },
            };
        }
        case "classroom_create_assignment": {
            const result = await createAssignmentForLineGroup({
                lineGroupId: input.lineGroupId,
                name: command.name,
                deadlineText: command.deadlineText,
            });
            if (!result.ok) {
                logAuditEvent({
                    action: "line.assignment.create",
                    category: "line",
                    status: result.reason === "PLAN_LIMIT" ? "rejected" : "error",
                    targetType: "LineGroup",
                    targetId: input.lineGroupId,
                    metadata: { reason: result.reason, name: command.name },
                });
                return {
                    handled: true,
                    replyText:
                        result.reason === "UNBOUND"
                            ? formatClassroomBindingRequiredMessage()
                            : result.reason === "PLAN_LIMIT"
                              ? formatLinePlanLimitMessage()
                            : formatLineAssignmentCreateFailedMessage(),
                };
            }
            logAuditEvent({
                action: "line.assignment.create",
                category: "line",
                status: "success",
                targetType: "Assignment",
                targetId: result.assignment.id,
                metadata: { lineGroupId: input.lineGroupId, name: command.name },
            });
            return { handled: true, replyText: formatLineAssignmentCreatedMessage(result.assignment) };
        }
        case "classroom_submit_text": {
            const result = await submitTextAssignmentForLineGroup({
                lineGroupId: input.lineGroupId,
                studentCode: command.studentCode,
                assignmentRef: command.assignmentRef,
                content: command.content,
            });
            if (!result.ok) {
                logAuditEvent({
                    action: "line.submission.create",
                    category: "line",
                    status: result.reason === "PLAN_LIMIT" ? "rejected" : "error",
                    targetType: "LineGroup",
                    targetId: input.lineGroupId,
                    metadata: { reason: result.reason, studentCode: command.studentCode, assignmentRef: command.assignmentRef },
                });
                return {
                    handled: true,
                    replyText:
                        result.reason === "UNBOUND"
                            ? formatClassroomBindingRequiredMessage()
                            : result.reason === "PLAN_LIMIT"
                              ? formatLinePlanLimitMessage()
                            : formatLineTextSubmissionFailedMessage(),
                };
            }
            logAuditEvent({
                action: "line.submission.create",
                category: "line",
                status: "success",
                targetType: "LineAssignmentRef",
                targetId: command.assignmentRef,
                metadata: { lineGroupId: input.lineGroupId, studentCode: command.studentCode, assignmentRef: command.assignmentRef },
            });
            return { handled: true, replyText: formatLineTextSubmissionSuccessMessage(result.submission) };
        }
        case "bind_classroom": {
            const expectedSecret = getLineClassroomBindingSecret();
            if (!expectedSecret || command.secret !== expectedSecret) {
                logAuditEvent({
                    action: "line.classroom.bind",
                    category: "line",
                    status: "rejected",
                    targetType: "LineGroup",
                    targetId: input.lineGroupId,
                    metadata: { reason: "invalid_secret", classroomId: command.classroomId },
                });
                return { handled: true, replyText: formatClassroomBindingFailedMessage() };
            }

            const result = await bindLineGroupToClassroom({
                lineGroupId: input.lineGroupId,
                classroomId: command.classroomId,
            });
            if (!result.ok) {
                logAuditEvent({
                    action: "line.classroom.bind",
                    category: "line",
                    status: "error",
                    targetType: "LineGroup",
                    targetId: input.lineGroupId,
                    metadata: { reason: "classroom_not_found", classroomId: command.classroomId },
                });
                return { handled: true, replyText: formatClassroomBindingFailedMessage() };
            }

            logAuditEvent({
                action: "line.classroom.bind",
                category: "line",
                status: "success",
                targetType: "LineGroup",
                targetId: input.lineGroupId,
                metadata: { classroomId: command.classroomId, classroomName: result.classroomName },
            });
            return {
                handled: true,
                replyText: formatClassroomBindingSuccessMessage(result.classroomName),
            };
        }
        case "bind_classroom_token": {
            const expectedSecret = getLineClassroomBindingSecret();
            if (!expectedSecret) {
                return { handled: true, replyText: formatClassroomBindingFailedMessage() };
            }

            const decoded = decodeLineClassroomBindingToken(command.token, expectedSecret);
            if (!decoded) {
                logAuditEvent({
                    action: "line.classroom.bind",
                    category: "line",
                    status: "rejected",
                    targetType: "LineGroup",
                    targetId: input.lineGroupId,
                    metadata: { reason: "invalid_token" },
                });
                return { handled: true, replyText: formatClassroomBindingFailedMessage() };
            }

            const result = await bindLineGroupToClassroom({
                lineGroupId: input.lineGroupId,
                classroomId: decoded.classroomId,
            });
            if (!result.ok) {
                logAuditEvent({
                    action: "line.classroom.bind",
                    category: "line",
                    status: "error",
                    targetType: "LineGroup",
                    targetId: input.lineGroupId,
                    metadata: { reason: "classroom_not_found", classroomId: decoded.classroomId },
                });
                return { handled: true, replyText: formatClassroomBindingFailedMessage() };
            }

            logAuditEvent({
                action: "line.classroom.bind",
                category: "line",
                status: "success",
                targetType: "LineGroup",
                targetId: input.lineGroupId,
                metadata: { classroomId: decoded.classroomId, classroomName: result.classroomName },
            });
            return {
                handled: true,
                replyText: formatClassroomBindingSuccessMessage(result.classroomName),
            };
        }
        case "ping":
            return { handled: true, replyText: "pong - LINE bot พร้อมใช้งาน" };
        case "help":
            return { handled: true, replyText: formatClassroomReminderHelpMessage() };
        case "summary": {
            const rows = await listOpenDebtsForLineGroup(input.lineGroupId);
            return { handled: true, replyText: formatOpenDebtSummary(rows) };
        }
        case "remind": {
            const rows = await listOpenDebtsForLineGroup(input.lineGroupId);
            return { handled: true, replyText: formatRemindMessage(rows) };
        }
        case "add": {
            const { debt } = await createLineGroupDebt({
                lineGroupId: input.lineGroupId,
                debtorLabel: command.debtorLabel,
                amountBaht: command.amountBaht,
                note: command.note,
                createdByLineUserId: input.createdByLineUserId,
                createdByLabel: input.createdByLabel,
            });
            const note = debt.note ? ` (${debt.note})` : "";
            return {
                handled: true,
                replyText: `บันทึก #${debt.shortCode}: ${debt.debtorLabel} ${debt.amountBaht} บาท${note}`,
            };
        }
        case "mark_paid": {
            const paid = await markLineGroupDebtPaid(input.lineGroupId, command.shortCode);
            if (!paid) {
                return {
                    handled: true,
                    replyText: `ไม่พบรายการเปิด #${command.shortCode} ในกลุ่มนี้`,
                };
            }
            return {
                handled: true,
                replyText: `ปิดแล้ว #${paid.shortCode}: ${paid.debtorLabel} ${paid.amountBaht} บาท`,
            };
        }
        default:
            return { handled: false };
    }
}

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
    formatLineGroupMutationDisabledMessage,
    formatLineMyWorkMessage,
    formatLineMyWorkListMessage,
    formatLineMyScoresMessage,
    formatLineMySubmissionsMessage,
    formatLineStudentAccountLinkFailedMessage,
    formatLineStudentAccountLinkedMessage,
    formatLineTeacherAccountLinkedMessage,
    formatLineTeacherAccountLinkFailedMessage,
    formatLineTeacherAuthorizationRequiredMessage,
    formatLinePrivateReplySentMessage,
    formatLinePrivateReplyUnavailableMessage,
    formatLinePlanLimitMessage,
    formatLineStudentBindingFailedMessage,
    formatLineStudentBindingRequiredMessage,
    formatLineStudentBindingSuccessMessage,
    formatLineTextSubmissionFailedMessage,
    formatLineTextSubmissionSuccessMessage,
    formatStudentSelfServiceWork,
    parseLineDebtCommand,
} from "@/lib/line-bot/commands";
import { pushLineText, replyLineText, replyLineTextWithQuickActions } from "@/lib/line-bot/client";
import {
    getLineClassroomBindingSecret,
    isLineDirectSubmissionsEnabled,
    isLineGroupMutationsEnabled,
} from "@/lib/line-bot/config";
import { decodeLineClassroomBindingToken } from "@/lib/line-bot/classroom-binding-token";
import { consumeStudentLineLinkCode } from "@/lib/line-bot/student-linking";
import { consumeTeacherLineLinkCode } from "@/lib/line-bot/teacher-linking";
import {
    authorizeLineCapability,
    resolveLineActor,
} from "@/lib/line-bot/line-authorization";
import { beginLineLinkAttempt, recordFailedLineLinkAttempt } from "@/lib/line-bot/link-abuse-protection";
import {
    bindLineGroupToClassroom,
    bindLineStudentToStudentCode,
    createAssignmentForLineGroup,
    deactivateLineBotGroup,
    getClassroomReminderSummaryForLineGroup,
    getLineMyProgressSummariesForLinkedAccount,
    getLineMyWorkSummariesForLinkedAccount,
    getLineMyWorkSummary,
    submitTextAssignmentForLinkedLineAccount,
    upsertLineBotGroup,
} from "@/lib/line-bot/repository";

export type LineHandlerResult = {
    handled: boolean;
    replyText?: string;
    privateReply?: {
        toLineUserId: string;
        text: string;
    };
    quickActions?: Array<
        | { type?: "postback"; label: string; data: string; displayText: string }
        | { type: "uri"; label: string; uri: string }
    >;
};

export async function handleLineWebhookEvents(events: WebhookEvent[]): Promise<void> {
    for (const event of events) {
        await handleLineWebhookEvent(event);
    }
}

export async function handleLineWebhookEvent(event: WebhookEvent): Promise<void> {
    if (event.type === "join" && event.source.type === "group" && event.source.groupId) {
        await upsertLineBotGroup(event.source.groupId);
        return;
    }

    if (event.type === "leave" && event.source.type === "group" && event.source.groupId) {
        await deactivateLineBotGroup(event.source.groupId);
        return;
    }

    if (
        event.type === "postback" &&
        event.source.type === "user" &&
        event.source.userId &&
        event.replyToken
    ) {
        const text = directPostbackToCommand(event.postback.data);
        if (!text) return;
        const result = await processDirectTextCommand({
            lineUserId: event.source.userId,
            text,
        });
        if (result.replyText) {
            await replyWithoutRetryingCommandEffects(event.replyToken, result.replyText);
        }
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

        if (result.quickActions?.length) {
            try {
                await replyLineTextWithQuickActions(
                    event.replyToken,
                    result.replyText,
                    result.quickActions
                );
            } catch (error) {
                logLineReplyFailure(error);
            }
        } else {
            await replyWithoutRetryingCommandEffects(event.replyToken, result.replyText);
        }
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

    await replyWithoutRetryingCommandEffects(event.replyToken, replyText);
}

async function replyWithoutRetryingCommandEffects(
    replyToken: string,
    text: string
): Promise<void> {
    try {
        await replyLineText(replyToken, text);
    } catch (error) {
        // The command/database effect has already completed. Treat provider
        // reply failure as delivery telemetry, not as a reason to run it again.
        logLineReplyFailure(error);
    }
}

function logLineReplyFailure(error: unknown): void {
    logAuditEvent({
        action: "line.reply.failed",
        category: "line",
        status: "error",
        targetType: "LineReply",
        metadata: {
            errorCode:
                typeof error === "object" &&
                error !== null &&
                ("status" in error || "statusCode" in error)
                    ? "LINE_PROVIDER_ERROR"
                    : "LINE_REPLY_FAILED",
            reason: error instanceof Error ? error.message : String(error),
        },
    });
}

const DIRECT_QUICK_ACTIONS = [
    { label: "งานของฉัน", data: "cmd=my_work", displayText: "งานของฉัน" },
    { label: "คะแนนของฉัน", data: "cmd=my_scores", displayText: "คะแนนของฉัน" },
    { label: "งานที่ส่งแล้ว", data: "cmd=my_submissions", displayText: "ส่งอะไรแล้ว" },
];

function directPostbackToCommand(data: string): string | null {
    const value = new URLSearchParams(data).get("cmd");
    if (value === "my_work") return "my work";
    if (value === "my_scores") return "my scores";
    if (value === "my_submissions") return "my submissions";
    return null;
}

export async function processDirectTextCommand(input: {
    lineUserId: string;
    text: string;
}): Promise<LineHandlerResult> {
    const command = parseLineDebtCommand(input.text);
    if (!command) {
        return { handled: true, replyText: formatLineDirectHelpMessage() };
    }

    switch (command.type) {
        case "student_link_account": {
            const protection = await beginLineLinkAttempt({ kind: "student", lineUserId: input.lineUserId, code: command.code });
            if (!protection.allowed) {
                logAuditEvent({
                    action: "line.student.account_link",
                    category: "line",
                    status: "rejected",
                    targetType: "LineUser",
                    targetId: input.lineUserId,
                    metadata: { reason: protection.reason },
                });
                return { handled: true, replyText: formatLineStudentAccountLinkFailedMessage() };
            }
            const result = await consumeStudentLineLinkCode({
                lineUserId: input.lineUserId,
                code: command.code,
            });
            if (!result.ok) {
                await recordFailedLineLinkAttempt({ kind: "student", lineUserId: input.lineUserId });
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
        case "teacher_link_account": {
            const protection = await beginLineLinkAttempt({ kind: "teacher", lineUserId: input.lineUserId, code: command.code });
            if (!protection.allowed) {
                logAuditEvent({
                    action: "line.teacher.account_link",
                    category: "line",
                    status: "rejected",
                    targetType: "LineUser",
                    targetId: input.lineUserId,
                    metadata: { reason: protection.reason },
                });
                return { handled: true, replyText: formatLineTeacherAccountLinkFailedMessage() };
            }
            const result = await consumeTeacherLineLinkCode({
                lineUserId: input.lineUserId,
                code: command.code,
            });
            if (!result.ok) {
                if (result.reason !== "MODEL_UNAVAILABLE") await recordFailedLineLinkAttempt({ kind: "teacher", lineUserId: input.lineUserId });
                logAuditEvent({
                    action: "line.teacher.account_link",
                    category: "line",
                    status: "rejected",
                    targetType: "LineUser",
                    targetId: input.lineUserId,
                    metadata: { reason: result.reason },
                });
                return { handled: true, replyText: formatLineTeacherAccountLinkFailedMessage() };
            }
            logAuditEvent({
                action: "line.teacher.account_link",
                category: "line",
                status: "success",
                targetType: "LineUser",
                targetId: input.lineUserId,
                metadata: { classroomName: result.classroomName },
            });
            return {
                handled: true,
                replyText: formatLineTeacherAccountLinkedMessage(result),
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
                quickActions:
                    result.ok && result.summaries[0]?.studentUrl
                        ? [
                              {
                                  type: "uri",
                                  label: "เปิด GameEdu",
                                  uri: result.summaries[0].studentUrl,
                              },
                          ]
                        : undefined,
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
            if (!isLineDirectSubmissionsEnabled()) {
                return {
                    handled: true,
                    replyText: "ระบบส่งงานผ่าน LINE ถูกพักชั่วคราว กรุณาส่งงานผ่านหน้า GameEdu",
                };
            }
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
                    metadata: {
                        lineUserId: input.lineUserId,
                        linkedStudentId: result.submission.studentId,
                        assignmentRef: command.assignmentRef,
                        revision: result.submission.revision,
                        submissionState: result.submission.submissionState,
                    },
            });
            return { handled: true, replyText: formatLineTextSubmissionSuccessMessage(result.submission) };
        }
        case "classroom_help":
        case "help":
            return {
                handled: true,
                replyText: formatLineDirectHelpMessage(),
                quickActions: DIRECT_QUICK_ACTIONS,
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

    const rejectDisabledMutation = (action: string) => {
        logAuditEvent({
            action,
            category: "line",
            status: "rejected",
            targetType: "LineGroup",
            targetId: input.lineGroupId,
            metadata: { reason: "group_mutations_disabled" },
        });
        return { handled: true, replyText: formatLineGroupMutationDisabledMessage() };
    };

    const authorizeGroupMutation = async (action: string): Promise<LineHandlerResult | null> => {
        if (!isLineGroupMutationsEnabled()) return rejectDisabledMutation(action);
        if (!input.createdByLineUserId) {
            return { handled: true, replyText: formatLineTeacherAuthorizationRequiredMessage() };
        }
        const actor = await resolveLineActor(input.createdByLineUserId);
        const authorized = await authorizeLineCapability({
            actor,
            capability: action as
                | "line.assignment.create"
                | "line.student.bind"
                | "line.classroom.bind",
            lineGroupId: input.lineGroupId,
        });
        if (authorized) {
            logAuditEvent({
                action: "line.authorization.allowed",
                category: "line",
                targetType: "LineGroup",
                targetId: input.lineGroupId,
                metadata: { capability: action },
            });
            return null;
        }
        logAuditEvent({
            action: "line.authorization.denied",
            category: "line",
            status: "rejected",
            targetType: "LineGroup",
            targetId: input.lineGroupId,
            metadata: { reason: "teacher_authorization_required", capability: action },
        });
        return { handled: true, replyText: formatLineTeacherAuthorizationRequiredMessage() };
    };

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
            const denial = await authorizeGroupMutation("line.student.bind");
            if (denial) return denial;
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
            const denial = await authorizeGroupMutation("line.assignment.create");
            if (denial) return denial;
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
        default:
            return { handled: false };
    }
}

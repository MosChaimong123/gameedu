import type { WebhookEvent } from "@line/bot-sdk";
import {
    formatClassroomBindingFailedMessage,
    formatClassroomBindingRequiredMessage,
    formatClassroomBindingSuccessMessage,
    formatClassroomWorkReminder,
    formatClassroomWorkSummary,
    formatClassroomReminderHelpMessage,
    formatDebtHelpMessage,
    formatOpenDebtSummary,
    formatRemindMessage,
    parseLineDebtCommand,
} from "@/lib/line-bot/commands";
import { replyLineText } from "@/lib/line-bot/client";
import { getLineClassroomBindingSecret } from "@/lib/line-bot/config";
import {
    bindLineGroupToClassroom,
    createLineGroupDebt,
    getClassroomReminderSummaryForLineGroup,
    listOpenDebtsForLineGroup,
    markLineGroupDebtPaid,
    upsertLineBotGroup,
} from "@/lib/line-bot/repository";

export type LineHandlerResult = {
    handled: boolean;
    replyText?: string;
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

    if (event.source.type !== "group" || !event.source.groupId) {
        return;
    }

    const result = await processGroupTextCommand({
        lineGroupId: event.source.groupId,
        text: event.message.text,
        createdByLineUserId: event.source.userId,
    });

    if (!result.handled || !result.replyText || !event.replyToken) {
        return;
    }

    await replyLineText(event.replyToken, result.replyText);
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
        case "bind_classroom": {
            const expectedSecret = getLineClassroomBindingSecret();
            if (!expectedSecret || command.secret !== expectedSecret) {
                return { handled: true, replyText: formatClassroomBindingFailedMessage() };
            }

            const result = await bindLineGroupToClassroom({
                lineGroupId: input.lineGroupId,
                classroomId: command.classroomId,
            });
            if (!result.ok) {
                return { handled: true, replyText: formatClassroomBindingFailedMessage() };
            }

            return {
                handled: true,
                replyText: formatClassroomBindingSuccessMessage(result.classroomName),
            };
        }
        case "ping":
            return { handled: true, replyText: "pong - LINE bot พร้อมใช้งาน" };
        case "help":
            return { handled: true, replyText: formatDebtHelpMessage() };
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

import type { WebhookEvent } from "@line/bot-sdk";
import {
    formatDebtHelpMessage,
    formatOpenDebtSummary,
    formatRemindMessage,
    parseLineDebtCommand,
} from "@/lib/line-bot/commands";
import { replyLineText } from "@/lib/line-bot/client";
import {
    createLineGroupDebt,
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

    const lineGroupId = event.source.groupId;
    const text = event.message.text;
    const result = await processGroupTextCommand({
        lineGroupId,
        text,
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
        case "ping":
            return { handled: true, replyText: "pong — บอททวงงานพร้อมใช้งาน" };
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
                replyText: `✅ บันทึก #${debt.shortCode}: ${debt.debtorLabel} ${debt.amountBaht} บาท${note}`,
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
                replyText: `✅ ปิดแล้ว #${paid.shortCode}: ${paid.debtorLabel} ${paid.amountBaht} บาท`,
            };
        }
        default:
            return { handled: false };
    }
}

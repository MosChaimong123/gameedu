import type { LineGroupDebt, LineBotGroup } from "@prisma/client";
import { db } from "@/lib/db";
import type { OpenDebtRow } from "@/lib/line-bot/commands";

export const LINE_DEBT_STATUS_OPEN = "OPEN";
export const LINE_DEBT_STATUS_PAID = "PAID";

export async function upsertLineBotGroup(lineGroupId: string, name?: string | null): Promise<LineBotGroup> {
    return db.lineBotGroup.upsert({
        where: { lineGroupId },
        create: { lineGroupId, name: name ?? undefined },
        update: {
            isActive: true,
            ...(name ? { name } : {}),
        },
    });
}

export async function deactivateLineBotGroup(lineGroupId: string): Promise<void> {
    await db.lineBotGroup.updateMany({
        where: { lineGroupId },
        data: { isActive: false },
    });
}

export async function listOpenDebtsForLineGroup(lineGroupId: string): Promise<OpenDebtRow[]> {
    const group = await db.lineBotGroup.findUnique({
        where: { lineGroupId },
        include: {
            debts: {
                where: { status: LINE_DEBT_STATUS_OPEN },
                orderBy: { shortCode: "asc" },
            },
        },
    });

    if (!group) return [];

    return group.debts.map(debtToOpenRow);
}

export async function createLineGroupDebt(input: {
    lineGroupId: string;
    debtorLabel: string;
    amountBaht: number;
    note?: string;
    createdByLineUserId?: string;
    createdByLabel?: string;
}): Promise<{ group: LineBotGroup; debt: LineGroupDebt }> {
    const group = await upsertLineBotGroup(input.lineGroupId);

    const max = await db.lineGroupDebt.aggregate({
        where: { groupId: group.id },
        _max: { shortCode: true },
    });
    const shortCode = (max._max.shortCode ?? 0) + 1;

    const debt = await db.lineGroupDebt.create({
        data: {
            groupId: group.id,
            shortCode,
            debtorLabel: input.debtorLabel,
            amountBaht: input.amountBaht,
            note: input.note,
            status: LINE_DEBT_STATUS_OPEN,
            createdByLineUserId: input.createdByLineUserId,
            createdByLabel: input.createdByLabel,
        },
    });

    return { group, debt };
}

export async function markLineGroupDebtPaid(
    lineGroupId: string,
    shortCode: number
): Promise<LineGroupDebt | null> {
    const group = await db.lineBotGroup.findUnique({ where: { lineGroupId } });
    if (!group) return null;

    const existing = await db.lineGroupDebt.findFirst({
        where: {
            groupId: group.id,
            shortCode,
            status: LINE_DEBT_STATUS_OPEN,
        },
    });
    if (!existing) return null;

    return db.lineGroupDebt.update({
        where: { id: existing.id },
        data: {
            status: LINE_DEBT_STATUS_PAID,
            paidAt: new Date(),
        },
    });
}

function debtToOpenRow(debt: LineGroupDebt): OpenDebtRow {
    return {
        shortCode: debt.shortCode,
        debtorLabel: debt.debtorLabel,
        amountBaht: debt.amountBaht,
        note: debt.note,
    };
}

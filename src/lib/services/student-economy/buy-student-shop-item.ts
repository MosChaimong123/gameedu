import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { ALL_ITEMS } from "@/lib/shop-items";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";

type BuyStudentShopItemDeps = {
    db: PrismaClient;
};

export type BuyStudentShopItemResult =
    | { ok: false; reason: "invalid_payload" }
    | { ok: false; reason: "item_not_found" }
    | { ok: false; reason: "student_not_found" }
    | { ok: false; reason: "already_owned" }
    | { ok: false; reason: "not_enough_gold" }
    | { ok: true; success: true; newGold: number; inventory: unknown };

export async function buyStudentShopItem(
    code: string,
    itemId: unknown,
    deps: BuyStudentShopItemDeps = { db }
): Promise<BuyStudentShopItemResult> {
    if (typeof itemId !== "string" || !itemId.trim()) {
        return { ok: false, reason: "invalid_payload" };
    }

    const item = ALL_ITEMS.find((entry) => entry.id === itemId);
    if (!item) {
        return { ok: false, reason: "item_not_found" };
    }

    return deps.db.$transaction(async (tx) => {
        const student = await tx.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
            },
            select: { id: true, classId: true, gold: true, inventory: true },
        });

        if (!student) {
            return { ok: false, reason: "student_not_found" };
        }

        // Frame is unique. Battle item is a consumable and may be stacked.
        if (item.type === "frame" && (student.inventory as string[]).includes(itemId)) {
            return { ok: false, reason: "already_owned" };
        }

        if (student.gold < item.price) {
            return { ok: false, reason: "not_enough_gold" };
        }

        const updatedCount = await tx.student.updateMany({
            where: {
                id: student.id,
                gold: { gte: item.price },
                ...(item.type === "frame"
                    ? { NOT: { inventory: { has: itemId } } }
                    : {}),
            },
            data: {
                gold: { decrement: item.price },
                inventory: { push: itemId },
            },
        });

        if (updatedCount.count !== 1) {
            const fresh = await tx.student.findUnique({
                where: { id: student.id },
                select: { gold: true, inventory: true },
            });
            if (item.type === "frame" && (fresh?.inventory as string[] | undefined)?.includes(itemId)) {
                return { ok: false, reason: "already_owned" };
            }
            return { ok: false, reason: "not_enough_gold" };
        }

        const updated = await tx.student.findUniqueOrThrow({
            where: { id: student.id },
            select: { gold: true, inventory: true },
        });

        await recordEconomyTransaction(tx, {
            studentId: student.id,
            classId: student.classId,
            type: "spend",
            source: "shop",
            amount: -item.price,
            balanceBefore: student.gold,
            balanceAfter: updated.gold,
            metadata: {
                itemId,
                itemType: item.type,
                price: item.price,
                rarity: item.rarity,
            },
        });

        return {
            ok: true,
            success: true,
            newGold: updated.gold,
            inventory: updated.inventory,
        };
    });
}

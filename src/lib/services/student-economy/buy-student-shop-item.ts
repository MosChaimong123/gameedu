import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import {
    applyInventoryChange,
    createGameStatePatch,
    type GameInventoryChange,
    type GameItemEffect,
    type GameStatePatch,
} from "@/lib/game-core";
import { findNegamonBattleItemDefinition } from "@/lib/game-negamon/core/battle-items";
import { createShopPurchasePlan, getGameShopCatalogItemById } from "@/lib/game-shop";
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
    | {
          ok: true;
          success: true;
          newGold: number;
          inventory: string[];
          inventoryChange: GameInventoryChange;
          itemEffects: GameItemEffect[];
          gameState: GameStatePatch;
      };

export async function buyStudentShopItem(
    code: string,
    itemId: unknown,
    deps: BuyStudentShopItemDeps = { db }
): Promise<BuyStudentShopItemResult> {
    if (typeof itemId !== "string" || !itemId.trim()) {
        return { ok: false, reason: "invalid_payload" };
    }

    const item = getGameShopCatalogItemById(itemId);
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

        const purchasePlan = createShopPurchasePlan({
            studentId: student.id,
            classId: student.classId,
            gold: student.gold,
            inventory: student.inventory as string[],
            item,
        });
        if (!purchasePlan.ok) return { ok: false, reason: purchasePlan.reason };

        const nextInventory = applyInventoryChange(
            Array.isArray(student.inventory) ? (student.inventory as string[]) : [],
            purchasePlan.inventoryChange
        );

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
                inventory: nextInventory,
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
            type: purchasePlan.economyMutation.type,
            source: purchasePlan.economyMutation.source,
            amount: purchasePlan.economyMutation.amount,
            balanceBefore: purchasePlan.economyMutation.balanceBefore,
            balanceAfter: updated.gold,
            sourceRefId: purchasePlan.economyMutation.sourceRefId,
            idempotencyKey: purchasePlan.economyMutation.idempotencyKey,
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
            inventory: updated.inventory as string[],
            inventoryChange: purchasePlan.inventoryChange,
            itemEffects:
                item.type === "battle_item"
                    ? (findNegamonBattleItemDefinition(item.id)?.effects ?? [])
                    : [],
            gameState: createGameStatePatch({
                gold: updated.gold,
                inventory: updated.inventory as string[],
            }),
        };
    });
}

import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import {
    applyInventoryChange,
    countInventoryItem,
    createGameStatePatch,
    type GameInventoryChange,
    type GameItemEffect,
    type GameStatePatch,
} from "@/lib/game-core";
import { findNegamonBattleItemDefinition } from "@/lib/game-negamon/core/battle-items";
import { createShopPurchasePlan, getGameShopCatalogItemById } from "@/lib/game-shop";
import { isSinglePurchaseShopItem } from "@/lib/shop-items";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";
import {
    normalizeInventoryChangeIds,
    normalizeStudentInventoryItemIds,
} from "@/lib/shop-item-migration";

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

        const inventory = normalizeStudentInventoryItemIds(student.inventory);
        const purchasePlan = createShopPurchasePlan({
            studentId: student.id,
            classId: student.classId,
            gold: student.gold,
            inventory,
            item,
        });
        if (!purchasePlan.ok) return { ok: false, reason: purchasePlan.reason };

        const normalizedInventoryChange = normalizeInventoryChangeIds(purchasePlan.inventoryChange);
        const nextInventory = applyInventoryChange(
            inventory,
            normalizedInventoryChange
        );
        const singlePurchase = isSinglePurchaseShopItem(item);

        const updatedCount = await tx.student.updateMany({
            where: {
                id: student.id,
                gold: { gte: item.price },
                ...(singlePurchase ? { NOT: { inventory: { has: itemId } } } : {}),
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
            const freshInventory = normalizeStudentInventoryItemIds(fresh?.inventory);
            if (singlePurchase && countInventoryItem(freshInventory, itemId) > 0) {
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
            balanceAfter: Math.trunc(updated.gold),
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
            inventory: normalizeStudentInventoryItemIds(updated.inventory),
            inventoryChange: normalizedInventoryChange,
            itemEffects:
                item.type === "battle_item"
                    ? (findNegamonBattleItemDefinition(item.id)?.effects ?? [])
                    : [],
            gameState: createGameStatePatch({
                gold: updated.gold,
                inventory: normalizeStudentInventoryItemIds(updated.inventory),
            }),
        };
    });
}

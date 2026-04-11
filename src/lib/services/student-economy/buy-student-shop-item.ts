import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { ALL_ITEMS } from "@/lib/shop-items";

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

    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
        },
        select: { id: true, gold: true, inventory: true },
    });

    if (!student) {
        return { ok: false, reason: "student_not_found" };
    }

    if ((student.inventory as string[]).includes(itemId)) {
        return { ok: false, reason: "already_owned" };
    }

    if (student.gold < item.price) {
        return { ok: false, reason: "not_enough_gold" };
    }

    const updated = await deps.db.student.update({
        where: { id: student.id },
        data: {
            gold: { decrement: item.price },
            inventory: { push: itemId },
        },
        select: { gold: true, inventory: true },
    });

    return {
        ok: true,
        success: true,
        newGold: updated.gold,
        inventory: updated.inventory,
    };
}

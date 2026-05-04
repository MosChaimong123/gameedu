import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { getItemById } from "@/lib/shop-items";

type EquipStudentShopItemDeps = {
    db: PrismaClient;
};

export type EquipStudentShopItemResult =
    | { ok: false; reason: "invalid_payload" }
    | { ok: false; reason: "item_not_equippable" }
    | { ok: false; reason: "student_not_found" }
    | { ok: false; reason: "not_in_inventory" }
    | { ok: true; success: true };

export async function equipStudentShopItem(
    code: string,
    itemId: unknown,
    deps: EquipStudentShopItemDeps = { db }
): Promise<EquipStudentShopItemResult> {
    if (itemId !== null && typeof itemId !== "string") {
        return { ok: false, reason: "invalid_payload" };
    }
    const normalizedItemId = typeof itemId === "string" ? itemId.trim() : null;
    if (typeof itemId === "string" && !normalizedItemId) {
        return { ok: false, reason: "invalid_payload" };
    }
    const item = normalizedItemId ? getItemById(normalizedItemId) : null;
    if (normalizedItemId && item?.type !== "frame") {
        return { ok: false, reason: "item_not_equippable" };
    }

    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(code).map((candidate) => ({ loginCode: candidate })),
        },
        select: { id: true, inventory: true },
    });

    if (!student) {
        return { ok: false, reason: "student_not_found" };
    }

    if (normalizedItemId && !(student.inventory as string[]).includes(normalizedItemId)) {
        return { ok: false, reason: "not_in_inventory" };
    }

    await deps.db.student.update({
        where: { id: student.id },
        data: { equippedFrame: normalizedItemId },
    });

    return { ok: true, success: true };
}

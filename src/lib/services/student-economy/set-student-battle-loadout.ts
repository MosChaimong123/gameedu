import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import type { GameInventoryChange, GameItemEffect } from "@/lib/game-core";
import { normalizeLoadoutInput } from "@/lib/battle-loadout";
import { validateNegamonBattleItemLoadout } from "@/lib/game-negamon/core/battle-items";
import { normalizeStudentInventoryItemIds } from "@/lib/shop-item-migration";

type Deps = { db: PrismaClient };

export type SetBattleLoadoutResult =
    | {
          ok: true;
          battleLoadout: string[];
          inventoryChange: GameInventoryChange;
          itemEffects: GameItemEffect[];
      }
    | {
          ok: false;
          reason: "student_not_found" | "invalid_loadout";
          code?: string;
          message?: string;
      };

export async function setStudentBattleLoadout(
    loginCode: string,
    rawItemIds: unknown,
    deps: Deps = { db }
): Promise<SetBattleLoadoutResult> {
    const student = await deps.db.student.findFirst({
        where: {
            OR: getStudentLoginCodeVariants(loginCode).map((c) => ({ loginCode: c })),
        },
        select: { id: true, inventory: true },
    });
    if (!student) {
        return { ok: false, reason: "student_not_found" };
    }

    const inv = normalizeStudentInventoryItemIds(student.inventory);
    const ids = normalizeLoadoutInput(rawItemIds);
    const v = validateNegamonBattleItemLoadout({ loadoutIds: ids, inventory: inv });
    if (!v.ok) {
        return {
            ok: false,
            reason: "invalid_loadout",
            code: v.code,
            message: v.message,
        };
    }

    await deps.db.student.update({
        where: { id: student.id },
        data: { battleLoadout: v.normalizedIds },
    });

    return {
        ok: true,
        battleLoadout: v.normalizedIds,
        inventoryChange: v.inventoryChange,
        itemEffects: v.items.flatMap((item) => item.effects),
    };
}

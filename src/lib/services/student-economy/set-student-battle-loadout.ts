import type { PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { normalizeLoadoutInput, validateBattleLoadout } from "@/lib/battle-loadout";

type Deps = { db: PrismaClient };

export type SetBattleLoadoutResult =
    | { ok: true; battleLoadout: string[] }
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

    const inv = Array.isArray(student.inventory) ? (student.inventory as string[]) : [];
    const ids = normalizeLoadoutInput(rawItemIds);
    const v = validateBattleLoadout(ids, inv);
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

    return { ok: true, battleLoadout: v.normalizedIds };
}

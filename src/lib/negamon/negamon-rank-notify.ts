import type { Prisma } from "@prisma/client";
import { sendNotification } from "@/lib/notifications";
import {
    getNegamonSettings,
    getRankIndex,
    getStudentMonsterState,
    type LevelConfigInput,
} from "@/lib/classroom-utils";

/**
 * หลังแต้มพฤติกรรม (student.behaviorPoints) เปลี่ยน — ถ้า Negamon เปิดและเลื่อน rank index
 * และนักเรียนมีมอน ให้แจ้งเตือน (DB notification → แสดงใน NotificationTray)
 */
export async function notifyNegamonRankUpIfNeeded(input: {
    studentId: string;
    loginCode: string | null;
    oldPoints: number;
    newPoints: number;
    levelConfig: Prisma.JsonValue | null | undefined;
    gamifiedSettings: Prisma.JsonValue | null | undefined;
}): Promise<void> {
    const negamon = getNegamonSettings(input.gamifiedSettings);
    if (!negamon?.enabled) return;

    const levelCfg = input.levelConfig as LevelConfigInput;
    const oldIdx = getRankIndex(input.oldPoints, levelCfg);
    const newIdx = getRankIndex(input.newPoints, levelCfg);
    if (newIdx <= oldIdx) return;

    const monsterNow = getStudentMonsterState(
        input.studentId,
        input.newPoints,
        levelCfg,
        negamon
    );
    if (!monsterNow) return;

    const monsterBefore = getStudentMonsterState(
        input.studentId,
        input.oldPoints,
        levelCfg,
        negamon
    );
    const oldFormName = monsterBefore?.form.name ?? "—";
    const newFormName = monsterNow.form.name;

    await sendNotification({
        studentId: input.studentId,
        type: "SUCCESS",
        link: input.loginCode ? `/student/${input.loginCode}` : undefined,
        i18n: {
            titleKey: "notifNegamonEvolvedTitle",
            messageKey: "notifNegamonEvolvedBody",
            params: {
                oldForm: oldFormName,
                newForm: newFormName,
                species: monsterNow.speciesName,
            },
        },
    });
}

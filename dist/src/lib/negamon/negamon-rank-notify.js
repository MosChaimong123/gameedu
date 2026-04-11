"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyNegamonRankUpIfNeeded = notifyNegamonRankUpIfNeeded;
const notifications_1 = require("@/lib/notifications");
const classroom_utils_1 = require("@/lib/classroom-utils");
/**
 * หลังแต้มพฤติกรรม (student.behaviorPoints) เปลี่ยน — ถ้า Negamon เปิดและเลื่อน rank index
 * และนักเรียนมีมอน ให้แจ้งเตือน (DB notification → แสดงใน NotificationTray)
 */
async function notifyNegamonRankUpIfNeeded(input) {
    var _a;
    const negamon = (0, classroom_utils_1.getNegamonSettings)(input.gamifiedSettings);
    if (!(negamon === null || negamon === void 0 ? void 0 : negamon.enabled))
        return;
    const levelCfg = input.levelConfig;
    const oldIdx = (0, classroom_utils_1.getRankIndex)(input.oldPoints, levelCfg);
    const newIdx = (0, classroom_utils_1.getRankIndex)(input.newPoints, levelCfg);
    if (newIdx <= oldIdx)
        return;
    const monsterNow = (0, classroom_utils_1.getStudentMonsterState)(input.studentId, input.newPoints, levelCfg, negamon);
    if (!monsterNow)
        return;
    const monsterBefore = (0, classroom_utils_1.getStudentMonsterState)(input.studentId, input.oldPoints, levelCfg, negamon);
    const oldFormName = (_a = monsterBefore === null || monsterBefore === void 0 ? void 0 : monsterBefore.form.name) !== null && _a !== void 0 ? _a : "—";
    const newFormName = monsterNow.form.name;
    await (0, notifications_1.sendNotification)({
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

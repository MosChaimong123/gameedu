"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNegamonBattleRewardsToClassroom = syncNegamonBattleRewardsToClassroom;
const db_1 = require("@/lib/db");
const classroom_utils_1 = require("@/lib/classroom-utils");
const negamon_battle_tuning_1 = require("@/lib/negamon-battle-tuning");
const negamon_rank_notify_1 = require("@/lib/negamon/negamon-rank-notify");
const notifications_1 = require("@/lib/notifications");
const audit_log_1 = require("@/lib/security/audit-log");
const point_history_reason_1 = require("@/lib/point-history-reason");
function normalizePlayerKey(name) {
    return name.trim().toLowerCase();
}
/**
 * หลังจบ Negamon Battle — ให้ EXP เข้า student.behaviorPoints ตาม HP สุดท้าย (สูตรเดียวกับ Assignment Negamon)
 * จับคู่ชื่อในเกมกับ Student.name หรือ Student.nickname (ไม่สนตัวพิมพ์เล็กใหญ่)
 */
async function syncNegamonBattleRewardsToClassroom(game) {
    var _a;
    if (game.gameMode !== "NEGAMON_BATTLE")
        return;
    const classroomId = game.settings.negamonRewardClassroomId;
    if (!classroomId || typeof classroomId !== "string")
        return;
    const classroom = await db_1.db.classroom.findFirst({
        where: { id: classroomId, teacherId: game.hostId },
        select: {
            id: true,
            gamifiedSettings: true,
            levelConfig: true,
        },
    });
    if (!classroom) {
        console.warn("[NegamonRewards] classroom missing or host mismatch", {
            classroomId,
            hostId: game.hostId,
        });
        return;
    }
    const negamon = (0, classroom_utils_1.getNegamonSettings)(classroom.gamifiedSettings);
    if (!(negamon === null || negamon === void 0 ? void 0 : negamon.enabled))
        return;
    const startHp = (0, negamon_battle_tuning_1.resolveNegamonTuning)({ negamonBattle: game.settings.negamonBattle }).startHp;
    const students = await db_1.db.student.findMany({
        where: { classId: classroomId },
        select: { id: true, name: true, nickname: true, behaviorPoints: true, loginCode: true },
    });
    const byKey = new Map();
    for (const s of students) {
        byKey.set(normalizePlayerKey(s.name), s);
        if ((_a = s.nickname) === null || _a === void 0 ? void 0 : _a.trim()) {
            byKey.set(normalizePlayerKey(s.nickname), s);
        }
    }
    const players = game.players;
    const awards = [];
    const usedStudentIds = new Set();
    players.forEach((p, idx) => {
        const st = byKey.get(normalizePlayerKey(p.name));
        if (!st || usedStudentIds.has(st.id))
            return;
        usedStudentIds.add(st.id);
        const finalScore = typeof p.score === "number" ? p.score : 0;
        const exp = (0, classroom_utils_1.calcAssignmentEXP)(finalScore, startHp, negamon.expPerPoint);
        if (exp <= 0)
            return;
        awards.push({
            studentId: st.id,
            exp,
            rank: idx + 1,
            finalScore,
            loginCode: st.loginCode,
        });
    });
    if (awards.length === 0)
        return;
    const beforeRows = await db_1.db.student.findMany({
        where: { id: { in: awards.map((a) => a.studentId) } },
        select: { id: true, behaviorPoints: true, loginCode: true },
    });
    const beforeById = new Map(beforeRows.map((r) => [r.id, r]));
    await db_1.db.$transaction(async (tx) => {
        for (const a of awards) {
            await tx.student.update({
                where: { id: a.studentId },
                data: {
                    behaviorPoints: { increment: a.exp },
                    history: {
                        create: {
                            value: a.exp,
                            reason: (0, point_history_reason_1.encodeNegamonLiveBattleReason)(a.rank, a.finalScore, startHp),
                        },
                    },
                },
            });
        }
    });
    const totalExp = awards.reduce((sum, a) => sum + a.exp, 0);
    (0, audit_log_1.logAuditEvent)({
        actorUserId: game.hostId,
        action: "classroom.negamon_battle.rewards_applied",
        category: "classroom",
        status: "success",
        targetType: "classroom",
        targetId: classroomId,
        metadata: {
            gamePin: game.pin,
            setId: game.setId,
            recipientCount: awards.length,
            totalExp,
            startHp,
            recipients: awards.map((a) => ({
                studentId: a.studentId,
                exp: a.exp,
                rank: a.rank,
                finalScore: a.finalScore,
            })),
        },
    });
    const afterRows = await db_1.db.student.findMany({
        where: { id: { in: awards.map((a) => a.studentId) } },
        select: { id: true, behaviorPoints: true, loginCode: true },
    });
    const afterById = new Map(afterRows.map((r) => [r.id, r]));
    // ใช้ allSettled เพื่อให้ notification ล้มเหลวได้โดยไม่ rollback EXP หรือ retry sync
    await Promise.allSettled(awards.map(async (a) => {
        var _a, _b, _c;
        const before = beforeById.get(a.studentId);
        const after = afterById.get(a.studentId);
        if (!before || !after)
            return;
        try {
            await (0, negamon_rank_notify_1.notifyNegamonRankUpIfNeeded)({
                studentId: a.studentId,
                loginCode: (_a = a.loginCode) !== null && _a !== void 0 ? _a : after.loginCode,
                oldPoints: before.behaviorPoints,
                newPoints: after.behaviorPoints,
                levelConfig: classroom.levelConfig,
                gamifiedSettings: classroom.gamifiedSettings,
            });
        }
        catch (err) {
            console.warn("[NegamonRewards] rank-up notify failed (non-fatal)", a.studentId, err);
        }
        try {
            await (0, notifications_1.sendNotification)({
                studentId: a.studentId,
                type: "SUCCESS",
                link: ((_b = a.loginCode) !== null && _b !== void 0 ? _b : after.loginCode) ? `/student/${(_c = a.loginCode) !== null && _c !== void 0 ? _c : after.loginCode}` : undefined,
                i18n: {
                    titleKey: "notifNegamonBattleExpTitle",
                    messageKey: "notifNegamonBattleExpBody",
                    params: { exp: a.exp, rank: a.rank },
                },
            });
        }
        catch (err) {
            console.warn("[NegamonRewards] send notification failed (non-fatal)", a.studentId, err);
        }
    }));
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncNegamonBattleRewardsToClassroom = syncNegamonBattleRewardsToClassroom;
exports.resyncNegamonBattleRewardsForGamePin = resyncNegamonBattleRewardsForGamePin;
const client_1 = require("@prisma/client");
const db_1 = require("@/lib/db");
const classroom_utils_1 = require("@/lib/classroom-utils");
const negamon_battle_tuning_1 = require("@/lib/negamon-battle-tuning");
const negamon_rank_notify_1 = require("@/lib/negamon/negamon-rank-notify");
const notifications_1 = require("@/lib/notifications");
const point_history_reason_1 = require("@/lib/point-history-reason");
const audit_log_1 = require("@/lib/security/audit-log");
function normalizePlayerKey(name) {
    return name.trim().toLowerCase();
}
function addStudentMatchKey(byKey, rawKey, student) {
    if (!(rawKey === null || rawKey === void 0 ? void 0 : rawKey.trim()))
        return;
    const key = normalizePlayerKey(rawKey);
    if (!byKey.has(key)) {
        byKey.set(key, student);
        return;
    }
    const existing = byKey.get(key);
    if (!existing || existing.id !== student.id) {
        byKey.set(key, null);
    }
}
function buildStudentLookup(students) {
    const byKey = new Map();
    const byStudentId = new Map();
    for (const student of students) {
        byStudentId.set(student.id, student);
        addStudentMatchKey(byKey, student.name, student);
        addStudentMatchKey(byKey, student.nickname, student);
    }
    return { byKey, byStudentId };
}
function liveRewardClaimKey(award) {
    return `${award.studentId}:${award.reason}`;
}
function isUniqueConstraintError(error) {
    return ((error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
        (typeof error === "object" && error !== null && "code" in error && error.code === "P2002"));
}
function buildRewardSyncIdentityMetadata(args) {
    const { players, awards, appliedAwards, skippedPlayers, duplicateSkipCount } = args;
    return {
        playerCount: players.length,
        matchedCount: awards.length,
        linkedIdentityCount: awards.filter((a) => a.identitySource === "studentId").length,
        nameFallbackCount: awards.filter((a) => a.identitySource === "name").length,
        appliedLinkedIdentityCount: appliedAwards.filter((a) => a.identitySource === "studentId").length,
        appliedNameFallbackCount: appliedAwards.filter((a) => a.identitySource === "name").length,
        skippedDuplicateCount: duplicateSkipCount,
        skippedPlayerCount: skippedPlayers.length,
        skippedAmbiguousNameCount: skippedPlayers.filter((p) => p.reason === "ambiguous_name").length,
        skippedInvalidStudentIdCount: skippedPlayers.filter((p) => p.reason === "invalid_student_id").length,
        skippedNoMatchCount: skippedPlayers.filter((p) => p.reason === "no_match").length,
        skippedPlayers: skippedPlayers.slice(0, 20),
    };
}
function buildSnapshotPlayersFromGame(args) {
    return args.players.map((player, index) => {
        const finalScore = typeof player.score === "number" ? player.score : 0;
        return {
            name: player.name,
            rank: index + 1,
            finalScore,
            exp: (0, classroom_utils_1.calcAssignmentEXP)(finalScore, args.startHp, args.expPerPoint),
            studentId: player.studentId,
            identitySource: player.studentId ? "studentId" : "name",
        };
    });
}
function resolveRewardsFromSnapshots(args) {
    const { byKey, byStudentId } = buildStudentLookup(args.students);
    const awards = [];
    const skippedPlayers = [];
    const usedStudentIds = new Set();
    for (const player of args.players) {
        if (player.exp <= 0) {
            skippedPlayers.push({
                name: player.name,
                rank: player.rank,
                reason: "non_positive_exp",
                studentId: player.studentId,
                finalScore: player.finalScore,
                exp: player.exp,
            });
            continue;
        }
        const key = normalizePlayerKey(player.name);
        const student = player.studentId ? byStudentId.get(player.studentId) : byKey.get(key);
        if (!student) {
            skippedPlayers.push({
                name: player.name,
                rank: player.rank,
                reason: player.studentId ? "invalid_student_id" : byKey.has(key) ? "ambiguous_name" : "no_match",
                studentId: player.studentId,
                finalScore: player.finalScore,
                exp: player.exp,
            });
            continue;
        }
        if (usedStudentIds.has(student.id)) {
            skippedPlayers.push({
                name: player.name,
                rank: player.rank,
                reason: "duplicate_student",
                studentId: student.id,
                finalScore: player.finalScore,
                exp: player.exp,
            });
            continue;
        }
        usedStudentIds.add(student.id);
        awards.push({
            studentId: student.id,
            exp: player.exp,
            rank: player.rank,
            finalScore: player.finalScore,
            loginCode: student.loginCode,
            reason: (0, point_history_reason_1.encodeNegamonLiveBattleRewardReason)(args.gamePin, player.rank, player.finalScore, args.startHp),
            identitySource: player.identitySource,
        });
    }
    return {
        awards,
        skippedPlayers,
        duplicateSkipCount: skippedPlayers.filter((player) => player.reason === "duplicate_student").length,
    };
}
async function applyRewardAwards(args) {
    const beforeRows = await db_1.db.student.findMany({
        where: { id: { in: args.awards.map((award) => award.studentId) } },
        select: { id: true, behaviorPoints: true },
    });
    const beforeById = new Map(beforeRows.map((row) => [row.id, row.behaviorPoints]));
    const appliedAwards = [];
    await db_1.db.$transaction(async (tx) => {
        var _a;
        const rewardClaimTx = tx;
        for (const award of args.awards) {
            try {
                await rewardClaimTx.negamonLiveBattleRewardClaim.create({
                    data: {
                        studentId: award.studentId,
                        classId: args.classroomId,
                        gamePin: args.gamePin,
                        reason: award.reason,
                        idempotencyKey: liveRewardClaimKey(award),
                        exp: award.exp,
                        rank: award.rank,
                        finalScore: award.finalScore,
                    },
                });
            }
            catch (error) {
                if (isUniqueConstraintError(error))
                    continue;
                throw error;
            }
            await tx.student.update({
                where: { id: award.studentId },
                data: {
                    behaviorPoints: { increment: award.exp },
                    history: {
                        create: {
                            value: award.exp,
                            reason: award.reason,
                        },
                    },
                },
            });
            const beforePoints = (_a = beforeById.get(award.studentId)) !== null && _a !== void 0 ? _a : 0;
            appliedAwards.push({
                ...award,
                behaviorPointsBefore: beforePoints,
                behaviorPointsAfter: beforePoints + award.exp,
            });
        }
    });
    let skipReason = null;
    if (args.awards.length > 0 && appliedAwards.length === 0) {
        skipReason = "claim_already_exists";
    }
    return {
        appliedAwards,
        duplicateSkipCount: args.awards.length - appliedAwards.length,
        skipReason,
    };
}
async function notifyAwardRecipients(args) {
    if (args.awards.length === 0)
        return;
    const afterRows = await db_1.db.student.findMany({
        where: { id: { in: args.awards.map((award) => award.studentId) } },
        select: { id: true, behaviorPoints: true, loginCode: true },
    });
    const afterById = new Map(afterRows.map((row) => [row.id, row]));
    await Promise.allSettled(args.awards.map(async (award) => {
        var _a, _b, _c;
        const after = afterById.get(award.studentId);
        if (!after)
            return;
        try {
            await (0, negamon_rank_notify_1.notifyNegamonRankUpIfNeeded)({
                studentId: award.studentId,
                loginCode: (_a = award.loginCode) !== null && _a !== void 0 ? _a : after.loginCode,
                oldPoints: after.behaviorPoints - award.exp,
                newPoints: after.behaviorPoints,
                levelConfig: args.classroom.levelConfig,
                gamifiedSettings: args.classroom.gamifiedSettings,
            });
        }
        catch (error) {
            console.warn("[NegamonRewards] rank-up notify failed (non-fatal)", award.studentId, error);
        }
        try {
            await (0, notifications_1.sendNotification)({
                studentId: award.studentId,
                type: "SUCCESS",
                link: ((_b = award.loginCode) !== null && _b !== void 0 ? _b : after.loginCode)
                    ? `/student/${(_c = award.loginCode) !== null && _c !== void 0 ? _c : after.loginCode}`
                    : undefined,
                i18n: {
                    titleKey: "notifNegamonBattleExpTitle",
                    messageKey: "notifNegamonBattleExpBody",
                    params: { exp: award.exp, rank: award.rank },
                },
            });
        }
        catch (error) {
            console.warn("[NegamonRewards] send notification failed (non-fatal)", award.studentId, error);
        }
    }));
}
function logRewardAudit(args) {
    var _a, _b;
    const totalExp = args.appliedAwards.reduce((sum, award) => sum + award.exp, 0);
    const metadata = {
        gamePin: args.gamePin,
        setId: (_a = args.setId) !== null && _a !== void 0 ? _a : null,
        startHp: args.startHp,
        trigger: args.mode,
        ...buildRewardSyncIdentityMetadata({
            players: args.players,
            awards: args.awards,
            appliedAwards: args.appliedAwards,
            skippedPlayers: args.skippedPlayers,
            duplicateSkipCount: args.duplicateSkipCount,
        }),
    };
    if (args.appliedAwards.length === 0) {
        (0, audit_log_1.logAuditEvent)({
            actorUserId: args.actorUserId,
            action: "classroom.negamon_battle.rewards_skipped",
            category: "classroom",
            status: "success",
            targetType: "classroom",
            targetId: args.classroomId,
            metadata: {
                ...metadata,
                reason: (_b = args.reasonOverride) !== null && _b !== void 0 ? _b : "no_awards",
            },
        });
        return;
    }
    (0, audit_log_1.logAuditEvent)({
        actorUserId: args.actorUserId,
        action: "classroom.negamon_battle.rewards_applied",
        category: "classroom",
        status: "success",
        targetType: "classroom",
        targetId: args.classroomId,
        metadata: {
            ...metadata,
            recipientCount: args.appliedAwards.length,
            totalExp,
            recipients: args.appliedAwards.map((award) => ({
                studentId: award.studentId,
                exp: award.exp,
                rank: award.rank,
                finalScore: award.finalScore,
                identitySource: award.identitySource,
            })),
        },
    });
}
async function findRewardClassroom(args) {
    return db_1.db.classroom.findFirst({
        where: { id: args.classroomId, teacherId: args.teacherId },
        select: {
            id: true,
            gamifiedSettings: true,
            levelConfig: true,
        },
    });
}
async function listClassroomStudents(classroomId) {
    return db_1.db.student.findMany({
        where: { classId: classroomId },
        select: { id: true, name: true, nickname: true, behaviorPoints: true, loginCode: true },
    });
}
function parseAuditSkippedPlayers(metadata) {
    const skipped = metadata === null || metadata === void 0 ? void 0 : metadata.skippedPlayers;
    return Array.isArray(skipped) ? skipped : [];
}
function buildSnapshotPlayersFromAudit(args) {
    const snapshots = [];
    const skippedPlayers = parseAuditSkippedPlayers(args.metadata);
    const unresolved = [];
    for (const skipped of skippedPlayers) {
        const name = typeof skipped.name === "string" ? skipped.name : null;
        const rank = typeof skipped.rank === "number" ? skipped.rank : null;
        const finalScore = typeof skipped.finalScore === "number" ? skipped.finalScore : null;
        const exp = typeof skipped.exp === "number" ? skipped.exp : null;
        const studentId = typeof skipped.studentId === "string" ? skipped.studentId : undefined;
        if (!name || !rank || finalScore === null || exp === null) {
            unresolved.push({
                name: name !== null && name !== void 0 ? name : "Unknown",
                rank: rank !== null && rank !== void 0 ? rank : 0,
                reason: "snapshot_missing",
                studentId,
                finalScore: finalScore !== null && finalScore !== void 0 ? finalScore : undefined,
                exp: exp !== null && exp !== void 0 ? exp : undefined,
            });
            continue;
        }
        snapshots.push({
            name,
            rank,
            finalScore,
            exp,
            studentId,
            identitySource: studentId ? "studentId" : "name",
        });
    }
    return { snapshots, unresolved };
}
/**
 * หลังจบ Negamon Battle ให้ EXP เข้า student.behaviorPoints โดยอ้างอิงผลรอบสด
 * และบันทึก audit สำหรับการตรวจย้อนหลัง/แก้ identity
 */
async function syncNegamonBattleRewardsToClassroom(game) {
    if (game.gameMode !== "NEGAMON_BATTLE")
        return;
    const classroomId = game.settings.negamonRewardClassroomId;
    if (!classroomId || typeof classroomId !== "string")
        return;
    const classroom = await findRewardClassroom({
        classroomId,
        teacherId: game.hostId,
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
    const students = await listClassroomStudents(classroomId);
    const players = buildSnapshotPlayersFromGame({
        players: game.players,
        startHp,
        expPerPoint: negamon.expPerPoint,
    });
    const resolution = resolveRewardsFromSnapshots({
        gamePin: game.pin,
        startHp,
        players,
        students,
    });
    if (resolution.awards.length === 0) {
        logRewardAudit({
            actorUserId: game.hostId,
            classroomId,
            gamePin: game.pin,
            setId: game.setId,
            startHp,
            players,
            awards: resolution.awards,
            appliedAwards: [],
            skippedPlayers: resolution.skippedPlayers,
            duplicateSkipCount: resolution.duplicateSkipCount,
            mode: "live_game_end",
            reasonOverride: "no_awards",
        });
        return;
    }
    const applied = await applyRewardAwards({
        classroomId,
        gamePin: game.pin,
        awards: resolution.awards,
    });
    logRewardAudit({
        actorUserId: game.hostId,
        classroomId,
        gamePin: game.pin,
        setId: game.setId,
        startHp,
        players,
        awards: resolution.awards,
        appliedAwards: applied.appliedAwards,
        skippedPlayers: resolution.skippedPlayers,
        duplicateSkipCount: resolution.duplicateSkipCount + applied.duplicateSkipCount,
        mode: "live_game_end",
        reasonOverride: applied.skipReason,
    });
    if (applied.appliedAwards.length === 0)
        return;
    await notifyAwardRecipients({
        classroom,
        awards: applied.appliedAwards,
    });
}
async function resyncNegamonBattleRewardsForGamePin(args) {
    var _a, _b, _c, _d, _e;
    const classroom = await findRewardClassroom({
        classroomId: args.classroomId,
        teacherId: args.teacherId,
    });
    if (!classroom) {
        throw new Error("FORBIDDEN");
    }
    const events = await (0, audit_log_1.listRecentAuditEvents)(200, {
        targetId: args.classroomId,
        category: "classroom",
        actionPrefix: "classroom.negamon_battle.rewards_",
    });
    const sourceEvent = events.find((event) => {
        var _a;
        const metadataGamePin = (_a = event.metadata) === null || _a === void 0 ? void 0 : _a.gamePin;
        return typeof metadataGamePin === "string" && metadataGamePin === args.gamePin;
    });
    if (!sourceEvent) {
        return {
            gamePin: args.gamePin,
            requestedByUserId: args.teacherId,
            appliedCount: 0,
            skippedCount: 0,
            unresolvedCount: 0,
            reason: "no_audit_event",
            appliedRecipients: [],
            skippedPlayers: [],
        };
    }
    const startHp = typeof ((_a = sourceEvent.metadata) === null || _a === void 0 ? void 0 : _a.startHp) === "number" && Number.isFinite(sourceEvent.metadata.startHp)
        ? sourceEvent.metadata.startHp
        : 100;
    const { snapshots, unresolved } = buildSnapshotPlayersFromAudit({
        gamePin: args.gamePin,
        startHp,
        metadata: sourceEvent.metadata,
    });
    if (snapshots.length === 0) {
        logRewardAudit({
            actorUserId: args.teacherId,
            classroomId: args.classroomId,
            gamePin: args.gamePin,
            setId: typeof ((_b = sourceEvent.metadata) === null || _b === void 0 ? void 0 : _b.setId) === "string" ? sourceEvent.metadata.setId : null,
            startHp,
            players: [],
            awards: [],
            appliedAwards: [],
            skippedPlayers: unresolved,
            duplicateSkipCount: 0,
            mode: "manual_resync",
            reasonOverride: "snapshot_missing",
        });
        return {
            gamePin: args.gamePin,
            requestedByUserId: args.teacherId,
            appliedCount: 0,
            skippedCount: 0,
            unresolvedCount: unresolved.length,
            reason: "snapshot_missing",
            appliedRecipients: [],
            skippedPlayers: unresolved,
        };
    }
    const students = await listClassroomStudents(args.classroomId);
    const resolution = resolveRewardsFromSnapshots({
        gamePin: args.gamePin,
        startHp,
        players: snapshots,
        students,
    });
    const combinedSkipped = [...resolution.skippedPlayers, ...unresolved];
    if (resolution.awards.length === 0) {
        logRewardAudit({
            actorUserId: args.teacherId,
            classroomId: args.classroomId,
            gamePin: args.gamePin,
            setId: typeof ((_c = sourceEvent.metadata) === null || _c === void 0 ? void 0 : _c.setId) === "string" ? sourceEvent.metadata.setId : null,
            startHp,
            players: snapshots,
            awards: resolution.awards,
            appliedAwards: [],
            skippedPlayers: combinedSkipped,
            duplicateSkipCount: resolution.duplicateSkipCount,
            mode: "manual_resync",
            reasonOverride: "no_awards",
        });
        return {
            gamePin: args.gamePin,
            requestedByUserId: args.teacherId,
            appliedCount: 0,
            skippedCount: combinedSkipped.length,
            unresolvedCount: unresolved.length,
            reason: "already_awarded",
            appliedRecipients: [],
            skippedPlayers: combinedSkipped,
        };
    }
    const applied = await applyRewardAwards({
        classroomId: args.classroomId,
        gamePin: args.gamePin,
        awards: resolution.awards,
    });
    logRewardAudit({
        actorUserId: args.teacherId,
        classroomId: args.classroomId,
        gamePin: args.gamePin,
        setId: typeof ((_d = sourceEvent.metadata) === null || _d === void 0 ? void 0 : _d.setId) === "string" ? sourceEvent.metadata.setId : null,
        startHp,
        players: snapshots,
        awards: resolution.awards,
        appliedAwards: applied.appliedAwards,
        skippedPlayers: combinedSkipped,
        duplicateSkipCount: resolution.duplicateSkipCount + applied.duplicateSkipCount,
        mode: "manual_resync",
        reasonOverride: applied.skipReason,
    });
    if (applied.appliedAwards.length > 0) {
        await notifyAwardRecipients({
            classroom,
            awards: applied.appliedAwards,
        });
    }
    return {
        gamePin: args.gamePin,
        requestedByUserId: args.teacherId,
        appliedCount: applied.appliedAwards.length,
        skippedCount: combinedSkipped.length,
        unresolvedCount: unresolved.length,
        reason: applied.appliedAwards.length > 0
            ? "applied"
            : (_e = applied.skipReason) !== null && _e !== void 0 ? _e : "already_awarded",
        appliedRecipients: applied.appliedAwards.map((award) => ({
            studentId: award.studentId,
            exp: award.exp,
            rank: award.rank,
            finalScore: award.finalScore,
            identitySource: award.identitySource,
            behaviorPointsBefore: award.behaviorPointsBefore,
            behaviorPointsAfter: award.behaviorPointsAfter,
        })),
        skippedPlayers: combinedSkipped,
    };
}

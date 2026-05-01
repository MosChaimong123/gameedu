import { Prisma } from "@prisma/client";
import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";
import type { NegamonBattlePlayer } from "@/lib/types/game";
import { db } from "@/lib/db";
import { calcAssignmentEXP, getNegamonSettings } from "@/lib/classroom-utils";
import { resolveNegamonTuning } from "@/lib/negamon-battle-tuning";
import { notifyNegamonRankUpIfNeeded } from "@/lib/negamon/negamon-rank-notify";
import { sendNotification } from "@/lib/notifications";
import { encodeNegamonLiveBattleRewardReason } from "@/lib/point-history-reason";
import { listRecentAuditEvents, logAuditEvent } from "@/lib/security/audit-log";

function normalizePlayerKey(name: string): string {
  return name.trim().toLowerCase();
}

type RewardSyncIdentitySource = "studentId" | "name";

type RewardSnapshotPlayer = {
  name: string;
  rank: number;
  finalScore: number;
  exp: number;
  studentId?: string;
  identitySource: RewardSyncIdentitySource;
};

type AwardRow = {
  studentId: string;
  exp: number;
  rank: number;
  finalScore: number;
  loginCode: string | null;
  reason: string;
  identitySource: RewardSyncIdentitySource;
};

type SkippedPlayerReason =
  | "ambiguous_name"
  | "duplicate_student"
  | "invalid_student_id"
  | "no_match"
  | "non_positive_exp"
  | "snapshot_missing";

type SkippedPlayerRow = {
  name: string;
  rank: number;
  reason: SkippedPlayerReason;
  studentId?: string;
  finalScore?: number;
  exp?: number;
};

type StudentRewardRow = {
  id: string;
  name: string;
  nickname: string | null;
  behaviorPoints: number;
  loginCode: string | null;
};

type RewardClaimTx = {
  negamonLiveBattleRewardClaim: {
    create(args: {
      data: {
        studentId: string;
        classId: string;
        gamePin: string;
        reason: string;
        idempotencyKey: string;
        exp: number;
        rank: number;
        finalScore: number;
      };
    }): Promise<unknown>;
  };
};

type RewardClassroomContext = {
  id: string;
  gamifiedSettings: Prisma.JsonValue | null;
  levelConfig: Prisma.JsonValue | null;
};

type RewardResolutionResult = {
  awards: AwardRow[];
  skippedPlayers: SkippedPlayerRow[];
  duplicateSkipCount: number;
};

type AppliedRewardResult = {
  appliedAwards: (AwardRow & {
    behaviorPointsBefore: number;
    behaviorPointsAfter: number;
  })[];
  duplicateSkipCount: number;
  skipReason: "already_awarded" | "claim_already_exists" | null;
};

export type NegamonRewardResyncResult = {
  gamePin: string;
  requestedByUserId: string;
  appliedCount: number;
  skippedCount: number;
  unresolvedCount: number;
  reason: "applied" | "already_awarded" | "claim_already_exists" | "snapshot_missing" | "no_audit_event";
  appliedRecipients: {
    studentId: string;
    exp: number;
    rank: number;
    finalScore: number;
    identitySource: RewardSyncIdentitySource;
    behaviorPointsBefore: number;
    behaviorPointsAfter: number;
  }[];
  skippedPlayers: SkippedPlayerRow[];
};

function addStudentMatchKey(
  byKey: Map<string, StudentRewardRow | null>,
  rawKey: string | null | undefined,
  student: StudentRewardRow
) {
  if (!rawKey?.trim()) return;
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

function buildStudentLookup(students: StudentRewardRow[]) {
  const byKey = new Map<string, StudentRewardRow | null>();
  const byStudentId = new Map<string, StudentRewardRow>();

  for (const student of students) {
    byStudentId.set(student.id, student);
    addStudentMatchKey(byKey, student.name, student);
    addStudentMatchKey(byKey, student.nickname, student);
  }

  return { byKey, byStudentId };
}

function liveRewardClaimKey(award: Pick<AwardRow, "studentId" | "reason">): string {
  return `${award.studentId}:${award.reason}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  );
}

function buildRewardSyncIdentityMetadata(args: {
  players: RewardSnapshotPlayer[];
  awards: AwardRow[];
  appliedAwards: AwardRow[];
  skippedPlayers: SkippedPlayerRow[];
  duplicateSkipCount: number;
}) {
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

function buildSnapshotPlayersFromGame(args: {
  players: NegamonBattlePlayer[];
  startHp: number;
  expPerPoint: number;
}) {
  return args.players.map((player, index) => {
    const finalScore = typeof player.score === "number" ? player.score : 0;
    return {
      name: player.name,
      rank: index + 1,
      finalScore,
      exp: calcAssignmentEXP(finalScore, args.startHp, args.expPerPoint),
      studentId: player.studentId,
      identitySource: player.studentId ? "studentId" : "name",
    } satisfies RewardSnapshotPlayer;
  });
}

function resolveRewardsFromSnapshots(args: {
  gamePin: string;
  startHp: number;
  players: RewardSnapshotPlayer[];
  students: StudentRewardRow[];
}): RewardResolutionResult {
  const { byKey, byStudentId } = buildStudentLookup(args.students);
  const awards: AwardRow[] = [];
  const skippedPlayers: SkippedPlayerRow[] = [];
  const usedStudentIds = new Set<string>();

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
      reason: encodeNegamonLiveBattleRewardReason(
        args.gamePin,
        player.rank,
        player.finalScore,
        args.startHp
      ),
      identitySource: player.identitySource,
    });
  }

  return {
    awards,
    skippedPlayers,
    duplicateSkipCount: skippedPlayers.filter((player) => player.reason === "duplicate_student").length,
  };
}

async function applyRewardAwards(args: {
  classroomId: string;
  gamePin: string;
  awards: AwardRow[];
}): Promise<AppliedRewardResult> {
  const beforeRows = await db.student.findMany({
    where: { id: { in: args.awards.map((award) => award.studentId) } },
    select: { id: true, behaviorPoints: true },
  });
  const beforeById = new Map(beforeRows.map((row) => [row.id, row.behaviorPoints] as const));

  const appliedAwards: AppliedRewardResult["appliedAwards"] = [];
  await db.$transaction(async (tx) => {
    const rewardClaimTx = tx as typeof tx & RewardClaimTx;
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
      } catch (error) {
        if (isUniqueConstraintError(error)) continue;
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
      const beforePoints = beforeById.get(award.studentId) ?? 0;
      appliedAwards.push({
        ...award,
        behaviorPointsBefore: beforePoints,
        behaviorPointsAfter: beforePoints + award.exp,
      });
    }
  });

  let skipReason: AppliedRewardResult["skipReason"] = null;
  if (args.awards.length > 0 && appliedAwards.length === 0) {
    skipReason = "claim_already_exists";
  }

  return {
    appliedAwards,
    duplicateSkipCount: args.awards.length - appliedAwards.length,
    skipReason,
  };
}

async function notifyAwardRecipients(args: {
  classroom: RewardClassroomContext;
  awards: AwardRow[];
}) {
  if (args.awards.length === 0) return;

  const afterRows = await db.student.findMany({
    where: { id: { in: args.awards.map((award) => award.studentId) } },
    select: { id: true, behaviorPoints: true, loginCode: true },
  });
  const afterById = new Map(afterRows.map((row) => [row.id, row] as const));

  await Promise.allSettled(
    args.awards.map(async (award) => {
      const after = afterById.get(award.studentId);
      if (!after) return;

      try {
        await notifyNegamonRankUpIfNeeded({
          studentId: award.studentId,
          loginCode: award.loginCode ?? after.loginCode,
          oldPoints: after.behaviorPoints - award.exp,
          newPoints: after.behaviorPoints,
          levelConfig: args.classroom.levelConfig,
          gamifiedSettings: args.classroom.gamifiedSettings,
        });
      } catch (error) {
        console.warn("[NegamonRewards] rank-up notify failed (non-fatal)", award.studentId, error);
      }

      try {
        await sendNotification({
          studentId: award.studentId,
          type: "SUCCESS",
          link: (award.loginCode ?? after.loginCode)
            ? `/student/${award.loginCode ?? after.loginCode}`
            : undefined,
          i18n: {
            titleKey: "notifNegamonBattleExpTitle",
            messageKey: "notifNegamonBattleExpBody",
            params: { exp: award.exp, rank: award.rank },
          },
        });
      } catch (error) {
        console.warn("[NegamonRewards] send notification failed (non-fatal)", award.studentId, error);
      }
    })
  );
}

function logRewardAudit(args: {
  actorUserId: string;
  classroomId: string;
  gamePin: string;
  setId?: string | null;
  startHp: number;
  players: RewardSnapshotPlayer[];
  awards: AwardRow[];
  appliedAwards: AwardRow[];
  skippedPlayers: SkippedPlayerRow[];
  duplicateSkipCount: number;
  mode: "live_game_end" | "manual_resync";
  reasonOverride?: string | null;
}) {
  const totalExp = args.appliedAwards.reduce((sum, award) => sum + award.exp, 0);
  const metadata = {
    gamePin: args.gamePin,
    setId: args.setId ?? null,
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
    logAuditEvent({
      actorUserId: args.actorUserId,
      action: "classroom.negamon_battle.rewards_skipped",
      category: "classroom",
      status: "success",
      targetType: "classroom",
      targetId: args.classroomId,
      metadata: {
        ...metadata,
        reason: args.reasonOverride ?? "no_awards",
      },
    });
    return;
  }

  logAuditEvent({
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

async function findRewardClassroom(args: { classroomId: string; teacherId: string }) {
  return db.classroom.findFirst({
    where: { id: args.classroomId, teacherId: args.teacherId },
    select: {
      id: true,
      gamifiedSettings: true,
      levelConfig: true,
    },
  });
}

async function listClassroomStudents(classroomId: string) {
  return db.student.findMany({
    where: { classId: classroomId },
    select: { id: true, name: true, nickname: true, behaviorPoints: true, loginCode: true },
  });
}

function parseAuditSkippedPlayers(metadata: Record<string, unknown> | undefined) {
  const skipped = metadata?.skippedPlayers;
  return Array.isArray(skipped) ? (skipped as Record<string, unknown>[]) : [];
}

function buildSnapshotPlayersFromAudit(args: {
  gamePin: string;
  startHp: number;
  metadata: Record<string, unknown> | undefined;
}) {
  const snapshots: RewardSnapshotPlayer[] = [];
  const skippedPlayers = parseAuditSkippedPlayers(args.metadata);
  const unresolved: SkippedPlayerRow[] = [];

  for (const skipped of skippedPlayers) {
    const name = typeof skipped.name === "string" ? skipped.name : null;
    const rank = typeof skipped.rank === "number" ? skipped.rank : null;
    const finalScore = typeof skipped.finalScore === "number" ? skipped.finalScore : null;
    const exp = typeof skipped.exp === "number" ? skipped.exp : null;
    const studentId = typeof skipped.studentId === "string" ? skipped.studentId : undefined;

    if (!name || !rank || finalScore === null || exp === null) {
      unresolved.push({
        name: name ?? "Unknown",
        rank: rank ?? 0,
        reason: "snapshot_missing",
        studentId,
        finalScore: finalScore ?? undefined,
        exp: exp ?? undefined,
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
export async function syncNegamonBattleRewardsToClassroom(game: AbstractGameEngine): Promise<void> {
  if (game.gameMode !== "NEGAMON_BATTLE") return;

  const classroomId = game.settings.negamonRewardClassroomId;
  if (!classroomId || typeof classroomId !== "string") return;

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

  const negamon = getNegamonSettings(classroom.gamifiedSettings);
  if (!negamon?.enabled) return;

  const startHp = resolveNegamonTuning({ negamonBattle: game.settings.negamonBattle }).startHp;
  const students = await listClassroomStudents(classroomId);
  const players = buildSnapshotPlayersFromGame({
    players: game.players as NegamonBattlePlayer[],
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

  if (applied.appliedAwards.length === 0) return;
  await notifyAwardRecipients({
    classroom,
    awards: applied.appliedAwards,
  });
}

export async function resyncNegamonBattleRewardsForGamePin(args: {
  classroomId: string;
  teacherId: string;
  gamePin: string;
}): Promise<NegamonRewardResyncResult> {
  const classroom = await findRewardClassroom({
    classroomId: args.classroomId,
    teacherId: args.teacherId,
  });
  if (!classroom) {
    throw new Error("FORBIDDEN");
  }

  const events = await listRecentAuditEvents(200, {
    targetId: args.classroomId,
    category: "classroom",
    actionPrefix: "classroom.negamon_battle.rewards_",
  });
  const sourceEvent = events.find((event) => {
    const metadataGamePin = event.metadata?.gamePin;
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

  const startHp =
    typeof sourceEvent.metadata?.startHp === "number" && Number.isFinite(sourceEvent.metadata.startHp)
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
      setId: typeof sourceEvent.metadata?.setId === "string" ? sourceEvent.metadata.setId : null,
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
      setId: typeof sourceEvent.metadata?.setId === "string" ? sourceEvent.metadata.setId : null,
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
    setId: typeof sourceEvent.metadata?.setId === "string" ? sourceEvent.metadata.setId : null,
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
    reason:
      applied.appliedAwards.length > 0
        ? "applied"
        : applied.skipReason ?? "already_awarded",
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

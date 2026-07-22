import { Prisma } from "@prisma/client";
import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";
import type { ArQuestPlayer } from "@/lib/types/game";
import { db } from "@/lib/db";
import { calcAssignmentEXP, getNegamonSettings } from "@/lib/classroom-utils";
import { notifyNegamonRankUpIfNeeded } from "@/lib/negamon/negamon-rank-notify";
import { sendNotification } from "@/lib/notifications";
import { encodeArQuestLiveRewardReason } from "@/lib/point-history-reason";
import { logAuditEvent } from "@/lib/security/audit-log";

type RewardSyncIdentitySource = "studentId" | "name";

type RewardSnapshotPlayer = {
  name: string;
  rank: number;
  finalScore: number;
  exp: number;
  studentId?: string;
  identitySource: RewardSyncIdentitySource;
};

type StudentRewardRow = {
  id: string;
  name: string;
  nickname: string | null;
  behaviorPoints: number;
  loginCode: string | null;
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
  | "non_positive_exp";

type SkippedPlayerRow = {
  name: string;
  rank: number;
  reason: SkippedPlayerReason;
  studentId?: string;
  finalScore?: number;
  exp?: number;
};

type RewardClassroomContext = {
  id: string;
  gamifiedSettings: Prisma.JsonValue | null;
  levelConfig: Prisma.JsonValue | null;
};

type ArQuestRewardClaimTx = {
  arQuestRewardClaim: {
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

function normalizePlayerKey(name: string): string {
  return name.trim().toLowerCase();
}

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

function isUniqueConstraintError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") ||
    (typeof error === "object" && error !== null && "code" in error && error.code === "P2002")
  );
}

function buildSnapshotPlayersFromGame(players: ArQuestPlayer[]): RewardSnapshotPlayer[] {
  const sorted = [...players].sort((a, b) => b.arScore - a.arScore);
  return sorted.map((player, index) => {
    const finalScore = Math.max(0, Math.floor(player.arScore ?? player.score ?? 0));
    const maxScore = Math.max(100, finalScore);
    return {
      name: player.name,
      rank: index + 1,
      finalScore,
      exp: finalScore > 0 ? calcAssignmentEXP(finalScore, maxScore, 1) : 0,
      studentId: player.studentId,
      identitySource: player.studentId ? "studentId" : "name",
    };
  });
}

function resolveRewardsFromSnapshots(args: {
  gamePin: string;
  players: RewardSnapshotPlayer[];
  students: StudentRewardRow[];
}) {
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
      reason: encodeArQuestLiveRewardReason(args.gamePin, player.rank, player.finalScore),
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
}) {
  const beforeRows = await db.student.findMany({
    where: { id: { in: args.awards.map((award) => award.studentId) } },
    select: { id: true, behaviorPoints: true },
  });
  const beforeById = new Map(beforeRows.map((row) => [row.id, row.behaviorPoints] as const));

  const appliedAwards: (AwardRow & {
    behaviorPointsBefore: number;
    behaviorPointsAfter: number;
  })[] = [];

  await db.$transaction(async (tx) => {
    const rewardClaimTx = tx as typeof tx & ArQuestRewardClaimTx;
    for (const award of args.awards) {
      try {
        await rewardClaimTx.arQuestRewardClaim.create({
          data: {
            studentId: award.studentId,
            classId: args.classroomId,
            gamePin: args.gamePin,
            reason: award.reason,
            idempotencyKey: `${award.studentId}:${award.reason}`,
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

  return {
    appliedAwards,
    duplicateSkipCount: args.awards.length - appliedAwards.length,
    skipReason: args.awards.length > 0 && appliedAwards.length === 0 ? "claim_already_exists" : null,
  };
}

function logRewardAudit(args: {
  actorUserId: string;
  classroomId: string;
  gamePin: string;
  setId?: string | null;
  players: RewardSnapshotPlayer[];
  awards: AwardRow[];
  appliedAwards: AwardRow[];
  skippedPlayers: SkippedPlayerRow[];
  duplicateSkipCount: number;
  reasonOverride?: string | null;
}) {
  const totalExp = args.appliedAwards.reduce((sum, award) => sum + award.exp, 0);
  const metadata = {
    gamePin: args.gamePin,
    setId: args.setId ?? null,
    trigger: "live_game_end",
    playerCount: args.players.length,
    matchedCount: args.awards.length,
    linkedIdentityCount: args.awards.filter((a) => a.identitySource === "studentId").length,
    nameFallbackCount: args.awards.filter((a) => a.identitySource === "name").length,
    appliedLinkedIdentityCount: args.appliedAwards.filter((a) => a.identitySource === "studentId").length,
    appliedNameFallbackCount: args.appliedAwards.filter((a) => a.identitySource === "name").length,
    skippedDuplicateCount: args.duplicateSkipCount,
    skippedPlayerCount: args.skippedPlayers.length,
    skippedAmbiguousNameCount: args.skippedPlayers.filter((p) => p.reason === "ambiguous_name").length,
    skippedInvalidStudentIdCount: args.skippedPlayers.filter((p) => p.reason === "invalid_student_id").length,
    skippedNoMatchCount: args.skippedPlayers.filter((p) => p.reason === "no_match").length,
    skippedPlayers: args.skippedPlayers.slice(0, 20),
  };

  if (args.appliedAwards.length === 0) {
    logAuditEvent({
      actorUserId: args.actorUserId,
      action: "classroom.ar_quest.rewards_skipped",
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
    action: "classroom.ar_quest.rewards_applied",
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
  const negamon = getNegamonSettings(args.classroom.gamifiedSettings);

  await Promise.allSettled(
    args.awards.map(async (award) => {
      const after = afterById.get(award.studentId);
      if (!after) return;

      if (negamon?.enabled) {
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
          console.warn("[ArQuestRewards] rank-up notify failed (non-fatal)", award.studentId, error);
        }
      }

      try {
        await sendNotification({
          studentId: award.studentId,
          type: "SUCCESS",
          link: (award.loginCode ?? after.loginCode)
            ? `/student/${award.loginCode ?? after.loginCode}`
            : undefined,
          i18n: {
            titleKey: "notifArQuestExpTitle",
            messageKey: "notifArQuestExpBody",
            params: { exp: award.exp, rank: award.rank },
          },
        });
      } catch (error) {
        console.warn("[ArQuestRewards] send notification failed (non-fatal)", award.studentId, error);
      }
    })
  );
}

export async function syncArQuestRewardsToClassroom(game: AbstractGameEngine): Promise<void> {
  if (game.gameMode !== "AR_QUEST") return;

  const classroomId = game.settings.arQuestRewardClassroomId;
  if (!classroomId || typeof classroomId !== "string") return;

  const classroom = await findRewardClassroom({
    classroomId,
    teacherId: game.hostId,
  });
  if (!classroom) {
    console.warn("[ArQuestRewards] classroom missing or host mismatch", {
      classroomId,
      hostId: game.hostId,
    });
    return;
  }

  const students = await listClassroomStudents(classroomId);
  const players = buildSnapshotPlayersFromGame(game.players as ArQuestPlayer[]);
  const resolution = resolveRewardsFromSnapshots({
    gamePin: game.pin,
    players,
    students,
  });

  if (resolution.awards.length === 0) {
    logRewardAudit({
      actorUserId: game.hostId,
      classroomId,
      gamePin: game.pin,
      setId: game.setId,
      players,
      awards: resolution.awards,
      appliedAwards: [],
      skippedPlayers: resolution.skippedPlayers,
      duplicateSkipCount: resolution.duplicateSkipCount,
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
    players,
    awards: resolution.awards,
    appliedAwards: applied.appliedAwards,
    skippedPlayers: resolution.skippedPlayers,
    duplicateSkipCount: resolution.duplicateSkipCount + applied.duplicateSkipCount,
    reasonOverride: applied.skipReason,
  });

  if (applied.appliedAwards.length === 0) return;
  await notifyAwardRecipients({
    classroom,
    awards: applied.appliedAwards,
  });
}

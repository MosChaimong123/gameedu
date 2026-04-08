import { db } from "@/lib/db";
import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";
import type { NegamonBattlePlayer } from "@/lib/types/game";
import { calcAssignmentEXP, getNegamonSettings } from "@/lib/classroom-utils";
import { resolveNegamonTuning } from "@/lib/negamon-battle-tuning";
import { notifyNegamonRankUpIfNeeded } from "@/lib/negamon/negamon-rank-notify";
import { sendNotification } from "@/lib/notifications";
import { logAuditEvent } from "@/lib/security/audit-log";
import { encodeNegamonLiveBattleReason } from "@/lib/point-history-reason";

function normalizePlayerKey(name: string): string {
  return name.trim().toLowerCase();
}

type AwardRow = {
  studentId: string;
  exp: number;
  rank: number;
  finalScore: number;
  loginCode: string | null;
};

/**
 * หลังจบ Negamon Battle — ให้ EXP เข้า student.behaviorPoints ตาม HP สุดท้าย (สูตรเดียวกับ Assignment Negamon)
 * จับคู่ชื่อในเกมกับ Student.name หรือ Student.nickname (ไม่สนตัวพิมพ์เล็กใหญ่)
 */
export async function syncNegamonBattleRewardsToClassroom(game: AbstractGameEngine): Promise<void> {
  if (game.gameMode !== "NEGAMON_BATTLE") return;

  const classroomId = game.settings.negamonRewardClassroomId;
  if (!classroomId || typeof classroomId !== "string") return;

  const classroom = await db.classroom.findFirst({
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

  const negamon = getNegamonSettings(classroom.gamifiedSettings);
  if (!negamon?.enabled) return;

  const startHp = resolveNegamonTuning({ negamonBattle: game.settings.negamonBattle }).startHp;

  const students = await db.student.findMany({
    where: { classId: classroomId },
    select: { id: true, name: true, nickname: true, behaviorPoints: true, loginCode: true },
  });

  const byKey = new Map<string, (typeof students)[number]>();
  for (const s of students) {
    byKey.set(normalizePlayerKey(s.name), s);
    if (s.nickname?.trim()) {
      byKey.set(normalizePlayerKey(s.nickname), s);
    }
  }

  const players = game.players as NegamonBattlePlayer[];
  const awards: AwardRow[] = [];
  const usedStudentIds = new Set<string>();

  players.forEach((p, idx) => {
    const st = byKey.get(normalizePlayerKey(p.name));
    if (!st || usedStudentIds.has(st.id)) return;
    usedStudentIds.add(st.id);

    const finalScore = typeof p.score === "number" ? p.score : 0;
    const exp = calcAssignmentEXP(finalScore, startHp, negamon.expPerPoint);
    if (exp <= 0) return;

    awards.push({
      studentId: st.id,
      exp,
      rank: idx + 1,
      finalScore,
      loginCode: st.loginCode,
    });
  });

  if (awards.length === 0) return;

  const beforeRows = await db.student.findMany({
    where: { id: { in: awards.map((a) => a.studentId) } },
    select: { id: true, behaviorPoints: true, loginCode: true },
  });
  const beforeById = new Map(beforeRows.map((r) => [r.id, r] as const));

  await db.$transaction(async (tx) => {
    for (const a of awards) {
      await tx.student.update({
        where: { id: a.studentId },
        data: {
          behaviorPoints: { increment: a.exp },
          history: {
            create: {
              value: a.exp,
              reason: encodeNegamonLiveBattleReason(a.rank, a.finalScore, startHp),
            },
          },
        },
      });
    }
  });

  const totalExp = awards.reduce((sum, a) => sum + a.exp, 0);
  logAuditEvent({
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

  const afterRows = await db.student.findMany({
    where: { id: { in: awards.map((a) => a.studentId) } },
    select: { id: true, behaviorPoints: true, loginCode: true },
  });
  const afterById = new Map(afterRows.map((r) => [r.id, r] as const));

  // ใช้ allSettled เพื่อให้ notification ล้มเหลวได้โดยไม่ rollback EXP หรือ retry sync
  await Promise.allSettled(
    awards.map(async (a) => {
      const before = beforeById.get(a.studentId);
      const after = afterById.get(a.studentId);
      if (!before || !after) return;

      try {
        await notifyNegamonRankUpIfNeeded({
          studentId: a.studentId,
          loginCode: a.loginCode ?? after.loginCode,
          oldPoints: before.behaviorPoints,
          newPoints: after.behaviorPoints,
          levelConfig: classroom.levelConfig,
          gamifiedSettings: classroom.gamifiedSettings,
        });
      } catch (err) {
        console.warn("[NegamonRewards] rank-up notify failed (non-fatal)", a.studentId, err);
      }

      try {
        await sendNotification({
          studentId: a.studentId,
          type: "SUCCESS",
          link: (a.loginCode ?? after.loginCode) ? `/student/${a.loginCode ?? after.loginCode}` : undefined,
          i18n: {
            titleKey: "notifNegamonBattleExpTitle",
            messageKey: "notifNegamonBattleExpBody",
            params: { exp: a.exp, rank: a.rank },
          },
        });
      } catch (err) {
        console.warn("[NegamonRewards] send notification failed (non-fatal)", a.studentId, err);
      }
    })
  );
}

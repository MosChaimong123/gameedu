import { NextRequest, NextResponse } from "next/server";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { requireSessionUser } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import {
  classifyPointHistoryReason,
  createRewardVisibilitySummary,
  filterRewardVisibilityEvents,
  readNumber,
  readRewardRecord,
  readString,
  readStringArray,
  rewardBlockedReasonLabel,
  type NegamonRewardVisibilityEvent,
  type NegamonRewardVisibilityFilter,
} from "@/lib/negamon/reward-visibility-report";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const EVENT_TYPES = new Set<NegamonRewardVisibilityFilter>([
  "all",
  "battle",
  "quest",
  "attendance",
  "level_up",
  "skill_unlock",
  "blocked",
]);

function parseLimit(value: string | null) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return DEFAULT_LIMIT;
  return Math.max(1, Math.min(parsed, MAX_LIMIT));
}

function parseEventType(value: string | null): NegamonRewardVisibilityFilter {
  return value && EVENT_TYPES.has(value as NegamonRewardVisibilityFilter)
    ? (value as NegamonRewardVisibilityFilter)
    : "all";
}

function studentName(student: { name?: string | null; nickname?: string | null } | null | undefined) {
  if (!student?.name) return null;
  return student.nickname ? `${student.name} (${student.nickname})` : student.name;
}

function sourceToKind(source: string): NegamonRewardVisibilityEvent["kind"] | null {
  if (source === "battle") return "battle";
  if (source === "quest") return "quest";
  if (source === "checkin") return "attendance";
  return null;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const user = await requireSessionUser();
  if (!user) {
    return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
  }

  const classroom = await db.classroom.findUnique({
    where: { id, teacherId: user.id },
    select: { id: true },
  });
  if (!classroom) {
    return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
  }

  const url = new URL(req.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const eventType = parseEventType(url.searchParams.get("eventType"));

  const [economyRows, historyRows, battleRows] = await Promise.all([
    db.economyTransaction.findMany({
      where: {
        classId: id,
        source: { in: ["battle", "quest", "checkin"] },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        studentId: true,
        source: true,
        amount: true,
        sourceRefId: true,
        metadata: true,
        createdAt: true,
        student: {
          select: {
            name: true,
            nickname: true,
          },
        },
      },
    }),
    db.pointHistory.findMany({
      where: {
        reason: { startsWith: "negamon_" },
        student: { classId: id },
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        studentId: true,
        value: true,
        reason: true,
        timestamp: true,
        student: {
          select: {
            name: true,
            nickname: true,
          },
        },
      },
    }),
    db.battleSession.findMany({
      where: {
        classId: id,
        interactivePending: false,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        challengerId: true,
        defenderId: true,
        winnerId: true,
        goldReward: true,
        result: true,
        createdAt: true,
      },
    }),
  ]);

  const battleStudentIds = Array.from(
    new Set(
      battleRows.flatMap((row) => [row.challengerId, row.defenderId, row.winnerId]).filter(Boolean) as string[]
    )
  );
  const battleStudents = battleStudentIds.length
    ? await db.student.findMany({
        where: { id: { in: battleStudentIds }, classId: id },
        select: { id: true, name: true, nickname: true },
      })
    : [];
  const battleStudentMap = new Map(battleStudents.map((student) => [student.id, student]));

  const economyEvents: NegamonRewardVisibilityEvent[] = economyRows.flatMap((row) => {
    const kind = sourceToKind(row.source);
    if (!kind) return [];
    const metadata = readRewardRecord(row.metadata);
    const reward = readRewardRecord(metadata.reward);
    const progression = readRewardRecord(metadata.progression);
    const blockedReason = readString(reward, "blockedReason") ?? readString(metadata, "rewardBlockedReason");
    const levelUps = Array.isArray(reward.levelUps) ? reward.levelUps : [];
    const unlockedSkillIds = readStringArray(reward, "unlockedSkillIds");
    const progressionUnlocks = readStringArray(progression, "newlyUnlockedSkillIds");

    return [
      {
        id: `economy:${row.id}`,
        kind,
        source: "economy",
        studentId: row.studentId,
        studentName: studentName(row.student),
        gold: Math.max(0, row.amount),
        exp: readNumber(metadata, "expReward") || readNumber(reward, "exp"),
        levelUpCount: levelUps.length,
        skillUnlockCount: Math.max(unlockedSkillIds.length, progressionUnlocks.length),
        blockedReason: blockedReason as NegamonRewardVisibilityEvent["blockedReason"],
        blockedReasonLabel: rewardBlockedReasonLabel(blockedReason as NegamonRewardVisibilityEvent["blockedReason"]),
        reason: row.source,
        sourceRefId: row.sourceRefId ?? null,
        createdAt: row.createdAt.toISOString(),
      },
    ];
  });

  const historyEvents: NegamonRewardVisibilityEvent[] = historyRows.flatMap((row) => {
    const kind = classifyPointHistoryReason(row.reason);
    if (!kind) return [];
    return [
      {
        id: `history:${row.id}`,
        kind,
        source: "history",
        studentId: row.studentId,
        studentName: studentName(row.student),
        gold: 0,
        exp: 0,
        levelUpCount: 0,
        skillUnlockCount: 0,
        blockedReason: null,
        blockedReasonLabel: null,
        reason: row.reason,
        sourceRefId: null,
        createdAt: row.timestamp.toISOString(),
      },
    ];
  });

  const battleEvents: NegamonRewardVisibilityEvent[] = battleRows.flatMap((row) => {
    const result = readRewardRecord(row.result);
    const reward = readRewardRecord(result.reward);
    const winnerId = readString(result, "winnerId") ?? row.winnerId;
    const blockedReason = readString(result, "rewardBlockedReason") ?? readString(reward, "blockedReason");
    if (!blockedReason) return [];
    const levelUps = Array.isArray(reward.levelUps) ? reward.levelUps : [];
    const unlockedSkillIds = readStringArray(reward, "unlockedSkillIds");

    return [
      {
        id: `battle:${row.id}`,
        kind: "battle",
        source: "battle_session",
        studentId: winnerId ?? null,
        studentName: winnerId ? studentName(battleStudentMap.get(winnerId)) : null,
        gold: Math.max(0, readNumber(result, "goldReward") || row.goldReward),
        exp: readNumber(reward, "exp"),
        levelUpCount: levelUps.length,
        skillUnlockCount: unlockedSkillIds.length,
        blockedReason: blockedReason as NegamonRewardVisibilityEvent["blockedReason"],
        blockedReasonLabel: rewardBlockedReasonLabel(blockedReason as NegamonRewardVisibilityEvent["blockedReason"]),
        reason: "battle_reward_blocked",
        sourceRefId: row.id,
        createdAt: row.createdAt.toISOString(),
      },
    ];
  });

  const allEvents = [...economyEvents, ...historyEvents, ...battleEvents]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const filteredEvents = filterRewardVisibilityEvents(allEvents, eventType).slice(0, limit);

  return NextResponse.json({
    filters: {
      classId: id,
      eventType,
      limit,
    },
    summary: createRewardVisibilitySummary(filteredEvents),
    events: filteredEvents,
  });
}

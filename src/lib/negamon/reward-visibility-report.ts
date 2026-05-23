import type { GameRewardBlockedReason } from "@/lib/game-core";

export type NegamonRewardVisibilityKind =
  | "battle"
  | "quest"
  | "attendance"
  | "level_up"
  | "skill_unlock";

export type NegamonRewardVisibilityFilter = NegamonRewardVisibilityKind | "all" | "blocked";

export type NegamonRewardVisibilityEvent = {
  id: string;
  kind: NegamonRewardVisibilityKind;
  source: "economy" | "history" | "battle_session";
  studentId: string | null;
  studentName: string | null;
  gold: number;
  exp: number;
  levelUpCount: number;
  skillUnlockCount: number;
  blockedReason: GameRewardBlockedReason | "daily_cap" | "pair_cooldown" | null;
  blockedReasonLabel: string | null;
  reason: string | null;
  sourceRefId: string | null;
  createdAt: string;
};

export type NegamonRewardVisibilitySummary = {
  eventCount: number;
  rewardEventCount: number;
  blockedEventCount: number;
  totalGold: number;
  totalExp: number;
  levelUpCount: number;
  skillUnlockCount: number;
  byEventType: Record<NegamonRewardVisibilityKind, number>;
  byBlockedReason: Record<string, number>;
};

const EMPTY_BY_EVENT_TYPE: Record<NegamonRewardVisibilityKind, number> = {
  battle: 0,
  quest: 0,
  attendance: 0,
  level_up: 0,
  skill_unlock: 0,
};

export function rewardBlockedReasonLabel(
  reason: NegamonRewardVisibilityEvent["blockedReason"]
): string | null {
  switch (reason) {
    case "daily_cap":
      return "Daily reward cap reached";
    case "pair_cooldown":
      return "Pair cooldown active";
    case "duplicate_finalize":
      return "Duplicate reward finalization";
    case "not_completed":
      return "Battle or activity is not completed";
    case "not_allowed":
      return "Reward is not allowed";
    default:
      return null;
  }
}

export function createRewardVisibilitySummary(
  events: NegamonRewardVisibilityEvent[]
): NegamonRewardVisibilitySummary {
  return events.reduce(
    (summary, event) => {
      summary.eventCount += 1;
      summary.byEventType[event.kind] += 1;
      summary.totalGold += event.gold;
      summary.totalExp += event.exp;
      summary.levelUpCount += event.levelUpCount + (event.kind === "level_up" ? 1 : 0);
      summary.skillUnlockCount += event.skillUnlockCount + (event.kind === "skill_unlock" ? 1 : 0);

      if (event.gold > 0 || event.exp > 0 || event.levelUpCount > 0 || event.skillUnlockCount > 0) {
        summary.rewardEventCount += 1;
      }

      if (event.blockedReason) {
        summary.blockedEventCount += 1;
        summary.byBlockedReason[event.blockedReason] = (summary.byBlockedReason[event.blockedReason] ?? 0) + 1;
      }

      return summary;
    },
    {
      eventCount: 0,
      rewardEventCount: 0,
      blockedEventCount: 0,
      totalGold: 0,
      totalExp: 0,
      levelUpCount: 0,
      skillUnlockCount: 0,
      byEventType: { ...EMPTY_BY_EVENT_TYPE },
      byBlockedReason: {} as Record<string, number>,
    }
  );
}

export function filterRewardVisibilityEvents(
  events: NegamonRewardVisibilityEvent[],
  eventType: NegamonRewardVisibilityFilter
) {
  if (eventType === "all") return events;
  if (eventType === "blocked") return events.filter((event) => Boolean(event.blockedReason));
  return events.filter((event) => event.kind === eventType);
}

export function classifyPointHistoryReason(reason: string): NegamonRewardVisibilityKind | null {
  if (reason === "negamon_battle_reward") return "battle";
  if (reason.startsWith("negamon_quest_reward:")) return "quest";
  if (reason.startsWith("negamon_attendance_reward:")) return "attendance";
  if (reason.startsWith("negamon_level_up")) return "level_up";
  if (reason.startsWith("negamon_skill_unlocked")) return "skill_unlock";
  return null;
}

export function readRewardRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export function readNumber(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

export function readStringArray(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

import type { NegamonContentCatalog } from "@/lib/game-negamon";

export type NegamonTeacherBalanceStudent = {
  id: string;
  name?: string | null;
  nickname?: string | null;
  behaviorPoints?: number | null;
  gold?: number | null;
};

export type NegamonTeacherBalancePointHistoryRow = {
  studentId: string;
  value: number;
  reason: string;
};

export type NegamonTeacherBalanceEconomyRow = {
  studentId: string;
  source: string;
  amount: number;
  metadata?: unknown;
  createdAt?: Date | string;
};

export type NegamonTeacherBalanceBattleRow = {
  challengerId?: string | null;
  defenderId?: string | null;
  winnerId?: string | null;
  result?: unknown;
};

export type NegamonBalanceGuardrail = {
  key: string;
  label: string;
  min: number;
  max: number;
  recommended: string;
};

export type NegamonBalanceWarning = {
  key: string;
  severity: "info" | "warning";
  label: string;
  detail: string;
};

export const NEGAMON_BALANCE_GUARDRAILS: NegamonBalanceGuardrail[] = [
  { key: "expMultiplier", label: "EXP multiplier", min: 0.25, max: 4, recommended: "0.75-1.5" },
  { key: "questGoldMultiplier", label: "Quest gold multiplier", min: 0, max: 4, recommended: "0.75-1.5" },
  { key: "battleGoldCap", label: "Battle gold cap", min: 0, max: 500, recommended: "50-150" },
  { key: "battleExpMultiplier", label: "Battle EXP multiplier", min: 0.25, max: 4, recommended: "0.75-1.5" },
];

function studentName(student: NegamonTeacherBalanceStudent | undefined) {
  if (!student) return null;
  if (!student.name) return null;
  return student.nickname ? `${student.name} (${student.nickname})` : student.name;
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function increment(map: Record<string, number>, key: string, amount = 1) {
  if (!key) return;
  map[key] = (map[key] ?? 0) + amount;
}

function topEntries(record: Record<string, number>, limit = 10) {
  return Object.entries(record)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, limit);
}

function buildWarnings(input: {
  economyRows: NegamonTeacherBalanceEconomyRow[];
  battleOutcomes: { total: number; wins: number; draws: number; unresolved: number };
  itemUsage: Record<string, number>;
}): NegamonBalanceWarning[] {
  const warnings: NegamonBalanceWarning[] = [];
  const questRows = input.economyRows.filter((row) => row.source === "quest");
  const battleRows = input.economyRows.filter((row) => row.source === "battle");
  const maxQuestReward = Math.max(0, ...questRows.map((row) => row.amount));
  const maxBattleReward = Math.max(0, ...battleRows.map((row) => row.amount));

  if (maxQuestReward > 150) {
    warnings.push({
      key: "quest_reward_high",
      severity: "warning",
      label: "High quest reward",
      detail: `Highest quest reward is ${maxQuestReward}G. Review questGoldMultiplier or one-time challenge rewards.`,
    });
  }
  if (maxBattleReward > 150) {
    warnings.push({
      key: "battle_reward_high",
      severity: "warning",
      label: "High battle reward",
      detail: `Highest battle reward is ${maxBattleReward}G. Review battle gold cap and reward item multipliers.`,
    });
  }
  if (input.battleOutcomes.total > 0 && input.battleOutcomes.unresolved / input.battleOutcomes.total > 0.2) {
    warnings.push({
      key: "battle_unresolved_rate",
      severity: "warning",
      label: "Unresolved battle rate",
      detail: "More than 20% of recent battle sessions are unresolved. Check battle completion and reward finalization.",
    });
  }
  const topItem = topEntries(input.itemUsage, 1)[0];
  if (topItem && topItem.count >= 10) {
    warnings.push({
      key: "item_reward_concentration",
      severity: "info",
      label: "Repeated item reward",
      detail: `${topItem.id} appears ${topItem.count} times in recent reward metadata.`,
    });
  }
  return warnings;
}

export function buildNegamonTeacherBalanceReport(input: {
  students: NegamonTeacherBalanceStudent[];
  pointHistoryRows: NegamonTeacherBalancePointHistoryRow[];
  economyRows: NegamonTeacherBalanceEconomyRow[];
  battleRows: NegamonTeacherBalanceBattleRow[];
  catalog: NegamonContentCatalog;
}) {
  const studentsById = new Map(input.students.map((student) => [student.id, student]));
  const progressionByStudent = new Map<string, number>();
  let levelUpCount = 0;
  let skillUnlockCount = 0;

  for (const row of input.pointHistoryRows) {
    progressionByStudent.set(row.studentId, (progressionByStudent.get(row.studentId) ?? 0) + Math.max(0, row.value));
    if (row.reason.startsWith("negamon_level_up")) levelUpCount += 1;
    if (row.reason.startsWith("negamon_skill_unlocked")) skillUnlockCount += 1;
  }

  const itemUsage: Record<string, number> = {};
  const rewardGoldBySource: Record<string, number> = {};
  const rewardCountBySource: Record<string, number> = {};
  const expBySource: Record<string, number> = {};
  const skillUnlocks: Record<string, number> = {};
  for (const row of input.economyRows) {
    const metadata = readRecord(row.metadata);
    const reward = readRecord(metadata.reward);
    const rewardRule = readRecord(metadata.rewardRule);
    increment(rewardGoldBySource, row.source, Math.max(0, row.amount));
    increment(rewardCountBySource, row.source);
    increment(expBySource, row.source, readNumber(reward, "exp") + readNumber(rewardRule, "exp"));
    for (const itemId of [
      ...readStringArray(reward, "grantedItemIds"),
      ...readStringArray(metadata, "itemRewardIds"),
      ...readStringArray(rewardRule, "itemIds"),
    ]) {
      increment(itemUsage, itemId);
    }
    for (const skillId of [
      ...readStringArray(reward, "unlockedSkillIds"),
      ...readStringArray(rewardRule, "skillIds"),
    ]) {
      increment(skillUnlocks, skillId);
    }
  }

  const battleOutcomes = { total: input.battleRows.length, wins: 0, draws: 0, unresolved: 0 };
  for (const row of input.battleRows) {
    if (row.winnerId) battleOutcomes.wins += 1;
    else {
      const result = readRecord(row.result);
      if (result.winnerId) battleOutcomes.wins += 1;
      else if (result.status === "finished") battleOutcomes.draws += 1;
      else battleOutcomes.unresolved += 1;
    }
  }

  const topProgression = [...progressionByStudent.entries()]
    .map(([studentId, progressionPoints]) => ({
      studentId,
      studentName: studentName(studentsById.get(studentId)),
      progressionPoints,
      currentBehaviorPoints: Math.max(0, Math.floor(studentsById.get(studentId)?.behaviorPoints ?? 0)),
    }))
    .sort((a, b) => b.progressionPoints - a.progressionPoints)
    .slice(0, 10);

  return {
    summary: {
      studentCount: input.students.length,
      levelUpCount,
      skillUnlockCount,
      battleOutcomes,
      itemUsage,
      rewardGoldBySource,
      rewardCountBySource,
      expBySource,
      skillUnlocks,
    },
    balanceWarnings: buildWarnings({ economyRows: input.economyRows, battleOutcomes, itemUsage }),
    rewardReview: {
      topItems: topEntries(itemUsage),
      topSkillUnlocks: topEntries(skillUnlocks),
      topRewardSources: topEntries(rewardGoldBySource),
    },
    topProgression,
    catalogPreview: {
      monsterCount: input.catalog.monsters.length,
      skillCount: input.catalog.skills.length,
      itemCount: input.catalog.items.length,
      monsters: input.catalog.monsters.slice(0, 12).map((monster) => ({
        id: monster.id,
        name: monster.name,
        role: monster.role,
        elementTypes: monster.elementTypes,
        traitCount: monster.traits.length,
        evolutionCount: monster.evolutionRules.length,
      })),
      skills: input.catalog.skills.slice(0, 20).map((skill) => ({
        id: skill.id,
        name: skill.name,
        category: skill.category,
        elementType: skill.elementType,
        energyCost: skill.energyCost,
      })),
      items: input.catalog.items.slice(0, 20).map((item) => ({
        id: item.id,
        rarity: item.rarity,
        itemType: item.itemType,
        priceGold: item.priceGold,
        effectKinds: item.effects.map((effect) => effect.kind),
      })),
    },
  };
}

export function readNegamonBalanceSettings(settings: unknown): Record<string, unknown> {
  const root = readRecord(settings);
  const negamon = readRecord(root.negamon);
  return readRecord(negamon.balance);
}

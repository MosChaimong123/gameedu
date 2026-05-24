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
  for (const row of input.economyRows) {
    const metadata = readRecord(row.metadata);
    const reward = readRecord(metadata.reward);
    for (const itemId of [
      ...readStringArray(reward, "grantedItemIds"),
      ...readStringArray(metadata, "itemRewardIds"),
    ]) {
      itemUsage[itemId] = (itemUsage[itemId] ?? 0) + 1;
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

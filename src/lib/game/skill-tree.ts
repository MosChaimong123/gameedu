import type { Skill } from "./job-system";

export const SKILL_POINTS_PER_LEVEL = 1;
export const SKILL_BASE_POINTS = 1;
export const DEFAULT_SKILL_MAX_RANK = 6;
export const RESPEC_BASE_GOLD = 500;
export const RESPEC_LEVEL_MULTIPLIER = 75;

export type SkillTreeProgress = Record<string, number>;

export type SkillTreeState = {
  skillPointsAvailable: number;
  skillPointsSpent: number;
  skillTreeProgress: SkillTreeProgress;
  lastRespecAt?: string;
};

export type SkillRankScales = {
  damageMultiplierPerRank?: number;
  costPerRank?: number;
  healMultiplierPerRank?: number;
};

export type SkillTreeLockReason =
  | "LEVEL_REQUIRED"
  | "MISSING_PREREQUISITE"
  | "NO_POINTS"
  | "MAX_RANK"
  | "SKILL_NOT_FOUND";

export type SkillTreeValidationResult =
  | { ok: true; currentRank: number; nextRank: number; pointsAfter: number }
  | { ok: false; reason: SkillTreeLockReason; message: string };

export type SkillTreeNodeView = {
  skillId: string;
  currentRank: number;
  maxRank: number;
  requiredLevel: number;
  canUpgrade: boolean;
  lockReason: SkillTreeLockReason | null;
  lockMessage: string | null;
};

export function calculateGrantedSkillPoints(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.max(0, SKILL_BASE_POINTS + (safeLevel - 1) * SKILL_POINTS_PER_LEVEL);
}

export function normalizeSkillTreeState(
  raw: Partial<SkillTreeState> | null | undefined,
  level: number
): SkillTreeState {
  const safeProgress: SkillTreeProgress =
    raw?.skillTreeProgress && typeof raw.skillTreeProgress === "object"
      ? Object.entries(raw.skillTreeProgress).reduce<SkillTreeProgress>((acc, [k, v]) => {
          const rank = typeof v === "number" ? Math.max(0, Math.floor(v)) : 0;
          if (rank > 0) acc[k] = rank;
          return acc;
        }, {})
      : {};

  const spentFromProgress = Object.values(safeProgress).reduce((sum, rank) => sum + rank, 0);
  const spent = Math.max(
    spentFromProgress,
    typeof raw?.skillPointsSpent === "number" ? Math.max(0, Math.floor(raw.skillPointsSpent)) : 0
  );
  const granted = calculateGrantedSkillPoints(level);
  // Always derive available points from level + spent.
  // This guarantees "skill points increase with level" deterministically,
  // and respec only re-allocates already-granted points (doesn't create new points).
  const available = Math.max(0, granted - spent);

  return {
    skillPointsAvailable: available,
    skillPointsSpent: spent,
    skillTreeProgress: safeProgress,
    ...(raw?.lastRespecAt ? { lastRespecAt: raw.lastRespecAt } : {}),
  };
}

/**
 * Balance guard:
 * Cap skill points by currently available skill tree capacity.
 * This prevents very high leftover points when a player has already maxed unlocked skills.
 */
export function clampSkillTreeStateToSkills(
  state: SkillTreeState,
  skills: Skill[]
): SkillTreeState {
  const skillMaxRankMap = new Map(
    skills.map((skill) => [skill.id, skill.maxRank ?? DEFAULT_SKILL_MAX_RANK] as const)
  );

  const clampedProgress = Object.entries(state.skillTreeProgress).reduce<SkillTreeProgress>(
    (acc, [skillId, rank]) => {
      const maxRank = skillMaxRankMap.get(skillId);
      if (!maxRank) return acc;
      const safeRank = Math.max(0, Math.min(Math.floor(rank), maxRank));
      if (safeRank > 0) acc[skillId] = safeRank;
      return acc;
    },
    {}
  );

  const spentFromProgress = Object.values(clampedProgress).reduce((sum, rank) => sum + rank, 0);
  return {
    ...state,
    skillTreeProgress: clampedProgress,
    skillPointsSpent: spentFromProgress,
    // Keep accumulated points (banking) even when current tree is fully capped.
    // Spending is still naturally limited by per-skill max rank/requirements.
    skillPointsAvailable: Math.max(0, state.skillPointsAvailable),
  };
}

export function getSkillRank(progress: SkillTreeProgress, skillId: string): number {
  return Math.max(0, Math.floor(progress[skillId] ?? 0));
}

export function calculateRespecCost(level: number): number {
  return Math.max(0, RESPEC_BASE_GOLD + Math.floor(level) * RESPEC_LEVEL_MULTIPLIER);
}

export function validateSkillUpgrade(params: {
  skill: Skill | undefined;
  state: SkillTreeState;
  level: number;
}): SkillTreeValidationResult {
  const { skill, state, level } = params;
  if (!skill) return { ok: false, reason: "SKILL_NOT_FOUND", message: "ไม่พบทักษะนี้" };

  const requiredLevel = skill.requiredLevel ?? skill.unlockLevel;
  if (level < requiredLevel) {
    return {
      ok: false,
      reason: "LEVEL_REQUIRED",
      message: `ต้องเลเวล ${requiredLevel} ขึ้นไป`,
    };
  }

  const currentRank = getSkillRank(state.skillTreeProgress, skill.id);
  const maxRank = skill.maxRank ?? DEFAULT_SKILL_MAX_RANK;
  if (currentRank >= maxRank) {
    return { ok: false, reason: "MAX_RANK", message: "อัปถึงแรงก์สูงสุดแล้ว" };
  }

  for (const preId of skill.prerequisite ?? []) {
    if (getSkillRank(state.skillTreeProgress, preId) <= 0) {
      return {
        ok: false,
        reason: "MISSING_PREREQUISITE",
        message: `ต้องปลดล็อก ${preId} ก่อน`,
      };
    }
  }

  if (state.skillPointsAvailable <= 0) {
    return { ok: false, reason: "NO_POINTS", message: "แต้มสกิลไม่พอ" };
  }

  return {
    ok: true,
    currentRank,
    nextRank: currentRank + 1,
    pointsAfter: state.skillPointsAvailable - 1,
  };
}

export function applySkillUpgrade(
  state: SkillTreeState,
  skillId: string
): SkillTreeState {
  const currentRank = getSkillRank(state.skillTreeProgress, skillId);
  const nextProgress = {
    ...state.skillTreeProgress,
    [skillId]: currentRank + 1,
  };

  return {
    ...state,
    skillTreeProgress: nextProgress,
    skillPointsSpent: state.skillPointsSpent + 1,
    skillPointsAvailable: Math.max(0, state.skillPointsAvailable - 1),
  };
}

export function applySkillRespec(
  state: SkillTreeState,
  nowIso: string = new Date().toISOString()
): SkillTreeState {
  return {
    skillPointsAvailable: state.skillPointsAvailable + state.skillPointsSpent,
    skillPointsSpent: 0,
    skillTreeProgress: {},
    lastRespecAt: nowIso,
  };
}

export function buildSkillTreeView(params: {
  skills: Skill[];
  state: SkillTreeState;
  level: number;
}): SkillTreeNodeView[] {
  const { skills, state, level } = params;
  return skills.map((skill) => {
    const validation = validateSkillUpgrade({ skill, state, level });
    return {
      skillId: skill.id,
      currentRank: getSkillRank(state.skillTreeProgress, skill.id),
      maxRank: skill.maxRank ?? DEFAULT_SKILL_MAX_RANK,
      requiredLevel: skill.requiredLevel ?? skill.unlockLevel,
      canUpgrade: validation.ok,
      lockReason: validation.ok ? null : validation.reason,
      lockMessage: validation.ok ? null : validation.message,
    };
  });
}

export function getEffectiveSkillAtRank(
  skill: Skill,
  rank: number
): Skill {
  const clampedRank = Math.max(0, Math.floor(rank));
  if (clampedRank <= 0) return skill;

  const scales = skill.rankScales ?? {};
  const damagePerRank = scales.damageMultiplierPerRank ?? 0;
  const healPerRank = scales.healMultiplierPerRank ?? 0;
  const costPerRank = scales.costPerRank ?? 0;

  const nextDamageMultiplier =
    typeof skill.damageMultiplier === "number"
      ? Number((skill.damageMultiplier * (1 + damagePerRank * clampedRank)).toFixed(4))
      : skill.damageMultiplier;

  const nextHealMultiplier =
    typeof skill.healMultiplier === "number"
      ? Number((skill.healMultiplier * (1 + healPerRank * clampedRank)).toFixed(4))
      : skill.healMultiplier;

  const nextCost = Math.max(0, Math.floor(skill.cost + costPerRank * clampedRank));

  return {
    ...skill,
    cost: nextCost,
    damageMultiplier: nextDamageMultiplier,
    healMultiplier: nextHealMultiplier,
  };
}

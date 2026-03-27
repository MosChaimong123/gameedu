import { randomUUID } from "crypto";
import type { PlayerBattleState, BattleLogEntry } from "./boss-config";

/**
 * Teacher-set raid configuration on the classroom (no shared HP — each student has their own copy).
 */
export type BossRaidTemplate = {
  templateId: string;
  bossId: string;
  difficulty: string;
  name: string;
  image: string;
  element: string;
  elementIcon: string;
  elementKey: string;
  maxHp: number;
  rewardGold: number;
  rewardXp: number;
  rewardMaterials: { type: string; quantity: number }[];
  passiveDamageMultiplier: number;
  createdAt: string;
};

/** Runtime boss state stored on student.gameStats.personalClassroomBoss */
export type PersonalClassroomBoss = BossRaidTemplate & {
  instanceId: string;
  active: boolean;
  currentHp: number;
  triggeredSkills: string[];
  activeEffect: unknown;
  rewardDistributedAt: string | null;
  recentAttacks?: { jobClass: string; timestamp: number }[];

  // ── Final Fantasy Battle System ───────────────────────────────────────────
  staggerGauge?: number;        // 0–100; hits fill this; at 100 → STAGGERED
  isStaggered?: boolean;
  staggerExpiry?: number | null; // Unix-ms when stagger ends
  totalAttacksReceived?: number; // total hits by this student (for boss-turn trigger)
  actionQueueIndex?: number;     // cycles through boss actions
  playerBattleState?: PlayerBattleState; // this student's HP/status effects
  battleLog?: BattleLogEntry[];  // last 15 entries shown in UI
};

const TEMPLATE_KEY = "bossRaidTemplate";

export function getBossRaidTemplate(
  gamifiedSettings: Record<string, unknown> | null | undefined
): BossRaidTemplate | null {
  const raw = gamifiedSettings?.[TEMPLATE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.templateId !== "string" || typeof t.bossId !== "string") return null;
  return raw as BossRaidTemplate;
}

export function persistGamifiedSettingsWithBossTemplate(
  existing: Record<string, unknown>,
  template: BossRaidTemplate | null
): Record<string, unknown> {
  const { boss: _b, bosses: _bs, [TEMPLATE_KEY]: _old, ...rest } = existing;
  void _b;
  void _bs;
  void _old;
  if (!template) {
    return { ...rest };
  }
  return { ...rest, [TEMPLATE_KEY]: template };
}

export function getPersonalBossFromStats(gameStats: unknown): PersonalClassroomBoss | null {
  const gs = (gameStats && typeof gameStats === "object" ? gameStats : {}) as Record<string, unknown>;
  const p = gs.personalClassroomBoss;
  if (!p || typeof p !== "object") return null;
  const pb = p as Record<string, unknown>;
  if (typeof pb.templateId !== "string" || typeof pb.currentHp !== "number") return null;
  return p as PersonalClassroomBoss;
}

export function spawnPersonalBossFromTemplate(t: BossRaidTemplate): PersonalClassroomBoss {
  return {
    ...t,
    instanceId: randomUUID(),
    active: true,
    currentHp: t.maxHp,
    triggeredSkills: [],
    activeEffect: null,
    rewardDistributedAt: null,
    recentAttacks: [],
  };
}

/**
 * Resolves the boss row for the student UI: spawns a fresh personal copy from the
 * classroom template when missing or when the teacher changed the template.
 */
export function getRaidBossForStudentUi(
  gamifiedSettings: unknown,
  gameStats: unknown
): PersonalClassroomBoss | null {
  const t = getBossRaidTemplate(
    (gamifiedSettings && typeof gamifiedSettings === "object"
      ? gamifiedSettings
      : {}) as Record<string, unknown>
  );
  if (!t) return null;
  const p = getPersonalBossFromStats(gameStats);
  if (!p || p.templateId !== t.templateId) {
    return {
      ...spawnPersonalBossFromTemplate(t),
      instanceId: `preview-${t.templateId}`,
    };
  }
  return p;
}

export function mergeGameStatsWithPersonalBoss(
  gameStats: unknown,
  personal: PersonalClassroomBoss | null
): Record<string, unknown> {
  const base =
    gameStats && typeof gameStats === "object"
      ? { ...(gameStats as Record<string, unknown>) }
      : {};
  if (personal === null) {
    delete base.personalClassroomBoss;
    return base;
  }
  return { ...base, personalClassroomBoss: personal };
}

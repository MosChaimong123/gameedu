import { randomUUID } from "crypto";

/** Max concurrent classroom boss instances per room */
export const MAX_CLASSROOM_BOSSES = 5;

/** Stored JSON shape for one boss instance (matches prior single `boss` object + instanceId) */
export type ClassroomBossInstance = Record<string, unknown> & {
  instanceId: string;
  active: boolean;
  currentHp: number;
  maxHp?: number;
  bossId?: string;
  elementKey?: string;
};

function ensureInstanceId(b: Record<string, unknown>, index: number): ClassroomBossInstance {
  const id =
    typeof b.instanceId === "string" && b.instanceId.length > 0
      ? b.instanceId
      : `migrated-${index}-${String(b.bossId ?? "boss")}-${String(b.createdAt ?? "0")}`;
  return { ...b, instanceId: id } as ClassroomBossInstance;
}

/**
 * Read `bosses[]` or migrate legacy single `boss` into a one-element list.
 */
export function normalizeBossesFromGamifiedSettings(
  settings: Record<string, unknown> | null | undefined
): ClassroomBossInstance[] {
  const raw = settings ?? {};
  const bosses = raw.bosses;
  if (Array.isArray(bosses) && bosses.length > 0) {
    return bosses.map((b, i) => ensureInstanceId(b as Record<string, unknown>, i));
  }
  const legacy = raw.boss as Record<string, unknown> | undefined;
  if (legacy && typeof legacy === "object") {
    return [ensureInstanceId(legacy, 0)];
  }
  return [];
}

export function persistGamifiedSettingsWithBosses(
  existing: Record<string, unknown>,
  bosses: ClassroomBossInstance[]
): Record<string, unknown> {
  const { boss: _removed, ...rest } = existing;
  void _removed;
  if (bosses.length === 0) {
    return { ...rest, bosses: [] };
  }
  return { ...rest, bosses };
}

export function resolveTargetInstanceId(
  bosses: ClassroomBossInstance[],
  requested: string | null | undefined,
  pickFirstWhenMultiple = false
): { ok: true; instanceId: string; index: number } | { ok: false; error: string } {
  const alive = bosses.filter((b) => b.active !== false && Number(b.currentHp) > 0);
  if (alive.length === 0) {
    return { ok: false, error: "No active boss" };
  }
  if (requested) {
    const idx = bosses.findIndex((b) => b.instanceId === requested);
    if (idx === -1) {
      return { ok: false, error: "Boss not found" };
    }
    const b = bosses[idx];
    if (b.active === false || Number(b.currentHp) <= 0) {
      return { ok: false, error: "No active boss" };
    }
    return { ok: true, instanceId: requested, index: idx };
  }
  if (alive.length === 1) {
    const only = alive[0];
    const idx = bosses.findIndex((b) => b.instanceId === only.instanceId);
    return { ok: true, instanceId: only.instanceId, index: Math.max(0, idx) };
  }
  if (pickFirstWhenMultiple) {
    const first = alive[0];
    const idx = bosses.findIndex((b) => b.instanceId === first.instanceId);
    return { ok: true, instanceId: first.instanceId, index: Math.max(0, idx) };
  }
  return { ok: false, error: "SELECT_BOSS_TARGET" };
}

export function newBossInstanceId(): string {
  return randomUUID();
}

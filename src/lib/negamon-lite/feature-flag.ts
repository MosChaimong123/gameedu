/**
 * Student dashboard Pokemon-lite battle rollout.
 * Enabled by default; set `NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED=false` to roll back to the old interactive battle.
 */
export function isNegamonLiteBattleEnabled(): boolean {
    const raw = process.env.NEXT_PUBLIC_NEGAMON_LITE_BATTLE_ENABLED?.trim().toLowerCase();
    if (raw === "false" || raw === "0" || raw === "off") return false;
    return true;
}

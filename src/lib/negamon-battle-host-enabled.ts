/**
 * Live Negamon Battle from the host flow (mode picker + create-game).
 * Set `NEXT_PUBLIC_NEGAMON_BATTLE_HOST_ENABLED=true` to re-enable (server + browser).
 */
export function isNegamonBattleHostEnabled(): boolean {
  return process.env.NEXT_PUBLIC_NEGAMON_BATTLE_HOST_ENABLED === "true";
}

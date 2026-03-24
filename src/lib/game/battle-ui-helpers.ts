import type { BattlePlayer, SoloMonster } from "@/lib/types/game";

type SoloFarmingStateLike = {
  wave: number;
  monster: SoloMonster;
  ap: number;
  stamina?: number;
  maxStamina?: number;
  mp: number;
} | null;

export function resolveBattleStamina(player: Pick<BattlePlayer, "ap" | "stamina">): number {
  return player.stamina ?? player.ap;
}

export function resolveBattleMaxStamina(player: Pick<BattlePlayer, "maxAp" | "maxStamina">): number {
  return player.maxStamina ?? player.maxAp;
}

export function resolveSoloFarmingResources(
  farmingState: SoloFarmingStateLike,
  player: Pick<BattlePlayer, "ap" | "stamina" | "maxAp" | "maxStamina" | "mp" | "maxMp">
) {
  return {
    stamina: farmingState?.stamina ?? farmingState?.ap ?? player.stamina ?? player.ap,
    maxStamina: farmingState?.maxStamina ?? player.maxStamina ?? player.maxAp,
    mp: farmingState?.mp ?? player.mp,
    maxMp: player.maxMp,
  };
}

export function getVisibleSkillIds(skills: string[], limit: number): string[] {
  return skills.slice(0, limit);
}

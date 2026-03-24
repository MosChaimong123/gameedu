type ItemStatSource = {
  baseHp?: number | null;
  baseAtk?: number | null;
  baseDef?: number | null;
  baseSpd?: number | null;
  baseCrit?: number | null;
  baseLuck?: number | null;
  baseMag?: number | null;
  baseMp?: number | null;
};

export type StudentItemStatSnapshot = {
  hp: number;
  atk: number;
  def: number;
  spd: number;
  crit: number;
  luck: number;
  mag: number;
  mp: number;
};

export function getEnhancementMultiplier(enhancementLevel = 0): number {
  return 1 + enhancementLevel * 0.1;
}

export function buildStudentItemStatSnapshot(
  item: ItemStatSource,
  enhancementLevel = 0
): StudentItemStatSnapshot {
  const mult = getEnhancementMultiplier(enhancementLevel);

  return {
    hp: Math.floor((item.baseHp ?? 0) * mult),
    atk: Math.floor((item.baseAtk ?? 0) * mult),
    def: Math.floor((item.baseDef ?? 0) * mult),
    spd: Math.floor((item.baseSpd ?? 0) * mult),
    crit: Number(((item.baseCrit ?? 0) * mult).toFixed(3)),
    luck: Number(((item.baseLuck ?? 0) * mult).toFixed(3)),
    mag: Math.floor((item.baseMag ?? 0) * mult),
    mp: Math.floor((item.baseMp ?? 0) * mult),
  };
}

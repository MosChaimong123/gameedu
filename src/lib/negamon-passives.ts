export type PassiveEffectType =
    | "gold_rate_bonus" // +N G/hr added on top of rank goldRate
    | "checkin_bonus" // +N G added on every daily check-in
    | "streak_shield"; // protects streak from breaking if miss 1 day

export interface NegamonPassive {
    id: string;
    icon: string;
    cost: number;
    effect: PassiveEffectType;
    value: number;
}

export const NEGAMON_PASSIVES: NegamonPassive[] = [
    {
        id: "gold_flow",
        icon: "💰",
        cost: 100,
        effect: "gold_rate_bonus",
        value: 2,
    },
    {
        id: "lucky_checkin",
        icon: "🍀",
        cost: 150,
        effect: "checkin_bonus",
        value: 5,
    },
    {
        id: "iron_will",
        icon: "🛡️",
        cost: 200,
        effect: "streak_shield",
        value: 1,
    },
];

export function getPassiveById(id: string): NegamonPassive | undefined {
    return NEGAMON_PASSIVES.find((p) => p.id === id);
}

export function negamonPassiveNameKey(id: string): string {
    return `negamonPassive_${id}_name`;
}

export function negamonPassiveDescKey(id: string): string {
    return `negamonPassive_${id}_desc`;
}

export function calcGoldRateBonus(negamonSkills: string[]): number {
    return NEGAMON_PASSIVES.filter(
        (p) => p.effect === "gold_rate_bonus" && negamonSkills.includes(p.id)
    ).reduce((sum, p) => sum + p.value, 0);
}

export function calcCheckinBonus(negamonSkills: string[]): number {
    return NEGAMON_PASSIVES.filter(
        (p) => p.effect === "checkin_bonus" && negamonSkills.includes(p.id)
    ).reduce((sum, p) => sum + p.value, 0);
}

export function hasStreakShield(negamonSkills: string[]): boolean {
    return negamonSkills.includes("iron_will");
}

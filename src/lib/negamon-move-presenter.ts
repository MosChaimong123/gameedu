/**
 * Shared Negamon move labels, badge classes, and effect copy helpers
 * (monster card, codex / info grids — single source of truth).
 */
import type { MonsterMove, MonsterType, MoveCategory, StatusEffect } from "@/lib/types/negamon";

export type NegamonTranslateFn = (
    key: string,
    params?: Record<string, string | number>
) => string;

/** Tailwind classes for move type pill */
export const NEGAMON_MOVE_TYPE_BADGE: Record<string, string> = {
    FIRE: "bg-orange-100 text-orange-700 border-orange-200",
    WATER: "bg-sky-100 text-sky-700 border-sky-200",
    EARTH: "bg-green-100 text-green-700 border-green-200",
    WIND: "bg-cyan-100 text-cyan-700 border-cyan-200",
    THUNDER: "bg-yellow-100 text-yellow-700 border-yellow-200",
    LIGHT: "bg-amber-100 text-amber-700 border-amber-200",
    DARK: "bg-purple-100 text-purple-700 border-purple-200",
    PSYCHIC: "bg-pink-100 text-pink-700 border-pink-200",
};

/** Tailwind classes for move category pill */
export const NEGAMON_MOVE_CATEGORY_BADGE: Record<string, string> = {
    PHYSICAL: "bg-orange-50 text-orange-600 border-orange-100",
    SPECIAL: "bg-purple-50 text-purple-600 border-purple-100",
    STATUS: "bg-slate-50 text-slate-500 border-slate-200",
    HEAL: "bg-green-50 text-green-600 border-green-100",
};

export const NEGAMON_TYPE_GLYPH: Record<string, string> = {
    FIRE: "🔥",
    WATER: "💧",
    EARTH: "🌿",
    WIND: "🌪️",
    THUNDER: "⚡",
    LIGHT: "✨",
    DARK: "🌑",
    PSYCHIC: "🔮",
};

export function negamonTypeGlyph(type: MonsterType | string): string {
    return NEGAMON_TYPE_GLYPH[type] ?? "◆";
}

export function negamonMonsterTypeLabel(t: NegamonTranslateFn, type: MonsterType | string): string {
    const key = `monsterType_${type}`;
    const out = t(key);
    if (out !== key) return out;
    return String(type);
}

export function negamonMoveCategoryLabel(t: NegamonTranslateFn, category: MoveCategory): string {
    return t(`monsterMoveCat_${category}`);
}

function effectDescriptionKey(effect: StatusEffect): string {
    return `monsterMoveEffect_${effect}`;
}

export function negamonMoveEffectTurns(effect: StatusEffect): number | null {
    switch (effect) {
        case "BURN":
            return 3;
        case "PARALYZE":
        case "SLEEP":
        case "BOOST_ATK":
        case "BOOST_DEF":
        case "BOOST_SPD":
        case "BOOST_WATER_DMG":
            return 2;
        case "POISON":
        case "BADLY_POISON":
        case "FREEZE":
            return -1;
        default:
            return null;
    }
}

export function negamonMoveEffectRealDescription(t: NegamonTranslateFn, move: MonsterMove): string | null {
    if (!move.effect) return null;
    const key = effectDescriptionKey(move.effect);
    const translated = t(key);
    if (translated !== key) return translated;
    return move.effect.replace(/_/g, " ").toLowerCase();
}

export function negamonMoveDisplayName(t: NegamonTranslateFn, move: MonsterMove): string {
    const key = `move_${move.id.replace(/-/g, "_")}`;
    const out = t(key);
    if (out !== key) return out;
    return move.name;
}

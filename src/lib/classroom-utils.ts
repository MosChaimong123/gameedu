import { getNegamonSettingsFromGamification } from "@/lib/services/classroom-settings/gamification-settings";

export type LevelConfig = {
    [key: string]: number;
};

export type LevelConfigInput = LevelConfig | RankEntry[] | null | undefined;

export type RankEntry = {
    name: string;
    minScore: number;
    icon?: string;    // emoji
    color?: string;   // hex or tailwind color token
    goldRate?: number; // Gold per hour
};

/** Helpers for custom classroom themes */
export function getThemeBgClass(theme?: string | null): string {
    if (!theme) return "from-indigo-500 to-purple-600";
    if (theme.startsWith("custom:")) return "";
    return theme;
}

/**
 * Horizontal gradient background for headers/buttons. Preset themes in DB are only color stops
 * (e.g. "from-blue-400 to-cyan-500") and MUST be paired with `bg-gradient-to-r`.
 * For `custom:…` themes, returns "" — use `getThemeBgStyle(theme)` on the same element.
 */
export function getThemeHorizontalBgClass(theme?: string | null): string {
    if (!theme) return "bg-gradient-to-r from-indigo-500 to-purple-600";
    if (theme.startsWith("custom:")) return "";
    return `bg-gradient-to-r ${theme}`;
}

export function getThemeBgStyle(theme?: string | null): { backgroundImage?: string } {
    if (!theme || !theme.startsWith("custom:")) return {};
    const parts = theme.replace("custom:", "").split(",");
    const color1 = parts[0] || "#6366f1";
    const color2 = parts[1] || "#a855f7";
    return { backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` };
}

export function getClassroomTheme(theme?: string | null) {
    return {
        themeClass: getThemeBgClass(theme),
        themeStyle: getThemeBgStyle(theme)
    };
}

export function getThemeTextClass(theme?: string | null): string {
    if (!theme) return "from-indigo-500 to-purple-600";
    if (theme.startsWith("custom:")) return "";
    return theme;
}

export const DEFAULT_RANK_ENTRIES: RankEntry[] = [
    { name: 'Common',    minScore: 5,   icon: '⚪',  color: '#94a3b8', goldRate: 1 },
    { name: 'Uncommon',  minScore: 10,  icon: '🟢',  color: '#22c55e', goldRate: 5 },
    { name: 'Rare',      minScore: 15,  icon: '🔵',  color: '#3b82f6', goldRate: 10 },
    { name: 'Epic',      minScore: 20,  icon: '🟣',  color: '#a855f7', goldRate: 20 },
    { name: 'Legendary', minScore: 30,  icon: '🟠',  color: '#f97316', goldRate: 80 },
    { name: 'Mythic',    minScore: 40,  icon: '🔴',  color: '#ef4444', goldRate: 50 },
];

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
    'Common': 5,
    'Uncommon': 10,
    'Rare': 15,
    'Epic': 20,
    'Legendary': 30,
    'Mythic': 40,
};

/** Parse levelConfig from DB — supports both old object format and new array format */
export function parseLevelConfigToEntries(raw: LevelConfigInput): RankEntry[] {
    if (!raw) return DEFAULT_RANK_ENTRIES;
    // New array format
    if (Array.isArray(raw)) {
        return (raw as RankEntry[]).sort((a, b) => a.minScore - b.minScore);
    }
    // Old object format: { [name]: minScore }
    return Object.entries(raw)
        .map(([name, minScore]) => {
            const def = DEFAULT_RANK_ENTRIES.find(r => r.name === name);
            return {
                ...def,
                name,
                minScore: minScore as number,
                goldRate: (def?.goldRate ?? 0)
            } as RankEntry;
        })
        .sort((a, b) => a.minScore - b.minScore);
}

/** Get rank name from a score, supporting both old and new levelConfig formats */
export function getRankEntry(totalPoints: number, levelConfig?: LevelConfigInput): RankEntry {
    const entries = parseLevelConfigToEntries(levelConfig);
    let current = entries[0] || DEFAULT_RANK_ENTRIES[0];
    for (const entry of entries) {
        if (totalPoints >= entry.minScore) current = entry;
        else break;
    }
    return current;
}

export function getStudentRank(totalPoints: number, levelConfig?: LevelConfigInput): string {
    return getRankEntry(totalPoints, levelConfig).name;
}

export function getNextRankProgress(totalPoints: number, levelConfig?: LevelConfigInput) {
    const entries = parseLevelConfigToEntries(levelConfig);
    
    let currentRankIndex = 0;
    for (let i = 0; i < entries.length; i++) {
        if (totalPoints >= entries[i].minScore) {
            currentRankIndex = i;
        } else {
            break;
        }
    }

    const currentRank = entries[currentRankIndex];
    const nextRank = entries[currentRankIndex + 1];

    if (!nextRank) {
        return {
            currentRank: currentRank.name,
            nextRank: null,
            progress: 100,
            pointsNeeded: 0
        };
    }

    const range = nextRank.minScore - currentRank.minScore;
    const earned = totalPoints - currentRank.minScore;
    const progress = Math.min(Math.max((earned / (range || 1)) * 100, 0), 100);

    return {
        currentRank: currentRank.name,
        nextRank: nextRank.name,
        progress,
        pointsNeeded: nextRank.minScore - totalPoints
    };
}

// ============================================================
// Negamon Classroom RPG — Utility Functions
// ============================================================

import type {
    MonsterType,
    MonsterBaseStats,
    MonsterMove,
    MonsterSpecies,
    MonsterStats,
    NegamonSettings,
    StudentMonsterState,
    DamageResult,
    SelectedAction,
} from "./types/negamon";
import { DEFAULT_NEGAMON_SPECIES } from "./negamon-species";

export type {
    MonsterType,
    MonsterBaseStats,
    MonsterMove,
    MonsterSpecies,
    MonsterStats,
    NegamonSettings,
    StudentMonsterState,
    DamageResult,
    SelectedAction,
};

/** Type Chart: moveType → defenderType → multiplier */
export const MONSTER_TYPE_CHART: Partial<Record<MonsterType, Partial<Record<MonsterType, number>>>> = {
    FIRE:    { EARTH: 2, WIND: 2,    WATER: 0.5, FIRE: 0.5    },
    WATER:   { FIRE: 2,  EARTH: 2,   THUNDER: 0.5, WATER: 0.5 },
    EARTH:   { THUNDER: 2,           FIRE: 0.5,  WIND: 0.5    },
    WIND:    { EARTH: 2,             THUNDER: 0.5              },
    THUNDER: { WATER: 2, WIND: 2,    EARTH: 0.5                },
    LIGHT:   { DARK: 2,              PSYCHIC: 0.5              },
    DARK:    { PSYCHIC: 2,           LIGHT: 0.5                },
    PSYCHIC: { LIGHT: 2,             DARK: 0.5                 },
};

export type NegamonTableProgressHint =
    | null
    | { kind: "threshold"; rankName: string }
    | { kind: "pointsToNext"; need: number; nextRankName: string };

/** ดึง rank index 0-5 จาก points (0 = Common, 5 = Mythic) */
export function getRankIndex(points: number, levelConfig?: LevelConfigInput): number {
    const entries = parseLevelConfigToEntries(levelConfig);
    let index = 0;
    for (let i = 0; i < entries.length; i++) {
        if (points >= entries[i].minScore) index = i;
        else break;
    }
    return index;
}

/** ดึง Monster form + species ของนักเรียน */
export function getStudentMonsterState(
    studentId: string,
    points: number,
    levelConfig: LevelConfigInput,
    negamon: NegamonSettings
): StudentMonsterState | null {
    const speciesId = negamon.studentMonsters?.[studentId];
    if (!speciesId) return null;
    // DEFAULT_NEGAMON_SPECIES เป็น source of truth เสมอ (ค่า stats/moves อัพเดตจากโค้ด)
    // fallback ไป DB species เฉพาะกรณีครูสร้าง custom species เองที่ไม่มีใน DEFAULT
    const species =
        DEFAULT_NEGAMON_SPECIES.find((s) => s.id === speciesId) ??
        negamon.species.find((s) => s.id === speciesId);
    if (!species) return null;

    const rankIndex = getRankIndex(points, levelConfig);
    const form = species.forms[rankIndex] ?? species.forms[0];
    const stats = calcMonsterStats(species.baseStats, rankIndex);
    const unlockedMoves = getUnlockedMoves(species, rankIndex, negamon.disabledMoves);
    const type2 = rankIndex >= 3 ? species.type2 : undefined;

    return { speciesId, speciesName: species.name, type: species.type, type2, form, stats, unlockedMoves, rankIndex, ability: species.ability };
}

/** คำนวณ Stats จาก baseStats + rankIndex (0-5) */
export function calcMonsterStats(baseStats: MonsterBaseStats, rankIndex: number): MonsterStats {
    const level = rankIndex + 1; // 1-6
    return {
        hp:  Math.floor(baseStats.hp  * (1 + level * 0.30)),
        atk: Math.floor(baseStats.atk * (1 + level * 0.25)),
        def: Math.floor(baseStats.def * (1 + level * 0.25)),
        spd: Math.floor(baseStats.spd * (1 + level * 0.20)),
    };
}

/** Moves ที่ unlock แล้วตาม rankIndex และไม่ถูกครูปิด */
export function getUnlockedMoves(
    species: MonsterSpecies,
    rankIndex: number,
    disabledMoves: string[] = []
): MonsterMove[] {
    const disabled = new Set(disabledMoves);
    return species.moves.filter(
        (m) => m.learnRank <= rankIndex + 1 && !disabled.has(m.id)
    );
}

/** Type multiplier จาก type chart */
export function getTypeMultiplier(moveType: MonsterType, defenderType: MonsterType): number {
    return MONSTER_TYPE_CHART[moveType]?.[defenderType] ?? 1.0;
}

/** Effectiveness label สำหรับแสดงใน UI */
export function getEffectiveness(multiplier: number): "super" | "normal" | "weak" {
    if (multiplier >= 2) return "super";
    if (multiplier <= 0.5) return "weak";
    return "normal";
}

/** คำนวณ Damage */
export function calcDamage(
    atk: number,
    def: number,
    movePower: number,
    typeMultiplier: number,
    isFast: boolean
): DamageResult {
    const base = Math.max(1, Math.floor((atk / Math.max(def, 1)) * movePower * typeMultiplier / 2));
    const damage = Math.floor(base * (isFast ? 1.5 : 1.0));
    return {
        damage,
        typeMultiplier,
        effectiveness: getEffectiveness(typeMultiplier),
        isFast,
    };
}

/** EXP ที่ได้จาก Assignment score */
export function calcAssignmentEXP(score: number, maxScore: number, expPerPoint: number): number {
    const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const multiplier = pct >= 90 ? 2.0 : pct >= 70 ? 1.5 : pct >= 50 ? 1.0 : 0.5;
    return Math.floor(maxScore * multiplier * (expPerPoint / 10));
}

/**
 * แรงค์ + ตัวเลขความคืบหน้าในช่วงแรงค์ (ใช้ในตาราง Negamon — ยังไม่มี EXP แยกจากแต้มห้อง)
 */
export function getNegamonTableProgress(
    totalPoints: number,
    levelConfig?: LevelConfigInput
): { rankName: string; progressText: string; progressHint: NegamonTableProgressHint } {
    const entries = parseLevelConfigToEntries(levelConfig);
    if (entries.length === 0) {
        return { rankName: "—", progressText: "—", progressHint: null };
    }

    let idx = -1;
    for (let i = 0; i < entries.length; i++) {
        if (totalPoints >= entries[i].minScore) idx = i;
        else break;
    }

    if (idx < 0) {
        const first = entries[0];
        return {
            rankName: first.name,
            progressText: `${totalPoints}/${first.minScore}`,
            progressHint: { kind: "threshold", rankName: first.name },
        };
    }

    const cur = entries[idx];
    const next = entries[idx + 1];
    if (!next) {
        return {
            rankName: cur.name,
            progressText: "MAX",
            progressHint: null,
        };
    }

    const denom = Math.max(1, next.minScore - cur.minScore);
    const num = Math.max(0, totalPoints - cur.minScore);
    const need = next.minScore - totalPoints;
    return {
        rankName: cur.name,
        progressText: `${Math.min(num, denom)}/${denom}`,
        progressHint:
            need > 0 ? { kind: "pointsToNext", need, nextRankName: next.name } : null,
    };
}

/** ดึง NegamonSettings จาก gamifiedSettings JSON */
export function getNegamonSettings(gamifiedSettings: unknown): NegamonSettings | null {
    return getNegamonSettingsFromGamification(gamifiedSettings);
}

/** Format large numbers with abbreviations (K, M, G, T) */
export function formatAmount(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (absNum >= 1e9)  return (num / 1e9).toFixed(1) + 'G';
    if (absNum >= 1e6)  return (num / 1e6).toFixed(1) + 'M';
    if (absNum >= 1e3)  return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

/**
 * Returns the highest gold multiplier from active classroom events.
 * Returns 1 if no gold boost event is active.
 */
export function getActiveGoldMultiplier(gamifiedSettings: any): number {
    if (!gamifiedSettings || typeof gamifiedSettings !== "object") return 1;
    
    const events = (gamifiedSettings.events as any[]) || [];
    if (!Array.isArray(events)) return 1;

    const now = new Date();

    const activeGoldBoosts = events.filter(event => {
        // Match gold boost types or CUSTOM boost
        const isGoldBoost = event.type === "GOLD_BOOST" || event.type === "GOLD_BOOST_3" || event.type === "CUSTOM";
        if (!isGoldBoost) return false;

        // Multiplier should be > 1 to be relevant
        const m = Number(event.multiplier) || 1;
        if (m <= 1) return false;

        const start = new Date(event.startAt);
        const end = new Date(event.endAt);
        
        // Active check based on current time
        return now >= start && now <= end;
    });

    if (activeGoldBoosts.length === 0) return 1;

    // Use the highest multiplier among all active gold boost events
    return Math.max(...activeGoldBoosts.map(e => Number(e.multiplier) || 1), 1);
}



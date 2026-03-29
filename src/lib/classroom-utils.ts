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

/** Format large numbers with abbreviations (K, M, G, T) */
export function formatAmount(num: number): string {
    const absNum = Math.abs(num);
    if (absNum >= 1e12) return (num / 1e12).toFixed(1) + 'T';
    if (absNum >= 1e9)  return (num / 1e9).toFixed(1) + 'G';
    if (absNum >= 1e6)  return (num / 1e6).toFixed(1) + 'M';
    if (absNum >= 1e3)  return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

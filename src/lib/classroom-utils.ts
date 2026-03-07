export type LevelConfig = {
    [key: string]: number;
};

// New rich rank format stored in levelConfig JSON
export type RankEntry = {
    name: string;
    minScore: number;
    icon?: string;    // emoji
    color?: string;   // hex or tailwind color token
};

export const DEFAULT_RANK_ENTRIES: RankEntry[] = [
    { name: 'ชาวบ้าน',     minScore: 0,   icon: '🧑',  color: '#94a3b8' },
    { name: 'ทหารฝึกหัด', minScore: 10,  icon: '⚔️',  color: '#22c55e' },
    { name: 'ผู้พิทักษ์', minScore: 20,  icon: '🛡️',  color: '#3b82f6' },
    { name: 'อัศวิน',     minScore: 40,  icon: '🗡️',  color: '#8b5cf6' },
    { name: 'กัปตัน',     minScore: 60,  icon: '⚓',  color: '#f59e0b' },
    { name: 'ฮีโร่',      minScore: 80,  icon: '🦸',  color: '#ef4444' },
    { name: 'ตำนาน',      minScore: 100, icon: '👑',  color: '#f97316' },
];

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
    'ชาวบ้าน': 0,
    'ทหารฝึกหัด': 10,
    'ผู้พิทักษ์': 20,
    'อัศวิน': 40,
    'กัปตัน': 60,
    'ฮีโร่': 80,
    'ตำนาน': 100,
};

/** Parse levelConfig from DB — supports both old object format and new array format */
export function parseLevelConfigToEntries(raw: any): RankEntry[] {
    if (!raw) return DEFAULT_RANK_ENTRIES;
    // New array format
    if (Array.isArray(raw)) {
        return (raw as RankEntry[]).sort((a, b) => a.minScore - b.minScore);
    }
    // Old object format: { [name]: minScore }
    return Object.entries(raw)
        .map(([name, minScore]) => ({ name, minScore: minScore as number }))
        .sort((a, b) => a.minScore - b.minScore);
}

/** Get rank name from a score, supporting both old and new levelConfig formats */
export function getRankEntry(totalPoints: number, levelConfig?: any): RankEntry {
    const entries = parseLevelConfigToEntries(levelConfig);
    let current = entries[0] || DEFAULT_RANK_ENTRIES[0];
    for (const entry of entries) {
        if (totalPoints >= entry.minScore) current = entry;
        else break;
    }
    return current;
}

export function getStudentRank(totalPoints: number, levelConfig?: LevelConfig | any): string {
    const config = (levelConfig && Object.keys(levelConfig).length > 0) 
        ? levelConfig as LevelConfig 
        : DEFAULT_LEVEL_CONFIG;

    let currentRank = Object.keys(config)[0] || 'Unknown';
    let highestThreshold = -1;

    for (const [rankName, minScore] of Object.entries(config)) {
        if (totalPoints >= (minScore as number) && (minScore as number) > highestThreshold) {
            currentRank = rankName;
            highestThreshold = minScore as number;
        }
    }

    return currentRank;
}

export function getNextRankProgress(totalPoints: number, levelConfig?: LevelConfig | any) {
    const config = (levelConfig && Object.keys(levelConfig).length > 0) 
        ? levelConfig as LevelConfig 
        : DEFAULT_LEVEL_CONFIG;

    // Sort by threshold to find the current and next
    const sortedRanks = Object.entries(config).sort((a, b) => (a[1] as number) - (b[1] as number));
    
    let currentRankIndex = 0;
    
    for (let i = 0; i < sortedRanks.length; i++) {
        if (totalPoints >= (sortedRanks[i][1] as number)) {
            currentRankIndex = i;
        } else {
            break;
        }
    }

    const currentRank = sortedRanks[currentRankIndex];
    const nextRank = currentRankIndex + 1 < sortedRanks.length ? sortedRanks[currentRankIndex + 1] : null;

    if (!nextRank) {
        // Max rank achieved
        return {
            currentRank: currentRank[0],
            nextRank: 'MAX LEVEL',
            pointsNeeded: 0,
            progressPercentage: 100,
            currentThreshold: currentRank[1] as number,
            nextThreshold: currentRank[1] as number
        };
    }

    const pointsNeeded = (nextRank[1] as number) - totalPoints;
    const progressRange = (nextRank[1] as number) - (currentRank[1] as number);
    const currentProgress = totalPoints - (currentRank[1] as number);
    const progressPercentage = Math.min(100, Math.max(0, (currentProgress / progressRange) * 100));

    return {
        currentRank: currentRank[0],
        nextRank: nextRank[0],
        pointsNeeded,
        progressPercentage,
        currentThreshold: currentRank[1] as number,
        nextThreshold: nextRank[1] as number
    };
}

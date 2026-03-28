"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_LEVEL_CONFIG = exports.DEFAULT_RANK_ENTRIES = void 0;
exports.getThemeBgClass = getThemeBgClass;
exports.getThemeBgStyle = getThemeBgStyle;
exports.getClassroomTheme = getClassroomTheme;
exports.getThemeTextClass = getThemeTextClass;
exports.parseLevelConfigToEntries = parseLevelConfigToEntries;
exports.getRankEntry = getRankEntry;
exports.getStudentRank = getStudentRank;
exports.getNextRankProgress = getNextRankProgress;
exports.formatAmount = formatAmount;
/** Helpers for custom classroom themes */
function getThemeBgClass(theme) {
    if (!theme)
        return "from-indigo-500 to-purple-600";
    if (theme.startsWith("custom:"))
        return "";
    return theme;
}
function getThemeBgStyle(theme) {
    if (!theme || !theme.startsWith("custom:"))
        return {};
    const parts = theme.replace("custom:", "").split(",");
    const color1 = parts[0] || "#6366f1";
    const color2 = parts[1] || "#a855f7";
    return { backgroundImage: `linear-gradient(to right, ${color1}, ${color2})` };
}
function getClassroomTheme(theme) {
    return {
        themeClass: getThemeBgClass(theme),
        themeStyle: getThemeBgStyle(theme)
    };
}
function getThemeTextClass(theme) {
    if (!theme)
        return "from-indigo-500 to-purple-600";
    if (theme.startsWith("custom:"))
        return "";
    return theme;
}
exports.DEFAULT_RANK_ENTRIES = [
    { name: 'Common', minScore: 5, icon: '⚪', color: '#94a3b8', goldRate: 1 },
    { name: 'Uncommon', minScore: 10, icon: '🟢', color: '#22c55e', goldRate: 5 },
    { name: 'Rare', minScore: 15, icon: '🔵', color: '#3b82f6', goldRate: 10 },
    { name: 'Epic', minScore: 20, icon: '🟣', color: '#a855f7', goldRate: 20 },
    { name: 'Legendary', minScore: 30, icon: '🟠', color: '#f97316', goldRate: 80 },
    { name: 'Mythic', minScore: 40, icon: '🔴', color: '#ef4444', goldRate: 50 },
];
exports.DEFAULT_LEVEL_CONFIG = {
    'Common': 5,
    'Uncommon': 10,
    'Rare': 15,
    'Epic': 20,
    'Legendary': 30,
    'Mythic': 40,
};
/** Parse levelConfig from DB — supports both old object format and new array format */
function parseLevelConfigToEntries(raw) {
    if (!raw)
        return exports.DEFAULT_RANK_ENTRIES;
    // New array format
    if (Array.isArray(raw)) {
        return raw.sort((a, b) => a.minScore - b.minScore);
    }
    // Old object format: { [name]: minScore }
    return Object.entries(raw)
        .map(([name, minScore]) => {
        var _a;
        const def = exports.DEFAULT_RANK_ENTRIES.find(r => r.name === name);
        return {
            ...def,
            name,
            minScore: minScore,
            goldRate: ((_a = def === null || def === void 0 ? void 0 : def.goldRate) !== null && _a !== void 0 ? _a : 0)
        };
    })
        .sort((a, b) => a.minScore - b.minScore);
}
/** Get rank name from a score, supporting both old and new levelConfig formats */
function getRankEntry(totalPoints, levelConfig) {
    const entries = parseLevelConfigToEntries(levelConfig);
    let current = entries[0] || exports.DEFAULT_RANK_ENTRIES[0];
    for (const entry of entries) {
        if (totalPoints >= entry.minScore)
            current = entry;
        else
            break;
    }
    return current;
}
function getStudentRank(totalPoints, levelConfig) {
    return getRankEntry(totalPoints, levelConfig).name;
}
function getNextRankProgress(totalPoints, levelConfig) {
    const entries = parseLevelConfigToEntries(levelConfig);
    let currentRankIndex = 0;
    for (let i = 0; i < entries.length; i++) {
        if (totalPoints >= entries[i].minScore) {
            currentRankIndex = i;
        }
        else {
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
function formatAmount(num) {
    const absNum = Math.abs(num);
    if (absNum >= 1e12)
        return (num / 1e12).toFixed(1) + 'T';
    if (absNum >= 1e9)
        return (num / 1e9).toFixed(1) + 'G';
    if (absNum >= 1e6)
        return (num / 1e6).toFixed(1) + 'M';
    if (absNum >= 1e3)
        return (num / 1e3).toFixed(1) + 'K';
    return Math.floor(num).toLocaleString();
}

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
    { name: 'ชาวบ้าน', minScore: 0, icon: '🧑', color: '#94a3b8', goldRate: 5 },
    { name: 'ทหารฝึกหัด', minScore: 10, icon: '⚔️', color: '#22c55e', goldRate: 10 },
    { name: 'ผู้พิทักษ์', minScore: 20, icon: '🛡️', color: '#3b82f6', goldRate: 15 },
    { name: 'อัศวิน', minScore: 40, icon: '🗡️', color: '#8b5cf6', goldRate: 20 },
    { name: 'กัปตัน', minScore: 60, icon: '⚓', color: '#f59e0b', goldRate: 25 },
    { name: 'ฮีโร่', minScore: 80, icon: '🦸', color: '#ef4444', goldRate: 30 },
    { name: 'ตำนาน', minScore: 100, icon: '👑', color: '#f97316', goldRate: 50 },
];
exports.DEFAULT_LEVEL_CONFIG = {
    'ชาวบ้าน': 0,
    'ทหารฝึกหัด': 10,
    'ผู้พิทักษ์': 20,
    'อัศวิน': 40,
    'กัปตัน': 60,
    'ฮีโร่': 80,
    'ตำนาน': 100,
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
        .map(([name, minScore]) => ({ name, minScore: minScore }))
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

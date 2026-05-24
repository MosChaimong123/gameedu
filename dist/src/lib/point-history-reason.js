"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeNegamonLiveBattleReason = encodeNegamonLiveBattleReason;
exports.encodeNegamonLiveBattleRewardReason = encodeNegamonLiveBattleRewardReason;
exports.formatPointHistoryReason = formatPointHistoryReason;
/**
 * Encoded reasons stored on `PointHistory.reason` for i18n at display time.
 * Legacy free-text rows (e.g. old Thai copy) are still recognized when possible.
 */
const NEGAMON_LIVE_BATTLE_V1_PREFIX = "negamon-live-v1|";
const NEGAMON_LIVE_BATTLE_V2_PREFIX = "negamon-live-v2|";
const NEGAMON_ATTENDANCE_PREFIX = "negamon_attendance_reward:";
const NEGAMON_QUEST_PREFIX = "negamon_quest_reward:";
const NEGAMON_LEVEL_UP_PREFIX = "negamon_level_up:";
const NEGAMON_SKILL_UNLOCKED_PREFIX = "negamon_skill_unlocked:";
/** Longest keys first so `wq_streak7` wins over `wq_streak3`. */
const QUEST_ID_NAME_KEYS = [
    { id: "quest_streak7", nameKey: "questStreak7Name" },
    { id: "quest_streak3", nameKey: "questStreak3Name" },
    { id: "wq_streak7", nameKey: "questStreak7Name" },
    { id: "wq_streak5", nameKey: "wqStreak5Name" },
    { id: "wq_streak3", nameKey: "questStreak3Name" },
    { id: "quest_checkin", nameKey: "questCheckinName" },
    { id: "quest_submit", nameKey: "questSubmitName" },
    { id: "quest_login", nameKey: "questLoginName" },
    { id: "wq_daily_complete", nameKey: "wqDailyCompleteName" },
    { id: "wq_submit3_week", nameKey: "wqSubmit3WeekName" },
    { id: "cq_streak14", nameKey: "cqStreak14Name" },
    { id: "cq_submit10", nameKey: "cqSubmit10Name" },
    { id: "cq_first_buy", nameKey: "cqFirstBuyName" },
];
const CHAIN_STEP_NAME_KEYS = [
    { chainId: "chain_learning_path", stepId: "login", nameKey: "questChainLoginName" },
    { chainId: "chain_learning_path", stepId: "checkin", nameKey: "questChainCheckinName" },
    { chainId: "chain_learning_path", stepId: "submit_week", nameKey: "questChainSubmitWeekName" },
    { chainId: "chain_attendance_spark", stepId: "checkin_starter", nameKey: "questChainAttendanceCheckinName" },
    { chainId: "chain_battle_training", stepId: "prepare_item", nameKey: "questChainBattlePrepareName" },
    { chainId: "chain_battle_training", stepId: "first_battle", nameKey: "questChainBattlePlayName" },
    { chainId: "chain_battle_training", stepId: "first_win", nameKey: "questChainBattleWinName" },
];
function encodeNegamonLiveBattleReason(rank, finalScore, startHp) {
    return `${NEGAMON_LIVE_BATTLE_V1_PREFIX}${rank}|${finalScore}|${startHp}`;
}
function encodeNegamonLiveBattleRewardReason(gamePin, rank, finalScore, startHp) {
    return `${NEGAMON_LIVE_BATTLE_V2_PREFIX}${gamePin}|${rank}|${finalScore}|${startHp}`;
}
function formatNegamonQuestRewardReason(payload, t) {
    for (const { chainId, stepId, nameKey } of CHAIN_STEP_NAME_KEYS) {
        if (payload.includes(chainId) && payload.includes(stepId)) {
            return t(nameKey);
        }
    }
    for (const { id, nameKey } of QUEST_ID_NAME_KEYS) {
        if (payload.includes(id)) {
            return t(nameKey);
        }
    }
    return null;
}
function formatPointHistoryReason(reason, t) {
    if (reason.startsWith(NEGAMON_LIVE_BATTLE_V2_PREFIX)) {
        const rest = reason.slice(NEGAMON_LIVE_BATTLE_V2_PREFIX.length);
        const [, rank, finalScore, startHp] = rest.split("|");
        if (rank && finalScore && startHp) {
            return t("negamonPointHistoryLiveBattle", { rank, finalScore, startHp });
        }
    }
    if (reason.startsWith(NEGAMON_LIVE_BATTLE_V1_PREFIX)) {
        const rest = reason.slice(NEGAMON_LIVE_BATTLE_V1_PREFIX.length);
        const [rank, finalScore, startHp] = rest.split("|");
        if (rank && finalScore && startHp) {
            return t("negamonPointHistoryLiveBattle", { rank, finalScore, startHp });
        }
    }
    const legacyTh = /^Negamon Battle สด — อันดับ #(\d+) \((\d+)\/(\d+) HP\)$/.exec(reason);
    if (legacyTh) {
        return t("negamonPointHistoryLiveBattle", {
            rank: legacyTh[1],
            finalScore: legacyTh[2],
            startHp: legacyTh[3],
        });
    }
    if (reason.startsWith(NEGAMON_ATTENDANCE_PREFIX)) {
        return t("pointHistoryNegamonAttendance");
    }
    if (reason.startsWith(NEGAMON_QUEST_PREFIX)) {
        const payload = reason.slice(NEGAMON_QUEST_PREFIX.length);
        const label = formatNegamonQuestRewardReason(payload, t);
        if (label)
            return label;
        return t("pointHistoryNegamonQuestFallback");
    }
    if (reason.startsWith(NEGAMON_LEVEL_UP_PREFIX)) {
        const level = reason.slice(NEGAMON_LEVEL_UP_PREFIX.length);
        if (level) {
            return t("pointHistoryNegamonLevelUp", { level });
        }
        return t("pointHistoryNegamonLevelUpGeneric");
    }
    if (reason.startsWith(NEGAMON_SKILL_UNLOCKED_PREFIX)) {
        return t("pointHistoryNegamonSkillUnlock");
    }
    return reason;
}

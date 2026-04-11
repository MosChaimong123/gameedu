"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeNegamonLiveBattleReason = encodeNegamonLiveBattleReason;
exports.formatPointHistoryReason = formatPointHistoryReason;
/**
 * Encoded reasons stored on `Student.history.reason` for i18n at display time.
 * Legacy free-text rows (e.g. old Thai copy) are still recognized when possible.
 */
const NEGAMON_LIVE_BATTLE_V1_PREFIX = "negamon-live-v1|";
function encodeNegamonLiveBattleReason(rank, finalScore, startHp) {
    return `${NEGAMON_LIVE_BATTLE_V1_PREFIX}${rank}|${finalScore}|${startHp}`;
}
function formatPointHistoryReason(reason, t) {
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
    return reason;
}

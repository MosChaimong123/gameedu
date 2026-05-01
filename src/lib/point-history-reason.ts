/**
 * Encoded reasons stored on `Student.history.reason` for i18n at display time.
 * Legacy free-text rows (e.g. old Thai copy) are still recognized when possible.
 */
const NEGAMON_LIVE_BATTLE_V1_PREFIX = "negamon-live-v1|";
const NEGAMON_LIVE_BATTLE_V2_PREFIX = "negamon-live-v2|";

export function encodeNegamonLiveBattleReason(
    rank: number,
    finalScore: number,
    startHp: number
): string {
    return `${NEGAMON_LIVE_BATTLE_V1_PREFIX}${rank}|${finalScore}|${startHp}`;
}

export function encodeNegamonLiveBattleRewardReason(
    gamePin: string,
    rank: number,
    finalScore: number,
    startHp: number
): string {
    return `${NEGAMON_LIVE_BATTLE_V2_PREFIX}${gamePin}|${rank}|${finalScore}|${startHp}`;
}

type TranslateFn = (key: string, params?: Record<string, string | number>) => string;

export function formatPointHistoryReason(reason: string, t: TranslateFn): string {
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

    return reason;
}

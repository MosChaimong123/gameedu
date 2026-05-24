"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shouldStartNegamonClassroomRewardSync = shouldStartNegamonClassroomRewardSync;
exports.triggerNegamonClassroomRewardSync = triggerNegamonClassroomRewardSync;
const sync_negamon_battle_rewards_1 = require("@/lib/negamon/sync-negamon-battle-rewards");
const audit_log_1 = require("@/lib/security/audit-log");
const DEFAULT_RETRY_DELAY_MS = 10000;
function getErrorMessage(error) {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === "string" && error.trim()) {
        return error;
    }
    return "Unknown reward sync error";
}
function shouldStartNegamonClassroomRewardSync(game, now = Date.now(), retryDelayMs = DEFAULT_RETRY_DELAY_MS) {
    return (game.status === "ENDED" &&
        game.gameMode === "NEGAMON_BATTLE" &&
        Boolean(game.settings.negamonRewardClassroomId) &&
        !game.negamonClassroomRewardsSynced &&
        !game.negamonClassroomRewardsSyncInProgress &&
        (game.negamonClassroomRewardsLastAttemptAt <= 0 ||
            now - game.negamonClassroomRewardsLastAttemptAt >= retryDelayMs));
}
function triggerNegamonClassroomRewardSync(game, options = {}) {
    var _a, _b, _c;
    const now = (_a = options.now) !== null && _a !== void 0 ? _a : Date.now();
    const retryDelayMs = (_b = options.retryDelayMs) !== null && _b !== void 0 ? _b : DEFAULT_RETRY_DELAY_MS;
    if (!shouldStartNegamonClassroomRewardSync(game, now, retryDelayMs)) {
        return false;
    }
    const syncFn = (_c = options.syncFn) !== null && _c !== void 0 ? _c : sync_negamon_battle_rewards_1.syncNegamonBattleRewardsToClassroom;
    game.negamonClassroomRewardsSyncInProgress = true;
    game.negamonClassroomRewardsLastAttemptAt = now;
    game.negamonClassroomRewardsLastError = null;
    void syncFn(game)
        .then(() => {
        game.negamonClassroomRewardsSynced = true;
        game.negamonClassroomRewardsLastError = null;
    })
        .catch((error) => {
        const message = getErrorMessage(error);
        game.negamonClassroomRewardsSynced = false;
        game.negamonClassroomRewardsLastError = message;
        console.error(`[GameManager] Negamon classroom rewards failed for ${game.pin}`, error);
        (0, audit_log_1.logAuditEvent)({
            actorUserId: game.hostId,
            action: "classroom.negamon_battle.rewards_sync_failed",
            category: "classroom",
            status: "error",
            targetType: "classroom",
            targetId: String(game.settings.negamonRewardClassroomId),
            metadata: {
                gamePin: game.pin,
                setId: game.setId,
                error: message,
                retryable: true,
            },
        });
    })
        .finally(() => {
        game.negamonClassroomRewardsSyncInProgress = false;
    });
    return true;
}

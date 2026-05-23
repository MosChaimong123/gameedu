import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";
import { syncNegamonBattleRewardsToClassroom } from "@/lib/negamon/sync-negamon-battle-rewards";
import { logAuditEvent } from "@/lib/security/audit-log";

const DEFAULT_RETRY_DELAY_MS = 10_000;

type RewardSyncFn = (game: AbstractGameEngine) => Promise<unknown>;

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === "string" && error.trim()) {
        return error;
    }
    return "Unknown reward sync error";
}

export function shouldStartNegamonClassroomRewardSync(
    game: AbstractGameEngine,
    now = Date.now(),
    retryDelayMs = DEFAULT_RETRY_DELAY_MS
) {
    return (
        game.status === "ENDED" &&
        game.gameMode === "NEGAMON_BATTLE" &&
        Boolean(game.settings.negamonRewardClassroomId) &&
        !game.negamonClassroomRewardsSynced &&
        !game.negamonClassroomRewardsSyncInProgress &&
        (
            game.negamonClassroomRewardsLastAttemptAt <= 0 ||
            now - game.negamonClassroomRewardsLastAttemptAt >= retryDelayMs
        )
    );
}

export function triggerNegamonClassroomRewardSync(
    game: AbstractGameEngine,
    options: {
        now?: number;
        retryDelayMs?: number;
        syncFn?: RewardSyncFn;
    } = {}
) {
    const now = options.now ?? Date.now();
    const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    if (!shouldStartNegamonClassroomRewardSync(game, now, retryDelayMs)) {
        return false;
    }

    const syncFn = options.syncFn ?? syncNegamonBattleRewardsToClassroom;
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
            logAuditEvent({
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

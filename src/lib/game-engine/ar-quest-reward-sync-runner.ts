import type { AbstractGameEngine } from "@/lib/game-engine/abstract-game";
import { syncArQuestRewardsToClassroom } from "@/lib/ar-quest/sync-ar-quest-rewards";
import { logAuditEvent } from "@/lib/security/audit-log";

const DEFAULT_RETRY_DELAY_MS = 10_000;

type RewardSyncFn = (game: AbstractGameEngine) => Promise<unknown>;

function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === "string" && error.trim()) return error;
    return "Unknown reward sync error";
}

export function shouldStartArQuestClassroomRewardSync(
    game: AbstractGameEngine,
    now = Date.now(),
    retryDelayMs = DEFAULT_RETRY_DELAY_MS
) {
    return (
        game.status === "ENDED" &&
        game.gameMode === "AR_QUEST" &&
        Boolean(game.settings.arQuestRewardClassroomId) &&
        !game.arQuestClassroomRewardsSynced &&
        !game.arQuestClassroomRewardsSyncInProgress &&
        (
            game.arQuestClassroomRewardsLastAttemptAt <= 0 ||
            now - game.arQuestClassroomRewardsLastAttemptAt >= retryDelayMs
        )
    );
}

export function triggerArQuestClassroomRewardSync(
    game: AbstractGameEngine,
    options: {
        now?: number;
        retryDelayMs?: number;
        syncFn?: RewardSyncFn;
    } = {}
) {
    const now = options.now ?? Date.now();
    const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
    if (!shouldStartArQuestClassroomRewardSync(game, now, retryDelayMs)) {
        return false;
    }

    const syncFn = options.syncFn ?? syncArQuestRewardsToClassroom;
    game.arQuestClassroomRewardsSyncInProgress = true;
    game.arQuestClassroomRewardsLastAttemptAt = now;
    game.arQuestClassroomRewardsLastError = null;

    void syncFn(game)
        .then(() => {
            game.arQuestClassroomRewardsSynced = true;
            game.arQuestClassroomRewardsLastError = null;
        })
        .catch((error) => {
            const message = getErrorMessage(error);
            game.arQuestClassroomRewardsSynced = false;
            game.arQuestClassroomRewardsLastError = message;
            console.error(`[GameManager] AR Quest classroom rewards failed for ${game.pin}`, error);
            logAuditEvent({
                actorUserId: game.hostId,
                action: "classroom.ar_quest.rewards_sync_failed",
                category: "classroom",
                status: "error",
                targetType: "classroom",
                targetId: String(game.settings.arQuestRewardClassroomId),
                metadata: {
                    gamePin: game.pin,
                    setId: game.setId,
                    error: message,
                    retryable: true,
                },
            });
        })
        .finally(() => {
            game.arQuestClassroomRewardsSyncInProgress = false;
        });

    return true;
}

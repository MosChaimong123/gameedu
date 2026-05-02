import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

/**
 * `board-actions` throws `Error(message)` with fixed strings.
 * Map exact messages to translation keys for client toasts.
 */
export const BOARD_ACTION_ERROR_MESSAGE_KEYS: Record<string, string> = {
    [AUTH_REQUIRED_MESSAGE]: "boardErrUnauthorized",
    "Classroom not found": "boardErrClassroomNotFound",
    "Board not found": "boardErrBoardNotFound",
    "Post not found": "boardErrPostNotFound",
    "This poll is closed": "boardErrPollClosed",
    "Poll not found": "boardErrNoPoll",
};

export function formatBoardActionErrorMessage(
    raw: string,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const normalized = raw.trim();
    if (normalized.startsWith("boardErr")) {
        const direct = t(normalized);
        if (direct !== normalized) return direct;
    }
    const key = BOARD_ACTION_ERROR_MESSAGE_KEYS[normalized];
    if (key) {
        const msg = t(key);
        if (msg !== key) return msg;
    }
    return raw;
}

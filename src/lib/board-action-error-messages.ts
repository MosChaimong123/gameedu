import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

/**
 * `board-actions` throws `Error(message)` with fixed English/Thai strings.
 * Map exact messages → `translations` keys for client toasts.
 */
export const BOARD_ACTION_ERROR_MESSAGE_KEYS: Record<string, string> = {
    [AUTH_REQUIRED_MESSAGE]: "boardErrUnauthorized",
    "Classroom not found": "boardErrClassroomNotFound",
    "Board not found": "boardErrBoardNotFound",
    "Post not found": "boardErrPostNotFound",
    "โพลนี้ถูกปิดการโหวตแล้ว": "boardErrPollClosed",
    "ไม่พบโพลสำหรับโพสต์นี้": "boardErrNoPoll",
}

export function formatBoardActionErrorMessage(
    raw: string,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const key = BOARD_ACTION_ERROR_MESSAGE_KEYS[raw.trim()]
    if (key) {
        const msg = t(key)
        if (msg !== key) return msg
    }
    return raw
}

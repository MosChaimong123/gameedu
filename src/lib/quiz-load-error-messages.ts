/**
 * Quiz question GET returns plain-text bodies (`NextResponse(string)`).
 * Map known strings from `quiz-take-context` / route handlers → translation keys.
 */
export const QUIZ_LOAD_PLAIN_ERROR_KEYS: Record<string, string> = {
    "Bad Request": "quizPlainErrBadRequest",
    "Student Not Found": "quizPlainErrStudentNotFound",
    "Not a quiz assignment": "quizPlainErrNotQuizAssignment",
    "Assignment closed": "quizPlainErrAssignmentClosed",
    "No questions": "quizPlainErrNoQuestions",
    "Already submitted": "quizPlainErrAlreadySubmitted",
    "Invalid index": "quizPlainErrInvalidIndex",
    "Internal Error": "quizPlainErrInternal",
}

export function formatQuizLoadPlainError(
    raw: string,
    t: (key: string, params?: Record<string, string | number>) => string
): string {
    const trimmed = raw.trim()
    const key = QUIZ_LOAD_PLAIN_ERROR_KEYS[trimmed]
    if (key) {
        const msg = t(key)
        if (msg !== key) return msg
    }
    const http = /^HTTP (\d{3})$/.exec(trimmed)
    if (http) {
        const m = t("quizPlainErrHttpStatus", { status: http[1] })
        if (m !== "quizPlainErrHttpStatus") return m
    }
    return trimmed || t("quizLoadFailed")
}

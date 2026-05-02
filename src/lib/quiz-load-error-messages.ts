/**
 * Quiz question GET returns plain-text bodies (`NextResponse(string)`).
 * Use translation keys directly for new responses, but keep legacy English
 * mappings so older responses still render correctly.
 */
export const QUIZ_PLAIN_ERR_BAD_REQUEST = "quizPlainErrBadRequest"
export const QUIZ_PLAIN_ERR_STUDENT_NOT_FOUND = "quizPlainErrStudentNotFound"
export const QUIZ_PLAIN_ERR_NOT_QUIZ_ASSIGNMENT = "quizPlainErrNotQuizAssignment"
export const QUIZ_PLAIN_ERR_ASSIGNMENT_CLOSED = "quizPlainErrAssignmentClosed"
export const QUIZ_PLAIN_ERR_NO_QUESTIONS = "quizPlainErrNoQuestions"
export const QUIZ_PLAIN_ERR_ALREADY_SUBMITTED = "quizPlainErrAlreadySubmitted"
export const QUIZ_PLAIN_ERR_INVALID_INDEX = "quizPlainErrInvalidIndex"
export const QUIZ_PLAIN_ERR_INTERNAL = "quizPlainErrInternal"

export const QUIZ_LOAD_PLAIN_ERROR_KEYS: Record<string, string> = {
    [QUIZ_PLAIN_ERR_BAD_REQUEST]: QUIZ_PLAIN_ERR_BAD_REQUEST,
    [QUIZ_PLAIN_ERR_STUDENT_NOT_FOUND]: QUIZ_PLAIN_ERR_STUDENT_NOT_FOUND,
    [QUIZ_PLAIN_ERR_NOT_QUIZ_ASSIGNMENT]: QUIZ_PLAIN_ERR_NOT_QUIZ_ASSIGNMENT,
    [QUIZ_PLAIN_ERR_ASSIGNMENT_CLOSED]: QUIZ_PLAIN_ERR_ASSIGNMENT_CLOSED,
    [QUIZ_PLAIN_ERR_NO_QUESTIONS]: QUIZ_PLAIN_ERR_NO_QUESTIONS,
    [QUIZ_PLAIN_ERR_ALREADY_SUBMITTED]: QUIZ_PLAIN_ERR_ALREADY_SUBMITTED,
    [QUIZ_PLAIN_ERR_INVALID_INDEX]: QUIZ_PLAIN_ERR_INVALID_INDEX,
    [QUIZ_PLAIN_ERR_INTERNAL]: QUIZ_PLAIN_ERR_INTERNAL,
    "Bad Request": QUIZ_PLAIN_ERR_BAD_REQUEST,
    "Student Not Found": QUIZ_PLAIN_ERR_STUDENT_NOT_FOUND,
    "Not a quiz assignment": QUIZ_PLAIN_ERR_NOT_QUIZ_ASSIGNMENT,
    "Assignment closed": QUIZ_PLAIN_ERR_ASSIGNMENT_CLOSED,
    "No questions": QUIZ_PLAIN_ERR_NO_QUESTIONS,
    "Already submitted": QUIZ_PLAIN_ERR_ALREADY_SUBMITTED,
    "Invalid index": QUIZ_PLAIN_ERR_INVALID_INDEX,
    "Invalid question index": QUIZ_PLAIN_ERR_INVALID_INDEX,
    "Invalid option index": QUIZ_PLAIN_ERR_INVALID_INDEX,
    "Internal Error": QUIZ_PLAIN_ERR_INTERNAL,
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

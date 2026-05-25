export type QuizSubmissionAttemptRow = {
    score: number;
    attemptStartedAt: Date | null;
    quizCompletedAt: Date | null;
};

/** Legacy quiz rows: submitted before attempt tracking (no startedAt, no completedAt). */
export function isLegacyQuizSubmission(row: QuizSubmissionAttemptRow): boolean {
    return row.attemptStartedAt == null && row.quizCompletedAt == null;
}

export function isQuizSubmissionCompleted(row: QuizSubmissionAttemptRow): boolean {
    if (row.quizCompletedAt != null) return true;
    return isLegacyQuizSubmission(row);
}

export function isQuizSubmissionInProgress(row: QuizSubmissionAttemptRow): boolean {
    return row.quizCompletedAt == null && row.attemptStartedAt != null;
}

export function normalizeQuizTimeLimitMinutes(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : parseInt(String(value), 10);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.min(24 * 60, Math.floor(n));
}

export function getQuizExpiresAt(
    startedAt: Date,
    timeLimitMinutes: number | null | undefined
): Date | null {
    const limit = normalizeQuizTimeLimitMinutes(timeLimitMinutes);
    if (!limit) return null;
    return new Date(startedAt.getTime() + limit * 60_000);
}

export function isQuizAttemptExpired(
    startedAt: Date,
    timeLimitMinutes: number | null | undefined,
    now: Date = new Date()
): boolean {
    const expiresAt = getQuizExpiresAt(startedAt, timeLimitMinutes);
    return expiresAt != null && now >= expiresAt;
}

export function getQuizSecondsRemaining(
    startedAt: Date,
    timeLimitMinutes: number | null | undefined,
    now: Date = new Date()
): number | null {
    const expiresAt = getQuizExpiresAt(startedAt, timeLimitMinutes);
    if (!expiresAt) return null;
    return Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
}

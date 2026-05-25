import { describe, expect, it } from "vitest";
import {
    getQuizExpiresAt,
    getQuizSecondsRemaining,
    isLegacyQuizSubmission,
    isQuizSubmissionCompleted,
    isQuizSubmissionInProgress,
    normalizeQuizTimeLimitMinutes,
} from "@/lib/quiz-attempt";

describe("quiz-attempt helpers", () => {
    it("detects legacy and in-progress submissions", () => {
        expect(isLegacyQuizSubmission({ score: 80, attemptStartedAt: null, quizCompletedAt: null })).toBe(
            true
        );
        expect(isQuizSubmissionCompleted({ score: 80, attemptStartedAt: null, quizCompletedAt: null })).toBe(
            true
        );
        const started = new Date("2026-01-01T10:00:00Z");
        expect(
            isQuizSubmissionInProgress({
                score: 0,
                attemptStartedAt: started,
                quizCompletedAt: null,
            })
        ).toBe(true);
        expect(
            isQuizSubmissionCompleted({
                score: 90,
                attemptStartedAt: started,
                quizCompletedAt: new Date("2026-01-01T10:05:00Z"),
            })
        ).toBe(true);
    });

    it("computes expiry and remaining seconds", () => {
        const started = new Date("2026-01-01T10:00:00Z");
        const expires = getQuizExpiresAt(started, 10);
        expect(expires?.toISOString()).toBe("2026-01-01T10:10:00.000Z");
        const remaining = getQuizSecondsRemaining(
            started,
            10,
            new Date("2026-01-01T10:07:30Z")
        );
        expect(remaining).toBe(150);
        expect(normalizeQuizTimeLimitMinutes("45")).toBe(45);
        expect(normalizeQuizTimeLimitMinutes("")).toBeNull();
    });
});

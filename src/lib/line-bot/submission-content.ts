import type { LineAiPreliminaryGradeResult } from "@/lib/line-bot/ai-grading";

export type ParsedLineTextSubmissionContent = {
    mode: "line_text";
    text: string;
    submittedVia: "line";
    aiPreliminaryGrading: LineAiPreliminaryGradeResult;
    aiPreliminaryReview?: LineAiPreliminaryReview | null;
};

export type LineAiPreliminaryReview = {
    status: "accepted" | "edited" | "rejected";
    score: number | null;
    reviewedAt: string;
    reviewedBy?: string | null;
};

export function buildLineSubmissionContent(
    content: string,
    aiPreliminaryGrade?: LineAiPreliminaryGradeResult
): string {
    return JSON.stringify({
        mode: "line_text",
        text: content,
        submittedVia: "line",
        aiPreliminaryGrading: aiPreliminaryGrade ?? { status: "unavailable", reason: "not_requested" },
    });
}

export function parseLineTextSubmissionContent(content: string | null | undefined): ParsedLineTextSubmissionContent | null {
    if (!content) return null;
    try {
        const parsed = JSON.parse(content) as Partial<ParsedLineTextSubmissionContent>;
        if (parsed.mode !== "line_text" || parsed.submittedVia !== "line") return null;
        if (typeof parsed.text !== "string") return null;
        return {
            mode: "line_text",
            text: parsed.text,
            submittedVia: "line",
            aiPreliminaryGrading: parsed.aiPreliminaryGrading ?? { status: "unavailable", reason: "not_requested" },
            aiPreliminaryReview: parseLineAiPreliminaryReview(parsed.aiPreliminaryReview),
        };
    } catch {
        return null;
    }
}

export function markLineAiPreliminaryReview(
    content: string | null | undefined,
    review: LineAiPreliminaryReview
): string | null {
    const parsed = parseLineTextSubmissionContent(content);
    if (!parsed || parsed.aiPreliminaryGrading.status !== "graded") return null;
    return JSON.stringify({
        mode: parsed.mode,
        text: parsed.text,
        submittedVia: parsed.submittedVia,
        aiPreliminaryGrading: parsed.aiPreliminaryGrading,
        aiPreliminaryReview: review,
    });
}

function parseLineAiPreliminaryReview(value: unknown): LineAiPreliminaryReview | null {
    if (!value || typeof value !== "object") return null;
    const review = value as Partial<LineAiPreliminaryReview>;
    if (review.status !== "accepted" && review.status !== "edited" && review.status !== "rejected") return null;
    if (typeof review.reviewedAt !== "string") return null;
    const score = typeof review.score === "number" && Number.isFinite(review.score) ? review.score : null;
    const reviewedBy = typeof review.reviewedBy === "string" ? review.reviewedBy : null;
    return {
        status: review.status,
        score,
        reviewedAt: review.reviewedAt,
        reviewedBy,
    };
}

export function getLineAssignmentShortCode(assignment: { order?: number | null }): string {
    const order = Number.isFinite(assignment.order) ? Number(assignment.order) : 0;
    return `A${Math.max(0, order) + 1}`;
}

export function matchesLineAssignmentRef(
    assignment: { id: string; name: string; order?: number | null },
    rawRef: string
): boolean {
    const ref = rawRef.trim().toLowerCase();
    if (!ref) return false;
    return (
        assignment.id.toLowerCase() === ref ||
        assignment.name.trim().toLowerCase() === ref ||
        getLineAssignmentShortCode(assignment).toLowerCase() === ref
    );
}

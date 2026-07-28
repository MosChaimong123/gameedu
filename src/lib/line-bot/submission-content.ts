import type { LineAiPreliminaryGradeResult } from "@/lib/line-bot/ai-grading";

export type ParsedLineTextSubmissionContent = {
    mode: "line_text";
    text: string;
    submittedVia: "line";
    aiPreliminaryGrading: LineAiPreliminaryGradeResult;
    aiPreliminaryReview?: LineAiPreliminaryReview | null;
    teacherReview?: LineTeacherReview | null;
    submissionState?: LineSubmissionState;
    revisions?: LineSubmissionRevision[];
};

export type LineSubmissionState = "submitted" | "resubmitted" | "needs_review";

export type LineSubmissionRevision = {
    revision: number;
    state: LineSubmissionState;
    submittedAt: string;
    actorLineUserId: string;
    linkedStudentId: string;
};

export type LineTeacherReview = {
    reviewedAt: string;
    reviewedBy?: string | null;
    score: number;
};

export type LineAiPreliminaryReview = {
    status: "accepted" | "edited" | "rejected";
    score: number | null;
    reviewedAt: string;
    reviewedBy?: string | null;
};

export function buildLineSubmissionContent(
    content: string,
    aiPreliminaryGrade?: LineAiPreliminaryGradeResult,
    revision?: LineSubmissionRevision,
    previousContent?: string | null
): string {
    const previous = parseLineTextSubmissionContent(previousContent);
    const revisions = revision ? [...(previous?.revisions ?? []), revision] : previous?.revisions;
    return JSON.stringify({
        mode: "line_text",
        text: content,
        submittedVia: "line",
        aiPreliminaryGrading: aiPreliminaryGrade ?? { status: "unavailable", reason: "not_requested" },
        ...(previous?.aiPreliminaryReview ? { aiPreliminaryReview: previous.aiPreliminaryReview } : {}),
        ...(previous?.teacherReview ? { teacherReview: previous.teacherReview } : {}),
        ...(revision ? { submissionState: revision.state } : previous?.submissionState ? { submissionState: previous.submissionState } : {}),
        ...(revisions?.length ? { revisions } : {}),
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
            teacherReview: parseLineTeacherReview(parsed.teacherReview),
            submissionState: parseLineSubmissionState(parsed.submissionState),
            revisions: parseLineSubmissionRevisions(parsed.revisions),
        };
    } catch {
        return null;
    }
}

export function markLineSubmissionTeacherReview(
    content: string | null | undefined,
    review: LineTeacherReview
): string | null {
    const parsed = parseLineTextSubmissionContent(content);
    if (!parsed) return null;
    return JSON.stringify({
        mode: parsed.mode,
        text: parsed.text,
        submittedVia: parsed.submittedVia,
        aiPreliminaryGrading: parsed.aiPreliminaryGrading,
        ...(parsed.aiPreliminaryReview ? { aiPreliminaryReview: parsed.aiPreliminaryReview } : {}),
        teacherReview: review,
        ...(parsed.submissionState ? { submissionState: parsed.submissionState } : {}),
        ...(parsed.revisions?.length ? { revisions: parsed.revisions } : {}),
    });
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

function parseLineTeacherReview(value: unknown): LineTeacherReview | null {
    if (!value || typeof value !== "object") return null;
    const review = value as Partial<LineTeacherReview>;
    if (typeof review.reviewedAt !== "string" || typeof review.score !== "number" || !Number.isFinite(review.score)) return null;
    return {
        reviewedAt: review.reviewedAt,
        score: review.score,
        reviewedBy: typeof review.reviewedBy === "string" ? review.reviewedBy : null,
    };
}

function parseLineSubmissionState(value: unknown): LineSubmissionState | undefined {
    return value === "submitted" || value === "resubmitted" || value === "needs_review" ? value : undefined;
}

function parseLineSubmissionRevisions(value: unknown): LineSubmissionRevision[] | undefined {
    if (!Array.isArray(value)) return undefined;
    const revisions = value.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const revision = item as Partial<LineSubmissionRevision>;
        const state = parseLineSubmissionState(revision.state);
        if (
            typeof revision.revision !== "number" ||
            !Number.isInteger(revision.revision) ||
            !state ||
            typeof revision.submittedAt !== "string" ||
            typeof revision.actorLineUserId !== "string" ||
            typeof revision.linkedStudentId !== "string"
        ) return [];
        return [{
            revision: revision.revision,
            state,
            submittedAt: revision.submittedAt,
            actorLineUserId: revision.actorLineUserId,
            linkedStudentId: revision.linkedStudentId,
        }];
    });
    return revisions.length ? revisions : undefined;
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

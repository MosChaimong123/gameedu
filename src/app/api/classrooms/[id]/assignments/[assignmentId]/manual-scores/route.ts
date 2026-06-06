import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { parseAndValidateManualScore } from "@/lib/validate-manual-assignment-score";
import { markLineAiPreliminaryReview } from "@/lib/line-bot/submission-content";
import { logAuditEvent } from "@/lib/security/audit-log";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

/** Teachers may still record/edit manual scores after the deadline (class policy); student quiz submission enforces its own rules. */

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const { id, assignmentId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(session.user.role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json() as { studentId?: unknown; score?: unknown; lineAiReviewAction?: unknown };
        const { studentId, score } = body;
        const lineAiReviewAction = parseLineAiReviewAction(body.lineAiReviewAction);

        if (!studentId || typeof studentId !== "string") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing studentId", 400);
        }

        const assignment = await db.assignment.findUnique({
            where: {
                id: assignmentId,
                classId: id,
                classroom: {
                    teacherId: session.user.id
                }
            }
        });

        if (!assignment) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const validated = parseAndValidateManualScore(
            assignment.type,
            assignment.maxScore,
            assignment.checklists,
            score
        );
        if (!validated.ok) {
            return createAppErrorResponse("INVALID_PAYLOAD", validated.message, 400);
        }

        const student = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true },
        });

        if (!student || student.classId !== id) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }

        const existingSubmission = await db.assignmentSubmission.findUnique({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId
                }
            },
            select: {
                id: true,
                content: true,
            },
        });
        const reviewedLineContent = lineAiReviewAction
            ? markLineAiPreliminaryReview(existingSubmission?.content, {
                status: lineAiReviewAction,
                score: validated.scoreInt,
                reviewedAt: new Date().toISOString(),
                reviewedBy: session.user.id,
            })
            : null;

        if (lineAiReviewAction && !reviewedLineContent) {
            return createAppErrorResponse("INVALID_PAYLOAD", "LINE AI review is unavailable for this submission", 400);
        }

        const submission = await db.assignmentSubmission.upsert({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId
                }
            },
            update: {
                score: validated.scoreInt,
                ...(reviewedLineContent ? { content: reviewedLineContent } : {}),
            },
            create: {
                studentId,
                assignmentId,
                score: validated.scoreInt,
                cheatingLogs: []
            }
        });

        if (lineAiReviewAction) {
            logAuditEvent({
                actorUserId: session.user.id,
                action: `line.assignment_ai_grade.${lineAiReviewAction}`,
                category: "line",
                targetType: "assignmentSubmission",
                targetId: submission.id,
                metadata: {
                    classroomId: id,
                    assignmentId,
                    studentId,
                    score: validated.scoreInt,
                },
            });
        }

        return NextResponse.json({
            success: true,
            submissionId: submission.id,
            score: submission.score,
            content: submission.content,
        });

    } catch (error) {
        console.error("[MANUAL_SCORES_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

function parseLineAiReviewAction(value: unknown): "accepted" | "edited" | "rejected" | null {
    return value === "accepted" || value === "edited" || value === "rejected" ? value : null;
}

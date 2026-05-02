import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { parseAndValidateManualScore } from "@/lib/validate-manual-assignment-score";
import { AUTH_REQUIRED_MESSAGE, INTERNAL_ERROR_MESSAGE, createAppErrorResponse } from "@/lib/api-error";

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

    try {
        const body = await req.json() as { studentId?: unknown; score?: unknown };
        const { studentId, score } = body;

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
            return createAppErrorResponse("NOT_FOUND", "Assignment not found or unauthorized", 404);
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
            return createAppErrorResponse("NOT_FOUND", "Student not found in classroom", 404);
        }

        const submission = await db.assignmentSubmission.upsert({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId
                }
            },
            update: {
                score: validated.scoreInt
            },
            create: {
                studentId,
                assignmentId,
                score: validated.scoreInt,
                cheatingLogs: []
            }
        });

        return NextResponse.json({
            success: true,
            submissionId: submission.id,
            score: submission.score,
        });

    } catch (error) {
        console.error("[MANUAL_SCORES_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

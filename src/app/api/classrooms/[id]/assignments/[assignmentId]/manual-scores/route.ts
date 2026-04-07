import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { parseAndValidateManualScore } from "@/lib/validate-manual-assignment-score";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

/** Teachers may still record/edit manual scores after the deadline (class policy); student quiz submission enforces its own rules. */

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const { id, assignmentId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const body = await req.json() as { studentId?: unknown; score?: unknown };
        const { studentId, score } = body;

        if (!studentId || typeof studentId !== "string") {
            return NextResponse.json({ error: "Missing studentId" }, { status: 400 });
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
            return new NextResponse("Assignment not found or unauthorized", { status: 404 });
        }

        const validated = parseAndValidateManualScore(
            assignment.type,
            assignment.maxScore,
            assignment.checklists,
            score
        );
        if (!validated.ok) {
            return NextResponse.json({ error: validated.message }, { status: 400 });
        }

        const student = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true },
        });

        if (!student || student.classId !== id) {
            return new NextResponse("Student not found in classroom", { status: 404 });
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}

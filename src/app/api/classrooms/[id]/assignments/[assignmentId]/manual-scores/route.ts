import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const { id, assignmentId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { studentId, score } = await req.json();

        if (!studentId || score === undefined) {
            return new NextResponse("Missing data", { status: 400 });
        }

        // Verify Class Ownership & Assignment Existence
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

        // Upsert Submission
        const submission = await db.assignmentSubmission.upsert({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId
                }
            },
            update: {
                score: score
            },
            create: {
                studentId,
                assignmentId,
                score: score,
                cheatingLogs: []
            }
        });

        return NextResponse.json(submission);

    } catch (error) {
        console.error("[MANUAL_SCORE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string, assignmentId: string }> }
) {
    const session = await auth();
    const resolvedParams = await params;

    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { studentId, score } = body;

        if (!studentId || score === undefined) {
            return new NextResponse("Missing data", { status: 400 });
        }

        // Verify Teacher
        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id },
            select: { teacherId: true }
        });

        if (!classroom || classroom.teacherId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get Original
        const originalSubmission = await db.assignmentSubmission.findUnique({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId: resolvedParams.assignmentId
                }
            }
        });

        const originalScore = originalSubmission?.score || 0;
        const diff = score - originalScore;

        // Upsert Submission
        const submission = await db.assignmentSubmission.upsert({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId: resolvedParams.assignmentId
                }
            },
            update: {
                score,
                submittedAt: new Date()
            },
            create: {
                studentId,
                assignmentId: resolvedParams.assignmentId,
                score,
            }
        });

        // Update Total Points on Student
        if (diff !== 0) {
            await db.student.update({
                where: { id: studentId },
                data: {
                    points: { increment: diff }
                }
            });

            // Also create a point history record for reference
            const assignment = await db.assignment.findUnique({ where: { id: resolvedParams.assignmentId }});
            await db.pointHistory.create({
                data: {
                    studentId,
                    reason: `Assignment: ${assignment?.name || 'Task'}`,
                    value: diff
                }
            });
        }

        return NextResponse.json(submission);
    } catch (error) {
        console.error("[ASSIGNMENTS_SUBMIT_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

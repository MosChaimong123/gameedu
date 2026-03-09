import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // 1. Get all student IDs in this classroom
        const students = await db.student.findMany({
            where: { classId: id },
            select: { id: true }
        });

        const studentIds = students.map(s => s.id);

        if (studentIds.length === 0) {
             return NextResponse.json({ 
                success: true, 
                studentsResetCount: 0,
                activitiesDeletedCount: 0
            });
        }

        // 2. Perform the transaction with direct IDs
        const [deletedActivities, deletedSubmissions, resetStudents] = await db.$transaction([
            db.pointHistory.deleteMany({
                where: {
                    studentId: { in: studentIds }
                }
            }),
            db.assignmentSubmission.deleteMany({
                where: {
                    studentId: { in: studentIds }
                }
            }),
            db.student.updateMany({
                where: { classId: id },
                data: { points: 0 }
            })
        ]);

        return NextResponse.json({ 
            success: true, 
            studentsResetCount: resetStudents.count,
            activitiesDeletedCount: deletedActivities.count
        });

    } catch (error) {
        console.error("[POINTS_RESET_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

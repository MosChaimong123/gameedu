import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    const { id, studentId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    try {
        // Verify the classroom belongs to this teacher
        const classroom = await db.classroom.findUnique({
            where: { id, teacherId: session.user.id }
        });

        if (!classroom) {
            return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
        }

        // Fetch the student and their full history
        const student = await db.student.findUnique({
            where: { id: studentId, classId: id },
            select: {
                id: true,
                name: true,
                nickname: true,
                behaviorPoints: true,
                avatar: true,
                history: {
                    orderBy: { timestamp: "desc" },
                    take: 200,
                }
            }
        });

        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student Not Found", 404);
        }

        return NextResponse.json(student);

    } catch (error) {
        console.error("[STUDENT_HISTORY_GET]", error);
        return createAppErrorResponse("INTERNAL_ERROR", "Internal Error", 500);
    }
}

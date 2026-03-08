import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    const { id, studentId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Verify the classroom belongs to this teacher
        const classroom = await db.classroom.findUnique({
            where: { id, teacherId: session.user.id }
        });

        if (!classroom) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Fetch the student and their full history
        const student = await db.student.findUnique({
            where: { id: studentId, classId: id },
            select: {
                id: true,
                name: true,
                nickname: true,
                points: true,
                avatar: true,
                history: {
                    orderBy: { timestamp: "desc" },
                    take: 200,
                }
            }
        });

        if (!student) {
            return new NextResponse("Student Not Found", { status: 404 });
        }

        return NextResponse.json(student);

    } catch (error) {
        console.error("[STUDENT_HISTORY_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

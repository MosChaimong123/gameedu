import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; recordId: string }> }
) {
    const { id, recordId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const body = await req.json();
        const { status } = body;

        if (!status) {
            return new NextResponse("Status is required", { status: 400 });
        }

        // Verify Class Ownership
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const existingRecord = await db.attendanceRecord.findUnique({
            where: {
                id: recordId,
            },
            select: {
                id: true,
                classId: true,
                studentId: true,
            },
        });

        if (!existingRecord || existingRecord.classId !== id) {
            return new NextResponse("Attendance record not found", { status: 404 });
        }

        const updatedRecord = await db.attendanceRecord.update({
            where: {
                id: recordId,
            },
            data: {
                status
            }
        });

        // Also update the current status in Student model if the record is for today?
        // Let's just update the student's status as a bonus if they edit it, 
        // but maybe safer to keep them decoupled or update both. We will just update the Student too.
        await db.student.update({
            where: { id: updatedRecord.studentId },
            data: { attendance: status }
        });

        return NextResponse.json(updatedRecord);

    } catch (error) {
        console.error("[ATTENDANCE_RECORD_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

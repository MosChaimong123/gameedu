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
        const body = await req.json();
        const { updates } = body; // Array of { studentId, status }

        if (!updates || !Array.isArray(updates)) {
            return new NextResponse("Invalid data", { status: 400 });
        }

        // Verify Class Ownership
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Transactional update (or Promise.all)
        // Prisma doesn't support bulk update with different values easily in one query
        // so we use Promise.all
        await Promise.all(
            updates.map((update: { studentId: string; status: string }) =>
                db.student.update({
                    where: { id: update.studentId },
                    data: { attendance: update.status }
                })
            )
        );

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[ATTENDANCE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

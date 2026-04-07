import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    try {
        const session = await auth();
        const { id, studentId } = await params;

        if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const body = await req.json();
        const existingStudent = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true },
        });

        if (!existingStudent || existingStudent.classId !== id) {
            return new NextResponse("Student not found", { status: 404 });
        }

        const student = await db.student.update({
            where: { id: studentId },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.nickname !== undefined && { nickname: body.nickname }),
                ...(body.avatar !== undefined && { avatar: body.avatar }),
                ...(body.order !== undefined && { order: body.order }),
            }
        });

        return NextResponse.json(student);
    } catch (error) {
        console.error("[STUDENT_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    try {
        const session = await auth();
        const { id, studentId } = await params;

        if (!session?.user?.id) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });

        const existingStudent = await db.student.findUnique({
            where: { id: studentId },
            select: { id: true, classId: true },
        });

        if (!existingStudent || existingStudent.classId !== id) {
            return new NextResponse("Student not found", { status: 404 });
        }

        await db.student.delete({ where: { id: studentId } });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[STUDENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

type StudentGroupPatchData = {
    name?: string
    studentIds?: string[]
};

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    const { id, groupId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const group = await db.studentGroup.findUnique({
            where: {
                id: groupId,
                classId: id
            }
        });

        if (!group) {
            return new NextResponse("Group not found", { status: 404 });
        }

        await db.studentGroup.delete({
            where: { id: groupId }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[GROUP_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    const { id, groupId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const body = await req.json() as StudentGroupPatchData;
        const { name, studentIds } = body;

        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const group = await db.studentGroup.findUnique({
            where: {
                id: groupId,
                classId: id
            }
        });

        if (!group) {
            return new NextResponse("Group not found", { status: 404 });
        }

        const updatedData: StudentGroupPatchData = {};
        if (name !== undefined) updatedData.name = name;
        if (studentIds !== undefined) {
            const students = await db.student.findMany({
                where: {
                    id: {
                        in: studentIds,
                    },
                },
                select: {
                    id: true,
                    classId: true,
                },
            });

            if (students.length !== studentIds.length || students.some((student) => student.classId !== id)) {
                return new NextResponse("Student not found in classroom", { status: 404 });
            }

            updatedData.studentIds = studentIds;
        }

        const updatedGroup = await db.studentGroup.update({
            where: { id: groupId },
            data: updatedData
        });

        return NextResponse.json(updatedGroup);

    } catch (error) {
        console.error("[GROUP_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

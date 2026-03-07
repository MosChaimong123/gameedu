import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, groupId: string }> }
) {
    const { id, groupId } = await params;
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
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, studentIds } = body;

        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
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

        const updatedData: any = {};
        if (name !== undefined) updatedData.name = name;
        if (studentIds !== undefined) updatedData.studentIds = studentIds;

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

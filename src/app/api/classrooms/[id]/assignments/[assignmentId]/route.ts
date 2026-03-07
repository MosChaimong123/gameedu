import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string, assignmentId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id, teacherId: session.user.id }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const body = await req.json();

        const assignment = await db.assignment.update({
            where: { id: resolvedParams.assignmentId },
            data: {
                ...(body.name !== undefined && { name: body.name }),
                ...(body.maxScore !== undefined && { maxScore: body.maxScore }),
                ...(body.passScore !== undefined && { passScore: body.passScore }),
                ...(body.type !== undefined && { type: body.type }),
                ...(body.checklists !== undefined && { checklists: body.checklists }),
                ...(body.visible !== undefined && { visible: body.visible }),
                ...(body.order !== undefined && { order: body.order }),
            }
        });

        return NextResponse.json(assignment);
    } catch (error) {
        console.error("[ASSIGNMENT_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string, assignmentId: string }> }
) {
    try {
        const session = await auth();
        const resolvedParams = await params;

        if (!session?.user?.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const classroom = await db.classroom.findUnique({
            where: {
                id: resolvedParams.id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const assignment = await db.assignment.findUnique({
             where: { id: resolvedParams.assignmentId, classId: resolvedParams.id }
        });

        if (!assignment) {
             return new NextResponse("Assignment Not Found", { status: 404 });
        }

        await db.assignment.delete({
            where: {
                id: resolvedParams.assignmentId,
            }
        });

        return new NextResponse(null, { status: 204 });

    } catch (error) {
        console.error("[ASSIGNMENT_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

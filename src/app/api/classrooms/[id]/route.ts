import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";
import {
    InvalidClassroomBasicUpdateError,
    type ClassroomBasicUpdateInput,
    updateClassroomBasics,
} from "@/lib/services/classroom-settings/update-classroom-basics";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id as string,
            },
            include: {
                students: {
                    orderBy: { name: "asc" },
                    include: {
                        submissions: true,
                    },
                },
                skills: true,
                assignments: {
                    orderBy: {
                        order: "asc",
                    },
                },
            },
        });

        if (!classroom) {
            return new NextResponse("Not Found", { status: 404 });
        }

        return NextResponse.json(classroom);
    } catch (error) {
        console.error("[CLASSROOM_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const classroom = await db.classroom.delete({
            where: {
                id,
                teacherId: session.user.id as string,
            },
        });

        return NextResponse.json(classroom);
    } catch (error) {
        console.error("[CLASSROOM_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const body = await req.json() as ClassroomBasicUpdateInput;
        const classroom = await updateClassroomBasics({
            classroomId: id,
            teacherId: session.user.id as string,
            body,
        });

        return NextResponse.json(classroom);
    } catch (error) {
        if (error instanceof InvalidClassroomBasicUpdateError) {
            return new NextResponse(error.message, { status: 400 });
        }

        console.error("[CLASSROOM_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id as string // Ensure ownership
            },
            include: {
                students: {
                    orderBy: { name: 'asc' },
                    include: {
                        submissions: true
                    }
                },
                skills: true,
                assignments: {
                    orderBy: {
                        order: 'asc'
                    }
                }
            }
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
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const classroom = await db.classroom.delete({
            where: {
                id,
                teacherId: session.user.id as string
            }
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
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        
        const classroom = await db.classroom.update({
            where: {
                id,
                teacherId: session.user.id as string
            },
            data: {
                ...body
            }
        });

        return NextResponse.json(classroom);
    } catch (error) {
        console.error("[CLASSROOM_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

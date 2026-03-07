import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const resolvedParams = await params;

    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const body = await req.json();
        const { name, maxScore, type, checklists, passScore } = body;

        if (!name) {
            return new NextResponse("Name is required", { status: 400 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id },
            include: { assignments: true }
        });

        if (!classroom || classroom.teacherId !== session.user.id) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const assignment = await db.assignment.create({
            data: {
                classId: classroom.id,
                name,
                maxScore: maxScore || 10,
                type: type || "score",
                checklists: checklists || [],
                passScore: passScore ?? null,
                order: classroom.assignments.length
            }
        });

        return NextResponse.json(assignment);
    } catch (error) {
        console.error("[ASSIGNMENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const resolvedParams = await params;

    if (!session?.user?.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: { id: resolvedParams.id, teacherId: session.user.id }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const items: { id: string; order: number }[] = await req.json();

        await Promise.all(
            items.map(item =>
                db.assignment.update({
                    where: { id: item.id },
                    data: { order: item.order }
                })
            )
        );

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[ASSIGNMENTS_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}


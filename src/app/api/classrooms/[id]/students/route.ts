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
        const { students } = body;

        if (!students || !Array.isArray(students)) {
            return new NextResponse("Invalid data", { status: 400 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id, teacherId: session.user.id },
            include: { students: true }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const startOrder = classroom.students.length;

        const created = await db.student.createMany({
            data: students.map((s: any, i: number) => ({
                name: s.name,
                nickname: s.nickname || null,
                classId: id,
                avatar: s.avatar || Math.floor(Math.random() * 1000).toString(),
                loginCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                order: startOrder + i,
            }))
        });

        return NextResponse.json(created);
    } catch (error) {
        console.error("[STUDENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    try {
        const classroom = await db.classroom.findUnique({ where: { id, teacherId: session.user.id } });
        if (!classroom) return new NextResponse("Unauthorized", { status: 401 });

        const items: { id: string; order: number }[] = await req.json();

        await Promise.all(
            items.map(item =>
                db.student.update({ where: { id: item.id }, data: { order: item.order } })
            )
        );

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[STUDENTS_REORDER]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}


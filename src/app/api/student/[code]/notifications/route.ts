import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    try {
        const student = await db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true }
        });

        if (!student) {
            return new NextResponse("Student not found", { status: 404 });
        }

        const notifications = await db.notification.findMany({
            where: {
                studentId: student.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 30,
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("GET /api/student/[code]/notifications error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;

    try {
        const student = await db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: { id: true }
        });

        if (!student) {
            return new NextResponse("Student not found", { status: 404 });
        }

        const { id, isRead } = await req.json();

        if (id === "all") {
            await db.notification.updateMany({
                where: { studentId: student.id, isRead: false },
                data: { isRead: true }
            });
            return NextResponse.json({ success: true });
        }

        const notification = await db.notification.update({
            where: {
                id,
                studentId: student.id,
            },
            data: {
                isRead,
            },
        });

        return NextResponse.json(notification);
    } catch (error) {
        console.error("PATCH /api/student/[code]/notifications error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

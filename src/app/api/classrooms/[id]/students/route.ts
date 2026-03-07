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
        const { students } = body; // Array of names or single name? Let's support array

        if (!students || !Array.isArray(students)) {
            return new NextResponse("Invalid data", { status: 400 });
        }

        // Verify ownership
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Main Unauthorized", { status: 401 });
        }

        // Create Students
        // Using createMany if supported by provider (MongoDB supports it)
        const created = await db.student.createMany({
            data: students.map((s: any) => ({
                name: s.name,
                classId: id,
                avatar: s.avatar || Math.floor(Math.random() * 1000).toString(), // Random seed
                loginCode: Math.random().toString(36).substring(2, 8).toUpperCase()
            }))
        });

        return NextResponse.json(created);
    } catch (error) {
        console.error("[STUDENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

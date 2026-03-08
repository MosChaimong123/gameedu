import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    const { id, studentId } = await params;

    try {
        const { avatar, loginCode } = await req.json();

        // Verify the student belongs to this classroom + loginCode matches (public route — no session)
        const student = await db.student.findUnique({
            where: { id: studentId, classId: id },
            select: { loginCode: true }
        });

        if (!student || student.loginCode !== loginCode) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        if (!avatar || typeof avatar !== "string") {
            return new NextResponse("Invalid avatar", { status: 400 });
        }

        const updated = await db.student.update({
            where: { id: studentId },
            data: { avatar },
            select: { id: true, avatar: true }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[AVATAR_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

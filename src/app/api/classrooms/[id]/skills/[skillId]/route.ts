import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; skillId: string }> }
) {
    const { id, skillId } = await params;
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

        const skill = await db.skill.delete({
            where: {
                id: skillId,
                classId: id
            }
        });

        return NextResponse.json(skill);

    } catch (error) {
        console.error("[SKILL_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

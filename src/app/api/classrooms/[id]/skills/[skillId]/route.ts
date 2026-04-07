import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { AUTH_REQUIRED_MESSAGE } from "@/lib/api-error";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string; skillId: string }> }
) {
    const { id, skillId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
    }

    try {
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse(AUTH_REQUIRED_MESSAGE, { status: 401 });
        }

        const existingSkill = await db.skill.findUnique({
            where: {
                id: skillId,
            },
            select: {
                id: true,
                classId: true,
            },
        });

        if (!existingSkill || existingSkill.classId !== id) {
            return new NextResponse("Skill not found", { status: 404 });
        }

        const skill = await db.skill.delete({
            where: {
                id: skillId,
            }
        });

        return NextResponse.json(skill);

    } catch (error) {
        console.error("[SKILL_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

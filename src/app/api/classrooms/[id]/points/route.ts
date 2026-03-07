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
        const { studentId, skillId, weight } = body;

        if (!studentId || !skillId) {
            return new NextResponse("Missing data", { status: 400 });
        }

        // Verify Class Ownership
        const classroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id
            }
        });

        if (!classroom) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Get Skill details
        const skill = await db.skill.findUnique({
            where: { id: skillId }
        });

        if (!skill) {
            return new NextResponse("Skill not found", { status: 404 });
        }

        // Update Student Points
        const updatedStudent = await db.student.update({
            where: { id: studentId },
            data: {
                points: { increment: skill.weight },
                history: {
                    create: {
                        skillId: skill.id,
                        reason: skill.name,
                        value: skill.weight
                    }
                }
            }
        });

        // TODO: Emit Socket Event here (will be added in Phase 9.3 step)

        return NextResponse.json(updatedStudent);

    } catch (error) {
        console.error("[POINTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

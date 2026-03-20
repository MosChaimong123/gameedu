import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const session = await auth();

    if (!session || !session.user || !session.user.id) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        // Get the original classroom
        const originalClassroom = await db.classroom.findUnique({
            where: {
                id,
                teacherId: session.user.id as string
            },
            include: {
                skills: true,
                assignments: true
            }
        });

        if (!originalClassroom) {
            return new NextResponse("Not Found", { status: 404 });
        }

        // Generate unique name for duplicate
        const timestamp = new Date().toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const newName = `${originalClassroom.name} (Copy - ${timestamp})`;

        // Create new classroom with same settings but no students
        const duplicatedClassroom = await db.classroom.create({
            data: {
                name: newName,
                teacherId: session.user.id as string,
                emoji: originalClassroom.emoji,
                theme: originalClassroom.theme,
                grade: originalClassroom.grade,
                gamifiedSettings: originalClassroom.gamifiedSettings,
                levelConfig: originalClassroom.levelConfig,
                // Copy skills
                skills: {
                    create: originalClassroom.skills.map((skill: any) => ({
                        name: skill.name,
                        type: skill.type,
                        weight: skill.weight,
                        icon: skill.icon
                    }))
                },
                // Copy assignments
                assignments: {
                    create: originalClassroom.assignments.map((assignment: any) => ({
                        name: assignment.name,
                        description: assignment.description,
                        order: assignment.order
                    }))
                }
            },
            include: {
                skills: true,
                assignments: true
            }
        });

        return NextResponse.json({
            success: true,
            classroom: duplicatedClassroom
        });
    } catch (error) {
        console.error("[CLASSROOM_DUPLICATE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

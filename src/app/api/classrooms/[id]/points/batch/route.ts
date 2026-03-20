import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { sendNotification } from "@/lib/notifications";
import { IdleEngine } from "@/lib/game/idle-engine";

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
        const { studentIds, skillId, weight } = body;

        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0 || !skillId) {
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

        // Apply Points to all students in a transaction
        await db.$transaction(
            studentIds.map((studentId: any) => 
                db.student.update({
                    where: { 
                        id: studentId,
                        classId: classroom.id // extra security measure
                    },
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
                })
            )
        );
 
        // Trigger Stamina Refill for everyone if good deed is significant
        if (skill.weight >= 10) {
            await Promise.all(
                studentIds.map((sid: any) => IdleEngine.handleStaminaRefill(sid, skill.weight))
            );
        }

        // Notify all students in parallel
        await Promise.all(
            studentIds.map((studentId: any) => 
                sendNotification({
                    studentId,
                    title: skill.weight > 0 ? "ทั้งชั้นเรียนได้รับคะแนน!" : "ทั้งชั้นเรียนโดนหักคะแนน!",
                    message: `ทุกคนได้รับ ${skill.weight} คะแนน ในทักษะ: ${skill.name}`,
                    type: "POINT",
                })
            )
        );

        return NextResponse.json({ success: true, count: studentIds.length });

    } catch (error) {
        console.error("[POINTS_BATCH_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

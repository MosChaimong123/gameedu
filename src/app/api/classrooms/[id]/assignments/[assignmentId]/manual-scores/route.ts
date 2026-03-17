import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/auth";
import { IdleEngine } from "@/lib/game/idle-engine";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
    const { id, assignmentId } = await params;
    const session = await auth();

    if (!session || !session.user) {
        return new NextResponse("Unauthorized", { status: 401 });
    }

    try {
        const { studentId, score } = await req.json();

        if (!studentId || score === undefined) {
            return new NextResponse("Missing data", { status: 400 });
        }

        // Fetch student items for damage calculation
        const student = await db.student.findUnique({
            where: { id: studentId },
            select: {
                points: true,
                items: {
                    where: { isEquipped: true },
                    include: { item: true }
                }
            }
        });

        // Verify Class Ownership & Assignment Existence
        const assignment = await db.assignment.findUnique({
            where: {
                id: assignmentId,
                classId: id,
                classroom: {
                    teacherId: session.user.id
                }
            }
        });

        if (!assignment) {
            return new NextResponse("Assignment not found or unauthorized", { status: 404 });
        }

        // Upsert Submission
        const submission = await db.assignmentSubmission.upsert({
            where: {
                studentId_assignmentId: {
                    studentId,
                    assignmentId
                }
            },
            update: {
                score: score
            },
            create: {
                studentId,
                assignmentId,
                score: score,
                cheatingLogs: []
            }
        });

        // Apply World Boss Damage using the new ATK-based calculation
        const battleResult = IdleEngine.calculateBossDamage(student?.points || 0, student?.items || []);
        const scoreMultiplier = assignment.maxScore > 0 ? (score / assignment.maxScore) : 0;
        const finalDamage = Math.max(1, Math.round(battleResult.damage * scoreMultiplier));
        
        const updatedBoss = await IdleEngine.applyBossDamage(id, studentId, {
            damageOverride: finalDamage,
            consumeStamina: false
        });

        return NextResponse.json({ 
            ...submission,
            updatedBoss
        });

    } catch (error) {
        console.error("[MANUAL_SCORE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

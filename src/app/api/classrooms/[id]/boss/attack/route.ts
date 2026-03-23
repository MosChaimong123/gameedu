import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";
import {
  getNewlyUnlockedSkills,
  resolveEffectiveJobKey,
} from "@/lib/game/job-system";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await auth();
        const { id: classId } = await params;

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // 1. Get the student's ID for this classroom
        const student = await db.student.findFirst({
            where: { 
                classId: classId,
                userId: session.user.id
            },
            select: {
                id: true,
                gameStats: true,
                jobClass: true,
                jobTier: true,
                advanceClass: true,
                jobSkills: true,
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // 2. Apply Boss Damage (Consumes Stamina inside)
        const result = await IdleEngine.applyBossDamage(classId, student.id);

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // 3. Grant XP for attacking (20 XP per hit)
        const xpGain = 20;
        const currentStats = (student.gameStats as any) || IdleEngine.getDefaultStats();
        const xpResult = IdleEngine.calculateXpGain(currentStats, xpGain);

        // Check for newly unlocked skills on level-up (Req 11.6)
        let updatedJobSkills: string[] | undefined;
        if (xpResult.leveledUp && student.jobClass) {
            const currentSkillIds = (student.jobSkills as string[]) ?? [];
            const eff = resolveEffectiveJobKey({
                jobClass: student.jobClass,
                jobTier: student.jobTier,
                advanceClass: student.advanceClass,
            });
            const newSkills = getNewlyUnlockedSkills(
                eff,
                currentStats.level,
                xpResult.level,
                currentSkillIds
            );
            if (newSkills.length > 0) {
                updatedJobSkills = [...currentSkillIds, ...newSkills];
            }
        }

        await db.student.update({
            where: { id: student.id },
            data: {
                gameStats: {
                    ...currentStats,
                    level: xpResult.level,
                    xp: xpResult.xp
                } as any,
                ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {})
            }
        });

        return NextResponse.json({
            success: true,
            damage: result.damage,
            isCrit: result.isCrit,
            staminaLeft: result.staminaLeft,
            boss: result.boss,
            xpGained: xpGain,
            leveledUp: xpResult.leveledUp
        });

    } catch (error) {
        console.error("Error attacking boss:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

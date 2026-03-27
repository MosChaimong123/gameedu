import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";
import { applyJobSkillUnlocksOnLevelUp } from "@/lib/game/job-system";
import { getElementMultiplier, getJobElement, getElementLabel } from "@/lib/game/element-system";
import { trackQuestEvent } from "@/lib/game/quest-engine";

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

        // 1. Get student
        const student = await db.student.findFirst({
            where: { classId, userId: session.user.id },
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

        // 2. Get boss element for multiplier
        const classroom = await db.classroom.findUnique({
            where: { id: classId },
            select: { gamifiedSettings: true }
        });
        const settings = (classroom?.gamifiedSettings ?? {}) as Record<string, unknown>;
        const boss = settings.boss as Record<string, unknown> | undefined;
        const bossElementKey = (boss?.elementKey as string | undefined) ?? null;

        const elementMultiplier = getElementMultiplier(student.jobClass, bossElementKey);

        // 3. Apply Boss Damage with element multiplier
        const result = await IdleEngine.applyBossDamage(classId, student.id, {
            consumeStamina: true,
            elementMultiplier,
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // 4. Grant XP for attacking (20 XP per hit)
        const xpGain = 20;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentStats = (student.gameStats as any) || IdleEngine.getDefaultStats();
        const xpResult = IdleEngine.calculateXpGain(currentStats, xpGain);

        let updatedJobSkills: string[] | undefined;
        if (xpResult.leveledUp) {
            const currentSkillIds = (student.jobSkills as string[]) ?? [];
            updatedJobSkills = applyJobSkillUnlocksOnLevelUp({
                jobClass: student.jobClass,
                jobTier: student.jobTier,
                advanceClass: student.advanceClass,
                oldLevel: (currentStats.level as number) ?? 1,
                newLevel: xpResult.level ?? (currentStats.level as number) ?? 1,
                currentJobSkills: currentSkillIds,
            });
        }

        await db.student.update({
            where: { id: student.id },
            data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                gameStats: { ...currentStats, level: xpResult.level, xp: xpResult.xp } as any,
                ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {})
            }
        });

        // 5. Track quest event (fire-and-forget)
        void trackQuestEvent(student.id, "BOSS_ATTACK");

        return NextResponse.json({
            success: true,
            damage: result.damage,
            isCrit: result.isCrit,
            staminaLeft: result.staminaLeft,
            boss: result.boss,
            xpGained: xpGain,
            leveledUp: xpResult.leveledUp,
            elementMultiplier,
            jobElement: getJobElement(student.jobClass),
            bossElement: bossElementKey,
            elementLabel: getElementLabel(elementMultiplier),
            triggeredSkill: result.triggeredSkills?.[0]
                ? { name: result.triggeredSkills[0] }
                : undefined,
        });

    } catch (error) {
        console.error("Error attacking boss:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

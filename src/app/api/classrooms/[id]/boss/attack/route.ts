import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { IdleEngine } from "@/lib/game/idle-engine";
import { applyJobSkillUnlocksOnLevelUp, getMergedClassDef } from "@/lib/game/job-system";
import { getElementMultiplier, getJobElement, getElementLabel } from "@/lib/game/element-system";
import { getBossPreset } from "@/lib/game/boss-config";
import { getBossRaidTemplate } from "@/lib/game/personal-classroom-boss";
import { trackQuestEvent } from "@/lib/game/quest-engine";
import { getEffectiveSkillAtRank, getSkillRank } from "@/lib/game/skill-tree";

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

        const body = await req.json().catch(() => ({})) as {
            limitBreak?: boolean;
            action?: "magic" | "attack";
            skillId?: string;
        };
        const isLimitBreak = body.limitBreak === true;
        const skillId = body.skillId ?? null;
        // A skill use always counts as magic (no stamina cost, MP deducted instead)
        const isMagicAction = body.action === "magic" || skillId !== null;

        const student = await db.student.findFirst({
            where: { classId, userId: session.user.id },
            select: {
                id: true,
                name: true,
                gameStats: true,
                jobClass: true,
                jobTier: true,
                advanceClass: true,
                jobSkills: true,
                mana: true,
            }
        });

        if (!student) {
            return NextResponse.json({ error: "Student not found" }, { status: 404 });
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentStats = (student.gameStats as any) || IdleEngine.getDefaultStats();
        const currentCharge: number = currentStats.limitBreakCharge ?? 0;

        if (isLimitBreak && currentCharge < 100) {
            return NextResponse.json({ error: "Limit Break not ready" }, { status: 400 });
        }

        const currentMana: number = student.mana ?? 0;

        // Skill attack: resolve skill def, validate, compute effective stats
        let skillDamageMultiplier: number | undefined;
        let skillForceCrit: boolean | undefined;
        let skillName: string | undefined;
        let skillCtbEffect: { type: "SLOW" | "HASTE"; delta: number } | undefined;
        let manaCost = 20; // default magic attack cost

        if (skillId) {
            const jobKey = student.advanceClass ?? student.jobClass;
            if (!jobKey) {
                return NextResponse.json({ error: "ไม่มีอาชีพ" }, { status: 400 });
            }
            const classDef = getMergedClassDef(jobKey);
            const skillDef = classDef.skills.find((s) => s.id === skillId);
            if (!skillDef) {
                return NextResponse.json({ error: "ไม่พบสกิลนี้" }, { status: 400 });
            }
            if (skillDef.costType !== "MP") {
                return NextResponse.json({ error: "สกิลนี้ไม่ใช่ Magic skill" }, { status: 400 });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const skillProgress = ((student.gameStats as any)?.skillTreeProgress ?? {}) as Record<string, number>;
            const skillRank = getSkillRank(skillProgress, skillId);
            const effectiveSkill = getEffectiveSkillAtRank(skillDef, Math.max(1, skillRank));
            manaCost = effectiveSkill.cost;
            if (currentMana < manaCost) {
                return NextResponse.json({ error: `MP ไม่พอ (ต้องการ ${manaCost} MP)` }, { status: 400 });
            }
            skillDamageMultiplier = effectiveSkill.damageMultiplier;
            skillForceCrit = effectiveSkill.isCrit;
            skillName = effectiveSkill.name;
            skillCtbEffect = effectiveSkill.ctbEffect;
        } else if (isMagicAction && currentMana < manaCost) {
            return NextResponse.json({ error: "MP ไม่พอ (ต้องการ 20 MP)" }, { status: 400 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id: classId },
            select: { gamifiedSettings: true }
        });
        const settings = (classroom?.gamifiedSettings ?? {}) as Record<string, unknown>;
        const template = getBossRaidTemplate(settings);
        const preset = template?.bossId ? getBossPreset(template.bossId) : null;
        const bossElementKey =
            template?.elementKey ?? preset?.elementKey ?? null;

        const elementMultiplier = getElementMultiplier(student.jobClass, bossElementKey);

        const result = await IdleEngine.applyBossDamage(classId, student.id, {
            consumeStamina: !isMagicAction,
            elementMultiplier,
            isLimitBreak,
            jobClass: student.jobClass,
            isMagicAttack: isMagicAction,
            studentName: student.name ?? undefined,
            skillDamageMultiplier,
            skillForceCrit,
            skillName,
            skillCtbEffect,
        });

        if (result.error) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        let newCharge: number;
        if (isLimitBreak) {
            newCharge = 0;
        } else {
            newCharge = Math.min(100, currentCharge + (result.limitBreakChargeGain ?? 0));
        }

        const xpGain = 20;
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

        const updatedStudent = await db.student.update({
            where: { id: student.id },
            data: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                gameStats: { ...currentStats, level: xpResult.level, xp: xpResult.xp, limitBreakCharge: newCharge } as any,
                ...(isMagicAction ? { mana: { decrement: manaCost } } : {}),
                ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {})
            },
            select: { mana: true },
        });

        void trackQuestEvent(student.id, "BOSS_ATTACK");

        return NextResponse.json({
            success: true,
            damage: result.damage,
            isCrit: result.isCrit,
            staminaLeft: result.staminaLeft,
            manaLeft: updatedStudent.mana,
            boss: result.boss,
            targetInstanceId: result.targetInstanceId,
            xpGained: xpGain,
            leveledUp: xpResult.leveledUp,
            elementMultiplier,
            jobElement: getJobElement(student.jobClass),
            bossElement: bossElementKey,
            elementLabel: getElementLabel(elementMultiplier),
            triggeredSkill: result.triggeredSkills?.[0]
                ? { name: result.triggeredSkills[0] }
                : undefined,
            limitBreakCharge: newCharge,
            comboLabel: result.comboLabel ?? "",
            comboMult: result.comboMult ?? 1.0,
            // FF battle system extras
            isMiss: result.isMiss ?? false,
            justStaggered: result.justStaggered ?? false,
            isStaggered: result.isStaggered ?? false,
            staggerGauge: result.staggerGauge ?? 0,
            executedBossAction: result.executedBossAction ?? null,
            playerBattleState: result.playerBattleState ?? null,
            battleLog: result.battleLog ?? [],
            phase: result.phase ?? 1,
            hitsUntilBossAct: result.hitsUntilBossAct ?? null,
            // CTB Timeline
            ctbTimeline: result.ctbTimeline ?? [],
            // CTB Delay Mechanics
            ctbEffectApplied: result.ctbEffectApplied ?? null,
        });

    } catch (error) {
        console.error("Error attacking boss:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

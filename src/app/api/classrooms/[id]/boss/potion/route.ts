import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { toPrismaJson } from "@/lib/game/game-stats";
import {
    getPersonalBossFromStats,
    mergeGameStatsWithPersonalBoss,
    getBossRaidTemplate,
} from "@/lib/game/personal-classroom-boss";
import { StatCalculator } from "@/lib/game/stat-calculator";
import type { PlayerBattleState } from "@/lib/game/boss-config";
import type { PersonalClassroomBoss } from "@/lib/game/personal-classroom-boss";

const HP_POTION_COST = 100;   // gold
const MP_ELIXIR_COST = 60;    // gold
const HP_RESTORE_PCT = 0.40;  // 40% of maxBattleHp
const MP_RESTORE_FLAT = 80;   // flat MP restore

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

        const body = await req.json().catch(() => ({})) as { type?: "HP" | "MP" };
        const potionType = body.type;
        if (potionType !== "HP" && potionType !== "MP") {
            return NextResponse.json({ error: "Invalid potion type" }, { status: 400 });
        }

        const student = await db.student.findFirst({
            where: { classId, userId: session.user.id },
            select: {
                id: true, gameStats: true, mana: true,
                points: true, jobClass: true, jobTier: true, advanceClass: true,
                items: { include: { item: true }, where: { isEquipped: true } },
            },
        });
        if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const gs = (student.gameStats as any) ?? {};
        const currentGold: number = gs.gold ?? 0;
        const cost = potionType === "HP" ? HP_POTION_COST : MP_ELIXIR_COST;

        if (currentGold < cost) {
            return NextResponse.json({ error: `Gold ไม่พอ (ต้องการ ${cost} Gold)` }, { status: 400 });
        }

        const classroom = await db.classroom.findUnique({
            where: { id: classId }, select: { gamifiedSettings: true },
        });
        const template = getBossRaidTemplate((classroom?.gamifiedSettings ?? {}) as Record<string, unknown>);
        if (!template) return NextResponse.json({ error: "No active boss" }, { status: 400 });

        const personal = getPersonalBossFromStats(student.gameStats);
        if (!personal || personal.active === false || Number(personal.currentHp) <= 0) {
            return NextResponse.json({ error: "No active boss" }, { status: 400 });
        }

        // ── HP Potion ─────────────────────────────────────────────────────────
        let newBattleHp: number | null = null;
        let newBattleHpMax: number | null = null;
        let newMana: number | null = null;
        let patchedBoss = personal as PersonalClassroomBoss;

        if (potionType === "HP") {
            const level = (gs.level as number) ?? 1;
            const fullStats = StatCalculator.compute(
                student.points || 0, student.items || [], level,
                student.jobClass, student.jobTier ?? "BASE", student.advanceClass
            );
            const playerMaxHp = Math.max(1, fullStats.hp);
            const existing: PlayerBattleState = personal.playerBattleState ??
                { battleHp: playerMaxHp, maxBattleHp: playerMaxHp, statusEffects: [] };
            const restoreAmt = Math.floor(playerMaxHp * HP_RESTORE_PCT);
            newBattleHp = Math.min(playerMaxHp, (existing.battleHp ?? 0) + restoreAmt);
            newBattleHpMax = playerMaxHp;
            const updatedState: PlayerBattleState = { ...existing, battleHp: newBattleHp, maxBattleHp: playerMaxHp };
            patchedBoss = { ...(personal as PersonalClassroomBoss), playerBattleState: updatedState };
        }

        // ── MP Elixir ─────────────────────────────────────────────────────────
        if (potionType === "MP") {
            newMana = Math.min(200, (student.mana ?? 0) + MP_RESTORE_FLAT);
        }

        // Merge patched boss back into gameStats and deduct gold
        const mergedGameStats = {
            ...gs,
            gold: currentGold - cost,
            personalClassroomBoss: potionType === "HP"
                ? patchedBoss
                : mergeGameStatsWithPersonalBoss(student.gameStats, personal as PersonalClassroomBoss)
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ?.personalClassroomBoss ?? (student.gameStats as any)?.personalClassroomBoss,
        };

        await db.student.update({
            where: { id: student.id },
            data: {
                gameStats: toPrismaJson(mergedGameStats),
                ...(newMana !== null ? { mana: newMana } : {}),
            },
        });

        return NextResponse.json({
            success: true,
            type: potionType,
            goldSpent: cost,
            goldLeft: currentGold - cost,
            ...(newBattleHp !== null ? { battleHp: newBattleHp, maxBattleHp: newBattleHpMax } : {}),
            ...(newMana !== null ? { manaLeft: newMana } : {}),
        });

    } catch (error) {
        console.error("Potion error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

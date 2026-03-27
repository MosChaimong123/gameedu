import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveBattle } from "@/lib/game/battle-engine";
import {
  getPvpMatchupBaseClass,
  resolveEffectiveJobKey,
} from "@/lib/game/job-system";
import { trackQuestEvent } from "@/lib/game/quest-engine";

// POST /api/student/[code]/battles/[battleId]/accept
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string; battleId: string }> }
) {
  try {
    const { code, battleId } = await params;

    // Load defender (the one accepting)
    const defender = await db.student.findUnique({
      where: { loginCode: code.toUpperCase() },
      select: {
        id: true,
        gameStats: true,
        points: true,
        jobClass: true,
        jobTier: true,
        advanceClass: true,
        items: { where: { isEquipped: true }, include: { item: true } },
      }
    });
    if (!defender) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Load battle
    const battle = await db.studentBattle.findUnique({
      where: { id: battleId },
      include: {
        challenger: {
          select: {
            id: true,
            name: true,
            gameStats: true,
            points: true,
            jobClass: true,
            jobTier: true,
            advanceClass: true,
            items: { where: { isEquipped: true }, include: { item: true } },
          }
        }
      }
    });

    if (!battle) return NextResponse.json({ error: "Battle not found" }, { status: 404 });
    if (battle.defenderId !== defender.id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    if (battle.status !== "PENDING") return NextResponse.json({ error: "Challenge expired or already resolved" }, { status: 400 });

    // Check both have enough gold
    const defenderGold = (defender.gameStats as any)?.gold || 0;
    const challengerGold = (battle.challenger.gameStats as any)?.gold || 0;
    if (defenderGold < battle.betAmount) return NextResponse.json({ error: "Gold ของคุณไม่เพียงพอ" }, { status: 400 });
    if (challengerGold < battle.betAmount) return NextResponse.json({ error: "ผู้ท้าดวลมี Gold ไม่เพียงพอแล้ว" }, { status: 400 });

    // Build stats
    const challengerStats = {
      points: battle.challenger.points,
      gold: challengerGold,
      items: battle.challenger.items.map((i: any) => ({
        goldMultiplier: i.item.goldMultiplier,
        bossDamageMultiplier: i.item.bossDamageMultiplier,
        enhancementLevel: i.enhancementLevel
      }))
    };
    const defenderStats = {
      points: defender.points,
      gold: defenderGold,
      items: defender.items.map((i: any) => ({
        goldMultiplier: i.item.goldMultiplier,
        bossDamageMultiplier: i.item.bossDamageMultiplier,
        enhancementLevel: i.enhancementLevel
      }))
    };

    // Resolve battle
    const challengerEff = resolveEffectiveJobKey({
      jobClass: battle.challenger.jobClass,
      jobTier: battle.challenger.jobTier,
      advanceClass: battle.challenger.advanceClass,
    });
    const defenderEff = resolveEffectiveJobKey({
      jobClass: defender.jobClass,
      jobTier: defender.jobTier,
      advanceClass: defender.advanceClass,
    });
    const { challengerRoll, defenderRoll, winnerId } = resolveBattle(
      battle.challengerId,
      challengerStats,
      defender.id,
      defenderStats,
      getPvpMatchupBaseClass(challengerEff),
      getPvpMatchupBaseClass(defenderEff)
    );

    const loserId = winnerId === battle.challengerId ? defender.id : battle.challengerId;
    const winnerIsChallenger = winnerId === battle.challengerId;

    // Transfer gold: loser → winner
    const winnerCurrentGold = winnerIsChallenger ? challengerGold : defenderGold;
    const loserCurrentGold = winnerIsChallenger ? defenderGold : challengerGold;

    // Sequential updates
    await db.studentBattle.update({
      where: { id: battleId },
      data: {
        status: "COMPLETED",
        winnerId,
        challengerRoll,
        defenderRoll,
        resolvedAt: new Date()
      }
    });

    // Winner gets gold + arena points
    const winnerStudent = await db.student.findUnique({ where: { id: winnerId }, select: { gameStats: true } });
    const winnerStats = (winnerStudent?.gameStats as any) || {};
    const arenaPointsGain = Math.max(5, Math.floor(battle.betAmount / 10)) + 10;
    const currentArenaPoints: number = winnerStats.arenaPoints ?? 0;
    await db.student.update({
      where: { id: winnerId },
      data: { gameStats: { ...winnerStats, gold: winnerCurrentGold + battle.betAmount, arenaPoints: currentArenaPoints + arenaPointsGain } as any }
    });
    void trackQuestEvent(winnerId, "PVP_WIN");

    // Loser loses gold
    const loserStudent = await db.student.findUnique({ where: { id: loserId }, select: { gameStats: true } });
    const loserStats = (loserStudent?.gameStats as any) || {};
    await db.student.update({
      where: { id: loserId },
      data: { gameStats: { ...loserStats, gold: Math.max(0, loserCurrentGold - battle.betAmount) } as any }
    });

    // Log in point history for both
    await db.pointHistory.create({
      data: { studentId: winnerId, reason: `⚔️ ชนะการดวล — รับ ${battle.betAmount} Gold`, value: battle.betAmount }
    });
    await db.pointHistory.create({
      data: { studentId: loserId, reason: `⚔️ แพ้การดวล — เสีย ${battle.betAmount} Gold`, value: -battle.betAmount }
    });

    return NextResponse.json({
      success: true,
      winnerId,
      challengerRoll,
      defenderRoll,
      betAmount: battle.betAmount,
      winnerName: winnerIsChallenger ? battle.challenger.name : undefined,
    });
  } catch (error) {
    console.error("Error accepting battle:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

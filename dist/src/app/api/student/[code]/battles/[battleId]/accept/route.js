"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const battle_engine_1 = require("@/lib/game/battle-engine");
// POST /api/student/[code]/battles/[battleId]/accept
async function POST(req, { params }) {
    var _a, _b;
    try {
        const { code, battleId } = await params;
        // Load defender (the one accepting)
        const defender = await db_1.db.student.findUnique({
            where: { loginCode: code.toUpperCase() },
            select: {
                id: true, gameStats: true, points: true, jobClass: true,
                items: { where: { isEquipped: true }, include: { item: true } }
            }
        });
        if (!defender)
            return server_1.NextResponse.json({ error: "Not found" }, { status: 404 });
        // Load battle
        const battle = await db_1.db.studentBattle.findUnique({
            where: { id: battleId },
            include: {
                challenger: {
                    select: {
                        id: true, name: true, gameStats: true, points: true, jobClass: true,
                        items: { where: { isEquipped: true }, include: { item: true } }
                    }
                }
            }
        });
        if (!battle)
            return server_1.NextResponse.json({ error: "Battle not found" }, { status: 404 });
        if (battle.defenderId !== defender.id)
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        if (battle.status !== "PENDING")
            return server_1.NextResponse.json({ error: "Challenge expired or already resolved" }, { status: 400 });
        // Check both have enough gold
        const defenderGold = ((_a = defender.gameStats) === null || _a === void 0 ? void 0 : _a.gold) || 0;
        const challengerGold = ((_b = battle.challenger.gameStats) === null || _b === void 0 ? void 0 : _b.gold) || 0;
        if (defenderGold < battle.betAmount)
            return server_1.NextResponse.json({ error: "Gold ของคุณไม่เพียงพอ" }, { status: 400 });
        if (challengerGold < battle.betAmount)
            return server_1.NextResponse.json({ error: "ผู้ท้าดวลมี Gold ไม่เพียงพอแล้ว" }, { status: 400 });
        // Build stats
        const challengerStats = {
            points: battle.challenger.points,
            gold: challengerGold,
            items: battle.challenger.items.map((i) => ({
                goldMultiplier: i.item.goldMultiplier,
                bossDamageMultiplier: i.item.bossDamageMultiplier,
                enhancementLevel: i.enhancementLevel
            }))
        };
        const defenderStats = {
            points: defender.points,
            gold: defenderGold,
            items: defender.items.map((i) => ({
                goldMultiplier: i.item.goldMultiplier,
                bossDamageMultiplier: i.item.bossDamageMultiplier,
                enhancementLevel: i.enhancementLevel
            }))
        };
        // Resolve battle
        const { challengerRoll, defenderRoll, winnerId } = (0, battle_engine_1.resolveBattle)(battle.challengerId, challengerStats, defender.id, defenderStats, battle.challenger.jobClass, defender.jobClass);
        const loserId = winnerId === battle.challengerId ? defender.id : battle.challengerId;
        const winnerIsChallenger = winnerId === battle.challengerId;
        // Transfer gold: loser → winner
        const winnerCurrentGold = winnerIsChallenger ? challengerGold : defenderGold;
        const loserCurrentGold = winnerIsChallenger ? defenderGold : challengerGold;
        // Sequential updates
        await db_1.db.studentBattle.update({
            where: { id: battleId },
            data: {
                status: "COMPLETED",
                winnerId,
                challengerRoll,
                defenderRoll,
                resolvedAt: new Date()
            }
        });
        // Winner gets gold
        const winnerStudent = await db_1.db.student.findUnique({ where: { id: winnerId }, select: { gameStats: true } });
        const winnerStats = (winnerStudent === null || winnerStudent === void 0 ? void 0 : winnerStudent.gameStats) || {};
        await db_1.db.student.update({
            where: { id: winnerId },
            data: { gameStats: { ...winnerStats, gold: winnerCurrentGold + battle.betAmount } }
        });
        // Loser loses gold
        const loserStudent = await db_1.db.student.findUnique({ where: { id: loserId }, select: { gameStats: true } });
        const loserStats = (loserStudent === null || loserStudent === void 0 ? void 0 : loserStudent.gameStats) || {};
        await db_1.db.student.update({
            where: { id: loserId },
            data: { gameStats: { ...loserStats, gold: Math.max(0, loserCurrentGold - battle.betAmount) } }
        });
        // Log in point history for both
        await db_1.db.pointHistory.create({
            data: { studentId: winnerId, reason: `⚔️ ชนะการดวล — รับ ${battle.betAmount} Gold`, value: battle.betAmount }
        });
        await db_1.db.pointHistory.create({
            data: { studentId: loserId, reason: `⚔️ แพ้การดวล — เสีย ${battle.betAmount} Gold`, value: -battle.betAmount }
        });
        return server_1.NextResponse.json({
            success: true,
            winnerId,
            challengerRoll,
            defenderRoll,
            betAmount: battle.betAmount,
            winnerName: winnerIsChallenger ? battle.challenger.name : undefined,
        });
    }
    catch (error) {
        console.error("Error accepting battle:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

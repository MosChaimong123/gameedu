"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
const game_stats_1 = require("@/lib/game/game-stats");
/**
 * POST /api/student/inventory/sell
 * Body: { studentItemId: string }
 *
 * Selling Formula: Math.floor(basePrice * 0.5 * (1 + enhancementLevel * 0.1))
 */
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { studentItemId } = body;
        if (!studentItemId) {
            return server_1.NextResponse.json({ error: "Missing item ID" }, { status: 400 });
        }
        const studentItem = await db_1.db.studentItem.findUnique({
            where: { id: studentItemId },
            include: {
                item: true,
                student: true,
            },
        });
        if (!studentItem) {
            return server_1.NextResponse.json({ error: "Item not found" }, { status: 404 });
        }
        if (studentItem.student.userId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Forbidden: You don't own this item" }, { status: 403 });
        }
        const basePrice = studentItem.item.price || 0;
        const level = studentItem.enhancementLevel || 0;
        const sellPrice = Math.floor(basePrice * 0.5 * (1 + level * 0.1));
        const updatedStudent = await db_1.db.$transaction(async (tx) => {
            const latestStudentItem = await tx.studentItem.findUnique({
                where: { id: studentItemId },
                include: {
                    item: true,
                    student: true,
                },
            });
            if (!latestStudentItem) {
                throw new Error("ITEM_NOT_FOUND");
            }
            const latestGameStats = (0, game_stats_1.parseGameStats)(latestStudentItem.student.gameStats);
            const updatedGold = Number(latestGameStats.gold || 0) + sellPrice;
            await tx.studentItem.delete({
                where: { id: studentItemId },
            });
            return tx.student.update({
                where: { id: latestStudentItem.studentId },
                data: {
                    gameStats: {
                        ...latestGameStats,
                        gold: updatedGold,
                    },
                    history: {
                        create: {
                            reason: `Sold item: ${latestStudentItem.item.name}${level > 0 ? ` (+${level})` : ""}`,
                            value: 0,
                            timestamp: new Date(),
                        },
                    },
                },
            });
        });
        return server_1.NextResponse.json({
            success: true,
            receivedGold: sellPrice,
            newGold: (_a = updatedStudent.gameStats) === null || _a === void 0 ? void 0 : _a.gold,
            itemName: studentItem.item.name,
        });
    }
    catch (error) {
        console.error("Selling error:", error);
        if (error instanceof Error && error.message === "ITEM_NOT_FOUND") {
            return server_1.NextResponse.json({ error: "Item not found" }, { status: 404 });
        }
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

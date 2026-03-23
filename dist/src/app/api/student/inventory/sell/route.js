"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
/**
 * POST /api/student/inventory/sell
 * Body: { studentItemId: string }
 *
 * Selling Formula: Math.floor(basePrice * 0.5 * (1 + enhancementLevel * 0.1))
 */
async function POST(req) {
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
        // 1. Fetch StudentItem with Item info and Student info
        const studentItem = await db_1.db.studentItem.findUnique({
            where: { id: studentItemId },
            include: {
                item: true,
                student: true
            }
        });
        if (!studentItem) {
            return server_1.NextResponse.json({ error: "Item not found" }, { status: 404 });
        }
        // Security check: ensure student belongs to the logged in user or is authorized
        // (In this system, we rely on studentId/userId linking)
        if (studentItem.student.userId !== session.user.id) {
            // Allow teachers to manage too? For now, just the student themselves.
            return server_1.NextResponse.json({ error: "Forbidden: You don't own this item" }, { status: 403 });
        }
        const basePrice = studentItem.item.price || 0;
        const level = studentItem.enhancementLevel || 0;
        // 2. Calculate Sell Price
        // Price = 50% base + 10% bonus per enhancement level
        const sellPrice = Math.floor(basePrice * 0.5 * (1 + level * 0.1));
        const gameStats = studentItem.student.gameStats || {};
        const currentGold = Number(gameStats.gold || 0);
        // 3. Update Database in a transaction
        const updatedGold = currentGold + sellPrice;
        const updatedStats = {
            ...gameStats,
            gold: updatedGold
        };
        const [deletedItem, updatedStudent] = await db_1.db.$transaction([
            // Remove item from inventory
            db_1.db.studentItem.delete({
                where: { id: studentItemId }
            }),
            // Update student gold and record history
            db_1.db.student.update({
                where: { id: studentItem.studentId },
                data: {
                    gameStats: updatedStats,
                    history: {
                        create: {
                            reason: `💰 ขายไอเทม: ${studentItem.item.name} ${level > 0 ? `(+${level})` : ''}`,
                            value: 0, // Behavior points don't increase from selling
                            timestamp: new Date()
                        }
                    }
                }
            })
        ]);
        return server_1.NextResponse.json({
            success: true,
            receivedGold: sellPrice,
            newGold: updatedGold,
            itemName: studentItem.item.name
        });
    }
    catch (error) {
        console.error("Selling error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

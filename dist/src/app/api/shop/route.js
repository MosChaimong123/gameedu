"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
// GET /api/shop - List items (filtered if studentId provided)
async function GET(req) {
    try {
        const studentId = req.nextUrl.searchParams.get("studentId");
        let items = await db_1.db.item.findMany({
            orderBy: { price: "asc" }
        });
        // If studentId provided, filter out items they already own
        if (studentId) {
            const ownedItems = await db_1.db.studentItem.findMany({
                where: { studentId },
                select: { itemId: true }
            });
            const ownedIds = new Set(ownedItems.map((oi) => oi.itemId));
            items = items.filter((item) => !ownedIds.has(item.id));
        }
        return server_1.NextResponse.json(items);
    }
    catch (error) {
        console.error("Error fetching shop items:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// POST /api/shop/buy - Buy an item
async function POST(req) {
    var _a, _b;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { itemId, studentId } = await req.json();
        if (!itemId || !studentId) {
            return server_1.NextResponse.json({ error: "Missing itemId or studentId" }, { status: 400 });
        }
        // 1. Get Item and Student
        const [item, student, existingItem] = await Promise.all([
            db_1.db.item.findUnique({ where: { id: itemId } }),
            db_1.db.student.findUnique({ where: { id: studentId } }),
            db_1.db.studentItem.findFirst({
                where: { studentId, itemId }
            })
        ]);
        if (!item || !student) {
            return server_1.NextResponse.json({ error: "Item or Student not found" }, { status: 404 });
        }
        // 2. Prevent duplicate purchase
        if (existingItem) {
            return server_1.NextResponse.json({ error: "คุณมีไอเทมชิ้นนี้อยู่แล้ว" }, { status: 400 });
        }
        // 3. Check if student has enough gold
        const gameStats = student.gameStats || {};
        const currentGold = Number(gameStats.gold || 0);
        if (currentGold < item.price) {
            return server_1.NextResponse.json({ error: "ทองไม่พอซื้อไอเทมนี้" }, { status: 400 });
        }
        // 4. Perform Transaction
        const updatedStudent = await db_1.db.$transaction(async (tx) => {
            // Deduct gold
            const studentUpdate = await tx.student.update({
                where: { id: studentId },
                data: {
                    gameStats: {
                        ...gameStats,
                        gold: currentGold - item.price
                    }
                }
            });
            // Add StudentItem
            await tx.studentItem.create({
                data: {
                    studentId,
                    itemId,
                    quantity: 1,
                    isEquipped: false
                }
            });
            return studentUpdate;
        });
        return server_1.NextResponse.json({
            success: true,
            gold: (_b = updatedStudent.gameStats) === null || _b === void 0 ? void 0 : _b.gold
        });
    }
    catch (error) {
        console.error("Error buying item:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

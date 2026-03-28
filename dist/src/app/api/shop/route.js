"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const game_stats_1 = require("@/lib/game/game-stats");
const rpg_route_errors_1 = require("@/lib/game/rpg-route-errors");
const rpg_copy_1 = require("@/lib/game/rpg-copy");
const student_item_stats_1 = require("@/lib/game/student-item-stats");
// GET /api/shop - List items
async function GET(req) {
    var _a, _b, _c;
    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get("studentId");
        const items = await db_1.db.item.findMany({
            orderBy: { price: "asc" },
        });
        // If studentId provided, filter out owned equipment and return gold/gems/points
        if (studentId) {
            const [student, ownedItems] = await Promise.all([
                db_1.db.student.findUnique({
                    where: { id: studentId },
                    select: { points: true, gameStats: true },
                }),
                db_1.db.studentItem.findMany({
                    where: { studentId },
                    select: { itemId: true },
                }),
            ]);
            const ownedItemIds = new Set(ownedItems.map((si) => si.itemId));
            // Hide equipment the student already owns; consumables always show
            const visibleItems = items.filter((item) => item.type === "CONSUMABLE" || !ownedItemIds.has(item.id));
            const gs = student ? (0, game_stats_1.parseGameStats)(student.gameStats) : null;
            return server_1.NextResponse.json({
                items: visibleItems,
                gold: (_a = gs === null || gs === void 0 ? void 0 : gs.gold) !== null && _a !== void 0 ? _a : 0,
                gems: (_b = gs === null || gs === void 0 ? void 0 : gs.gems) !== null && _b !== void 0 ? _b : 0,
                points: (_c = student === null || student === void 0 ? void 0 : student.points) !== null && _c !== void 0 ? _c : 0,
            });
        }
        return server_1.NextResponse.json({ items });
    }
    catch (error) {
        console.error("Error fetching shop items:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
// POST /api/shop/buy - Buy an item
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { itemId, studentId, quantity = 1 } = (await req.json());
        if (!itemId || !studentId) {
            return server_1.NextResponse.json({ error: "Missing itemId or studentId" }, { status: 400 });
        }
        const buyQty = Math.max(1, Number(quantity));
        const [item, student, existingItem] = await Promise.all([
            db_1.db.item.findUnique({ where: { id: itemId } }),
            db_1.db.student.findUnique({
                where: { id: studentId },
                select: { points: true, gameStats: true },
            }),
            db_1.db.studentItem.findFirst({
                where: { studentId, itemId },
                select: { id: true, quantity: true },
            }),
        ]);
        if (!item || !student) {
            return server_1.NextResponse.json({ error: "Item or Student not found" }, { status: 404 });
        }
        if (existingItem && item.type !== "CONSUMABLE") {
            return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.shop.duplicateItem }, { status: 400 });
        }
        const isPoints = item.currency === "POINTS";
        const totalPrice = item.price * buyQty;
        if (isPoints) {
            if (student.points < totalPrice) {
                return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.shop.insufficientPoints }, { status: 400 });
            }
        }
        else {
            const gameStats = (0, game_stats_1.parseGameStats)(student.gameStats);
            const currentGold = Number(gameStats.gold || 0);
            if (currentGold < totalPrice) {
                return server_1.NextResponse.json({ error: rpg_copy_1.RPG_COPY.shop.insufficientGold }, { status: 400 });
            }
        }
        const updatedStudent = await db_1.db.$transaction(async (tx) => {
            const latestStudent = await tx.student.findUnique({
                where: { id: studentId },
                select: { points: true, gameStats: true },
            });
            if (!latestStudent) {
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.studentNotFound);
            }
            const latestGameStats = (0, game_stats_1.parseGameStats)(latestStudent.gameStats);
            if (isPoints) {
                if (latestStudent.points < totalPrice) {
                    throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.insufficientPoints);
                }
                await tx.student.update({
                    where: { id: studentId },
                    data: { points: { decrement: totalPrice } },
                });
            }
            else {
                const currentGold = Number(latestGameStats.gold || 0);
                if (currentGold < totalPrice) {
                    throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.insufficientGold);
                }
                await tx.student.update({
                    where: { id: studentId },
                    data: {
                        gameStats: (0, game_stats_1.toPrismaJson)({
                            ...latestGameStats,
                            gold: currentGold - totalPrice,
                        }),
                    },
                });
            }
            const latestExistingItem = await tx.studentItem.findFirst({
                where: { studentId, itemId },
            });
            if (latestExistingItem) {
                await tx.studentItem.update({
                    where: { id: latestExistingItem.id },
                    data: { quantity: { increment: buyQty } },
                });
            }
            else {
                await tx.studentItem.create({
                    data: {
                        studentId,
                        itemId,
                        quantity: buyQty,
                        isEquipped: false,
                        ...(0, student_item_stats_1.buildStudentItemStatSnapshot)(item, 0),
                    },
                });
            }
            return (await tx.student.findUnique({
                where: { id: studentId },
                select: { points: true, gameStats: true },
            }));
        });
        if (!updatedStudent) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        const updatedGameStats = (0, game_stats_1.parseGameStats)(updatedStudent.gameStats);
        return server_1.NextResponse.json({
            success: true,
            gold: updatedGameStats.gold,
            points: updatedStudent.points,
        });
    }
    catch (error) {
        console.error("Error buying item:", error);
        const knownErrorResponse = (0, rpg_route_errors_1.toShopErrorResponse)(error);
        if (knownErrorResponse)
            return knownErrorResponse;
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

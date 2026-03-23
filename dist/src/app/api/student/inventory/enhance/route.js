"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
const enhancement_system_1 = require("@/lib/game/enhancement-system");
async function POST(req) {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { studentItemId, materialType } = body;
        if (!studentItemId) {
            return server_1.NextResponse.json({ error: "Missing item ID" }, { status: 400 });
        }
        // 1. Fetch StudentItem with item + student
        const studentItem = await db_1.db.studentItem.findUnique({
            where: { id: studentItemId },
            include: { item: true, student: true },
        });
        if (!studentItem) {
            return server_1.NextResponse.json({ error: "ไม่พบไอเทม" }, { status: 404 });
        }
        const currentLevel = (_a = studentItem.enhancementLevel) !== null && _a !== void 0 ? _a : 0;
        const tier = (_b = studentItem.item.tier) !== null && _b !== void 0 ? _b : "COMMON";
        const tierMax = (_c = enhancement_system_1.TIER_MAX[tier]) !== null && _c !== void 0 ? _c : 9;
        // 2. Tier max enforcement
        if (currentLevel >= tierMax) {
            return server_1.NextResponse.json({ error: `ระดับสูงสุดสำหรับ ${tier} แล้ว (+${tierMax})` }, { status: 400 });
        }
        // 3. Determine zone and costs
        const zone = (0, enhancement_system_1.getEnhancementZone)(currentLevel);
        const itemPrice = (_d = studentItem.item.price) !== null && _d !== void 0 ? _d : 0;
        const cost = (0, enhancement_system_1.calculateEnhancementCost)(currentLevel, itemPrice, materialType);
        // 4. Validate resources
        const gameStats = (_e = studentItem.student.gameStats) !== null && _e !== void 0 ? _e : { gold: 0 };
        const currentGold = Number((_f = gameStats.gold) !== null && _f !== void 0 ? _f : 0);
        const currentPoints = (_g = studentItem.student.points) !== null && _g !== void 0 ? _g : 0;
        if (currentGold < cost.gold) {
            return server_1.NextResponse.json({ error: `ทองไม่เพียงพอ (ต้องการ ${cost.gold}, มี ${Math.floor(currentGold)})` }, { status: 400 });
        }
        if (currentPoints < cost.behaviorPoints) {
            return server_1.NextResponse.json({
                error: `คะแนนพฤติกรรมไม่เพียงพอ (ต้องการ ${cost.behaviorPoints}, มี ${currentPoints})`,
            }, { status: 400 });
        }
        // Danger zone: validate material
        let materialRecord = null;
        if (zone === "DANGER" && cost.materialQuantity > 0) {
            if (!materialType) {
                return server_1.NextResponse.json({ error: "ต้องระบุวัสดุสำหรับโซน Danger" }, { status: 400 });
            }
            materialRecord = await db_1.db.material.findFirst({
                where: { studentId: studentItem.studentId, type: materialType },
            });
            if (!materialRecord || materialRecord.quantity < cost.materialQuantity) {
                return server_1.NextResponse.json({
                    error: `วัสดุไม่เพียงพอ (ต้องการ ${cost.materialQuantity} ${materialType})`,
                }, { status: 400 });
            }
        }
        // 5. Roll outcome
        const result = (0, enhancement_system_1.rollEnhancement)(currentLevel);
        const successRate = (0, enhancement_system_1.getSuccessRate)(currentLevel);
        // 6. Build updated gold
        const updatedGold = Math.floor(currentGold - cost.gold);
        const updatedStats = { ...gameStats, gold: updatedGold };
        console.log(`🔨 [ENHANCE] Zone: ${zone} | Roll result: ${result.success ? "SUCCESS" : "FAIL"} | ${currentLevel} → ${result.newLevel}`);
        // 7. DB transaction
        const txOps = [
            // Deduct gold + BP, add history
            db_1.db.student.update({
                where: { id: studentItem.studentId },
                data: {
                    points: { decrement: cost.behaviorPoints },
                    gameStats: updatedStats,
                    history: {
                        create: {
                            reason: result.success
                                ? `🔨 ตีบวก ${studentItem.item.name} สำเร็จ! (+${result.newLevel})`
                                : `🔨 ตีบวก ${studentItem.item.name} ไม่สำเร็จ (${zone === "DANGER" ? `ลดเหลือ +${result.newLevel}` : "ไม่เปลี่ยนแปลง"})`,
                            value: -cost.behaviorPoints,
                            timestamp: new Date(),
                        },
                    },
                },
            }),
            // Update enhancement level
            db_1.db.studentItem.update({
                where: { id: studentItemId },
                data: { enhancementLevel: result.newLevel },
            }),
        ];
        // Danger: deduct material regardless of outcome
        if (zone === "DANGER" && materialRecord && cost.materialQuantity > 0) {
            txOps.push(db_1.db.material.update({
                where: { id: materialRecord.id },
                data: { quantity: { decrement: cost.materialQuantity } },
            }));
        }
        const txResults = await db_1.db.$transaction(txOps);
        const updatedItem = txResults[1];
        return server_1.NextResponse.json({
            success: result.success,
            newLevel: updatedItem.enhancementLevel,
            zone,
            goldSpent: cost.gold,
            pointsSpent: cost.behaviorPoints,
            materialSpent: zone === "DANGER" ? cost.materialQuantity : 0,
            newGold: updatedGold,
            newPoints: currentPoints - cost.behaviorPoints,
            successRate,
        });
    }
    catch (error) {
        console.error("Enhancement error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

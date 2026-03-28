"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
const crafting_system_1 = require("@/lib/game/crafting-system");
async function POST(req, { params }) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!(session === null || session === void 0 ? void 0 : session.user)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { code } = await params;
        const body = await req.json();
        const { materialType, targetTier } = body;
        // Validate required fields
        if (!materialType || !targetTier) {
            return server_1.NextResponse.json({ error: "materialType and targetTier are required" }, { status: 400 });
        }
        // Validate materialType is one of the 12 known types
        if (!crafting_system_1.MATERIAL_TYPES.includes(materialType)) {
            return server_1.NextResponse.json({ error: `Invalid materialType: ${materialType}` }, { status: 400 });
        }
        // Validate targetTier is a known tier
        if (!["COMMON", "RARE", "EPIC", "LEGENDARY"].includes(targetTier)) {
            return server_1.NextResponse.json({ error: `Invalid targetTier: ${targetTier}` }, { status: 400 });
        }
        // Validate materialType matches targetTier
        const expectedTier = crafting_system_1.MATERIAL_TIER_MAP[materialType];
        if (expectedTier !== targetTier) {
            return server_1.NextResponse.json({
                error: `Material "${materialType}" belongs to tier ${expectedTier}, not ${targetTier}`,
            }, { status: 400 });
        }
        // Verify student exists
        const student = await db_1.db.student.findUnique({ where: { loginCode: code.toUpperCase() } });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        // Check student has sufficient materials
        const required = crafting_system_1.CRAFT_REQUIREMENTS[targetTier];
        const materialRecord = await db_1.db.material.findUnique({
            where: { studentId_type: { studentId: student.id, type: materialType } },
        });
        if (!materialRecord || materialRecord.quantity < required.quantity) {
            const have = (_a = materialRecord === null || materialRecord === void 0 ? void 0 : materialRecord.quantity) !== null && _a !== void 0 ? _a : 0;
            return server_1.NextResponse.json({
                error: `Insufficient materials: need ${required.quantity} ${materialType}, have ${have}`,
            }, { status: 400 });
        }
        // Run atomic transaction via craftItem
        const result = await (0, crafting_system_1.craftItem)(student.id, materialType, materialRecord.quantity, db_1.db);
        // Fetch the created StudentItem with item details
        const studentItem = await db_1.db.studentItem.findUnique({
            where: { id: result.studentItemId },
            include: { item: true },
        });
        return server_1.NextResponse.json({ item: studentItem });
    }
    catch (error) {
        console.error("[CRAFT_POST]", error);
        const message = error instanceof Error ? error.message : "Internal Server Error";
        return server_1.NextResponse.json({ error: message }, { status: 500 });
    }
}

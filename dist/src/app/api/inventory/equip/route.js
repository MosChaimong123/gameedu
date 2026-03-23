"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
// POST /api/inventory/equip - Equip/Unequip an item
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { studentItemId, equip } = await req.json();
        if (!studentItemId) {
            return server_1.NextResponse.json({ error: "Missing studentItemId" }, { status: 400 });
        }
        // 1. Get StudentItem and Include Item Details
        const studentItem = await db_1.db.studentItem.findUnique({
            where: { id: studentItemId },
            include: { item: true, student: true }
        });
        if (!studentItem) {
            return server_1.NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
        }
        const { studentId, item } = studentItem;
        if (equip) {
            // 2. If equipping, unequip others of the same type first
            await db_1.db.studentItem.updateMany({
                where: {
                    studentId,
                    isEquipped: true,
                    item: {
                        type: item.type
                    }
                },
                data: {
                    isEquipped: false
                }
            });
        }
        // 3. Update target item status
        const updated = await db_1.db.studentItem.update({
            where: { id: studentItemId },
            data: {
                isEquipped: equip
            }
        });
        return server_1.NextResponse.json({ success: true, isEquipped: updated.isEquipped });
    }
    catch (error) {
        console.error("Error toggling equipment:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const { plan } = await req.json();
        if (!["PLUS", "PRO"].includes(plan)) {
            return new server_1.NextResponse("Invalid Plan", { status: 400 });
        }
        // Simulating 30 days of Plus
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);
        const updatedUser = await db_1.db.user.update({
            where: { id: session.user.id },
            data: {
                plan: plan,
                planStatus: "ACTIVE",
                planExpiry: expiryDate,
            }
        });
        return server_1.NextResponse.json(updatedUser);
    }
    catch (error) {
        console.error("[UPGRADE_POST]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}

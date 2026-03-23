"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const server_1 = require("next/server");
async function PATCH(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const { name, image } = await req.json();
        console.log(`[API_PROFILE] Updating user ${session.user.id}:`, { name, hasImage: !!image });
        const updatedUser = await db_1.db.user.update({
            where: { id: session.user.id },
            data: { name, image }
        });
        console.log("[API_PROFILE] Update success");
        return server_1.NextResponse.json(updatedUser);
    }
    catch (error) {
        console.error("[API_PROFILE] Error:", error);
        return new server_1.NextResponse(error.message || "Internal Error", { status: 500 });
    }
}

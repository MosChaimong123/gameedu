"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const db_1 = require("@/lib/db");
const auth_1 = require("@/auth");
const server_1 = require("next/server");
async function PATCH(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return new server_1.NextResponse("Unauthorized", { status: 401 });
        }
        const body = await req.json();
        console.log(`[API_SETTINGS] Updating for user ${session.user.id}:`, body);
        // Update the user's settings field in DB
        // Since it's a Json field in MongoDB, we can just pass the object
        const updatedUser = await db_1.db.user.update({
            where: { id: session.user.id },
            data: {
                settings: body
            }
        });
        console.log(`[API_SETTINGS] Success for ${session.user.id}`);
        return server_1.NextResponse.json(updatedUser.settings);
    }
    catch (error) {
        console.error("[API_SETTINGS_ERROR]", error);
        return new server_1.NextResponse("Internal Error", { status: 500 });
    }
}

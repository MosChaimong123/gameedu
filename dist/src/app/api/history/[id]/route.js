"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req, props) {
    var _a;
    const params = await props.params;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const game = await db_1.db.gameHistory.findUnique({
            where: {
                id: params.id,
            },
        });
        if (!game) {
            return server_1.NextResponse.json({ error: "Game not found" }, { status: 404 });
        }
        // Security check: Only host can view details? 
        // Or maybe players who played it? For now, stick to Host.
        if (game.hostId !== session.user.id) {
            return server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        return server_1.NextResponse.json(game);
    }
    catch (error) {
        console.error("GET /api/history/[id] Error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

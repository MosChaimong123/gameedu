"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
async function GET(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const history = await db_1.db.gameHistory.findMany({
            where: {
                hostId: session.user.id
            },
            orderBy: {
                endedAt: 'desc'
            },
            select: {
                id: true,
                gameMode: true,
                startedAt: true,
                endedAt: true,
                players: true // We might want just a count here? For now, fetch all.
            }
        });
        // Transform for list view (e.g. just player count)
        const summary = history.map((h) => ({
            id: h.id,
            gameMode: h.gameMode,
            startedAt: h.startedAt,
            endedAt: h.endedAt,
            playerCount: Array.isArray(h.players) ? h.players.length : 0
        }));
        return server_1.NextResponse.json(summary);
    }
    catch (error) {
        console.error("GET /api/history Error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = await req.json();
        const { gameMode, pin, startedAt, settings, players } = body;
        const record = await db_1.db.gameHistory.create({
            data: {
                hostId: session.user.id,
                gameMode,
                pin,
                startedAt: new Date(startedAt),
                settings,
                players
            }
        });
        return server_1.NextResponse.json(record);
    }
    catch (error) {
        console.error("POST /api/history Error:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

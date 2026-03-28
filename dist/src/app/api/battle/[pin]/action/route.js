"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const manager_1 = require("@/lib/game-engine/manager");
/**
 * POST /api/battle/[pin]/action
 * Submit battle action (ATTACK, DEFEND, or SKILL)
 */
async function POST(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!session) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { pin } = await params;
        const { type, skillId, targetId } = await req.json();
        // Validate action type
        if (!["ATTACK", "DEFEND", "SKILL"].includes(type)) {
            return server_1.NextResponse.json({ error: "Invalid action type. Must be ATTACK, DEFEND, or SKILL" }, { status: 400 });
        }
        // Get the battle game
        const game = manager_1.gameManager.getGame(pin);
        if (!game) {
            return server_1.NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }
        // Emit battle-action event to the game engine
        // The game engine will handle the logic
        return server_1.NextResponse.json({ success: true, action: { type, skillId, targetId } });
    }
    catch (error) {
        console.error("[Battle Action API] POST error:", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const manager_1 = require("@/lib/game-engine/manager");
/**
 * POST /api/battle/[pin]/farming-action
 * Submit farming skill action
 */
async function POST(req, { params }) {
    try {
        const session = await (0, auth_1.auth)();
        if (!session) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const { pin } = await params;
        const { type, skillId } = await req.json();
        // Validate action type
        if (type !== "SKILL") {
            return server_1.NextResponse.json({ error: "Invalid action type. Must be SKILL" }, { status: 400 });
        }
        // Get the battle game
        const game = manager_1.gameManager.getGame(pin);
        if (!game) {
            return server_1.NextResponse.json({ error: "Battle not found" }, { status: 404 });
        }
        // Emit farming-action event to the game engine
        return server_1.NextResponse.json({ success: true, action: { type, skillId } });
    }
    catch (error) {
        console.error("[Farming Action API] POST error:", error);
        return server_1.NextResponse.json({ error: error.message }, { status: 500 });
    }
}

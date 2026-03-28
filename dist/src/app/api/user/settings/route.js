"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATCH = PATCH;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const game_stats_1 = require("@/lib/game/game-stats");
const user_settings_1 = require("@/lib/user-settings");
async function PATCH(req) {
    var _a, _b;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const body = (await req.json());
        const user = await db_1.db.user.findUnique({
            where: { id: session.user.id },
            select: { settings: true },
        });
        if (!user) {
            return server_1.NextResponse.json({ error: "User not found" }, { status: 404 });
        }
        const currentSettings = (0, user_settings_1.parseUserSettings)(user.settings);
        const nextSettings = {
            ...currentSettings,
            accessibility: {
                ...currentSettings.accessibility,
                ...((_b = body.accessibility) !== null && _b !== void 0 ? _b : {}),
            },
        };
        const updated = await db_1.db.user.update({
            where: { id: session.user.id },
            data: {
                settings: (0, game_stats_1.toPrismaJson)(nextSettings),
            },
            select: {
                settings: true,
            },
        });
        return server_1.NextResponse.json({ settings: updated.settings });
    }
    catch (error) {
        console.error("[USER_SETTINGS_PATCH]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

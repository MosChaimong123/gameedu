"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const game_stats_1 = require("@/lib/game/game-stats");
const rpg_route_errors_1 = require("@/lib/game/rpg-route-errors");
const skill_tree_1 = require("@/lib/game/skill-tree");
async function POST(req) {
    var _a;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const { studentId } = (await req.json());
        if (!studentId) {
            return server_1.NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }
        const updated = await db_1.db.$transaction(async (tx) => {
            var _a, _b, _c;
            const student = await tx.student.findUnique({
                where: { id: studentId },
                select: { id: true, userId: true, gameStats: true },
            });
            if (!student)
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.studentNotFound);
            if (student.userId !== userId)
                throw new Error("FORBIDDEN");
            const gameStats = (0, game_stats_1.parseGameStats)(student.gameStats);
            const level = (_a = gameStats.level) !== null && _a !== void 0 ? _a : 1;
            const cost = (0, skill_tree_1.calculateRespecCost)(level);
            if (((_b = gameStats.gold) !== null && _b !== void 0 ? _b : 0) < cost) {
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.insufficientGold);
            }
            const state = (0, skill_tree_1.normalizeSkillTreeState)({
                skillPointsAvailable: gameStats.skillPointsAvailable,
                skillPointsSpent: gameStats.skillPointsSpent,
                skillTreeProgress: gameStats.skillTreeProgress,
                lastRespecAt: gameStats.lastRespecAt,
            }, level);
            const nextState = (0, skill_tree_1.applySkillRespec)(state);
            const nextStats = {
                ...gameStats,
                ...nextState,
                gold: Math.max(0, ((_c = gameStats.gold) !== null && _c !== void 0 ? _c : 0) - cost),
            };
            await tx.student.update({
                where: { id: studentId },
                data: { gameStats: (0, game_stats_1.toPrismaJson)(nextStats) },
            });
            return {
                skillPointsAvailable: nextState.skillPointsAvailable,
                skillPointsSpent: nextState.skillPointsSpent,
                progress: nextState.skillTreeProgress,
                gold: nextStats.gold,
                respecCost: cost,
                lastRespecAt: nextState.lastRespecAt,
            };
        });
        return server_1.NextResponse.json({ success: true, ...updated });
    }
    catch (error) {
        if (error instanceof Error && error.message === "FORBIDDEN") {
            return server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const knownErrorResponse = (0, rpg_route_errors_1.toSkillTreeErrorResponse)(error);
        if (knownErrorResponse)
            return knownErrorResponse;
        console.error("[SKILL_TREE_RESPEC_ERROR]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

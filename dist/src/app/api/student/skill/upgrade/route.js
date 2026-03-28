"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const game_stats_1 = require("@/lib/game/game-stats");
const job_system_1 = require("@/lib/game/job-system");
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
        const { studentId, skillId } = (await req.json());
        if (!studentId || !skillId) {
            return server_1.NextResponse.json({ error: "Missing studentId or skillId" }, { status: 400 });
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
            const skillState = (0, skill_tree_1.normalizeSkillTreeState)({
                skillPointsAvailable: gameStats.skillPointsAvailable,
                skillPointsSpent: gameStats.skillPointsSpent,
                skillTreeProgress: gameStats.skillTreeProgress,
                lastRespecAt: gameStats.lastRespecAt,
            }, level);
            const skill = (0, job_system_1.buildGlobalSkillMap)()[skillId];
            if (!skill)
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.skillNotFound);
            const validation = (0, skill_tree_1.validateSkillUpgrade)({ skill, state: skillState, level });
            if (!validation.ok) {
                throw new rpg_route_errors_1.RpgRouteError(rpg_route_errors_1.RPG_ROUTE_ERROR.skillUpgradeBlocked, validation.message);
            }
            const nextState = (0, skill_tree_1.applySkillUpgrade)(skillState, skill.id);
            const nextStats = {
                ...gameStats,
                ...nextState,
            };
            await tx.student.update({
                where: { id: studentId },
                data: { gameStats: (0, game_stats_1.toPrismaJson)(nextStats) },
            });
            const effectiveSkill = (0, skill_tree_1.getEffectiveSkillAtRank)(skill, validation.nextRank);
            return {
                skillId: skill.id,
                rank: validation.nextRank,
                skillPointsAvailable: nextState.skillPointsAvailable,
                skillPointsSpent: nextState.skillPointsSpent,
                cost: effectiveSkill.cost,
                damageMultiplier: (_b = effectiveSkill.damageMultiplier) !== null && _b !== void 0 ? _b : null,
                healMultiplier: (_c = effectiveSkill.healMultiplier) !== null && _c !== void 0 ? _c : null,
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
        console.error("[SKILL_TREE_UPGRADE_ERROR]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

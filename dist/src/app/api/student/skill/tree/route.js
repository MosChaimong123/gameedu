"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const game_stats_1 = require("@/lib/game/game-stats");
const job_system_1 = require("@/lib/game/job-system");
const skill_tree_1 = require("@/lib/game/skill-tree");
async function GET(req) {
    var _a, _b, _c;
    try {
        const session = await (0, auth_1.auth)();
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const userId = session.user.id;
        const studentId = new URL(req.url).searchParams.get("studentId");
        if (!studentId) {
            return server_1.NextResponse.json({ error: "Missing studentId" }, { status: 400 });
        }
        const student = await db_1.db.student.findUnique({
            where: { id: studentId },
            select: {
                userId: true,
                gameStats: true,
                jobClass: true,
                jobTier: true,
                advanceClass: true,
            },
        });
        if (!student)
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        if (student.userId !== userId) {
            return server_1.NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const gameStats = (0, game_stats_1.parseGameStats)(student.gameStats);
        const level = (_b = gameStats.level) !== null && _b !== void 0 ? _b : 1;
        const skillState = (0, skill_tree_1.normalizeSkillTreeState)({
            skillPointsAvailable: gameStats.skillPointsAvailable,
            skillPointsSpent: gameStats.skillPointsSpent,
            skillTreeProgress: gameStats.skillTreeProgress,
            lastRespecAt: gameStats.lastRespecAt,
        }, level);
        const jobKey = (0, job_system_1.resolveEffectiveJobKey)({
            jobClass: student.jobClass,
            jobTier: student.jobTier,
            advanceClass: student.advanceClass,
        });
        const classDef = (0, job_system_1.getMergedClassDef)(jobKey);
        const nodes = (0, skill_tree_1.buildSkillTreeView)({
            skills: classDef.skills,
            state: skillState,
            level,
        });
        return server_1.NextResponse.json({
            success: true,
            level,
            skillTree: nodes,
            skillPointsAvailable: skillState.skillPointsAvailable,
            skillPointsSpent: skillState.skillPointsSpent,
            progress: skillState.skillTreeProgress,
            respecCost: Math.max(0, 500 + level * 75),
            lastRespecAt: (_c = skillState.lastRespecAt) !== null && _c !== void 0 ? _c : null,
        });
    }
    catch (error) {
        console.error("[SKILL_TREE_GET_ERROR]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

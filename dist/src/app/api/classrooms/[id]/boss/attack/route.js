"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const auth_1 = require("@/auth");
const db_1 = require("@/lib/db");
const idle_engine_1 = require("@/lib/game/idle-engine");
const job_system_1 = require("@/lib/game/job-system");
async function POST(req, { params }) {
    var _a, _b;
    try {
        const session = await (0, auth_1.auth)();
        const { id: classId } = await params;
        if (!((_a = session === null || session === void 0 ? void 0 : session.user) === null || _a === void 0 ? void 0 : _a.id)) {
            return server_1.NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        // 1. Get the student's ID for this classroom
        const student = await db_1.db.student.findFirst({
            where: {
                classId: classId,
                userId: session.user.id
            },
            select: {
                id: true,
                gameStats: true,
                jobClass: true,
                jobTier: true,
                advanceClass: true,
                jobSkills: true,
            }
        });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        // 2. Apply Boss Damage (Consumes Stamina inside)
        const result = await idle_engine_1.IdleEngine.applyBossDamage(classId, student.id);
        if (result.error) {
            return server_1.NextResponse.json({ error: result.error }, { status: 400 });
        }
        // 3. Grant XP for attacking (20 XP per hit)
        const xpGain = 20;
        const currentStats = student.gameStats || idle_engine_1.IdleEngine.getDefaultStats();
        const xpResult = idle_engine_1.IdleEngine.calculateXpGain(currentStats, xpGain);
        // Check for newly unlocked skills on level-up (Req 11.6)
        let updatedJobSkills;
        if (xpResult.leveledUp && student.jobClass) {
            const currentSkillIds = (_b = student.jobSkills) !== null && _b !== void 0 ? _b : [];
            const eff = (0, job_system_1.resolveEffectiveJobKey)({
                jobClass: student.jobClass,
                jobTier: student.jobTier,
                advanceClass: student.advanceClass,
            });
            const newSkills = (0, job_system_1.getNewlyUnlockedSkills)(eff, currentStats.level, xpResult.level, currentSkillIds);
            if (newSkills.length > 0) {
                updatedJobSkills = [...currentSkillIds, ...newSkills];
            }
        }
        await db_1.db.student.update({
            where: { id: student.id },
            data: {
                gameStats: {
                    ...currentStats,
                    level: xpResult.level,
                    xp: xpResult.xp
                },
                ...(updatedJobSkills ? { jobSkills: updatedJobSkills } : {})
            }
        });
        return server_1.NextResponse.json({
            success: true,
            damage: result.damage,
            isCrit: result.isCrit,
            staminaLeft: result.staminaLeft,
            boss: result.boss,
            xpGained: xpGain,
            leveledUp: xpResult.leveledUp
        });
    }
    catch (error) {
        console.error("Error attacking boss:", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

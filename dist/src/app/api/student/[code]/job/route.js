"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = GET;
/**
 * Student job state API.
 * `[code]` = Student **database id** (`Student.id`), not `loginCode`.
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const job_system_1 = require("@/lib/game/job-system");
const job_constants_1 = require("@/lib/game/job-constants");
const SKILL_MAP = (0, job_system_1.buildGlobalSkillMap)();
async function GET(_req, { params }) {
    var _a, _b, _c, _d, _e;
    try {
        const { code } = await params;
        const student = await db_1.db.student.findUnique({ where: { id: code } });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        const jobClass = (_a = student.jobClass) !== null && _a !== void 0 ? _a : "NOVICE";
        const jobTier = ((_b = student.jobTier) !== null && _b !== void 0 ? _b : "BASE");
        const advanceClass = (_c = student.advanceClass) !== null && _c !== void 0 ? _c : null;
        const jobSelectedAt = (_d = student.jobSelectedAt) !== null && _d !== void 0 ? _d : null;
        const effectiveKey = (0, job_system_1.resolveEffectiveJobKey)({
            jobClass: student.jobClass,
            jobTier,
            advanceClass,
        });
        const storedSkillIds = Array.isArray(student.jobSkills)
            ? student.jobSkills
            : [];
        const jobSkills = storedSkillIds
            .map((skillId) => SKILL_MAP[skillId])
            .filter(Boolean);
        const passives = (0, job_system_1.getPassivesForClass)(effectiveKey);
        const statMultipliers = (0, job_system_1.getStatMultipliers)(effectiveKey, jobTier);
        const gameStats = (_e = student.gameStats) !== null && _e !== void 0 ? _e : {};
        const level = typeof gameStats.level === "number" ? gameStats.level : 1;
        let availableAdvanceOptions = [];
        if (jobTier === "BASE" && level >= 20) {
            availableAdvanceOptions = (0, job_constants_1.getAdvanceOptions)(jobClass);
        }
        else if (jobTier === "ADVANCE" && level >= 50 && advanceClass) {
            availableAdvanceOptions = (0, job_constants_1.getMasterOptions)(advanceClass);
        }
        return server_1.NextResponse.json({
            jobClass,
            jobTier,
            advanceClass,
            jobSelectedAt,
            effectiveJobKey: effectiveKey,
            jobSkills,
            passives,
            statMultipliers,
            availableAdvanceOptions,
        });
    }
    catch (error) {
        console.error("[STUDENT_JOB_GET]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

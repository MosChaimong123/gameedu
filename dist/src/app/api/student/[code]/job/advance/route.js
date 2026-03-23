"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const job_constants_1 = require("@/lib/game/job-constants");
const job_system_1 = require("@/lib/game/job-system");
async function POST(req, { params }) {
    var _a, _b, _c, _d;
    try {
        const { code } = await params;
        const body = await req.json();
        const { advanceClass } = body;
        if (!advanceClass) {
            return server_1.NextResponse.json({ error: "advanceClass is required." }, { status: 400 });
        }
        // Fetch student from DB
        const student = await db_1.db.student.findUnique({ where: { code } });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        // Must have selected a base class first
        if (!student.jobClass || !student.jobTier) {
            return server_1.NextResponse.json({ error: "Student must select a base job class before advancing." }, { status: 400 });
        }
        const gameStats = (_a = student.gameStats) !== null && _a !== void 0 ? _a : {};
        const level = (_b = gameStats.level) !== null && _b !== void 0 ? _b : 1;
        const currentTier = student.jobTier;
        const normalizedAdvanceClass = advanceClass.toUpperCase();
        let newTier;
        let validOptions;
        if (currentTier === "BASE") {
            // Req 12.1: Must be level >= 20 to advance
            if (level < job_constants_1.JOB_LEVEL_REQUIREMENTS.ADVANCE_LEVEL) {
                return server_1.NextResponse.json({
                    error: `Student must be at least level ${job_constants_1.JOB_LEVEL_REQUIREMENTS.ADVANCE_LEVEL} to advance.`,
                }, { status: 400 });
            }
            validOptions = (0, job_constants_1.getAdvanceOptions)(student.jobClass);
            newTier = "ADVANCE";
        }
        else if (currentTier === "ADVANCE") {
            // Req 12.3: Must be level >= 50 to reach master
            if (level < job_constants_1.JOB_LEVEL_REQUIREMENTS.MASTER_LEVEL) {
                return server_1.NextResponse.json({
                    error: `Student must be at least level ${job_constants_1.JOB_LEVEL_REQUIREMENTS.MASTER_LEVEL} to reach master tier.`,
                }, { status: 400 });
            }
            // Use current advanceClass (stored in student.advanceClass) for master options
            const currentAdvanceClass = (_c = student.advanceClass) !== null && _c !== void 0 ? _c : student.jobClass;
            validOptions = (0, job_constants_1.getMasterOptions)(currentAdvanceClass);
            newTier = "MASTER";
        }
        else {
            return server_1.NextResponse.json({ error: "Student has already reached the MASTER tier." }, { status: 400 });
        }
        // Req 12.2 / 12.4: Validate the chosen class is a valid option
        if (!validOptions.includes(normalizedAdvanceClass)) {
            return server_1.NextResponse.json({
                error: `Invalid advanceClass. Valid options are: ${validOptions.join(", ")}`,
            }, { status: 400 });
        }
        // Req 12.6: Get new skills unlocked at the new tier (not already in jobSkills)
        const existingSkills = (_d = student.jobSkills) !== null && _d !== void 0 ? _d : [];
        const newClassSkills = (0, job_system_1.getSkillsForLevel)(normalizedAdvanceClass, level);
        const newSkillIds = newClassSkills
            .map((s) => s.id)
            .filter((id) => !existingSkills.includes(id));
        const updatedSkills = [...existingSkills, ...newSkillIds];
        // Req 12.2 / 12.4: Update student with new advanceClass, jobTier, and jobSkills
        const updatedStudent = await db_1.db.student.update({
            where: { id: student.id },
            data: {
                advanceClass: normalizedAdvanceClass,
                jobTier: newTier,
                jobSkills: updatedSkills,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            jobClass: updatedStudent.jobClass,
            advanceClass: updatedStudent.advanceClass,
            jobTier: updatedStudent.jobTier,
            jobSkills: updatedStudent.jobSkills,
        });
    }
    catch (error) {
        console.error("[JOB_ADVANCE_POST]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

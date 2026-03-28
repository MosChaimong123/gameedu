"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = POST;
/**
 * Student job selection API.
 * The dynamic segment `[code]` here is the Student **database id** (`Student.id`), not `loginCode`.
 */
const server_1 = require("next/server");
const db_1 = require("@/lib/db");
const job_constants_1 = require("@/lib/game/job-constants");
const job_system_1 = require("@/lib/game/job-system");
async function POST(req, { params }) {
    var _a, _b;
    try {
        const { code } = await params;
        const body = await req.json();
        const { jobClass } = body;
        // Validate jobClass is one of the 5 BASE_CLASSES
        if (!jobClass || !job_constants_1.BASE_CLASSES.includes(jobClass.toUpperCase())) {
            return server_1.NextResponse.json({ error: `Invalid jobClass. Must be one of: ${job_constants_1.BASE_CLASSES.join(", ")}` }, { status: 400 });
        }
        const normalizedJobClass = jobClass.toUpperCase();
        // Fetch student from DB
        const student = await db_1.db.student.findUnique({
            where: { id: code },
        });
        if (!student) {
            return server_1.NextResponse.json({ error: "Student not found" }, { status: 404 });
        }
        // Req 10.4: Prevent changing jobClass after jobSelectedAt is set
        if (student.jobClass !== null || student.jobSelectedAt !== null) {
            return server_1.NextResponse.json({ error: "Job class has already been selected and cannot be changed." }, { status: 409 });
        }
        // Req 10.1: Student level must be >= 5
        const gameStats = (_a = student.gameStats) !== null && _a !== void 0 ? _a : {};
        const level = (_b = gameStats.level) !== null && _b !== void 0 ? _b : 1;
        if (level < 5) {
            return server_1.NextResponse.json({ error: "Student must be at least level 5 to select a job class." }, { status: 400 });
        }
        // Req 11.1-11.5: Get initial skills (unlockLevel <= current level)
        const initialSkills = (0, job_system_1.getSkillsForLevel)(normalizedJobClass, level);
        const skillIds = initialSkills.map((skill) => skill.id);
        // Req 10.2: Set jobClass, jobTier="BASE", jobSelectedAt=now, initial jobSkills
        const updatedStudent = await db_1.db.student.update({
            where: { id: student.id },
            data: {
                jobClass: normalizedJobClass,
                jobTier: "BASE",
                jobSelectedAt: new Date(),
                jobSkills: skillIds,
            },
        });
        return server_1.NextResponse.json({
            success: true,
            jobClass: updatedStudent.jobClass,
            jobTier: updatedStudent.jobTier,
            jobSelectedAt: updatedStudent.jobSelectedAt,
            jobSkills: updatedStudent.jobSkills,
        });
    }
    catch (error) {
        console.error("[JOB_SELECT_POST]", error);
        return server_1.NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

/**
 * Student job selection API.
 * The dynamic segment `[code]` here is the Student **database id** (`Student.id`), not `loginCode`.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { BASE_CLASSES } from "@/lib/game/job-constants";
import { getSkillsForLevel } from "@/lib/game/job-system";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { jobClass } = body;

    // Validate jobClass is one of the 5 BASE_CLASSES
    if (!jobClass || !BASE_CLASSES.includes(jobClass.toUpperCase())) {
      return NextResponse.json(
        { error: `Invalid jobClass. Must be one of: ${BASE_CLASSES.join(", ")}` },
        { status: 400 }
      );
    }

    const normalizedJobClass = jobClass.toUpperCase();

    // Fetch student from DB
    const student = await db.student.findUnique({
      where: { id: code },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Req 10.4: Prevent changing jobClass after jobSelectedAt is set
    if (student.jobClass !== null || student.jobSelectedAt !== null) {
      return NextResponse.json(
        { error: "Job class has already been selected and cannot be changed." },
        { status: 409 }
      );
    }

    // Req 10.1: Student level must be >= 5
    const gameStats = (student.gameStats as Record<string, any>) ?? {};
    const level: number = gameStats.level ?? 1;

    if (level < 5) {
      return NextResponse.json(
        { error: "Student must be at least level 5 to select a job class." },
        { status: 400 }
      );
    }

    // Req 11.1-11.5: Get initial skills (unlockLevel <= current level)
    const initialSkills = getSkillsForLevel(normalizedJobClass, level);
    const skillIds = initialSkills.map((skill) => skill.id);

    // Req 10.2: Set jobClass, jobTier="BASE", jobSelectedAt=now, initial jobSkills
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: {
        jobClass: normalizedJobClass,
        jobTier: "BASE",
        jobSelectedAt: new Date(),
        jobSkills: skillIds,
      },
    });

    return NextResponse.json({
      success: true,
      jobClass: updatedStudent.jobClass,
      jobTier: updatedStudent.jobTier,
      jobSelectedAt: updatedStudent.jobSelectedAt,
      jobSkills: updatedStudent.jobSkills,
    });
  } catch (error) {
    console.error("[JOB_SELECT_POST]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

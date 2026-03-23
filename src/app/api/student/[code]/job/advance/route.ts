/**
 * Advance / Master tier promotion.
 * `[code]` = Student **database id** (`Student.id`), not `loginCode`.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  JOB_LEVEL_REQUIREMENTS,
  getAdvanceOptions,
  getMasterOptions,
} from "@/lib/game/job-constants";
import { getSkillsForLevel, normalizeJobName } from "@/lib/game/job-system";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { advanceClass } = body;

    if (!advanceClass) {
      return NextResponse.json(
        { error: "advanceClass is required." },
        { status: 400 }
      );
    }

    // Fetch student from DB
    const student = await db.student.findUnique({ where: { id: code } });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Must have selected a base class first
    if (!student.jobClass || !student.jobTier) {
      return NextResponse.json(
        { error: "Student must select a base job class before advancing." },
        { status: 400 }
      );
    }

    const gameStats = (student.gameStats as Record<string, unknown>) ?? {};
    const level: number = (gameStats.level as number) ?? 1;
    const currentTier = student.jobTier;
    const normalizedAdvanceClass = normalizeJobName(advanceClass);

    let newTier: "ADVANCE" | "MASTER";
    let validOptions: string[];

    if (currentTier === "BASE") {
      // Req 12.1: Must be level >= 20 to advance
      if (level < JOB_LEVEL_REQUIREMENTS.ADVANCE_LEVEL) {
        return NextResponse.json(
          {
            error: `Student must be at least level ${JOB_LEVEL_REQUIREMENTS.ADVANCE_LEVEL} to advance.`,
          },
          { status: 400 }
        );
      }
      validOptions = getAdvanceOptions(student.jobClass);
      newTier = "ADVANCE";
    } else if (currentTier === "ADVANCE") {
      // Req 12.3: Must be level >= 50 to reach master
      if (level < JOB_LEVEL_REQUIREMENTS.MASTER_LEVEL) {
        return NextResponse.json(
          {
            error: `Student must be at least level ${JOB_LEVEL_REQUIREMENTS.MASTER_LEVEL} to reach master tier.`,
          },
          { status: 400 }
        );
      }
      // Use current advanceClass (stored in student.advanceClass) for master options
      const currentAdvanceClass = student.advanceClass ?? student.jobClass;
      validOptions = getMasterOptions(currentAdvanceClass);
      newTier = "MASTER";
    } else {
      return NextResponse.json(
        { error: "Student has already reached the MASTER tier." },
        { status: 400 }
      );
    }

    // Req 12.2 / 12.4: Validate the chosen class is a valid option
    if (!validOptions.includes(normalizedAdvanceClass)) {
      return NextResponse.json(
        {
          error: `Invalid advanceClass. Valid options are: ${validOptions.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Req 12.6: Get new skills unlocked at the new tier (not already in jobSkills)
    const existingSkills = (student.jobSkills as string[]) ?? [];
    const newClassSkills = getSkillsForLevel(normalizedAdvanceClass, level);
    const newSkillIds = newClassSkills
      .map((s) => s.id)
      .filter((id) => !existingSkills.includes(id));

    const updatedSkills = [...existingSkills, ...newSkillIds];

    // Req 12.2 / 12.4: Update student with new advanceClass, jobTier, and jobSkills
    const updatedStudent = await db.student.update({
      where: { id: student.id },
      data: {
        advanceClass: normalizedAdvanceClass,
        jobTier: newTier,
        jobSkills: updatedSkills,
      },
    });

    return NextResponse.json({
      success: true,
      jobClass: updatedStudent.jobClass,
      advanceClass: updatedStudent.advanceClass,
      jobTier: updatedStudent.jobTier,
      jobSkills: updatedStudent.jobSkills,
    });
  } catch (error) {
    console.error("[JOB_ADVANCE_POST]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

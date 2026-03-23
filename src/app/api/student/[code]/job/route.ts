/**
 * Student job state API.
 * `[code]` = Student **database id** (`Student.id`), not `loginCode`.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  buildGlobalSkillMap,
  getPassivesForClass,
  getStatMultipliers,
  resolveEffectiveJobKey,
} from "@/lib/game/job-system";
import { getAdvanceOptions, getMasterOptions } from "@/lib/game/job-constants";

const SKILL_MAP = buildGlobalSkillMap();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    const student = await db.student.findUnique({ where: { id: code } });
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const jobClass = student.jobClass ?? "NOVICE";
    const jobTier = (student.jobTier ?? "BASE") as "BASE" | "ADVANCE" | "MASTER";
    const advanceClass = student.advanceClass ?? null;
    const jobSelectedAt = student.jobSelectedAt ?? null;

    const effectiveKey = resolveEffectiveJobKey({
      jobClass: student.jobClass,
      jobTier,
      advanceClass,
    });

    const storedSkillIds: string[] = Array.isArray(student.jobSkills)
      ? (student.jobSkills as string[])
      : [];

    const jobSkills = storedSkillIds
      .map((skillId) => SKILL_MAP[skillId])
      .filter(Boolean);

    const passives = getPassivesForClass(effectiveKey);
    const statMultipliers = getStatMultipliers(effectiveKey, jobTier);

    const gameStats = (student.gameStats as Record<string, unknown>) ?? {};
    const level: number = typeof gameStats.level === "number" ? gameStats.level : 1;

    let availableAdvanceOptions: string[] = [];
    if (jobTier === "BASE" && level >= 20) {
      availableAdvanceOptions = getAdvanceOptions(jobClass);
    } else if (jobTier === "ADVANCE" && level >= 50 && advanceClass) {
      availableAdvanceOptions = getMasterOptions(advanceClass);
    }

    return NextResponse.json({
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
  } catch (error) {
    console.error("[STUDENT_JOB_GET]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

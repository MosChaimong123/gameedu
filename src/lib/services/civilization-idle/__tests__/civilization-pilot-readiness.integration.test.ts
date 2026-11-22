import { describe, expect, it } from "vitest";
import { db } from "@/lib/db";

const runDatabaseQa = process.env.RUN_CIVILIZATION_DB_QA === "true";

describe.runIf(runDatabaseQa)("Civilization Idle pilot readiness", () => {
  it("lists eligible classrooms without exposing student credentials", async () => {
    const classrooms = await db.classroom.findMany({
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        grade: true,
        updatedAt: true,
        _count: { select: { students: true } },
      },
    });

    const candidates = classrooms.map((classroom) => ({
      classroomId: classroom.id,
      name: classroom.name,
      grade: classroom.grade,
      studentCount: classroom._count.students,
      updatedAt: classroom.updatedAt.toISOString(),
    }));

    console.log("CIVILIZATION_PILOT_CLASSROOM_CANDIDATES");
    console.log(JSON.stringify(candidates, null, 2));
    expect(candidates.length).toBeGreaterThan(0);
  }, 20_000);
});

import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CIVILIZATION_CONVERTER_IDS,
  CIVILIZATION_TECHS,
  createInitialCivilizationState,
  parseCivilizationState,
  type CivilizationTechId,
} from "@/lib/civilization-idle";
import { db } from "@/lib/db";
import {
  executeCivilizationCommand,
  readCivilizationState,
} from "@/lib/services/civilization-idle/civilization-state";

const runDatabaseQa = process.env.RUN_CIVILIZATION_DB_QA === "true";

describe.runIf(runDatabaseQa)("Civilization Idle MongoDB prestige", () => {
  let studentId = "";
  let profileId = "";
  let studentBefore: { classId: string; behaviorPoints: number; gold: number } | null = null;
  const commandId = `civilization-prestige-db-qa-${Date.now()}`;

  beforeAll(async () => {
    const students = await db.student.findMany({
      take: 100,
      select: { id: true, classId: true, behaviorPoints: true, gold: true },
    });
    for (const student of students) {
      const profile = await db.civilizationProfile.findUnique({
        where: { studentId: student.id },
        select: { id: true },
      });
      if (!profile) {
        studentId = student.id;
        studentBefore = {
          classId: student.classId,
          behaviorPoints: student.behaviorPoints,
          gold: student.gold,
        };
        break;
      }
    }
    if (!studentId || !studentBefore) {
      throw new Error("No student without a Civilization profile is available for prestige QA");
    }

    const now = Date.now();
    const completed = createInitialCivilizationState(now);
    completed.era = "space";
    completed.unlockedEras = ["stone", "bronze", "industrial", "information", "space"];
    completed.researchedTechs = Object.keys(CIVILIZATION_TECHS) as CivilizationTechId[];
    completed.unlockedConverters = [...CIVILIZATION_CONVERTER_IDS];
    completed.bronzeCompleted = true;
    completed.industrialCompleted = true;
    completed.informationCompleted = true;
    completed.spaceProjectStage = 4;
    completed.spaceCompleted = true;

    const profile = await db.civilizationProfile.create({
      data: {
        studentId,
        snapshot: completed as unknown as Prisma.InputJsonValue,
        schemaVersion: completed.schemaVersion,
        contentVersion: completed.contentVersion,
        revision: 7,
        lastSimulatedAt: new Date(completed.lastSimulatedAt),
      },
      select: { id: true },
    });
    profileId = profile.id;
  }, 30_000);

  afterAll(async () => {
    if (!profileId) return;
    await db.civilizationCommand.deleteMany({ where: { profileId } });
    await db.civilizationRunHistory.deleteMany({ where: { profileId } });
    await db.civilizationProfile.deleteMany({ where: { id: profileId } });
  }, 30_000);

  it("resets atomically, replays once, restores history, and preserves classroom economy", async () => {
    const input = {
      studentId,
      commandId,
      expectedRevision: 7,
      command: {
        type: "PRESTIGE_RESET",
        rewardId: "research_archive",
        confirmRunNumber: 1,
      } as const,
    };

    const first = await executeCivilizationCommand(input);
    const replay = await executeCivilizationCommand(input);
    const stale = await executeCivilizationCommand({
      ...input,
      commandId: `${commandId}-stale`,
      command: { ...input.command, rewardId: "abundant_harvest" },
    });
    const loaded = await readCivilizationState(studentId);
    const history = await db.civilizationRunHistory.findMany({ where: { profileId } });
    const studentAfter = await db.student.findUniqueOrThrow({
      where: { id: studentId },
      select: { classId: true, behaviorPoints: true, gold: true },
    });

    expect(first).toMatchObject({
      ok: true,
      value: {
        accepted: true,
        replayed: false,
        revision: 8,
        state: {
          era: "stone",
          runNumber: 2,
          spaceCompleted: false,
          permanentRewards: { research_archive: 1 },
        },
      },
    });
    expect(replay).toMatchObject({ ok: true, value: { replayed: true, revision: 8 } });
    expect(stale).toEqual({ ok: false, reason: "revision_conflict", currentRevision: 8 });
    expect(loaded).toMatchObject({
      ok: true,
      value: {
        initialized: true,
        revision: 8,
        state: { runNumber: 2, permanentRewards: { research_archive: 1 } },
      },
    });
    expect(history).toHaveLength(1);
    const completedRun = history[0];
    if (!completedRun) throw new Error("Prestige run history was not created");
    expect(completedRun).toMatchObject({
      commandId,
      runNumber: 1,
      rewardId: "research_archive",
      revisionBefore: 7,
      revisionAfter: 8,
    });
    const finalState = parseCivilizationState(completedRun.finalSnapshot);
    expect(finalState).toMatchObject({
      runNumber: 1,
      spaceCompleted: true,
      spaceProjectStage: 4,
    });
    expect(parseCivilizationState(completedRun.resetSnapshot)).toMatchObject({
      runNumber: 2,
      era: "stone",
      permanentRewards: { research_archive: 1 },
    });
    expect(await db.civilizationCommand.count({ where: { profileId } })).toBe(1);

    await db.civilizationProfile.update({
      where: { id: profileId },
      data: {
        snapshot: completedRun.finalSnapshot as Prisma.InputJsonValue,
        schemaVersion: finalState.schemaVersion,
        contentVersion: finalState.contentVersion,
        revision: { increment: 1 },
        lastSimulatedAt: new Date(finalState.lastSimulatedAt),
      },
    });
    expect(await readCivilizationState(studentId)).toMatchObject({
      ok: true,
      value: {
        initialized: true,
        revision: 9,
        state: { runNumber: 1, spaceCompleted: true, spaceProjectStage: 4 },
      },
    });
    expect(studentAfter).toEqual(studentBefore);
  }, 30_000);
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import {
  executeCivilizationCommand,
  readCivilizationState,
} from "@/lib/services/civilization-idle/civilization-state";

const runDatabaseQa = process.env.RUN_CIVILIZATION_DB_QA === "true";

describe.runIf(runDatabaseQa)("Civilization Idle MongoDB persistence", () => {
  let studentId = "";
  let profileId = "";
  const commandId = `civilization-db-qa-${Date.now()}`;

  beforeAll(async () => {
    const students = await db.student.findMany({ take: 50, select: { id: true } });
    for (const student of students) {
      const profile = await db.civilizationProfile.findUnique({
        where: { studentId: student.id },
        select: { id: true },
      });
      if (!profile) {
        studentId = student.id;
        break;
      }
    }
    if (!studentId) throw new Error("No local student without a Civilization profile is available for QA");
  });

  afterAll(async () => {
    if (!studentId) return;
    const profile = await db.civilizationProfile.findUnique({
      where: { studentId },
      select: { id: true },
    });
    if (!profile) return;
    await db.civilizationCommand.deleteMany({ where: { profileId: profile.id } });
    await db.civilizationProfile.delete({ where: { id: profile.id } });
  });

  it("creates, replays, and reloads a canonical state without duplicate writes", async () => {
    const input = {
      studentId,
      commandId,
      expectedRevision: 0,
      command: { type: "SYNC" } as const,
    };

    const first = await executeCivilizationCommand(input);
    const replay = await executeCivilizationCommand(input);
    const loaded = await readCivilizationState(studentId);
    const profile = await db.civilizationProfile.findUnique({
      where: { studentId },
      select: { id: true, revision: true },
    });
    profileId = profile?.id ?? "";

    expect(first).toMatchObject({ ok: true, value: { replayed: false, revision: 1 } });
    expect(replay).toMatchObject({ ok: true, value: { replayed: true, revision: 1 } });
    expect(loaded).toMatchObject({ ok: true, value: { initialized: true, revision: 1 } });
    expect(profile).toEqual({ id: profileId, revision: 1 });
    expect(await db.civilizationCommand.count({ where: { profileId } })).toBe(1);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import {
  createInitialCivilizationState,
  type CivilizationState,
} from "@/lib/civilization-idle";
import {
  executeCivilizationCommand,
  readCivilizationState,
  type CivilizationServiceDeps,
} from "@/lib/services/civilization-idle/civilization-state";

interface StoredProfile {
  id: string;
  studentId: string;
  snapshot: CivilizationState;
  schemaVersion: number;
  contentVersion: number;
  revision: number;
  lastSimulatedAt: Date;
}

interface StoredCommand {
  commandId: string;
  profileId: string;
  commandType: string;
  payloadHash: string;
  payload: unknown;
  response: unknown;
  revisionBefore: number;
  revisionAfter: number;
}

function selectProfile(profile: StoredProfile, select?: Record<string, unknown>) {
  if (!select) return structuredClone(profile);
  return Object.fromEntries(
    Object.keys(select).map((key) => [key, structuredClone(profile[key as keyof StoredProfile])])
  );
}

function createHarness(now = new Date("2026-11-21T00:00:00.000Z")) {
  let profile: StoredProfile | null = null;
  const commands = new Map<string, StoredCommand>();
  let profileCreateCount = 0;
  let profileUpdateCount = 0;

  const profileDelegate = {
    findUnique: async (args: {
      where: { studentId?: string; id?: string };
      select?: Record<string, unknown>;
    }) => {
      if (!profile) return null;
      const matches =
        (args.where.studentId && args.where.studentId === profile.studentId) ||
        (args.where.id && args.where.id === profile.id);
      return matches ? selectProfile(profile, args.select) : null;
    },
    create: async (args: { data: Omit<StoredProfile, "id"> }) => {
      profileCreateCount += 1;
      profile = { id: "profile-1", ...structuredClone(args.data) };
      return structuredClone(profile);
    },
    updateMany: async (args: {
      where: { id: string; revision: number };
      data: {
        snapshot: CivilizationState;
        schemaVersion: number;
        contentVersion: number;
        revision: { increment: number };
        lastSimulatedAt: Date;
      };
    }) => {
      if (!profile || profile.id !== args.where.id || profile.revision !== args.where.revision) {
        return { count: 0 };
      }
      profileUpdateCount += 1;
      profile = {
        ...profile,
        snapshot: structuredClone(args.data.snapshot),
        schemaVersion: args.data.schemaVersion,
        contentVersion: args.data.contentVersion,
        revision: profile.revision + args.data.revision.increment,
        lastSimulatedAt: new Date(args.data.lastSimulatedAt),
      };
      return { count: 1 };
    },
  };

  const commandDelegate = {
    findUnique: async (args: {
      where: { commandId: string };
      select?: { profile?: unknown };
    }) => {
      const command = commands.get(args.where.commandId);
      if (!command) return null;
      if (args.select?.profile) {
        return {
          payloadHash: command.payloadHash,
          response: structuredClone(command.response),
          profile: { studentId: profile?.studentId },
        };
      }
      return structuredClone(command);
    },
    create: async (args: { data: StoredCommand }) => {
      commands.set(args.data.commandId, structuredClone(args.data));
      return structuredClone(args.data);
    },
  };

  const database = {
    civilizationProfile: profileDelegate,
    civilizationCommand: commandDelegate,
    $transaction: async <T>(callback: (tx: {
      civilizationProfile: typeof profileDelegate;
      civilizationCommand: typeof commandDelegate;
    }) => Promise<T>) => callback({
      civilizationProfile: profileDelegate,
      civilizationCommand: commandDelegate,
    }),
  };

  return {
    deps: { db: database, now: () => now } as unknown as CivilizationServiceDeps,
    commands,
    getProfile: () => profile,
    setProfile: (value: StoredProfile) => {
      profile = value;
    },
    getProfileCreateCount: () => profileCreateCount,
    getProfileUpdateCount: () => profileUpdateCount,
  };
}

describe("Civilization Idle persistence service", () => {
  let harness: ReturnType<typeof createHarness>;

  beforeEach(() => {
    harness = createHarness();
  });

  it("returns an uninitialized preview without writing a profile", async () => {
    const result = await readCivilizationState("student-1", harness.deps);

    expect(result).toMatchObject({
      ok: true,
      value: { initialized: false, revision: 0, state: { era: "stone" } },
    });
    expect(harness.getProfileCreateCount()).toBe(0);
  });

  it("creates the profile and command receipt atomically on first sync", async () => {
    const result = await executeCivilizationCommand(
      {
        studentId: "student-1",
        commandId: "command-0001",
        expectedRevision: 0,
        command: { type: "SYNC" },
      },
      harness.deps
    );

    expect(result).toMatchObject({
      ok: true,
      value: { accepted: true, revision: 1, replayed: false },
    });
    expect(harness.getProfile()).toMatchObject({ studentId: "student-1", revision: 1 });
    expect(harness.commands.get("command-0001")).toMatchObject({
      revisionBefore: 0,
      revisionAfter: 1,
      commandType: "SYNC",
    });
  });

  it("replays the same command without applying or charging it twice", async () => {
    const input = {
      studentId: "student-1",
      commandId: "command-0002",
      expectedRevision: 0,
      command: { type: "BUY_BUILDING", buildingId: "shelter" } as const,
    };

    const first = await executeCivilizationCommand(input, harness.deps);
    const replay = await executeCivilizationCommand(input, harness.deps);

    expect(first).toMatchObject({ ok: true, value: { replayed: false, revision: 1 } });
    expect(replay).toEqual({
      ok: true,
      value: expect.objectContaining({ replayed: true, revision: 1 }),
    });
    expect(harness.getProfileUpdateCount()).toBe(1);
    expect(harness.getProfile()?.snapshot.buildings.shelter).toBe(1);
  });

  it("rejects a reused command id when the payload changes", async () => {
    await executeCivilizationCommand(
      {
        studentId: "student-1",
        commandId: "command-0003",
        expectedRevision: 0,
        command: { type: "SYNC" },
      },
      harness.deps
    );

    const conflict = await executeCivilizationCommand(
      {
        studentId: "student-1",
        commandId: "command-0003",
        expectedRevision: 1,
        command: { type: "SYNC" },
      },
      harness.deps
    );

    expect(conflict).toEqual({ ok: false, reason: "command_conflict" });
    expect(harness.getProfileUpdateCount()).toBe(1);
  });

  it("rejects a stale revision before changing the snapshot", async () => {
    await executeCivilizationCommand(
      {
        studentId: "student-1",
        commandId: "command-0004",
        expectedRevision: 0,
        command: { type: "SYNC" },
      },
      harness.deps
    );

    const conflict = await executeCivilizationCommand(
      {
        studentId: "student-1",
        commandId: "command-0005",
        expectedRevision: 0,
        command: { type: "SYNC" },
      },
      harness.deps
    );

    expect(conflict).toEqual({
      ok: false,
      reason: "revision_conflict",
      currentRevision: 1,
    });
    expect(harness.getProfileUpdateCount()).toBe(1);
  });

  it("persists a rejected command response so a retry is deterministic", async () => {
    const input = {
      studentId: "student-1",
      commandId: "command-0006",
      expectedRevision: 0,
      command: { type: "START_ACTION", actionId: "pan_copper" } as const,
    };

    const rejected = await executeCivilizationCommand(input, harness.deps);
    const replay = await executeCivilizationCommand(input, harness.deps);

    expect(rejected).toMatchObject({
      ok: true,
      value: {
        accepted: false,
        commandError: "CONTENT_LOCKED",
        revision: 1,
        replayed: false,
      },
    });
    expect(replay).toMatchObject({
      ok: true,
      value: { accepted: false, revision: 1, replayed: true },
    });
  });

  it("does not overwrite a stored snapshot that fails validation", async () => {
    const state = createInitialCivilizationState(Date.parse("2026-11-21T00:00:00.000Z"));
    state.resources.food.amount = -1;
    harness.setProfile({
      id: "profile-1",
      studentId: "student-1",
      snapshot: state,
      schemaVersion: 1,
      contentVersion: 1,
      revision: 7,
      lastSimulatedAt: new Date(state.lastSimulatedAt),
    });

    const read = await readCivilizationState("student-1", harness.deps);
    const command = await executeCivilizationCommand(
      {
        studentId: "student-1",
        commandId: "command-0007",
        expectedRevision: 7,
        command: { type: "SYNC" },
      },
      harness.deps
    );

    expect(read).toEqual({ ok: false, reason: "state_invalid" });
    expect(command).toEqual({ ok: false, reason: "state_invalid" });
    expect(harness.getProfileUpdateCount()).toBe(0);
  });

  it("caps offline production at eight hours and discards the remaining gap", async () => {
    const now = new Date("2026-11-21T12:00:00.000Z");
    harness = createHarness(now);
    const state = createInitialCivilizationState(now.getTime() - 9 * 60 * 60 * 1_000);
    state.workers.woodcutter = 1;
    state.idleWorkers = 1;
    harness.setProfile({
      id: "profile-1",
      studentId: "student-1",
      snapshot: state,
      schemaVersion: 1,
      contentVersion: 1,
      revision: 3,
      lastSimulatedAt: new Date(state.lastSimulatedAt),
    });

    const input = {
      studentId: "student-1",
      commandId: "offline-command-1",
      expectedRevision: 3,
      command: { type: "SYNC" } as const,
    };
    const result = await executeCivilizationCommand(input, harness.deps);
    const replay = await executeCivilizationCommand(input, harness.deps);

    expect(result).toMatchObject({
      ok: true,
      value: {
        revision: 4,
        replayed: false,
        simulation: {
          requestedElapsedMs: 9 * 60 * 60 * 1_000,
          simulatedElapsedMs: 8 * 60 * 60 * 1_000,
          discardedElapsedMs: 60 * 60 * 1_000,
          clockAdjusted: false,
        },
      },
    });
    expect(harness.getProfile()?.snapshot.lastSimulatedAt).toBe(now.getTime());
    expect(replay).toMatchObject({
      ok: true,
      value: {
        revision: 4,
        replayed: true,
        simulation: { discardedElapsedMs: 60 * 60 * 1_000 },
      },
    });
    expect(harness.getProfileUpdateCount()).toBe(1);
  });

  it("handles a server clock moving backward without corrupting the snapshot", async () => {
    const now = new Date("2026-11-21T12:00:00.000Z");
    harness = createHarness(now);
    const state = createInitialCivilizationState(now.getTime() + 60_000);
    harness.setProfile({
      id: "profile-1",
      studentId: "student-1",
      snapshot: state,
      schemaVersion: 1,
      contentVersion: 1,
      revision: 2,
      lastSimulatedAt: new Date(state.lastSimulatedAt),
    });

    const result = await executeCivilizationCommand(
      {
        studentId: "student-1",
        commandId: "clock-command-1",
        expectedRevision: 2,
        command: { type: "SYNC" },
      },
      harness.deps
    );

    expect(result).toMatchObject({
      ok: true,
      value: {
        simulation: {
          requestedElapsedMs: 0,
          simulatedElapsedMs: 0,
          discardedElapsedMs: 0,
          clockAdjusted: true,
        },
      },
    });
    expect(harness.getProfile()?.snapshot.lastSimulatedAt).toBe(state.lastSimulatedAt);
  });

  it("allows only one of two concurrent syncs at the same revision to persist", async () => {
    const input = (commandId: string) => ({
      studentId: "student-1",
      commandId,
      expectedRevision: 0,
      command: { type: "SYNC" } as const,
    });

    const results = await Promise.all([
      executeCivilizationCommand(input("concurrent-sync-1"), harness.deps),
      executeCivilizationCommand(input("concurrent-sync-2"), harness.deps),
    ]);

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual([
      { ok: false, reason: "revision_conflict", currentRevision: 1 },
    ]);
    expect(harness.getProfileUpdateCount()).toBe(1);
    expect(harness.getProfile()?.revision).toBe(1);
  });
});

import { Prisma, type PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import {
  applyCivilizationCommand,
  createInitialCivilizationState,
  hashCivilizationCommand,
  parseCivilizationState,
  civilizationStoredCommandResponseSchema,
  CIVILIZATION_MAX_OFFLINE_ELAPSED_MS,
  CIVILIZATION_RESOURCE_IDS,
  simulateCivilization,
  type CivilizationCommand,
  type CivilizationEngineEvent,
  type CivilizationEngineErrorCode,
  type CivilizationState,
  type CivilizationStoredCommandResponse,
} from "@/lib/civilization-idle";

type CivilizationDb = Pick<
  PrismaClient,
  "$transaction" | "civilizationProfile" | "civilizationCommand"
>;

export interface CivilizationServiceDeps {
  db: CivilizationDb;
  now: () => Date;
}

const defaultDeps: CivilizationServiceDeps = { db, now: () => new Date() };

export interface CivilizationStateView {
  initialized: boolean;
  revision: number;
  state: CivilizationState;
  serverNow: string;
}

export type ReadCivilizationStateResult =
  | { ok: true; value: CivilizationStateView }
  | { ok: false; reason: "state_invalid" };

export interface ExecuteCivilizationCommandInput {
  studentId: string;
  commandId: string;
  expectedRevision: number;
  command: CivilizationCommand;
}

export interface CivilizationCommandResponse {
  accepted: boolean;
  commandError?: CivilizationEngineErrorCode;
  revision: number;
  state: CivilizationState;
  events: CivilizationEngineEvent[];
  replayed: boolean;
}

export type ExecuteCivilizationCommandResult =
  | { ok: true; value: CivilizationCommandResponse }
  | { ok: false; reason: "revision_conflict"; currentRevision: number }
  | { ok: false; reason: "command_conflict" }
  | { ok: false; reason: "state_invalid" };

function asInputJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function isPrismaErrorCode(error: unknown, code: string): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === code) ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === code)
  );
}

function parseStoredResponse(value: unknown): CivilizationStoredCommandResponse | null {
  const parsed = civilizationStoredCommandResponseSchema.safeParse(value);
  if (!parsed.success) return null;
  try {
    parseCivilizationState(parsed.data.state);
    return parsed.data;
  } catch {
    return null;
  }
}

function buildResponse(
  response: CivilizationStoredCommandResponse,
  replayed: boolean
): CivilizationCommandResponse {
  return { ...response, replayed };
}

export async function readCivilizationState(
  studentId: string,
  deps: CivilizationServiceDeps = defaultDeps
): Promise<ReadCivilizationStateResult> {
  const now = deps.now();
  const profile = await deps.db.civilizationProfile.findUnique({
    where: { studentId },
    select: {
      revision: true,
      snapshot: true,
      schemaVersion: true,
      contentVersion: true,
      lastSimulatedAt: true,
    },
  });

  if (!profile) {
    return {
      ok: true,
      value: {
        initialized: false,
        revision: 0,
        state: createInitialCivilizationState(now.getTime()),
        serverNow: now.toISOString(),
      },
    };
  }

  try {
    const state = parseCivilizationState(profile.snapshot);
    if (
      profile.schemaVersion !== state.schemaVersion ||
      profile.contentVersion !== state.contentVersion ||
      profile.lastSimulatedAt.getTime() !== state.lastSimulatedAt
    ) {
      return { ok: false, reason: "state_invalid" };
    }
    return {
      ok: true,
      value: {
        initialized: true,
        revision: profile.revision,
        state,
        serverNow: now.toISOString(),
      },
    };
  } catch {
    return { ok: false, reason: "state_invalid" };
  }
}

async function replayAfterUniqueRace(
  input: ExecuteCivilizationCommandInput,
  payloadHash: string,
  deps: CivilizationServiceDeps
): Promise<ExecuteCivilizationCommandResult | null> {
  const existing = await deps.db.civilizationCommand.findUnique({
    where: { commandId: input.commandId },
    select: {
      payloadHash: true,
      response: true,
      profile: { select: { studentId: true } },
    },
  });
  if (!existing) return null;
  if (existing.profile.studentId !== input.studentId || existing.payloadHash !== payloadHash) {
    return { ok: false, reason: "command_conflict" };
  }
  const response = parseStoredResponse(existing.response);
  if (!response) return { ok: false, reason: "state_invalid" };
  return { ok: true, value: buildResponse(response, true) };
}

async function executeAttempt(
  input: ExecuteCivilizationCommandInput,
  now: Date,
  payloadHash: string,
  deps: CivilizationServiceDeps
): Promise<ExecuteCivilizationCommandResult> {
  return deps.db.$transaction(async (tx) => {
    let profile = await tx.civilizationProfile.findUnique({
      where: { studentId: input.studentId },
    });

    if (!profile) {
      const initial = createInitialCivilizationState(now.getTime());
      profile = await tx.civilizationProfile.create({
        data: {
          studentId: input.studentId,
          snapshot: asInputJson(initial),
          schemaVersion: initial.schemaVersion,
          contentVersion: initial.contentVersion,
          revision: 0,
          lastSimulatedAt: now,
        },
      });
    }

    const existing = await tx.civilizationCommand.findUnique({
      where: { commandId: input.commandId },
    });
    if (existing) {
      if (existing.profileId !== profile.id || existing.payloadHash !== payloadHash) {
        return { ok: false, reason: "command_conflict" } as const;
      }
      const response = parseStoredResponse(existing.response);
      if (!response) return { ok: false, reason: "state_invalid" } as const;
      return { ok: true, value: buildResponse(response, true) } as const;
    }

    if (profile.revision !== input.expectedRevision) {
      return {
        ok: false,
        reason: "revision_conflict",
        currentRevision: profile.revision,
      } as const;
    }

    let state: CivilizationState;
    try {
      state = parseCivilizationState(profile.snapshot);
      if (
        profile.schemaVersion !== state.schemaVersion ||
        profile.contentVersion !== state.contentVersion ||
        profile.lastSimulatedAt.getTime() !== state.lastSimulatedAt
      ) {
        return { ok: false, reason: "state_invalid" } as const;
      }
    } catch {
      return { ok: false, reason: "state_invalid" } as const;
    }

    const requestedNowMs = now.getTime();
    const effectiveNowMs = Math.max(requestedNowMs, state.lastSimulatedAt);
    const requestedElapsedMs = Math.max(0, requestedNowMs - state.lastSimulatedAt);
    const simulation = simulateCivilization(
      state,
      effectiveNowMs,
      CIVILIZATION_MAX_OFFLINE_ELAPSED_MS
    );
    const simulatedElapsedMs = effectiveNowMs - state.lastSimulatedAt - simulation.remainingMs;
    const resourceDeltas = Object.fromEntries(
      CIVILIZATION_RESOURCE_IDS.map((resourceId) => [
        resourceId,
        simulation.state.resources[resourceId].amount - state.resources[resourceId].amount,
      ])
    ) as CivilizationStoredCommandResponse["simulation"] extends infer Summary
      ? Summary extends { resourceDeltas: infer Deltas }
        ? Deltas
        : never
      : never;

    // Discard elapsed time beyond the cap so repeated syncs cannot farm the same offline gap.
    if (simulation.remainingMs > 0) {
      simulation.state.lastSimulatedAt = effectiveNowMs;
    }

    const commandResult = applyCivilizationCommand(
      simulation.state,
      input.command,
      effectiveNowMs
    );
    const engineResult = {
      ...commandResult,
      events: [...simulation.events, ...commandResult.events],
    };
    const revisionAfter = profile.revision + 1;
    const storedResponse: CivilizationStoredCommandResponse = {
      accepted: engineResult.ok,
      ...(engineResult.ok ? {} : { commandError: engineResult.error }),
      revision: revisionAfter,
      state: engineResult.state,
      events: engineResult.events,
      simulation: {
        requestedElapsedMs,
        simulatedElapsedMs,
        discardedElapsedMs: simulation.remainingMs,
        clockAdjusted: requestedNowMs < state.lastSimulatedAt,
        resourceDeltas,
      },
    };

    const updated = await tx.civilizationProfile.updateMany({
      where: { id: profile.id, revision: profile.revision },
      data: {
        snapshot: asInputJson(engineResult.state),
        schemaVersion: engineResult.state.schemaVersion,
        contentVersion: engineResult.state.contentVersion,
        revision: { increment: 1 },
        lastSimulatedAt: new Date(engineResult.state.lastSimulatedAt),
      },
    });
    if (updated.count !== 1) {
      const current = await tx.civilizationProfile.findUnique({
        where: { id: profile.id },
        select: { revision: true },
      });
      return {
        ok: false,
        reason: "revision_conflict",
        currentRevision: current?.revision ?? profile.revision,
      } as const;
    }

    await tx.civilizationCommand.create({
      data: {
        commandId: input.commandId,
        profileId: profile.id,
        commandType: input.command.type,
        payloadHash,
        payload: asInputJson({
          expectedRevision: input.expectedRevision,
          command: input.command,
        }),
        response: asInputJson(storedResponse),
        revisionBefore: profile.revision,
        revisionAfter,
      },
    });

    return { ok: true, value: buildResponse(storedResponse, false) } as const;
  });
}

export async function executeCivilizationCommand(
  input: ExecuteCivilizationCommandInput,
  deps: CivilizationServiceDeps = defaultDeps
): Promise<ExecuteCivilizationCommandResult> {
  const now = deps.now();
  const payloadHash = hashCivilizationCommand({
    expectedRevision: input.expectedRevision,
    command: input.command,
  });

  try {
    return await executeAttempt(input, now, payloadHash, deps);
  } catch (error) {
    if (isPrismaErrorCode(error, "P2002")) {
      const replay = await replayAfterUniqueRace(input, payloadHash, deps);
      if (replay) return replay;
      return executeAttempt(input, now, payloadHash, deps);
    }
    if (isPrismaErrorCode(error, "P2034")) {
      return executeAttempt(input, now, payloadHash, deps);
    }
    throw error;
  }
}

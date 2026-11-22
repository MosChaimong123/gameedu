"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CivilizationCommand,
  CivilizationEngineErrorCode,
  CivilizationEngineEvent,
  CivilizationState,
} from "@/lib/civilization-idle";
import { applyCivilizationCommand } from "@/lib/civilization-idle";

interface StatePayload {
  initialized: boolean;
  revision: number;
  state: CivilizationState;
  serverNow: string;
}

interface CommandPayload {
  accepted: boolean;
  commandError?: CivilizationEngineErrorCode;
  revision: number;
  state: CivilizationState;
  events: CivilizationEngineEvent[];
  replayed: boolean;
  simulation?: CivilizationSimulationSummary;
}

export interface CivilizationSimulationSummary {
  requestedElapsedMs: number;
  simulatedElapsedMs: number;
  discardedElapsedMs: number;
  clockAdjusted: boolean;
  resourceDeltas: Record<
    "food" | "population" | "wood" | "stone" | "science" | "copper" | "bronze" | "iron",
    number
  >;
}

interface PendingCommand {
  commandId: string;
  command: CivilizationCommand;
  expectedRevision?: number;
}

export type CivilizationConnectionState = "loading" | "saved" | "syncing" | "offline" | "error";

function newCommandId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `cmd_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export function useCivilizationGame(
  previewState?: CivilizationState,
  previewOfflineSummary?: CivilizationSimulationSummary
) {
  const [state, setState] = useState<CivilizationState | null>(previewState ?? null);
  const [revision, setRevision] = useState(0);
  const [connection, setConnection] = useState<CivilizationConnectionState>("loading");
  const [queuedCount, setQueuedCount] = useState(0);
  const [events, setEvents] = useState<CivilizationEngineEvent[]>([]);
  const [lastError, setLastError] = useState<CivilizationEngineErrorCode | "CONFLICT" | null>(null);
  const [offlineSummary, setOfflineSummary] = useState<CivilizationSimulationSummary | null>(previewOfflineSummary ?? null);
  const stateRef = useRef<CivilizationState | null>(previewState ?? null);
  const revisionRef = useRef(0);
  const queueRef = useRef<PendingCommand[]>([]);
  const drainingRef = useRef(false);

  const acceptState = useCallback((nextState: CivilizationState, nextRevision: number) => {
    stateRef.current = nextState;
    revisionRef.current = nextRevision;
    setState(nextState);
    setRevision(nextRevision);
  }, []);

  const loadState = useCallback(async () => {
    if (previewState) {
      acceptState(previewState, revisionRef.current);
      setConnection("saved");
      return true;
    }
    setConnection((value) => (value === "loading" ? "loading" : "syncing"));
    try {
      const response = await fetch("/api/student/access/civilization/state", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(`state:${response.status}`);
      const body = (await response.json()) as { ok: true } & StatePayload;
      acceptState(body.state, body.revision);
      setConnection("saved");
      setLastError(null);
      return true;
    } catch {
      setConnection(stateRef.current ? "offline" : "error");
      return false;
    }
  }, [acceptState, previewState]);

  const drainQueue = useCallback(async () => {
    if (drainingRef.current || !stateRef.current) return;
    drainingRef.current = true;
    setConnection("syncing");

    try {
      while (queueRef.current.length > 0) {
        const pending = queueRef.current[0];
        pending.expectedRevision ??= revisionRef.current;
        if (previewState && stateRef.current) {
          const result = applyCivilizationCommand(
            stateRef.current,
            pending.command,
            Date.now()
          );
          acceptState(result.state, revisionRef.current + 1);
          if (result.events.length) {
            setEvents((current) => [...result.events, ...current].slice(0, 8));
          }
          setLastError(result.ok ? null : result.error);
          queueRef.current.shift();
          setQueuedCount(queueRef.current.length);
          continue;
        }
        let response: Response;
        try {
          response = await fetch("/api/student/access/civilization/command", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              commandId: pending.commandId,
              expectedRevision: pending.expectedRevision,
              command: pending.command,
            }),
          });
        } catch {
          setConnection("offline");
          break;
        }

        if (response.status === 409) {
          queueRef.current.shift();
          setQueuedCount(queueRef.current.length);
          setLastError("CONFLICT");
          await loadState();
          continue;
        }

        const body = (await response.json().catch(() => null)) as
          | ({ ok?: boolean } & Partial<CommandPayload>)
          | null;
        if ((response.ok || response.status === 422) && body?.state && body.revision != null) {
          acceptState(body.state, body.revision);
          if (body.events?.length) {
            setEvents((current) => [...body.events!, ...current].slice(0, 8));
          }
          setLastError(body.commandError ?? null);
          if (
            body.simulation &&
            (body.simulation.simulatedElapsedMs >= 60_000 ||
              body.simulation.discardedElapsedMs > 0 ||
              body.simulation.clockAdjusted)
          ) {
            setOfflineSummary(body.simulation);
          }
          queueRef.current.shift();
          setQueuedCount(queueRef.current.length);
          continue;
        }

        if (response.status === 401) {
          window.location.assign("/student?error=session_expired");
          break;
        }
        setConnection("offline");
        break;
      }
    } finally {
      drainingRef.current = false;
      if (queueRef.current.length === 0 && stateRef.current) setConnection("saved");
    }
  }, [acceptState, loadState, previewState]);

  const enqueue = useCallback(
    (command: CivilizationCommand) => {
      queueRef.current.push({ commandId: newCommandId(), command });
      setQueuedCount(queueRef.current.length);
      setLastError(null);
      void drainQueue();
    },
    [drainQueue]
  );

  const retry = useCallback(() => {
    if (queueRef.current.length > 0) void drainQueue();
    else void loadState();
  }, [drainQueue, loadState]);

  useEffect(() => {
    void loadState().then((loaded) => {
      if (loaded && !previewState) enqueue({ type: "SYNC" });
    });
  }, [enqueue, loadState, previewState]);

  useEffect(() => {
    if (!state) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && queueRef.current.length === 0) {
        enqueue({ type: "SYNC" });
      }
    }, 10_000);
    return () => window.clearInterval(timer);
  }, [enqueue, state]);

  return {
    state,
    revision,
    connection,
    queuedCount,
    events,
    lastError,
    enqueue,
    retry,
    refresh: loadState,
    offlineSummary,
    dismissOfflineSummary: () => setOfflineSummary(null),
  };
}

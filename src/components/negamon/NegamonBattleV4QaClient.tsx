"use client";

import { useCallback, useEffect, useState } from "react";
import type { NegamonBattleChoiceV4, NegamonBattleStateV4 } from "@/lib/game-negamon";
import { NegamonBattleArenaV4 } from "@/components/negamon/NegamonBattleArenaV4";

type StartPayload = {
  mode?: "negamon_battle_v4";
  engineVersion?: string;
  sessionId?: string;
  choiceRequestId?: string;
  state?: NegamonBattleStateV4;
  validChoices?: NegamonBattleChoiceV4[];
  error?: string;
};

declare global {
  interface Window {
    __NEGAMON_BATTLE_V4_QA__?: {
      sessionId?: string;
      choiceRequestId?: string;
      state?: NegamonBattleStateV4;
      validChoices?: NegamonBattleChoiceV4[];
    };
  }
}

export function NegamonBattleV4QaClient({
  classId,
  challengerId,
  defenderId,
  studentCode,
  initialStart,
}: {
  classId: string;
  challengerId: string;
  defenderId: string;
  studentCode: string;
  initialStart?: StartPayload;
}) {
  const [session, setSession] = useState<StartPayload | null>(
    initialStart?.sessionId && initialStart.choiceRequestId && initialStart.state ? initialStart : null
  );
  const [error, setError] = useState<string | null>(
    initialStart && (!initialStart.sessionId || !initialStart.choiceRequestId || !initialStart.state)
      ? initialStart.error ?? "BATTLE_START_FAILED"
      : null
  );
  const [loading, setLoading] = useState(
    !(initialStart?.sessionId && initialStart.choiceRequestId && initialStart.state)
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const startBattle = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSession(null);
    try {
      const response = await fetch(`/api/classrooms/${classId}/battle/v4/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengerId,
          defenderId,
          studentCode,
        }),
      });
      const data = (await response.json()) as StartPayload;
      if (!response.ok || !data.sessionId || !data.choiceRequestId || !data.state) {
        setError(data.error ?? "BATTLE_START_FAILED");
        return;
      }
      setSession(data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "BATTLE_START_FAILED");
    } finally {
      setLoading(false);
    }
  }, [challengerId, classId, defenderId, studentCode]);

  useEffect(() => {
    if (refreshKey === 0 && initialStart?.sessionId && initialStart.choiceRequestId && initialStart.state) {
      return;
    }
    void startBattle();
  }, [initialStart, refreshKey, startBattle]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (session?.sessionId && session.choiceRequestId && session.state) {
      window.__NEGAMON_BATTLE_V4_QA__ = {
        sessionId: session.sessionId,
        choiceRequestId: session.choiceRequestId,
        state: session.state,
        validChoices: session.validChoices ?? [],
      };
      return;
    }
    window.__NEGAMON_BATTLE_V4_QA__ = undefined;
  }, [session]);

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-6 py-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-black text-slate-900">Negamon Battle V4 QA Harness</h1>
        <p className="mt-1 text-sm text-slate-500">
          Local stale-choice recovery smoke page for Plan 30.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
          <span className="rounded-full bg-slate-100 px-3 py-1">Class {classId}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">Challenger {challengerId}</span>
          <span className="rounded-full bg-slate-100 px-3 py-1">Defender {defenderId}</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
          Starting V4 battle...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
          <p className="text-sm font-black text-rose-700">QA harness could not start a V4 battle.</p>
          <p className="mt-2 text-xs font-bold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="mt-4 rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-black text-rose-700"
          >
            Retry
          </button>
        </div>
      ) : session?.sessionId && session.choiceRequestId && session.state ? (
        <NegamonBattleArenaV4
          classId={classId}
          challengerId={challengerId}
          defenderId={defenderId}
          studentCode={studentCode}
          sessionId={session.sessionId}
          initialChoiceRequestId={session.choiceRequestId}
          initialState={session.state}
          initialValidChoices={session.validChoices ?? []}
          onReset={() => setRefreshKey((value) => value + 1)}
        />
      ) : null}
    </div>
  );
}

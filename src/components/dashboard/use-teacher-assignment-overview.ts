"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
    AssignmentOverviewRangeDays,
    TeacherAssignmentOverviewPayload,
} from "@/lib/services/teacher/get-teacher-assignment-overview";
import { buildAssignmentOverviewUrl } from "./assignment-command-center.helpers";

export type LoadTeacherAssignmentOverviewResult =
    | { ok: true; data: TeacherAssignmentOverviewPayload }
    | { ok: false; error: string };

export type LoadTeacherAssignmentOverviewOutcome =
    | LoadTeacherAssignmentOverviewResult
    | { aborted: true };

export type LoadTeacherAssignmentOverviewOptions = {
    signal?: AbortSignal;
    fetchImpl?: typeof fetch;
};

function isAbortError(e: unknown): boolean {
    if (e && typeof e === "object" && "name" in e && (e as { name: string }).name === "AbortError") {
        return true;
    }
    return false;
}

export async function loadTeacherAssignmentOverview(
    rangeDays: AssignmentOverviewRangeDays,
    fallbackError: string,
    options?: LoadTeacherAssignmentOverviewOptions
): Promise<LoadTeacherAssignmentOverviewOutcome> {
    const { signal, fetchImpl = fetch } = options ?? {};
    try {
        const res = await fetchImpl(buildAssignmentOverviewUrl(rangeDays), {
            cache: "no-store",
            signal,
        });
        const json = (await res.json()) as TeacherAssignmentOverviewPayload | { error?: { message?: string } };
        if (!res.ok) {
            const msg =
                "error" in json && json.error?.message ? json.error.message : fallbackError;
            return { ok: false, error: msg };
        }
        return { ok: true, data: json as TeacherAssignmentOverviewPayload };
    } catch (e) {
        if (signal?.aborted || isAbortError(e)) {
            return { aborted: true };
        }
        return { ok: false, error: fallbackError };
    }
}

export function createLatestRequestGate() {
    let latest = 0;
    return {
        begin() {
            latest += 1;
            return latest;
        },
        isLatest(requestId: number) {
            return requestId === latest;
        },
    };
}

export function useTeacherAssignmentOverview(fallbackError: string) {
    const [rangeDays, setRangeDays] = useState<AssignmentOverviewRangeDays>(14);
    const [data, setData] = useState<TeacherAssignmentOverviewPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [gate] = useState(() => createLatestRequestGate());
    const abortRef = useRef<AbortController | null>(null);

    const load = useCallback(async () => {
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const requestId = gate.begin();
        setLoading(true);
        setError(null);
        const result = await loadTeacherAssignmentOverview(rangeDays, fallbackError, {
            signal: controller.signal,
        });
        if ("aborted" in result && result.aborted) {
            return;
        }
        if (!gate.isLatest(requestId)) {
            return;
        }
        if (result.ok) {
            setData(result.data);
        } else {
            setData(null);
            setError(result.error);
        }
        setLoading(false);
    }, [rangeDays, fallbackError, gate]);

    useEffect(() => {
        void load();
        return () => {
            abortRef.current?.abort();
        };
    }, [load]);

    return { rangeDays, setRangeDays, data, loading, error, load };
}

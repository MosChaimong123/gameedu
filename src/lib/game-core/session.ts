import type { GameKind, GameSessionStatus, GameSessionSummary } from "./types";

export type CreateGameSessionSummaryInput = {
    id: string;
    kind: GameKind;
    status?: GameSessionStatus;
    studentId: string;
    classId: string;
    startedAt?: string | Date;
    finishedAt?: string | Date | null;
    opponentId?: string | null;
    winnerId?: string | null;
};

function toIsoString(value: string | Date): string {
    return value instanceof Date ? value.toISOString() : value;
}

export function createGameSessionSummary(input: CreateGameSessionSummaryInput): GameSessionSummary {
    return {
        id: input.id,
        kind: input.kind,
        status: input.status ?? "pending",
        studentId: input.studentId,
        classId: input.classId,
        startedAt: toIsoString(input.startedAt ?? new Date(0)),
        finishedAt: input.finishedAt ? toIsoString(input.finishedAt) : undefined,
        opponentId: input.opponentId ?? undefined,
        winnerId: input.winnerId ?? undefined,
    };
}

export function isFinalGameSessionStatus(status: GameSessionStatus): boolean {
    return status === "finished" || status === "cancelled";
}

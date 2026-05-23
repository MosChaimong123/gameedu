import type { GameEconomyMutation, GameEconomyMutationType, GameEconomySource } from "./types";

export type CreateGameEconomyMutationInput = {
    studentId: string;
    classId?: string | null;
    type: GameEconomyMutationType;
    source: GameEconomySource;
    amount: number;
    balanceBefore: number;
    sourceRefId?: string | null;
    idempotencyKey?: string | null;
};

export function applyGoldBalance(balanceBefore: number, amount: number): number {
    return balanceBefore + amount;
}

export function createGameEconomyMutation(input: CreateGameEconomyMutationInput): GameEconomyMutation {
    const amount = Math.trunc(input.amount);
    const balanceBefore = Math.trunc(input.balanceBefore);

    return {
        studentId: input.studentId,
        classId: input.classId ?? null,
        type: input.type,
        source: input.source,
        amount,
        balanceBefore,
        balanceAfter: applyGoldBalance(balanceBefore, amount),
        sourceRefId: input.sourceRefId ?? null,
        idempotencyKey: input.idempotencyKey?.trim() || undefined,
    };
}

export function assertEconomyMutationBalance(mutation: GameEconomyMutation): void {
    if (mutation.balanceAfter !== mutation.balanceBefore + mutation.amount) {
        throw new Error("GAME_ECONOMY_BALANCE_MISMATCH");
    }
}

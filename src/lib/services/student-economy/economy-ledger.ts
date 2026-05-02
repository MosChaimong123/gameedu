import { Prisma, type PrismaClient } from "@prisma/client";

export type EconomyTransactionType = "earn" | "spend" | "adjust";

export type EconomyTransactionSource =
    | "passive_gold"
    | "checkin"
    | "quest"
    | "battle"
    | "shop"
    | "admin_adjustment"
    | "migration";

type EconomyLedgerDb = Pick<PrismaClient, "economyTransaction"> | Prisma.TransactionClient;

export type RecordEconomyTransactionInput = {
    studentId: string;
    classId?: string | null;
    type: EconomyTransactionType;
    source: EconomyTransactionSource;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    sourceRefId?: string | null;
    idempotencyKey?: string | null;
    metadata?: Prisma.InputJsonValue;
};

export async function recordEconomyTransaction(
    db: EconomyLedgerDb,
    input: RecordEconomyTransactionInput
) {
    if (input.balanceAfter !== input.balanceBefore + input.amount) {
        throw new Error("ECONOMY_LEDGER_BALANCE_MISMATCH");
    }

    const idempotencyKey = input.idempotencyKey?.trim() || null;
    const economyTransaction = (db as { economyTransaction?: typeof db.economyTransaction }).economyTransaction as
        | (typeof db.economyTransaction & {
              findFirst?: typeof db.economyTransaction.findFirst;
          })
        | undefined;

    // Older Prisma Client builds may not know this model yet. Skip ledger write rather than
    // breaking the user-facing flow until the client is regenerated.
    if (!economyTransaction || typeof economyTransaction.create !== "function") {
        return null;
    }
    const data = {
        studentId: input.studentId,
        classId: input.classId ?? null,
        type: input.type,
        source: input.source,
        amount: input.amount,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        sourceRefId: input.sourceRefId ?? null,
        idempotencyKey,
        metadata: input.metadata ?? undefined,
    };

    if (!idempotencyKey || typeof economyTransaction.findFirst !== "function") {
        return economyTransaction.create({ data });
    }

    const existing = await economyTransaction.findFirst({
        where: { idempotencyKey },
    });
    if (existing) return existing;

    try {
        return await economyTransaction.create({ data });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const raced = await economyTransaction.findFirst({
                where: { idempotencyKey },
            });
            if (raced) return raced;
        }
        throw error;
    }
}

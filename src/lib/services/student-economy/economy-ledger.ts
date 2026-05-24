import { Prisma, type PrismaClient } from "@prisma/client";

const MONGO_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

/** Prisma stores `sourceRefId` as MongoDB ObjectId — shop/quest slugs must not be written there. */
export function isMongoObjectId(value: string): boolean {
    return MONGO_OBJECT_ID_PATTERN.test(value.trim());
}

export function sanitizeEconomySourceRefId(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    if (!trimmed || !isMongoObjectId(trimmed)) return null;
    return trimmed;
}

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
        throw new Error(
            `ECONOMY_LEDGER_BALANCE_MISMATCH: expected ${
                input.balanceBefore + input.amount
            } but got ${input.balanceAfter} (before: ${input.balanceBefore}, amount: ${input.amount})`
        );
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
        sourceRefId: sanitizeEconomySourceRefId(input.sourceRefId),
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

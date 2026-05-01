import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE } from "@/lib/api-error";
import type { EconomyTransactionSource, EconomyTransactionType } from "@/lib/services/student-economy/economy-ledger";

const ECONOMY_SOURCES = new Set<EconomyTransactionSource>([
    "passive_gold",
    "checkin",
    "quest",
    "battle",
    "shop",
    "admin_adjustment",
    "migration",
]);

const ECONOMY_TYPES = new Set<EconomyTransactionType>(["earn", "spend", "adjust"]);
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

function parseLimit(raw: string | null): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
    return Math.min(MAX_LIMIT, Math.max(1, Math.floor(parsed)));
}

function parseSource(raw: string | null): EconomyTransactionSource | undefined {
    return raw && ECONOMY_SOURCES.has(raw as EconomyTransactionSource)
        ? (raw as EconomyTransactionSource)
        : undefined;
}

function parseType(raw: string | null): EconomyTransactionType | undefined {
    return raw && ECONOMY_TYPES.has(raw as EconomyTransactionType)
        ? (raw as EconomyTransactionType)
        : undefined;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;
    const user = await requireSessionUser();
    if (!user) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    const classroom = await db.classroom.findUnique({
        where: { id, teacherId: user.id },
        select: { id: true },
    });
    if (!classroom) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const url = new URL(req.url);
    const limit = parseLimit(url.searchParams.get("limit"));
    const studentId = url.searchParams.get("studentId")?.trim() || undefined;
    const source = parseSource(url.searchParams.get("source"));
    const type = parseType(url.searchParams.get("type"));

    const rows = await db.economyTransaction.findMany({
        where: {
            classId: id,
            ...(studentId ? { studentId } : {}),
            ...(source ? { source } : {}),
            ...(type ? { type } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: {
            id: true,
            studentId: true,
            classId: true,
            type: true,
            source: true,
            amount: true,
            balanceBefore: true,
            balanceAfter: true,
            sourceRefId: true,
            idempotencyKey: true,
            metadata: true,
            createdAt: true,
            student: {
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                },
            },
        },
    });

    const summary = rows.reduce(
        (acc, row) => {
            if (row.amount > 0) acc.totalEarned += row.amount;
            if (row.amount < 0) acc.totalSpent += Math.abs(row.amount);
            acc.net += row.amount;
            acc.bySource[row.source] = (acc.bySource[row.source] ?? 0) + row.amount;
            acc.byType[row.type] = (acc.byType[row.type] ?? 0) + row.amount;
            return acc;
        },
        {
            rowCount: rows.length,
            totalEarned: 0,
            totalSpent: 0,
            net: 0,
            bySource: {} as Record<string, number>,
            byType: {} as Record<string, number>,
        }
    );

    return NextResponse.json({
        filters: {
            classId: id,
            studentId: studentId ?? null,
            source: source ?? null,
            type: type ?? null,
            limit,
        },
        summary,
        transactions: rows.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
        })),
    });
}

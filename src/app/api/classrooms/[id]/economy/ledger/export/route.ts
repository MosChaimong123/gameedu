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
const DEFAULT_LIMIT = 500;
const MAX_LIMIT = 2000;

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

function sanitizeFormulaString(value: string) {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function sanitizeFormulaValue(value: unknown): unknown {
    if (typeof value === "string") return sanitizeFormulaString(value);
    if (Array.isArray(value)) return value.map((item) => sanitizeFormulaValue(item));
    if (value && typeof value === "object") {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, entryValue]) => [
                key,
                sanitizeFormulaValue(entryValue),
            ])
        );
    }
    return value;
}

function escapeCsvValue(value: unknown) {
    const text =
        typeof value === "string"
            ? sanitizeFormulaString(value)
            : JSON.stringify(sanitizeFormulaValue(value ?? ""));
    const sanitized = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${sanitized.replace(/"/g, "\"\"")}"`;
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
                    name: true,
                    nickname: true,
                },
            },
        },
    });

    const csvRows = [
        [
            "createdAt",
            "transactionId",
            "studentId",
            "studentName",
            "studentNickname",
            "type",
            "source",
            "amount",
            "balanceBefore",
            "balanceAfter",
            "sourceRefId",
            "idempotencyKey",
            "metadata",
        ].join(","),
        ...rows.map((row) =>
            [
                escapeCsvValue(row.createdAt.toISOString()),
                escapeCsvValue(row.id),
                escapeCsvValue(row.studentId),
                escapeCsvValue(row.student?.name ?? ""),
                escapeCsvValue(row.student?.nickname ?? ""),
                escapeCsvValue(row.type),
                escapeCsvValue(row.source),
                escapeCsvValue(row.amount),
                escapeCsvValue(row.balanceBefore),
                escapeCsvValue(row.balanceAfter),
                escapeCsvValue(row.sourceRefId ?? ""),
                escapeCsvValue(row.idempotencyKey ?? ""),
                escapeCsvValue(row.metadata ?? {}),
            ].join(",")
        ),
    ];

    return new NextResponse(csvRows.join("\n"), {
        status: 200,
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="classroom-economy-ledger.csv"',
            "Cache-Control": "no-store",
        },
    });
}

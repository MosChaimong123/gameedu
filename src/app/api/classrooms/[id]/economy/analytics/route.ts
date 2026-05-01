import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";

const ALLOWED_DAYS = new Set([7, 30, 90]);

function parseDays(raw: string | null): number {
    const parsed = Number(raw);
    return ALLOWED_DAYS.has(parsed) ? parsed : 30;
}

function dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
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
    const days = parseDays(url.searchParams.get("days"));
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - (days - 1));
    since.setUTCHours(0, 0, 0, 0);

    const rows = await db.economyTransaction.findMany({
        where: {
            classId: id,
            createdAt: { gte: since },
        },
        orderBy: { createdAt: "asc" },
        select: {
            studentId: true,
            source: true,
            type: true,
            amount: true,
            createdAt: true,
            student: {
                select: {
                    name: true,
                    nickname: true,
                },
            },
        },
    });

    const daily = new Map<string, { date: string; earned: number; spent: number; net: number }>();
    for (let i = 0; i < days; i += 1) {
        const d = new Date(since);
        d.setUTCDate(since.getUTCDate() + i);
        const key = dayKey(d);
        daily.set(key, { date: key, earned: 0, spent: 0, net: 0 });
    }

    const bySource: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byStudent = new Map<string, { studentId: string; name: string; earned: number; spent: number; net: number }>();

    for (const row of rows) {
        const bucket = daily.get(dayKey(row.createdAt));
        if (bucket) {
            if (row.amount > 0) bucket.earned += row.amount;
            if (row.amount < 0) bucket.spent += Math.abs(row.amount);
            bucket.net += row.amount;
        }

        bySource[row.source] = (bySource[row.source] ?? 0) + row.amount;
        byType[row.type] = (byType[row.type] ?? 0) + row.amount;

        const existing = byStudent.get(row.studentId) ?? {
            studentId: row.studentId,
            name: row.student?.nickname || row.student?.name || row.studentId,
            earned: 0,
            spent: 0,
            net: 0,
        };
        if (row.amount > 0) existing.earned += row.amount;
        if (row.amount < 0) existing.spent += Math.abs(row.amount);
        existing.net += row.amount;
        byStudent.set(row.studentId, existing);
    }

    const totals = rows.reduce(
        (acc, row) => {
            if (row.amount > 0) acc.earned += row.amount;
            if (row.amount < 0) acc.spent += Math.abs(row.amount);
            acc.net += row.amount;
            return acc;
        },
        { earned: 0, spent: 0, net: 0 }
    );

    return NextResponse.json({
        days,
        since: since.toISOString(),
        totals,
        daily: Array.from(daily.values()),
        bySource,
        byType,
        topStudents: Array.from(byStudent.values())
            .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
            .slice(0, 10),
    });
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { buildEconomyReconciliationReport } from "@/lib/services/student-economy/economy-reconciliation";

export async function GET(
    _req: NextRequest,
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

    const [students, transactions] = await Promise.all([
        db.student.findMany({
            where: { classId: id },
            orderBy: { name: "asc" },
            select: {
                id: true,
                name: true,
                nickname: true,
                gold: true,
            },
        }),
        db.economyTransaction.findMany({
            where: { classId: id },
            orderBy: [{ studentId: "asc" }, { createdAt: "asc" }],
            select: {
                id: true,
                studentId: true,
                type: true,
                source: true,
                amount: true,
                balanceBefore: true,
                balanceAfter: true,
                idempotencyKey: true,
                createdAt: true,
            },
        }),
    ]);

    return NextResponse.json(buildEconomyReconciliationReport(students, transactions));
}

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSessionUser } from "@/lib/auth-guards";
import { AUTH_REQUIRED_MESSAGE, FORBIDDEN_MESSAGE, createAppErrorResponse } from "@/lib/api-error";
import { recordEconomyTransaction } from "@/lib/services/student-economy/economy-ledger";

const MAX_ADJUSTMENT_ABS = 100_000;
const MAX_BULK_ADJUSTMENT_STUDENTS = 200;

type AdjustPayload = {
    studentId?: string;
    studentIds?: string[];
    scope?: "selected" | "all";
    amount?: number;
    reason?: string;
};

function normalizeStudentIds(body: AdjustPayload): string[] {
    const rawIds = [
        ...(body.studentId ? [body.studentId] : []),
        ...(Array.isArray(body.studentIds) ? body.studentIds : []),
    ];
    return Array.from(new Set(rawIds.map((id) => id.trim()).filter(Boolean)));
}

export async function POST(
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

    const body = (await req.json()) as AdjustPayload;
    const requestedStudentIds = normalizeStudentIds(body);
    const isAllStudents = body.scope === "all";
    const amount = Number(body.amount);
    const reason = body.reason?.trim();

    if (
        (!isAllStudents && requestedStudentIds.length === 0) ||
        requestedStudentIds.length > MAX_BULK_ADJUSTMENT_STUDENTS ||
        !Number.isInteger(amount) ||
        amount === 0 ||
        Math.abs(amount) > MAX_ADJUSTMENT_ABS ||
        !reason
    ) {
        return createAppErrorResponse("INVALID_PAYLOAD", "Invalid adjustment payload", 400);
    }

    try {
        const result = await db.$transaction(async (tx) => {
            const students = await tx.student.findMany({
                where: isAllStudents
                    ? { classId: id }
                    : { id: { in: requestedStudentIds }, classId: id },
                orderBy: { name: "asc" },
                select: { id: true, gold: true, name: true },
            });
            if (students.length === 0 || (!isAllStudents && students.length !== requestedStudentIds.length)) {
                throw new Error("STUDENT_NOT_FOUND");
            }
            if (students.length > MAX_BULK_ADJUSTMENT_STUDENTS) {
                throw new Error("TOO_MANY_STUDENTS");
            }

            const negativeBalanceStudent = students.find((student) => student.gold + amount < 0);
            if (negativeBalanceStudent) {
                throw new Error("NEGATIVE_BALANCE");
            }

            const operationId = `teacher-adjust:${id}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
            const updatedStudents = [];

            for (const student of students) {
                const updated = await tx.student.update({
                    where: { id: student.id },
                    data: { gold: { increment: amount } },
                    select: { id: true, gold: true, name: true },
                });

                await recordEconomyTransaction(tx, {
                    studentId: student.id,
                    classId: id,
                    type: "adjust",
                    source: "admin_adjustment",
                    amount,
                    balanceBefore: student.gold,
                    balanceAfter: updated.gold,
                    idempotencyKey: null,
                    metadata: {
                        teacherId: user.id,
                        reason,
                        operationId,
                        scope: isAllStudents ? "all" : "selected",
                        studentCount: students.length,
                    },
                });

                updatedStudents.push(updated);
            }

            return {
                operationId,
                studentCount: updatedStudents.length,
                students: updatedStudents,
            };
        });

        return NextResponse.json({
            ...result,
            student: result.students[0] ?? null,
        });
    } catch (error) {
        if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }
        if (error instanceof Error && error.message === "NEGATIVE_BALANCE") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Adjustment would make gold negative", 400);
        }
        if (error instanceof Error && error.message === "TOO_MANY_STUDENTS") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Too many students in one adjustment", 400);
        }
        throw error;
    }
}

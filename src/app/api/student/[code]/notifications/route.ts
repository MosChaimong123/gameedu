import { db } from "@/lib/db";
import { createAppErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import { NextResponse } from "next/server";
import {
    buildRateLimitKey,
    consumeRateLimit,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const normalizedCode = code.trim().toUpperCase();
    const rateLimit = consumeRateLimit({
        bucket: "student-notifications:get",
        key: buildRateLimitKey(getRequestClientIdentifier(req), normalizedCode),
        limit: 60,
        windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(normalizedCode).map((candidate) => ({ loginCode: candidate })),
            },
            select: { id: true }
        });

        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }

        const notifications = await db.notification.findMany({
            where: {
                studentId: student.id,
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 30,
        });

        return NextResponse.json(notifications);
    } catch (error) {
        console.error("GET /api/student/[code]/notifications error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const normalizedCode = code.trim().toUpperCase();
    const rateLimit = consumeRateLimit({
        bucket: "student-notifications:patch",
        key: buildRateLimitKey(getRequestClientIdentifier(req), normalizedCode),
        limit: 20,
        windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(normalizedCode).map((candidate) => ({ loginCode: candidate })),
            },
            select: { id: true }
        });

        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }

        const { id, isRead } = await req.json() as {
            id?: unknown;
            isRead?: unknown;
        };

        if (id === "all") {
            await db.notification.updateMany({
                where: { studentId: student.id, isRead: false },
                data: { isRead: true }
            });
            return NextResponse.json({ success: true });
        }

        if (typeof id !== "string" || typeof isRead !== "boolean") {
            return createAppErrorResponse("INVALID_PAYLOAD", "Invalid notification update", 400);
        }

        const notification = await db.notification.update({
            where: {
                id,
                studentId: student.id,
            },
            data: {
                isRead,
            },
        });

        return NextResponse.json(notification);
    } catch (error) {
        console.error("PATCH /api/student/[code]/notifications error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ code: string }> }
) {
    const { code } = await params;
    const normalizedCode = code.trim().toUpperCase();
    const rateLimit = consumeRateLimit({
        bucket: "student-notifications:delete",
        key: buildRateLimitKey(getRequestClientIdentifier(req), normalizedCode),
        limit: 20,
        windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(normalizedCode).map((candidate) => ({ loginCode: candidate })),
            },
            select: { id: true }
        });

        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id || id.trim().length === 0) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing id", 400);
        }

        await db.notification.delete({
            where: {
                id,
                studentId: student.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/student/[code]/notifications error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

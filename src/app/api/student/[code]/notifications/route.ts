import { createAppErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { NextResponse } from "next/server";
import {
    buildRateLimitKey,
    consumeRateLimit,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import {
    deleteStudentNotification,
    listStudentNotifications,
    updateStudentNotificationReadState,
} from "@/lib/services/student-dashboard/student-notifications";

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
        const result = await listStudentNotifications(normalizedCode);
        if (!result.ok) {
            return createAppErrorResponse(result.code, result.message, result.status);
        }

        return NextResponse.json(result.data);
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
        const { id, isRead } = await req.json() as {
            id?: unknown;
            isRead?: unknown;
        };

        const result = await updateStudentNotificationReadState(normalizedCode, { id, isRead });
        if (!result.ok) {
            return createAppErrorResponse(result.code, result.message, result.status);
        }

        return NextResponse.json(result.data);
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
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        const result = await deleteStudentNotification(normalizedCode, id);
        if (!result.ok) {
            return createAppErrorResponse(result.code, result.message, result.status);
        }

        return NextResponse.json(result.data);
    } catch (error) {
        console.error("DELETE /api/student/[code]/notifications error:", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

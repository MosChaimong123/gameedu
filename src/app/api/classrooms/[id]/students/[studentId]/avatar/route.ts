import { NextResponse } from "next/server";
import {
    createAppErrorResponse,
    AUTH_REQUIRED_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
} from "@/lib/api-error";
import { db } from "@/lib/db";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import {
    buildRateLimitKey,
    consumeRateLimit,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";

const avatarSeedPattern = /^[a-z0-9-]{1,64}$/i;

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string; studentId: string }> }
) {
    const { id, studentId } = await params;
    const rateLimit = consumeRateLimit({
        bucket: "student-avatar:patch",
        key: buildRateLimitKey(getRequestClientIdentifier(req), id, studentId),
        limit: 10,
        windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
        const { avatar, loginCode } = await req.json() as {
            avatar?: unknown;
            loginCode?: unknown;
        };
        const normalizedLoginCode = typeof loginCode === "string" ? loginCode.trim().toUpperCase() : "";

        const student = await db.student.findUnique({
            where: { id: studentId, classId: id },
            select: { loginCode: true }
        });

        if (!student || !getStudentLoginCodeVariants(normalizedLoginCode).includes(student.loginCode)) {
            return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
        }

        if (!avatar || typeof avatar !== "string" || !avatarSeedPattern.test(avatar.trim())) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Invalid avatar", 400);
        }

        const updated = await db.student.update({
            where: { id: studentId },
            data: { avatar: avatar.trim() },
            select: { id: true, avatar: true }
        });

        return NextResponse.json(updated);
    } catch (error) {
        console.error("[AVATAR_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

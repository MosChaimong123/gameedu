import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { createAppErrorResponse, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import { getStudentLoginCodeVariants } from "@/lib/student-login-code";
import {
    buildRateLimitKey,
    consumeRateLimit,
    createRateLimitResponse,
    getRequestClientIdentifier,
} from "@/lib/security/rate-limit";
import { DEFAULT_NEGAMON_SPECIES } from "@/lib/negamon-species";
import type { NegamonSettings } from "@/lib/types/negamon";
import {
    normalizeGamificationSettings,
    updateClassroomGamificationSettingsById,
} from "@/lib/services/classroom-settings/gamification-settings";

export async function POST(req: Request) {
    const rateLimit = consumeRateLimit({
        bucket: "student-negamon:select",
        key: buildRateLimitKey(getRequestClientIdentifier(req)),
        limit: 10,
        windowMs: 60_000,
    });

    if (!rateLimit.allowed) {
        return createRateLimitResponse(rateLimit.retryAfterSeconds);
    }

    try {
        const body = await req.json() as { loginCode?: unknown; speciesId?: unknown };
        const { loginCode, speciesId } = body;

        if (typeof loginCode !== "string" || !loginCode.trim()) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing loginCode", 400);
        }
        if (typeof speciesId !== "string" || !speciesId.trim()) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Missing speciesId", 400);
        }

        const normalizedCode = loginCode.trim().toUpperCase();

        const student = await db.student.findFirst({
            where: {
                OR: getStudentLoginCodeVariants(normalizedCode).map((candidate) => ({
                    loginCode: candidate,
                })),
            },
            include: { classroom: true },
        });

        if (!student) {
            return createAppErrorResponse("NOT_FOUND", "Student not found", 404);
        }

        const raw = normalizeGamificationSettings(student.classroom.gamifiedSettings);
        const negamon = (raw?.negamon ?? null) as NegamonSettings | null;

        if (!negamon?.enabled) {
            return createAppErrorResponse("NEGAMON_NOT_ENABLED", "Negamon is not enabled for this classroom", 403);
        }

        if (!negamon.allowStudentChoice) {
            return createAppErrorResponse(
                "NEGAMON_SELECTION_DISABLED",
                "Student species selection is disabled",
                403
            );
        }

        // Determine the allowed species list (empty array means all defaults are allowed)
        const allowedIds: Set<string> =
            negamon.species && negamon.species.length > 0
                ? new Set(negamon.species.map((s) => s.id))
                : new Set(DEFAULT_NEGAMON_SPECIES.map((s) => s.id));

        if (!allowedIds.has(speciesId)) {
            return createAppErrorResponse("NEGAMON_INVALID_SPECIES", "Invalid speciesId", 400);
        }

        // Update the classroom's gamifiedSettings
        const updated: Record<string, unknown> = {
            ...(raw ?? {}),
            negamon: {
                ...negamon,
                studentMonsters: {
                    ...(negamon.studentMonsters ?? {}),
                    [student.id]: speciesId,
                },
            },
        };

        await updateClassroomGamificationSettingsById(student.classId, updated);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[NEGAMON_SELECT_POST]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

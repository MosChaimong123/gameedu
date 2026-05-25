import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
    createAppErrorResponse,
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    INTERNAL_ERROR_MESSAGE,
    NOT_FOUND_MESSAGE,
} from "@/lib/api-error";
import {
    gamificationSettingsSchema,
    getGamificationSettings,
    InvalidGamificationSettingsError,
    normalizeGamificationSettings,
    sanitizeGamificationSettingsNegamon,
    updateGamificationSettings,
    updateClassroomGamificationSettingsById,
} from "@/lib/services/classroom-settings/gamification-settings";
import { getLimitsForUser, validateNegamonSpeciesForPlan } from "@/lib/plan/plan-access";
import { logAuditEvent } from "@/lib/security/audit-log";
import { readNegamonBalanceSettings } from "@/lib/negamon/teacher-balance-report";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    const { id } = await params;

    if (session.user.role === "ADMIN") {
        const row = await db.classroom.findUnique({
            where: { id },
            select: { gamifiedSettings: true },
        });
        if (!row) {
            return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
        }
        return NextResponse.json({
            gamifiedSettings: sanitizeGamificationSettingsNegamon(row.gamifiedSettings),
        });
    }

    const settings = await getGamificationSettings(id, session.user.id);
    if (!settings) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    return NextResponse.json({
        gamifiedSettings: sanitizeGamificationSettingsNegamon(settings),
    });
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    const { id } = await params;
    const isAdmin = session.user.role === "ADMIN";
    const classroom = await db.classroom.findUnique({
        where: { id },
        select: { teacherId: true, gamifiedSettings: true },
    });

    if (!classroom) {
        return createAppErrorResponse("NOT_FOUND", NOT_FOUND_MESSAGE, 404);
    }

    if (!isAdmin && classroom.teacherId !== session.user.id) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    try {
        const body = await req.json() as { gamifiedSettings?: unknown };
        const settings = body.gamifiedSettings ?? body;
        const parsed = gamificationSettingsSchema.safeParse(settings);
        if (!parsed.success) {
            return createAppErrorResponse("INVALID_PAYLOAD", "Invalid gamification settings", 400);
        }
        const negamonSpecies = parsed.data.negamon?.species;
        if (negamonSpecies?.length) {
            const user = await db.user.findUnique({
                where: { id: session.user.id },
                select: { plan: true, role: true, planStatus: true, planExpiry: true },
            });
            const limits = getLimitsForUser(
                user?.role,
                user?.plan,
                user?.planStatus,
                user?.planExpiry
            );
            const violation = validateNegamonSpeciesForPlan(limits, negamonSpecies);
            if (violation) {
                return createAppErrorResponse(
                    "PLAN_LIMIT_NEGAMON_SPECIES",
                    "Negamon species selection exceeds your plan",
                    403
                );
            }
        }
        const updated = isAdmin
            ? await updateClassroomGamificationSettingsById(id, settings)
            : await updateGamificationSettings(id, session.user.id, settings);
        const previousBalance = readNegamonBalanceSettings(classroom.gamifiedSettings);
        const nextBalance = readNegamonBalanceSettings(updated.gamifiedSettings);
        if (JSON.stringify(previousBalance) !== JSON.stringify(nextBalance)) {
            logAuditEvent({
                actorUserId: session.user.id,
                action: "classroom.negamon_balance.settings_updated",
                category: "classroom",
                targetType: "classroom",
                targetId: id,
                metadata: {
                    previousBalance,
                    nextBalance,
                },
            });
        }

        return NextResponse.json({
            gamifiedSettings: sanitizeGamificationSettingsNegamon(updated.gamifiedSettings),
        });
    } catch (error) {
        if (error instanceof InvalidGamificationSettingsError) {
            return createAppErrorResponse("INVALID_PAYLOAD", error.message, 400);
        }
        console.error("[GAMIFICATION_SETTINGS_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

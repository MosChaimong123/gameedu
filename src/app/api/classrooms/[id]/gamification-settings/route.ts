import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { createAppErrorResponse, AUTH_REQUIRED_MESSAGE, INTERNAL_ERROR_MESSAGE } from "@/lib/api-error";
import {
    gamificationSettingsSchema,
    getGamificationSettings,
    InvalidGamificationSettingsError,
    normalizeGamificationSettings,
    updateGamificationSettings,
} from "@/lib/services/classroom-settings/gamification-settings";
import { getLimitsForUser, validateNegamonSpeciesForPlan } from "@/lib/plan/plan-access";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const session = await auth();
    if (!session?.user?.id) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    const { id } = await params;
    const settings = await getGamificationSettings(id, session.user.id);
    if (!settings) {
        return createAppErrorResponse("NOT_FOUND", "Not found", 404);
    }

    return NextResponse.json({
        gamifiedSettings: normalizeGamificationSettings(settings),
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
                select: { plan: true, role: true },
            });
            const limits = getLimitsForUser(user?.role, user?.plan);
            const violation = validateNegamonSpeciesForPlan(limits, negamonSpecies);
            if (violation) {
                return createAppErrorResponse(
                    "PLAN_LIMIT_NEGAMON_SPECIES",
                    "Negamon species selection exceeds your plan",
                    403
                );
            }
        }
        const updated = await updateGamificationSettings(id, session.user.id, settings);

        return NextResponse.json({
            gamifiedSettings: normalizeGamificationSettings(updated.gamifiedSettings),
        });
    } catch (error) {
        if (error instanceof InvalidGamificationSettingsError) {
            return createAppErrorResponse("INVALID_PAYLOAD", error.message, 400);
        }
        console.error("[GAMIFICATION_SETTINGS_PATCH]", error);
        return createAppErrorResponse("INTERNAL_ERROR", INTERNAL_ERROR_MESSAGE, 500);
    }
}

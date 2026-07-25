import { NextResponse } from "next/server";
import { validateServerEnv } from "@/lib/env";
import { resolveEmailDeliveryReadiness } from "@/lib/email/email-delivery-readiness";
import { pingOperationalDb } from "@/lib/ops/mongo-admin";
import { db } from "@/lib/db";
import { isLineBotConfigured } from "@/lib/line-bot/config";
import { isR2Configured } from "@/lib/storage/r2-env";

type CheckStatus = "ok" | "configured" | "not_configured" | "invalid" | "error";

type ReadinessChecks = {
    mongodb: CheckStatus;
    prisma: CheckStatus;
    lineBot: "configured" | "not_configured";
    r2Storage: "configured" | "not_configured";
    stripe: "configured" | "not_configured";
    emailDelivery: "configured" | "not_configured" | "invalid";
};

export async function GET() {
    const emailDelivery = resolveEmailDeliveryReadiness();
    let env: ReturnType<typeof validateServerEnv>;
    try {
        env = validateServerEnv();
    } catch (error) {
        return NextResponse.json(
            {
                ok: false,
                status: "not_ready",
                checks: { emailDelivery: emailDelivery.status },
                errors: [
                    `server_env: ${error instanceof Error ? error.message : "invalid configuration"}`,
                ],
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }

    const checks: ReadinessChecks = {
        mongodb: "ok",
        prisma: "ok",
        lineBot: isLineBotConfigured() ? "configured" : "not_configured",
        r2Storage: isR2Configured() ? "configured" : "not_configured",
        stripe: env.STRIPE_SECRET_KEY ? "configured" : "not_configured",
        emailDelivery: emailDelivery.status,
    };

    const criticalErrors: string[] = [];

    // MongoDB ping
    try {
        await pingOperationalDb(env.HEALTHCHECK_DB_TIMEOUT_MS);
    } catch (error) {
        checks.mongodb = "error";
        criticalErrors.push(`mongodb: ${error instanceof Error ? error.message : "ping failed"}`);
    }

    // Prisma connection check
    try {
        await db.$connect();
    } catch (error) {
        checks.prisma = "error";
        criticalErrors.push(`prisma: ${error instanceof Error ? error.message : "connect failed"}`);
    }

    if (criticalErrors.length > 0) {
        return NextResponse.json(
            {
                ok: false,
                status: "not_ready",
                checks,
                errors: criticalErrors,
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }

    return NextResponse.json({
        ok: true,
        status: "ready",
        checks,
        timestamp: new Date().toISOString(),
    });
}

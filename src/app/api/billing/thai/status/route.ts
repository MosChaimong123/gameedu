import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAppEnv } from "@/lib/env";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";
import { resolvePublicAppOrigin } from "@/lib/billing/resolve-public-url";
import { resolveOmisePlusAmountSatang } from "@/lib/billing/omise-plus-amounts";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export const runtime = "nodejs";

/**
 * Diagnostic snapshot for Omise/Thai billing readiness on the running server.
 * Teacher/admin only; never returns secrets — only presence + non-secret hints.
 */
export async function GET() {
    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId) {
        return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }
    if (!isTeacherOrAdmin(role)) {
        return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const env = getAppEnv();
    const providerId = getThaiBillingProviderId() ?? null;
    const hasOmiseSecret = Boolean(env.OMISE_SECRET_KEY);
    const omiseSecretMode = env.OMISE_SECRET_KEY?.startsWith("skey_test_")
        ? "test"
        : env.OMISE_SECRET_KEY?.startsWith("skey_")
          ? "live"
          : null;
    const hasOmisePublicKey = Boolean(env.NEXT_PUBLIC_OMISE_PUBLIC_KEY);
    const omisePublicKeyMode = env.NEXT_PUBLIC_OMISE_PUBLIC_KEY?.startsWith("pkey_test_")
        ? "test"
        : env.NEXT_PUBLIC_OMISE_PUBLIC_KEY?.startsWith("pkey_")
          ? "live"
          : null;

    const monthlySatang = resolveOmisePlusAmountSatang("month", env);
    const yearlySatang = resolveOmisePlusAmountSatang("year", env);
    const appOrigin = resolvePublicAppOrigin();

    const ready =
        providerId === "omise" &&
        hasOmiseSecret &&
        Boolean(appOrigin) &&
        monthlySatang >= 2000 &&
        yearlySatang >= 2000;

    const issues: string[] = [];
    if (!providerId) issues.push("BILLING_THAI_PROVIDER not set");
    if (providerId && providerId !== "omise" && providerId !== "mock") {
        issues.push(`BILLING_THAI_PROVIDER="${providerId}" not implemented`);
    }
    if (providerId === "omise" && !hasOmiseSecret) issues.push("OMISE_SECRET_KEY missing");
    if (providerId === "omise" && omiseSecretMode && omisePublicKeyMode && omiseSecretMode !== omisePublicKeyMode) {
        issues.push(
            `Omise key mode mismatch: secret=${omiseSecretMode} public=${omisePublicKeyMode}`
        );
    }
    if (!appOrigin) issues.push("NEXT_PUBLIC_APP_URL / NEXTAUTH_URL not set");

    return NextResponse.json({
        ready,
        provider: providerId,
        omise: {
            hasSecretKey: hasOmiseSecret,
            secretKeyMode: omiseSecretMode,
            hasPublicKey: hasOmisePublicKey,
            publicKeyMode: omisePublicKeyMode,
            monthlySatang,
            yearlySatang,
        },
        appOrigin,
        issues,
    });
}

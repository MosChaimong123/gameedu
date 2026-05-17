import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
    AUTH_REQUIRED_MESSAGE,
    FORBIDDEN_MESSAGE,
    createAppErrorResponse,
} from "@/lib/api-error";
import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export const runtime = "nodejs";

/**
 * Diagnostic snapshot for dev mock Thai billing (BILLING_THAI_PROVIDER=mock).
 * Teacher/admin only. Production uses Stripe card + Stripe PromptPay on /dashboard/upgrade.
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

    const providerId = getThaiBillingProviderId() ?? null;
    const ready = providerId === "mock";

    const issues: string[] = [];
    if (!providerId) {
        issues.push("BILLING_THAI_PROVIDER not set (use mock for dev or none for production)");
    } else if (providerId !== "mock") {
        issues.push(`BILLING_THAI_PROVIDER="${providerId}" is not supported (only mock for dev)`);
    }

    return NextResponse.json({
        ready,
        provider: providerId,
        note: "Production PLUS checkout uses Stripe only. Set BILLING_THAI_PROVIDER=none on Render.",
        issues,
    });
}

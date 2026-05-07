import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAppEnv } from "@/lib/env";
import { OMISE_PENDING_CHARGE_COOKIE } from "@/lib/billing/omise-constants";
import { applyPlusFromPaidOmiseCharge } from "@/lib/billing/omise-entitlement";
import {
    omiseMarkChargeAsPaid,
    omiseRetrieveCharge,
} from "@/lib/billing/omise-api";
import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";
import { createAppError } from "@/lib/api-error";
import { isTeacherOrAdmin } from "@/lib/role-guards";

export const runtime = "nodejs";

/**
 * Test-mode-only convenience: flip the user's pending Omise PromptPay charge
 * to "paid" via Omise's test endpoint, then immediately reconcile and apply
 * PLUS. Saves a trip to the Omise dashboard during QA.
 *
 * Refuses unless the secret key is `skey_test_...` and the cookie-bound
 * charge belongs to the requesting user.
 */
export async function POST() {
    try {
        if (getThaiBillingProviderId() !== "omise") {
            return NextResponse.json(
                {
                    ok: false,
                    ...createAppError(
                        "BILLING_OMISE_INACTIVE",
                        "Omise is not active"
                    ),
                },
                { status: 503 }
            );
        }

        const secret = getAppEnv().OMISE_SECRET_KEY;
        if (!secret) {
            return NextResponse.json(
                {
                    ok: false,
                    ...createAppError(
                        "BILLING_OMISE_NOT_CONFIGURED",
                        "Omise not configured"
                    ),
                },
                { status: 500 }
            );
        }

        if (!secret.startsWith("skey_test_")) {
            return NextResponse.json(
                {
                    ok: false,
                    error: "mark-as-paid is only available in Omise test mode",
                },
                { status: 400 }
            );
        }

        const session = await auth();
        const userId = session?.user?.id;
        const role = session?.user?.role;
        if (!userId) {
            return NextResponse.json(
                { ok: false, error: "Unauthorized" },
                { status: 401 }
            );
        }
        if (!isTeacherOrAdmin(role)) {
            return NextResponse.json(
                { ok: false, error: "Forbidden" },
                { status: 403 }
            );
        }

        const jar = await cookies();
        const chargeId = jar.get(OMISE_PENDING_CHARGE_COOKIE)?.value?.trim();
        if (!chargeId?.startsWith("chrg_")) {
            return NextResponse.json(
                { ok: false, error: "no pending charge cookie" },
                { status: 404 }
            );
        }

        // Confirm charge belongs to this user before flipping it.
        const retrieved = await omiseRetrieveCharge(secret, chargeId);
        if (!retrieved.ok) {
            return NextResponse.json(
                { ok: false, error: retrieved.message },
                { status: 502 }
            );
        }
        const metaUser =
            retrieved.charge.metadata?.user_id ??
            retrieved.charge.metadata?.userId;
        const metaUserStr =
            typeof metaUser === "string" ? metaUser.trim() : "";
        if (metaUserStr !== userId) {
            return NextResponse.json(
                {
                    ok: false,
                    ...createAppError(
                        "BILLING_CHARGE_SESSION_MISMATCH",
                        "Charge does not belong to this session."
                    ),
                },
                { status: 403 }
            );
        }

        const marked = await omiseMarkChargeAsPaid(secret, chargeId);
        if (!marked.ok) {
            return NextResponse.json(
                { ok: false, error: marked.message },
                { status: marked.httpStatus || 502 }
            );
        }

        // Re-retrieve to get the post-mark status (Omise sometimes returns the
        // updated charge directly; this is belt-and-braces).
        const after = await omiseRetrieveCharge(secret, chargeId);
        const fresh = after.ok ? after.charge : marked.charge;

        const outcome = await applyPlusFromPaidOmiseCharge(fresh, {
            source: "reconcile",
        });

        const res = NextResponse.json({
            ok: true,
            outcome,
            chargeId,
            chargeStatus: fresh.status ?? null,
            chargePaid: fresh.paid ?? null,
        });
        if (outcome === "applied" || outcome === "duplicate") {
            res.cookies.delete(OMISE_PENDING_CHARGE_COOKIE);
        }
        return res;
    } catch (e) {
        console.error("[billing/omise/mark-as-paid]", e);
        return NextResponse.json(
            {
                ok: false,
                ...createAppError("INTERNAL_ERROR", "Internal error"),
            },
            { status: 500 }
        );
    }
}

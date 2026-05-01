import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAppEnv } from "@/lib/env";
import { OMISE_PENDING_CHARGE_COOKIE } from "@/lib/billing/omise-constants";
import { applyPlusFromPaidOmiseCharge } from "@/lib/billing/omise-entitlement";
import { omiseRetrieveCharge } from "@/lib/billing/omise-api";
import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";

export const runtime = "nodejs";

function jsonWithClearedChargeCookie(body: unknown, status = 200) {
  const res = NextResponse.json(body, { status });
  res.cookies.delete(OMISE_PENDING_CHARGE_COOKIE);
  return res;
}

/**
 * Called when the user lands on `/dashboard/upgrade?checkout=omise_return`.
 * Applies PLUS if the pending Omise charge is paid (covers local dev without a public webhook).
 */
export async function POST() {
  try {
    if (getThaiBillingProviderId() !== "omise") {
      return NextResponse.json({ ok: false, error: "Omise is not active" }, { status: 503 });
    }

    const secret = getAppEnv().OMISE_SECRET_KEY;
    if (!secret) {
      return NextResponse.json({ ok: false, error: "Omise not configured" }, { status: 500 });
    }

    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (role !== "TEACHER" && role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const jar = await cookies();
    const chargeId = jar.get(OMISE_PENDING_CHARGE_COOKIE)?.value?.trim();

    if (!chargeId?.startsWith("chrg_")) {
      return jsonWithClearedChargeCookie({
        ok: true,
        outcome: "no_pending_charge",
      });
    }

    const retrieved = await omiseRetrieveCharge(secret, chargeId);
    if (!retrieved.ok) {
      return jsonWithClearedChargeCookie(
        { ok: false, error: retrieved.message },
        502
      );
    }

    const metaUser = retrieved.charge.metadata?.user_id ?? retrieved.charge.metadata?.userId;
    const metaUserStr = typeof metaUser === "string" ? metaUser.trim() : "";
    if (metaUserStr !== userId) {
      return jsonWithClearedChargeCookie(
        { ok: false, error: "Charge does not belong to this session." },
        403
      );
    }

    try {
      const outcome = await applyPlusFromPaidOmiseCharge(retrieved.charge, {
        source: "reconcile",
      });
      return jsonWithClearedChargeCookie({ ok: true, outcome });
    } catch (e) {
      console.error("[billing/omise/reconcile] apply", e);
      return jsonWithClearedChargeCookie({ ok: false, error: "Processing failed" }, 500);
    }
  } catch (e) {
    console.error("[billing/omise/reconcile]", e);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

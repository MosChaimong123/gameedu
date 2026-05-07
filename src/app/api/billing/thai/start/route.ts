import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { OMISE_PENDING_CHARGE_COOKIE } from "@/lib/billing/omise-constants";
import { resolvePublicAppOrigin } from "@/lib/billing/resolve-public-url";
import { resolveThaiBillingAdapter } from "@/lib/billing/providers/resolve-thai-adapter";
import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";
import { getAppEnv } from "@/lib/env";
import { isTeacherOrAdmin } from "@/lib/role-guards";

const bodySchema = z.object({
  interval: z.enum(["month", "year"]).default("month"),
  paymentMethod: z
    .enum([
      "promptpay",
      "mobile_banking_scb",
      "mobile_banking_kbank",
      "mobile_banking_bay",
      "mobile_banking_bbl",
      "mobile_banking_ktb",
    ])
    .default("promptpay"),
});

export async function POST(req: Request) {
  try {
    const adapter = resolveThaiBillingAdapter();
    if (!adapter) {
      const providerId = getThaiBillingProviderId();
      const env = getAppEnv();
      console.error("[billing/thai/start] adapter unavailable", {
        BILLING_THAI_PROVIDER: providerId ?? null,
        hasOmiseSecret: Boolean(env.OMISE_SECRET_KEY),
      });
      const reason =
        providerId === "omise" && !env.OMISE_SECRET_KEY
          ? "Omise secret key not set on server (OMISE_SECRET_KEY)."
          : !providerId
            ? "BILLING_THAI_PROVIDER is not set on server."
            : `Provider \"${providerId}\" is not implemented.`;
      return createAppErrorResponse(
        "BILLING_THAI_NOT_CONFIGURED",
        reason,
        503
      );
    }

    const session = await auth();
    const userId = session?.user?.id;
    const role = session?.user?.role;

    if (!userId) {
      return createAppErrorResponse("AUTH_REQUIRED", AUTH_REQUIRED_MESSAGE, 401);
    }

    if (!isTeacherOrAdmin(role)) {
      return createAppErrorResponse("FORBIDDEN", FORBIDDEN_MESSAGE, 403);
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json ?? {});
    if (!parsed.success) {
      return createAppErrorResponse("INVALID_PAYLOAD", "Invalid payload", 400);
    }

    const interval = parsed.data.interval;
    const paymentMethod = parsed.data.paymentMethod;

    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });

    if (!dbUser) {
      return createAppErrorResponse("NOT_FOUND", "User not found", 404);
    }

    if (dbUser.plan === "PRO") {
      return createAppErrorResponse(
        "BILLING_PRO_MANAGED",
        "School Pro accounts are managed by your organization.",
        409
      );
    }

    // Use public env URL for checkout return links.
    // Request URL can be internal host on some platforms (e.g. 0.0.0.0:PORT).
    const appOrigin = resolvePublicAppOrigin();
    const result = await adapter.startPlusPurchase({
      userId,
      interval,
      appOrigin,
      paymentMethod,
    });

    if (!result.ok) {
      console.error("[billing/thai/start] adapter rejected", {
        provider: adapter.id,
        userId,
        interval,
        paymentMethod,
        appOrigin,
        message: result.message,
      });
      return createAppErrorResponse("BILLING_PROCESSING_FAILED", result.message, 500);
    }

    const res = NextResponse.json({ url: result.redirectUrl });
    if (result.pendingChargeId) {
      res.cookies.set(OMISE_PENDING_CHARGE_COOKIE, result.pendingChargeId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 3,
      });
    }
    return res;
  } catch (e) {
    console.error("[billing/thai/start]", e);
    return createAppErrorResponse("INTERNAL_ERROR", "Internal error", 500);
  }
}

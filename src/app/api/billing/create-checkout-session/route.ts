import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { getStripeCheckoutConfigured, getStripeClient, resolvePlusStripePriceId } from "@/lib/billing/stripe";
import { resolvePublicAppOrigin } from "@/lib/billing/resolve-public-url";
import { isTeacherOrAdmin } from "@/lib/role-guards";

const bodySchema = z.object({
  interval: z.enum(["month", "year"]).default("month"),
});

export async function POST(req: Request) {
  try {
    if (!getStripeCheckoutConfigured()) {
      return createAppErrorResponse("BILLING_NOT_CONFIGURED", "Billing is not configured", 503);
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
    const priceId = resolvePlusStripePriceId(interval);
    if (!priceId) {
      return createAppErrorResponse(
        "BILLING_PRICE_NOT_CONFIGURED",
        "Price not configured for interval",
        503
      );
    }

    const dbUser = await db.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        customerId: true,
        plan: true,
      },
    });

    if (!dbUser) {
      return createAppErrorResponse("NOT_FOUND", "User not found", 404);
    }

    if (dbUser.plan === "PRO") {
      return createAppErrorResponse(
        "BILLING_PRO_MANAGED",
        "School Pro accounts are managed by your organization. Contact us to change billing.",
        409
      );
    }

    const stripe = getStripeClient();
    let customerId = dbUser.customerId?.trim() ?? null;

    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email ?? undefined,
        metadata: { userId },
      });
      customerId = customer.id;
      await db.user.update({
        where: { id: userId },
        data: { customerId },
      });
    } else {
      await stripe.customers.update(customerId, {
        metadata: { userId },
      });
    }

    const origin = resolvePublicAppOrigin();

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: userId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/upgrade?checkout=success`,
      cancel_url: `${origin}/dashboard/upgrade?checkout=cancelled`,
      metadata: { userId },
      subscription_data: {
        metadata: { userId },
      },
    });

    if (!checkoutSession.url) {
      return createAppErrorResponse(
        "BILLING_CHECKOUT_CREATE_FAILED",
        "Could not create checkout session",
        500
      );
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (e) {
    console.error("[billing/create-checkout-session]", e);
    return createAppErrorResponse("INTERNAL_ERROR", "Internal error", 500);
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import {
  AUTH_REQUIRED_MESSAGE,
  FORBIDDEN_MESSAGE,
  createAppErrorResponse,
} from "@/lib/api-error";
import { ensureStripeCustomerForUser } from "@/lib/billing/ensure-stripe-customer";
import { resolvePublicAppOrigin } from "@/lib/billing/resolve-public-url";
import {
  StripePromotionCodeError,
  isStripePromotionCheckoutError,
  normalizePromotionCodeInput,
  resolveStripePromotionForPlus,
} from "@/lib/billing/resolve-stripe-promotion-code";
import {
  createPlusPromptPayCheckoutSession,
  resolvePlusAmountSatang,
} from "@/lib/billing/stripe-promptpay-checkout";
import {
  getStripeCheckoutConfigured,
  getStripeClient,
  resolvePlusStripePriceId,
} from "@/lib/billing/stripe";
import { isTeacherOrAdmin } from "@/lib/role-guards";

const bodySchema = z.object({
  interval: z.enum(["month", "year"]).default("month"),
  channel: z.enum(["card", "promptpay"]).default("card"),
  promotionCode: z.string().max(64).optional(),
});

export async function POST(req: Request) {
  let trimmedPromo: string | null = null;
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

    const { interval, channel, promotionCode } = parsed.data;
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

    const customerId = await ensureStripeCustomerForUser({
      userId,
      email: dbUser.email,
      existingCustomerId: dbUser.customerId,
    });

    trimmedPromo = normalizePromotionCodeInput(promotionCode);
    let resolvedPromo: Awaited<ReturnType<typeof resolveStripePromotionForPlus>> = null;
    if (trimmedPromo) {
      const stripe = getStripeClient();
      const baseAmountSatang = await resolvePlusAmountSatang(stripe, interval);
      try {
        resolvedPromo = await resolveStripePromotionForPlus(
          stripe,
          trimmedPromo,
          baseAmountSatang
        );
      } catch (e) {
        if (e instanceof StripePromotionCodeError) {
          return createAppErrorResponse("BILLING_PROMO_INVALID", e.message, 400);
        }
        throw e;
      }
    }

    const checkoutSession =
      channel === "promptpay"
        ? await createPlusPromptPayCheckoutSession({
            userId,
            customerId,
            interval,
            unitAmountSatang: resolvedPromo?.discountedAmountSatang,
            promotionCode: resolvedPromo?.code,
          })
        : await (async () => {
            const stripe = getStripeClient();
            const origin = resolvePublicAppOrigin();
            return stripe.checkout.sessions.create({
              mode: "subscription",
              customer: customerId,
              client_reference_id: userId,
              line_items: [{ price: priceId, quantity: 1 }],
              success_url: `${origin}/dashboard/upgrade?checkout=success`,
              cancel_url: `${origin}/dashboard/upgrade?checkout=cancelled`,
              metadata: {
                userId,
                ...(resolvedPromo?.code ? { promotionCode: resolvedPromo.code } : {}),
              },
              subscription_data: {
                metadata: { userId },
              },
              ...(resolvedPromo
                ? { discounts: [{ promotion_code: resolvedPromo.promotionCodeId }] }
                : { allow_promotion_codes: true }),
            });
          })();

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
    if (e instanceof Stripe.errors.StripeError) {
      const message = e.message ?? "Checkout failed";
      if (trimmedPromo || isStripePromotionCheckoutError(message)) {
        return createAppErrorResponse("BILLING_PROMO_INVALID", message, 400);
      }
      return createAppErrorResponse("BILLING_CHECKOUT_CREATE_FAILED", message, 502);
    }
    return createAppErrorResponse("INTERNAL_ERROR", "Internal error", 500);
  }
}

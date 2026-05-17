import type Stripe from "stripe";
import {
  getStripeClient,
  resolvePlusStripePriceId,
  type PlusBillingInterval,
} from "@/lib/billing/stripe";
import { resolvePublicAppOrigin } from "@/lib/billing/resolve-public-url";
import {
  PROMPTPAY_PASS_FALLBACK_SATANG,
  STRIPE_CHECKOUT_KIND_PROMPTPAY_PASS,
} from "@/lib/billing/stripe-promptpay-pass";

async function resolvePlusAmountSatang(
  stripe: Stripe,
  interval: PlusBillingInterval
): Promise<number> {
  const priceId = resolvePlusStripePriceId(interval);
  if (priceId) {
    try {
      const price = await stripe.prices.retrieve(priceId);
      if (typeof price.unit_amount === "number" && price.unit_amount > 0) {
        return price.unit_amount;
      }
    } catch {
      /* fall through to fallback */
    }
  }
  return PROMPTPAY_PASS_FALLBACK_SATANG[interval];
}

function productLabel(interval: PlusBillingInterval): string {
  return interval === "year"
    ? "GameEdu PLUS — Yearly (PromptPay)"
    : "GameEdu PLUS — Monthly (PromptPay)";
}

export async function createPlusPromptPayCheckoutSession(params: {
  userId: string;
  customerId: string;
  interval: PlusBillingInterval;
}): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  const origin = resolvePublicAppOrigin();
  const unitAmount = await resolvePlusAmountSatang(stripe, params.interval);

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer: params.customerId,
    client_reference_id: params.userId,
    payment_method_types: ["promptpay"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "thb",
          unit_amount: unitAmount,
          product_data: {
            name: productLabel(params.interval),
          },
        },
      },
    ],
    success_url: `${origin}/dashboard/upgrade?checkout=success`,
    cancel_url: `${origin}/dashboard/upgrade?checkout=cancelled`,
    metadata: {
      userId: params.userId,
      plusInterval: params.interval,
      checkoutKind: STRIPE_CHECKOUT_KIND_PROMPTPAY_PASS,
    },
  });
}

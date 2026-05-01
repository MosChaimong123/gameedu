import Stripe from "stripe";
import { getAppEnv } from "@/lib/env";

let stripeSingleton: Stripe | null = null;

export function getStripeCheckoutConfigured(): boolean {
  const env = getAppEnv();
  return Boolean(
    env.STRIPE_SECRET_KEY && env.STRIPE_PRICE_PLUS_MONTHLY && env.STRIPE_PRICE_PLUS_YEARLY
  );
}

export function getStripeSecretKey(): string | undefined {
  return getAppEnv().STRIPE_SECRET_KEY;
}

export function getStripeWebhookSecret(): string | undefined {
  return getAppEnv().STRIPE_WEBHOOK_SECRET;
}

export type PlusBillingInterval = "month" | "year";

export function resolvePlusStripePriceId(interval: PlusBillingInterval): string | null {
  const env = getAppEnv();
  const id = interval === "year" ? env.STRIPE_PRICE_PLUS_YEARLY : env.STRIPE_PRICE_PLUS_MONTHLY;
  return id ?? null;
}

export function getStripeClient(): Stripe {
  const secret = getStripeSecretKey();
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(secret, {
      typescript: true,
    });
  }
  return stripeSingleton;
}

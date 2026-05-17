import type { PlusBillingInterval } from "@/lib/billing/stripe";

/** Checkout Session metadata.checkoutKind for one-time PromptPay PLUS passes. */
export const STRIPE_CHECKOUT_KIND_PROMPTPAY_PASS = "promptpay_pass";

export const PROMPTPAY_PASS_FALLBACK_SATANG: Record<PlusBillingInterval, number> = {
  month: 29_000,
  year: 290_000,
};

const PASS_DAYS: Record<PlusBillingInterval, number> = {
  month: 30,
  year: 365,
};

export function computePromptPayPassExpiry(
  interval: PlusBillingInterval,
  existingExpiry: Date | null
): Date {
  const candidate = new Date();
  candidate.setDate(candidate.getDate() + PASS_DAYS[interval]);
  if (!existingExpiry) {
    return candidate;
  }
  return existingExpiry.getTime() > candidate.getTime() ? existingExpiry : candidate;
}

export function parsePlusIntervalFromMetadata(
  value: string | undefined | null
): PlusBillingInterval | null {
  if (value === "month" || value === "year") {
    return value;
  }
  return null;
}

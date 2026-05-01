import { getStripeCheckoutConfigured, getStripeClient, resolvePlusStripePriceId } from "@/lib/billing/stripe";
import type { PlusPricesFromStripe } from "@/lib/billing/plus-price-types";

/**
 * Loads PLUS list prices from Stripe using env Price IDs (source of truth for Checkout).
 */
export async function getPlusPricesFromStripe(): Promise<PlusPricesFromStripe | null> {
  if (!getStripeCheckoutConfigured()) {
    return null;
  }

  const monthlyId = resolvePlusStripePriceId("month");
  const yearlyId = resolvePlusStripePriceId("year");
  if (!monthlyId || !yearlyId) {
    return null;
  }

  try {
    const stripe = getStripeClient();
    const [monthly, yearly] = await Promise.all([
      stripe.prices.retrieve(monthlyId),
      stripe.prices.retrieve(yearlyId),
    ]);

    const currency = (monthly.currency ?? yearly.currency ?? "thb").toUpperCase();

    const toMajor = (unitAmount: number | null | undefined) => {
      if (unitAmount == null || Number.isNaN(unitAmount)) return 0;
      return unitAmount / 100;
    };

    return {
      monthlyAmount: toMajor(monthly.unit_amount),
      yearlyAmount: toMajor(yearly.unit_amount),
      currency,
    };
  } catch (e) {
    console.error("[billing/getPlusPricesFromStripe]", e);
    return null;
  }
}

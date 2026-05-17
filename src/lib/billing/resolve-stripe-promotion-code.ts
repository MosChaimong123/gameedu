import type Stripe from "stripe";

/** Stripe PromptPay minimum charge (THB satang). */
export const PROMPTPAY_MIN_UNIT_AMOUNT_SATANG = 2000;

export type ResolvedStripePromotion = {
  promotionCodeId: string;
  code: string;
  discountedAmountSatang: number;
};

export class StripePromotionCodeError extends Error {
  constructor(message = "Invalid or expired promotion code") {
    super(message);
    this.name = "StripePromotionCodeError";
  }
}

export function normalizePromotionCodeInput(raw: string | undefined | null): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  return trimmed;
}

function applyCouponToAmountSatang(baseAmountSatang: number, coupon: Stripe.Coupon): number {
  let amount = baseAmountSatang;
  if (coupon.amount_off != null && coupon.currency?.toLowerCase() === "thb") {
    amount = baseAmountSatang - coupon.amount_off;
  } else if (coupon.percent_off != null) {
    amount = Math.round((baseAmountSatang * (100 - coupon.percent_off)) / 100);
  }
  return Math.max(PROMPTPAY_MIN_UNIT_AMOUNT_SATANG, amount);
}

/**
 * Resolves a customer-facing promotion code and computes the PromptPay amount after discount.
 * Subscription checkout should pass `promotionCodeId` via Checkout `discounts` instead.
 */
export async function resolveStripePromotionForPlus(
  stripe: Stripe,
  rawCode: string | undefined | null,
  baseAmountSatang: number
): Promise<ResolvedStripePromotion | null> {
  const code = normalizePromotionCodeInput(rawCode);
  if (!code) return null;

  const list = await stripe.promotionCodes.list({
    code,
    active: true,
    limit: 1,
    expand: ["data.coupon"],
  });

  const promo = list.data[0];
  if (!promo?.id) {
    throw new StripePromotionCodeError();
  }

  const coupon = (promo as Stripe.PromotionCode & { coupon?: Stripe.Coupon | string | null })
    .coupon;
  if (!coupon || typeof coupon === "string") {
    throw new StripePromotionCodeError();
  }
  if (coupon.valid === false) {
    throw new StripePromotionCodeError();
  }

  const discountedAmountSatang = applyCouponToAmountSatang(baseAmountSatang, coupon);
  if (discountedAmountSatang >= baseAmountSatang) {
    throw new StripePromotionCodeError();
  }

  return {
    promotionCodeId: promo.id,
    code: promo.code,
    discountedAmountSatang,
  };
}

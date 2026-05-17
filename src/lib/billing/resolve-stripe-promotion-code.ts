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

function isPromotionExhausted(promo: Stripe.PromotionCode): boolean {
  if (promo.active === false) return true;
  const max = promo.max_redemptions;
  const used = promo.times_redeemed ?? 0;
  return typeof max === "number" && max > 0 && used >= max;
}

type PromotionCodeWithCoupon = Stripe.PromotionCode & {
  coupon?: string | Stripe.Coupon | null;
  promotion?: { coupon?: string | Stripe.Coupon | null } | string | null;
};

async function loadCouponForPromotionCode(
  stripe: Stripe,
  promo: Stripe.PromotionCode
): Promise<Stripe.Coupon> {
  const expanded = (await stripe.promotionCodes.retrieve(promo.id, {
    expand: ["coupon", "promotion.coupon"],
  })) as PromotionCodeWithCoupon;

  const couponRef =
    expanded.coupon ??
    (typeof expanded.promotion === "object" && expanded.promotion !== null
      ? expanded.promotion.coupon
      : undefined);

  if (!couponRef) {
    throw new StripePromotionCodeError();
  }

  const coupon =
    typeof couponRef === "string" ? await stripe.coupons.retrieve(couponRef) : couponRef;

  if (coupon.valid === false) {
    throw new StripePromotionCodeError();
  }

  return coupon;
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
  });

  let promo: Stripe.PromotionCode | undefined = list.data[0];

  if (!promo) {
    const fallbackList = await stripe.promotionCodes.list({ active: true, limit: 100 });
    const codeUpper = code.toUpperCase();
    promo = fallbackList.data.find((row) => row.code?.toUpperCase() === codeUpper);
  }

  if (!promo?.id) {
    throw new StripePromotionCodeError();
  }

  if (isPromotionExhausted(promo)) {
    throw new StripePromotionCodeError("Promotion code has been fully redeemed");
  }

  const coupon = await loadCouponForPromotionCode(stripe, promo);

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

export function isStripePromotionCheckoutError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("promotion") ||
    lower.includes("coupon") ||
    lower.includes("discount") ||
    lower.includes("does not apply")
  );
}

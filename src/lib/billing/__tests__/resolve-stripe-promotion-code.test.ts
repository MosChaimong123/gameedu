import { describe, expect, it, vi } from "vitest";
import {
  StripePromotionCodeError,
  normalizePromotionCodeInput,
} from "@/lib/billing/resolve-stripe-promotion-code";

describe("resolve-stripe-promotion-code", () => {
  it("normalizes empty promo input to null", () => {
    expect(normalizePromotionCodeInput(undefined)).toBeNull();
    expect(normalizePromotionCodeInput("   ")).toBeNull();
    expect(normalizePromotionCodeInput(" PROMO99 ")).toBe("PROMO99");
  });

  it("throws StripePromotionCodeError for missing promo in list", async () => {
    const stripe = {
      promotionCodes: {
        list: async () => ({ data: [] }),
      },
    };

    const { resolveStripePromotionForPlus } = await import(
      "@/lib/billing/resolve-stripe-promotion-code"
    );

    await expect(
      resolveStripePromotionForPlus(stripe as never, "PROMO99", 29000)
    ).rejects.toBeInstanceOf(StripePromotionCodeError);
  });

  it("applies fixed THB discount after retrieving expanded coupon", async () => {
    const retrieve = vi.fn().mockResolvedValue({
      id: "promo_1",
      code: "PROMO99",
      coupon: {
        valid: true,
        amount_off: 19100,
        currency: "thb",
      },
    });

    const stripe = {
      promotionCodes: {
        list: async () => ({
          data: [
            {
              id: "promo_1",
              code: "PROMO99",
              active: true,
              times_redeemed: 0,
              max_redemptions: 10,
            },
          ],
        }),
        retrieve,
      },
      coupons: {
        retrieve: vi.fn(),
      },
    };

    const { resolveStripePromotionForPlus } = await import(
      "@/lib/billing/resolve-stripe-promotion-code"
    );

    const result = await resolveStripePromotionForPlus(stripe as never, "PROMO99", 29000);
    expect(retrieve).toHaveBeenCalledWith("promo_1", {
      expand: ["coupon", "promotion.coupon"],
    });
    expect(result).toEqual({
      promotionCodeId: "promo_1",
      code: "PROMO99",
      discountedAmountSatang: 9900,
    });
  });

  it("rejects exhausted promotion codes", async () => {
    const stripe = {
      promotionCodes: {
        list: async () => ({
          data: [
            {
              id: "promo_1",
              code: "PROMO99",
              active: true,
              times_redeemed: 1,
              max_redemptions: 1,
            },
          ],
        }),
      },
    };

    const { resolveStripePromotionForPlus } = await import(
      "@/lib/billing/resolve-stripe-promotion-code"
    );

    await expect(
      resolveStripePromotionForPlus(stripe as never, "PROMO99", 29000)
    ).rejects.toThrow(/fully redeemed/i);
  });
});

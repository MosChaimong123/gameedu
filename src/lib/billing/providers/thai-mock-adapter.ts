import { resolvePublicAppOrigin } from "@/lib/billing/resolve-public-url";
import { BILLING_REDIRECT_URL_UNAVAILABLE } from "@/lib/billing/billing-error-keys";
import { BILLING_PROVIDER_THAI_MOCK } from "@/lib/billing/billing-providers";
import type { ThaiBillingAdapter } from "@/lib/billing/providers/types";

/**
 * Dev-only placeholder: redirects back to upgrade with query flags (no real charge).
 * Production PLUS uses Stripe card + Stripe PromptPay on /dashboard/upgrade.
 */
export const thaiMockBillingAdapter: ThaiBillingAdapter = {
  id: BILLING_PROVIDER_THAI_MOCK,

  async startPlusPurchase(input) {
    try {
      const rawOrigin = input.appOrigin?.trim().replace(/\/$/, "") || resolvePublicAppOrigin();
      const origin = rawOrigin;
      const url = new URL(`${origin}/dashboard/upgrade`);
      url.searchParams.set("checkout", "thai_mock");
      url.searchParams.set("interval", input.interval);
      return { ok: true, redirectUrl: url.toString() };
    } catch {
      return {
        ok: false,
        message: BILLING_REDIRECT_URL_UNAVAILABLE,
      };
    }
  },
};

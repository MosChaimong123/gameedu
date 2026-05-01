import { getAppEnv } from "@/lib/env";
import { omiseCreatePromptPayCharge } from "@/lib/billing/omise-api";
import { resolveOmisePlusAmountSatang } from "@/lib/billing/omise-plus-amounts";
import { BILLING_PROVIDER_OMISE } from "@/lib/billing/billing-providers";
import type { ThaiBillingAdapter } from "@/lib/billing/providers/types";

function buildReturnUri(appOrigin: string): string {
  const base = appOrigin.replace(/\/$/, "");
  return `${base}/dashboard/upgrade?checkout=omise_return`;
}

export function createOmiseBillingAdapter(secretKey: string): ThaiBillingAdapter {
  return {
    id: BILLING_PROVIDER_OMISE,

    async startPlusPurchase(input) {
      const env = getAppEnv();
      const rawOrigin = input.appOrigin?.trim().replace(/\/$/, "") || env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
      if (!rawOrigin) {
        return {
          ok: false,
          message: "Could not build return URL (set NEXT_PUBLIC_APP_URL / NEXTAUTH_URL or open the app via a normal URL).",
        };
      }

      const amountSatang = resolveOmisePlusAmountSatang(input.interval, env);

      const result = await omiseCreatePromptPayCharge({
        secretKey,
        amountSatang,
        metadata: {
          user_id: input.userId,
          interval: input.interval,
          purpose: "plus_subscription",
        },
        returnUri: buildReturnUri(rawOrigin),
      });

      if (!result.ok) {
        return result;
      }

      return {
        ok: true,
        redirectUrl: result.authorizeUri,
        pendingChargeId: result.chargeId,
      };
    },
  };
}

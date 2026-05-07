import { getAppEnv } from "@/lib/env";
import { BILLING_RETURN_URL_UNAVAILABLE } from "@/lib/billing/billing-error-keys";
import {
  omiseCreateAuthorizeUriCharge,
  type OmiseAuthorizeUriSource,
} from "@/lib/billing/omise-api";
import { resolveOmisePlusAmountSatang } from "@/lib/billing/omise-plus-amounts";
import { BILLING_PROVIDER_OMISE } from "@/lib/billing/billing-providers";
import type {
  ThaiBillingAdapter,
  ThaiPlusPaymentMethod,
} from "@/lib/billing/providers/types";

function buildReturnUri(appOrigin: string): string {
  const base = appOrigin.replace(/\/$/, "");
  return `${base}/dashboard/upgrade?checkout=omise_return`;
}

function mapPaymentMethodToOmiseSource(
  method: ThaiPlusPaymentMethod | undefined
): OmiseAuthorizeUriSource {
  switch (method) {
    case "mobile_banking_scb":
    case "mobile_banking_kbank":
    case "mobile_banking_bay":
    case "mobile_banking_bbl":
    case "mobile_banking_ktb":
      return method;
    case "promptpay":
    case undefined:
    default:
      return "promptpay";
  }
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
          message: BILLING_RETURN_URL_UNAVAILABLE,
        };
      }

      const amountSatang = resolveOmisePlusAmountSatang(input.interval, env);
      const sourceType: OmiseAuthorizeUriSource = mapPaymentMethodToOmiseSource(
        input.paymentMethod
      );

      const result = await omiseCreateAuthorizeUriCharge({
        secretKey,
        amountSatang,
        sourceType,
        metadata: {
          user_id: input.userId,
          interval: input.interval,
          purpose: "plus_subscription",
          payment_method: sourceType,
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

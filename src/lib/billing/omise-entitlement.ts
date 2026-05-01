import { addMonths, addYears } from "date-fns";
import { applyPlusPlanEntitlement } from "@/lib/billing/apply-plus-entitlement";
import { BILLING_PROVIDER_OMISE } from "@/lib/billing/billing-providers";
import type { OmiseChargeJson } from "@/lib/billing/omise-api";
import {
  claimBillingProviderEvent,
  releaseBillingProviderEvent,
} from "@/lib/billing/billing-idempotency";

export type OmiseApplyOutcome =
  | "applied"
  | "duplicate"
  | "skipped_not_paid"
  | "missing_charge_id"
  | "missing_user_metadata"
  | "user_not_found";

/**
 * Idempotency key = Omise charge id so webhook + browser reconcile cannot double-apply.
 */
export async function applyPlusFromPaidOmiseCharge(
  charge: OmiseChargeJson,
  auditExtra?: { omiseEventId?: string; source: "webhook" | "reconcile" }
): Promise<OmiseApplyOutcome> {
  const chargeId = charge.id?.trim();
  if (!chargeId) {
    return "missing_charge_id";
  }

  const paid = charge.status === "successful" || charge.paid === true;
  if (!paid) {
    return "skipped_not_paid";
  }

  const claimed = await claimBillingProviderEvent(BILLING_PROVIDER_OMISE, chargeId);
  if (!claimed) {
    return "duplicate";
  }

  const meta = charge.metadata ?? {};
  const userIdRaw = meta.user_id ?? meta.userId;
  const userId = typeof userIdRaw === "string" ? userIdRaw.trim() : "";
  const intervalRaw = meta.interval;
  const interval = intervalRaw === "year" ? "year" : "month";

  if (!userId) {
    await releaseBillingProviderEvent(BILLING_PROVIDER_OMISE, chargeId);
    return "missing_user_metadata";
  }

  const now = new Date();
  const planExpiry = interval === "month" ? addMonths(now, 1) : addYears(now, 1);

  try {
    const result = await applyPlusPlanEntitlement({
      userId,
      plan: "PLUS",
      planStatus: "ACTIVE",
      planExpiry,
      billingProvider: BILLING_PROVIDER_OMISE,
      billingExternalCustomerId: chargeId,
      auditAction:
        auditExtra?.source === "reconcile"
          ? "billing.omise.reconcile_return"
          : "billing.omise.charge_complete",
      auditMetadata: {
        chargeId,
        ...(auditExtra?.omiseEventId ? { omiseEventId: auditExtra.omiseEventId } : {}),
        source: auditExtra?.source ?? "webhook",
      },
    });

    if (result.ok === false) {
      await releaseBillingProviderEvent(BILLING_PROVIDER_OMISE, chargeId);
      return "user_not_found";
    }
  } catch (e) {
    console.error("[applyPlusFromPaidOmiseCharge]", e);
    await releaseBillingProviderEvent(BILLING_PROVIDER_OMISE, chargeId);
    throw e;
  }

  return "applied";
}

export function extractOmiseEventChargeId(data: unknown): string | null {
  if (data == null) {
    return null;
  }
  if (typeof data === "string" && data.startsWith("chrg_")) {
    return data;
  }
  if (typeof data === "object" && data !== null && "id" in data) {
    const id = (data as { id?: unknown }).id;
    return typeof id === "string" && id.startsWith("chrg_") ? id : null;
  }
  return null;
}

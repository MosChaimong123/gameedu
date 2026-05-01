import {
  claimBillingProviderEvent as claimGeneric,
  releaseBillingProviderEvent as releaseGeneric,
} from "@/lib/billing/billing-idempotency";
import { BILLING_PROVIDER_STRIPE } from "@/lib/billing/billing-providers";

/**
 * Reserves a Stripe event id before handling. Returns false if already processed.
 * Call `releaseStripeWebhookClaim` if handling throws so Stripe can retry.
 */
export async function claimStripeWebhookEvent(eventId: string): Promise<boolean> {
  return claimGeneric(BILLING_PROVIDER_STRIPE, eventId);
}

export async function releaseStripeWebhookClaim(eventId: string): Promise<void> {
  await releaseGeneric(BILLING_PROVIDER_STRIPE, eventId);
}

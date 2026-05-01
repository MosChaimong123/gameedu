import type Stripe from "stripe";
import { derivePlanFieldsFromStripeSubscription } from "@/lib/billing/subscription-mapping";
import { applyPlusPlanEntitlement } from "@/lib/billing/apply-plus-entitlement";
import { BILLING_PROVIDER_STRIPE } from "@/lib/billing/billing-providers";

export async function applyStripeSubscriptionToUser(params: {
  userId: string;
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
  auditReason: string;
}) {
  const { userId, stripeCustomerId, subscription, auditReason } = params;

  const fields = derivePlanFieldsFromStripeSubscription(subscription);

  return applyPlusPlanEntitlement({
    userId,
    plan: fields.plan,
    planStatus: fields.planStatus,
    planExpiry: fields.planExpiry,
    stripeCustomerId,
    billingProvider: BILLING_PROVIDER_STRIPE,
    billingExternalCustomerId: stripeCustomerId,
    auditAction: "billing.stripe.subscription_sync",
    auditActionUserMissing: "billing.stripe.user_missing",
    auditActionSkippedPro: "billing.stripe.skipped_pro_plan",
    auditMetadata: {
      stripeSubscriptionId: subscription.id,
      stripeCustomerId,
      reason: auditReason,
    },
  });
}

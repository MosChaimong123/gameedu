import type Stripe from "stripe";
import { db } from "@/lib/db";
import { applyPlusPlanEntitlement } from "@/lib/billing/apply-plus-entitlement";
import { BILLING_PROVIDER_STRIPE } from "@/lib/billing/billing-providers";
import {
  computePromptPayPassExpiry,
  parsePlusIntervalFromMetadata,
  STRIPE_CHECKOUT_KIND_PROMPTPAY_PASS,
} from "@/lib/billing/stripe-promptpay-pass";
import { getStripeClient } from "@/lib/billing/stripe";
import { applyStripeSubscriptionToUser } from "@/lib/billing/sync-user-plan";
import { resolveUserIdFromStripeSubscription } from "@/lib/billing/resolve-stripe-user";

async function syncSubscription(params: {
  subscription: Stripe.Subscription;
  auditReason: string;
}) {
  const { subscription, auditReason } = params;

  const userId = await resolveUserIdFromStripeSubscription(subscription);
  if (!userId) {
    return { handled: false as const, reason: "user_id_unresolved" };
  }

  const customerRef = subscription.customer;
  const customerId =
    typeof customerRef === "string"
      ? customerRef
      : customerRef && "id" in customerRef
        ? customerRef.id
        : null;

  if (!customerId) {
    return { handled: false as const, reason: "customer_missing" };
  }

  await applyStripeSubscriptionToUser({
    userId,
    stripeCustomerId: customerId,
    subscription,
    auditReason,
  });

  return { handled: true as const };
}

function resolveUserIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const fromRef =
    typeof session.client_reference_id === "string" ? session.client_reference_id.trim() : "";
  if (fromRef) {
    return fromRef;
  }
  const fromMeta = session.metadata?.userId?.trim();
  return fromMeta || null;
}

function resolveCustomerIdFromCheckoutSession(session: Stripe.Checkout.Session): string | null {
  const customerRef = session.customer;
  if (typeof customerRef === "string") {
    return customerRef;
  }
  if (customerRef && typeof customerRef === "object" && "id" in customerRef) {
    return customerRef.id;
  }
  return null;
}

export async function handleStripePromptPayCheckoutPaid(session: Stripe.Checkout.Session) {
  if (session.metadata?.checkoutKind !== STRIPE_CHECKOUT_KIND_PROMPTPAY_PASS) {
    return { handled: false as const, reason: "not_promptpay_pass" as const };
  }

  if (session.payment_status !== "paid") {
    return { handled: false as const, reason: "not_paid" as const };
  }

  const userId = resolveUserIdFromCheckoutSession(session);
  if (!userId) {
    return { handled: false as const, reason: "user_id_unresolved" as const };
  }

  const interval = parsePlusIntervalFromMetadata(session.metadata?.plusInterval);
  if (!interval) {
    return { handled: false as const, reason: "invalid_interval" as const };
  }

  const customerId = resolveCustomerIdFromCheckoutSession(session);

  const existing = await db.user.findUnique({
    where: { id: userId },
    select: { planExpiry: true },
  });

  const planExpiry = computePromptPayPassExpiry(interval, existing?.planExpiry ?? null);

  const result = await applyPlusPlanEntitlement({
    userId,
    plan: "PLUS",
    planStatus: "ACTIVE",
    planExpiry,
    stripeCustomerId: customerId ?? undefined,
    billingProvider: BILLING_PROVIDER_STRIPE,
    billingExternalCustomerId: customerId,
    auditAction: "billing.stripe.promptpay_pass",
    auditMetadata: {
      checkoutSessionId: session.id,
      plusInterval: interval,
      paymentStatus: session.payment_status,
    },
  });

  if (!result.ok) {
    return { handled: false as const, reason: result.reason };
  }

  return { handled: true as const };
}

export async function handleStripeCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode === "payment") {
    if (session.metadata?.checkoutKind === STRIPE_CHECKOUT_KIND_PROMPTPAY_PASS) {
      if (session.payment_status === "paid") {
        return handleStripePromptPayCheckoutPaid(session);
      }
      return { handled: true as const, reason: "awaiting_async_payment" as const };
    }
    return { handled: true as const };
  }

  if (session.mode !== "subscription") {
    return { handled: true as const };
  }

  const userId = resolveUserIdFromCheckoutSession(session);

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription && typeof session.subscription === "object" && "id" in session.subscription
        ? (session.subscription as Stripe.Subscription).id
        : null;

  const customerId = resolveCustomerIdFromCheckoutSession(session);

  if (!userId || !subscriptionId || !customerId) {
    return { handled: false as const, reason: "checkout_missing_refs" };
  }

  const stripe = getStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  await applyStripeSubscriptionToUser({
    userId,
    stripeCustomerId: customerId,
    subscription,
    auditReason: "checkout.session.completed",
  });

  return { handled: true as const };
}

export async function handleStripeSubscriptionUpdated(subscription: Stripe.Subscription) {
  return syncSubscription({ subscription, auditReason: "customer.subscription.updated" });
}

export async function handleStripeSubscriptionDeleted(subscription: Stripe.Subscription) {
  return syncSubscription({ subscription, auditReason: "customer.subscription.deleted" });
}

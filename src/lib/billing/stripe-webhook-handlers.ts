import type Stripe from "stripe";
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

export async function handleStripeCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== "subscription") {
    return { handled: true as const };
  }

  const userId =
    (typeof session.client_reference_id === "string" && session.client_reference_id.trim()) ||
    session.metadata?.userId?.trim();

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription && typeof session.subscription === "object" && "id" in session.subscription
        ? (session.subscription as Stripe.Subscription).id
        : null;

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer && typeof session.customer === "object" && "id" in session.customer
        ? session.customer.id
        : null;

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

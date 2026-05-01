import type Stripe from "stripe";

export type PlanFields = {
  plan: string;
  planStatus: string;
  planExpiry: Date | null;
};

/** Stripe.Subscription typings omit some API fields in certain versions; read safely at runtime. */
function subscriptionCurrentPeriodEndUnix(sub: Stripe.Subscription): number | undefined {
  const end = (sub as unknown as { current_period_end?: number }).current_period_end;
  return typeof end === "number" ? end : undefined;
}

/**
 * Maps a Stripe subscription to GameEdu plan fields. PRO (sales-led) is never set here.
 */
export function derivePlanFieldsFromStripeSubscription(sub: Stripe.Subscription): PlanFields {
  const periodEnd = subscriptionCurrentPeriodEndUnix(sub);
  const expiry = typeof periodEnd === "number" ? new Date(periodEnd * 1000) : null;

  const status = sub.status;

  if (status === "active" || status === "trialing" || status === "past_due") {
    return { plan: "PLUS", planStatus: "ACTIVE", planExpiry: expiry };
  }

  if (
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete_expired" ||
    status === "paused"
  ) {
    return { plan: "FREE", planStatus: "EXPIRED", planExpiry: expiry };
  }

  return { plan: "FREE", planStatus: "INACTIVE", planExpiry: null };
}

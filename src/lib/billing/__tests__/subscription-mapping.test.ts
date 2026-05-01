import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { derivePlanFieldsFromStripeSubscription } from "@/lib/billing/subscription-mapping";

type SubOverrides = Partial<Stripe.Subscription> & { current_period_end?: number };

function sub(overrides: SubOverrides): Stripe.Subscription {
  return {
    id: "sub_test",
    object: "subscription",
    status: "active",
    customer: "cus_test",
    items: { object: "list", data: [], has_more: false, url: "" },
    ...overrides,
  } as Stripe.Subscription;
}

describe("derivePlanFieldsFromStripeSubscription", () => {
  it("maps active subscription to PLUS ACTIVE with expiry", () => {
    const end = 1_700_000_000;
    const fields = derivePlanFieldsFromStripeSubscription(
      sub({ status: "active", current_period_end: end })
    );
    expect(fields.plan).toBe("PLUS");
    expect(fields.planStatus).toBe("ACTIVE");
    expect(fields.planExpiry?.getTime()).toBe(end * 1000);
  });

  it("maps canceled to FREE EXPIRED", () => {
    const fields = derivePlanFieldsFromStripeSubscription(sub({ status: "canceled", current_period_end: 1_700_000_000 }));
    expect(fields.plan).toBe("FREE");
    expect(fields.planStatus).toBe("EXPIRED");
  });

  it("maps incomplete to FREE INACTIVE", () => {
    const fields = derivePlanFieldsFromStripeSubscription(sub({ status: "incomplete", current_period_end: undefined }));
    expect(fields.plan).toBe("FREE");
    expect(fields.planStatus).toBe("INACTIVE");
    expect(fields.planExpiry).toBeNull();
  });
});

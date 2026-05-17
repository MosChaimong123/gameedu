import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const mockUserFindUnique = vi.fn();
const mockApplyPlusPlanEntitlement = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}));

vi.mock("@/lib/billing/apply-plus-entitlement", () => ({
  applyPlusPlanEntitlement: mockApplyPlusPlanEntitlement,
}));

function promptPaySession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  return {
    id: "cs_test",
    mode: "payment",
    payment_status: "paid",
    client_reference_id: "user-1",
    metadata: {
      userId: "user-1",
      plusInterval: "month",
      checkoutKind: "promptpay_pass",
    },
    customer: "cus_1",
    ...overrides,
  } as Stripe.Checkout.Session;
}

describe("stripe PromptPay webhook handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUserFindUnique.mockResolvedValue({ planExpiry: null });
    mockApplyPlusPlanEntitlement.mockResolvedValue({ ok: true, skipped: false });
  });

  it("grants PLUS on async_payment_succeeded when paid", async () => {
    const { handleStripePromptPayCheckoutPaid } = await import(
      "@/lib/billing/stripe-webhook-handlers"
    );

    const result = await handleStripePromptPayCheckoutPaid(promptPaySession());
    expect(result).toEqual({ handled: true });
    expect(mockApplyPlusPlanEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        plan: "PLUS",
        planStatus: "ACTIVE",
        auditAction: "billing.stripe.promptpay_pass",
      }),
    );
  });

  it("does not grant on checkout.session.completed when payment is still unpaid", async () => {
    const { handleStripeCheckoutSessionCompleted } = await import(
      "@/lib/billing/stripe-webhook-handlers"
    );

    const result = await handleStripeCheckoutSessionCompleted(
      promptPaySession({ payment_status: "unpaid" }),
    );
    expect(result).toEqual({ handled: true, reason: "awaiting_async_payment" });
    expect(mockApplyPlusPlanEntitlement).not.toHaveBeenCalled();
  });

  it("extends planExpiry to the later date when existing expiry is further out", async () => {
    const future = new Date();
    future.setDate(future.getDate() + 200);
    mockUserFindUnique.mockResolvedValue({ planExpiry: future });

    const { handleStripePromptPayCheckoutPaid } = await import(
      "@/lib/billing/stripe-webhook-handlers"
    );
    await handleStripePromptPayCheckoutPaid(promptPaySession());

    const call = mockApplyPlusPlanEntitlement.mock.calls[0]?.[0] as {
      planExpiry: Date;
    };
    expect(call.planExpiry.getTime()).toBe(future.getTime());
  });
});

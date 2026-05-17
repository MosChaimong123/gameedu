import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserUpdate = vi.fn();
const mockGetStripeCheckoutConfigured = vi.fn();
const mockGetStripeSecretKey = vi.fn();
const mockGetStripeWebhookSecret = vi.fn();
const mockResolvePlusStripePriceId = vi.fn();
const mockGetStripeClient = vi.fn();
const mockResolvePublicAppOrigin = vi.fn();
const mockClaimStripeWebhookEvent = vi.fn();
const mockReleaseStripeWebhookClaim = vi.fn();
const mockHandleStripeCheckoutSessionCompleted = vi.fn();
const mockHandleStripePromptPayCheckoutPaid = vi.fn();
const mockHandleStripeSubscriptionUpdated = vi.fn();
const mockHandleStripeSubscriptionDeleted = vi.fn();
const mockCreatePlusPromptPayCheckoutSession = vi.fn();
const mockEnsureStripeCustomerForUser = vi.fn();

vi.mock("@/auth", () => ({
  auth: mockAuth,
}));

vi.mock("@/lib/db", () => ({
  db: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));

vi.mock("@/lib/billing/stripe", () => ({
  getStripeCheckoutConfigured: mockGetStripeCheckoutConfigured,
  getStripeSecretKey: mockGetStripeSecretKey,
  getStripeWebhookSecret: mockGetStripeWebhookSecret,
  resolvePlusStripePriceId: mockResolvePlusStripePriceId,
  getStripeClient: mockGetStripeClient,
}));

vi.mock("@/lib/billing/resolve-public-url", () => ({
  resolvePublicAppOrigin: mockResolvePublicAppOrigin,
}));

vi.mock("@/lib/billing/stripe-idempotency", () => ({
  claimStripeWebhookEvent: mockClaimStripeWebhookEvent,
  releaseStripeWebhookClaim: mockReleaseStripeWebhookClaim,
}));

vi.mock("@/lib/billing/stripe-promptpay-checkout", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/stripe-promptpay-checkout")>();
  return {
    ...actual,
    createPlusPromptPayCheckoutSession: mockCreatePlusPromptPayCheckoutSession,
  };
});

vi.mock("@/lib/billing/ensure-stripe-customer", () => ({
  ensureStripeCustomerForUser: mockEnsureStripeCustomerForUser,
}));

vi.mock("@/lib/billing/stripe-webhook-handlers", () => ({
  handleStripeCheckoutSessionCompleted: mockHandleStripeCheckoutSessionCompleted,
  handleStripePromptPayCheckoutPaid: mockHandleStripePromptPayCheckoutPaid,
  handleStripeSubscriptionUpdated: mockHandleStripeSubscriptionUpdated,
  handleStripeSubscriptionDeleted: mockHandleStripeSubscriptionDeleted,
}));

function stripeClientMock(event: unknown = null) {
  return {
    customers: {
      retrieve: vi.fn(),
      create: vi.fn().mockResolvedValue({ id: "cus_new" }),
      update: vi.fn().mockResolvedValue({ id: "cus_existing" }),
    },
    prices: {
      retrieve: vi.fn().mockResolvedValue({ unit_amount: 29000 }),
    },
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.test/session" }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue(event),
    },
  };
}

describe("billing stripe routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockAuth.mockResolvedValue({ user: { id: "user-1", role: "TEACHER" } });
    mockUserFindUnique.mockResolvedValue({
      email: "teacher@example.com",
      customerId: null,
      plan: "FREE",
    });
    mockGetStripeCheckoutConfigured.mockReturnValue(true);
    mockGetStripeSecretKey.mockReturnValue("sk_test_xxx");
    mockGetStripeWebhookSecret.mockReturnValue("whsec_xxx");
    mockResolvePlusStripePriceId.mockReturnValue("price_plus_month");
    mockResolvePublicAppOrigin.mockReturnValue("https://www.teachplayedu.com");
    mockClaimStripeWebhookEvent.mockResolvedValue(true);
    mockReleaseStripeWebhookClaim.mockResolvedValue(undefined);
    mockHandleStripeCheckoutSessionCompleted.mockResolvedValue({ handled: true });
    mockHandleStripePromptPayCheckoutPaid.mockResolvedValue({ handled: true });
    mockHandleStripeSubscriptionUpdated.mockResolvedValue({ handled: true });
    mockHandleStripeSubscriptionDeleted.mockResolvedValue({ handled: true });
    mockEnsureStripeCustomerForUser.mockResolvedValue("cus_test");
    mockCreatePlusPromptPayCheckoutSession.mockResolvedValue({
      url: "https://checkout.stripe.test/promptpay",
    });
  });

  it("returns a structured 503 when Stripe checkout is not configured", async () => {
    mockGetStripeCheckoutConfigured.mockReturnValue(false);

    const { POST } = await import("@/app/api/billing/create-checkout-session/route");
    const response = await POST(
      new Request("http://localhost/api/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ interval: "month" }),
      }),
    );

    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe("BILLING_NOT_CONFIGURED");
    expect(mockAuth).not.toHaveBeenCalled();
  });

  it("rejects non-staff Stripe checkout requests", async () => {
    mockAuth.mockResolvedValue({ user: { id: "student-1", role: "STUDENT" } });

    const { POST } = await import("@/app/api/billing/create-checkout-session/route");
    const response = await POST(
      new Request("http://localhost/api/billing/create-checkout-session", {
        method: "POST",
        body: JSON.stringify({ interval: "month" }),
      }),
    );

    expect(response.status).toBe(403);
    expect(mockUserFindUnique).not.toHaveBeenCalled();
  });

  it("creates PromptPay checkout in payment mode with promptpay method", async () => {
    const { POST } = await import("@/app/api/billing/create-checkout-session/route");
    const response = await POST(
      new Request("http://localhost/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "year", channel: "promptpay" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockCreatePlusPromptPayCheckoutSession).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_test",
      interval: "year",
    });
    expect(mockGetStripeClient).not.toHaveBeenCalled();
  });

  it("creates Stripe checkout with public success and cancel URLs", async () => {
    const stripe = stripeClientMock();
    mockGetStripeClient.mockReturnValue(stripe);

    const { POST } = await import("@/app/api/billing/create-checkout-session/route");
    const response = await POST(
      new Request("http://internal-host/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "month" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        success_url: "https://www.teachplayedu.com/dashboard/upgrade?checkout=success",
        cancel_url: "https://www.teachplayedu.com/dashboard/upgrade?checkout=cancelled",
        line_items: [{ price: "price_plus_month", quantity: 1 }],
        allow_promotion_codes: true,
      }),
    );
  });

  it("applies promotion code to card checkout when provided", async () => {
    const stripe = {
      ...stripeClientMock(),
      promotionCodes: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: "promo_test",
              code: "PROMO99",
              active: true,
              times_redeemed: 0,
              max_redemptions: 10,
            },
          ],
        }),
        retrieve: vi.fn().mockResolvedValue({
          id: "promo_test",
          code: "PROMO99",
          coupon: { valid: true, amount_off: 19100, currency: "thb" },
        }),
      },
    };
    mockGetStripeClient.mockReturnValue(stripe);

    const { POST } = await import("@/app/api/billing/create-checkout-session/route");
    const response = await POST(
      new Request("http://localhost/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "month", channel: "card", promotionCode: "PROMO99" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(stripe.promotionCodes.list).toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        discounts: [{ promotion_code: "promo_test" }],
      }),
    );
  });

  it("passes discounted PromptPay amount when promotion code is valid", async () => {
    const stripe = {
      ...stripeClientMock(),
      promotionCodes: {
        list: vi.fn().mockResolvedValue({
          data: [
            {
              id: "promo_test",
              code: "PROMO99",
              active: true,
              times_redeemed: 0,
              max_redemptions: 10,
            },
          ],
        }),
        retrieve: vi.fn().mockResolvedValue({
          id: "promo_test",
          code: "PROMO99",
          coupon: { valid: true, amount_off: 19100, currency: "thb" },
        }),
      },
    };
    mockGetStripeClient.mockReturnValue(stripe);

    const { POST } = await import("@/app/api/billing/create-checkout-session/route");
    const response = await POST(
      new Request("http://localhost/api/billing/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interval: "month", channel: "promptpay", promotionCode: "PROMO99" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockCreatePlusPromptPayCheckoutSession).toHaveBeenCalledWith({
      userId: "user-1",
      customerId: "cus_test",
      interval: "month",
      unitAmountSatang: 9900,
      promotionCode: "PROMO99",
    });
  });

  it("ignores duplicate Stripe webhook events without reprocessing", async () => {
    const event = {
      id: "evt_duplicate",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription" } },
    };
    mockGetStripeClient.mockReturnValue(stripeClientMock(event));
    mockClaimStripeWebhookEvent.mockResolvedValue(false);

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true, duplicate: true });
    expect(mockHandleStripeCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  it("routes async_payment_succeeded to the PromptPay handler", async () => {
    const event = {
      id: "evt_async_pp",
      type: "checkout.session.async_payment_succeeded",
      data: {
        object: {
          mode: "payment",
          metadata: { checkoutKind: "promptpay_pass" },
        },
      },
    };
    mockGetStripeClient.mockReturnValue(stripeClientMock(event));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(200);
    expect(mockHandleStripePromptPayCheckoutPaid).toHaveBeenCalledTimes(1);
  });

  it("releases the Stripe webhook claim when handler processing fails", async () => {
    const event = {
      id: "evt_fail",
      type: "checkout.session.completed",
      data: { object: { mode: "subscription" } },
    };
    mockGetStripeClient.mockReturnValue(stripeClientMock(event));
    mockHandleStripeCheckoutSessionCompleted.mockRejectedValue(new Error("boom"));

    const { POST } = await import("@/app/api/webhooks/stripe/route");
    const response = await POST(
      new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        headers: { "stripe-signature": "sig" },
        body: "{}",
      }),
    );

    expect(response.status).toBe(500);
    expect(mockReleaseStripeWebhookClaim).toHaveBeenCalledWith("evt_fail");
  });
});

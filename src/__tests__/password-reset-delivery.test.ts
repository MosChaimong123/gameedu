import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEventCreate = vi.fn();
const mockEventUpdate = vi.fn();
const mockEventDeleteMany = vi.fn();
const mockCodeFindFirst = vi.fn();
const mockCodeUpdate = vi.fn();
const mockCodeCount = vi.fn();
const mockLogAuditEvent = vi.fn();
const mockCaptureMessage = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    emailDeliveryWebhookEvent: {
      create: mockEventCreate,
      update: mockEventUpdate,
      deleteMany: mockEventDeleteMany,
    },
    emailVerificationCode: {
      findFirst: mockCodeFindFirst,
      update: mockCodeUpdate,
      count: mockCodeCount,
    },
  },
}));
vi.mock("@/lib/security/audit-log", () => ({ logAuditEvent: mockLogAuditEvent }));
vi.mock("@sentry/nextjs", () => ({ captureMessage: mockCaptureMessage }));

function event(type: string) {
  return {
    type,
    created_at: "2026-07-14T00:00:00.000Z",
    data: {
      email_id: "email-123",
      created_at: "2026-07-14T00:00:00.000Z",
      from: "notify@example.com",
      to: ["alice@example.com"],
      subject: "Reset",
    },
  } as never;
}

describe("password reset delivery processing", () => {
  afterEach(() => vi.unstubAllEnvs());

  beforeEach(() => {
    vi.clearAllMocks();
    mockEventCreate.mockResolvedValue({});
    mockEventUpdate.mockResolvedValue({});
    mockEventDeleteMany.mockResolvedValue({ count: 1 });
    mockCodeUpdate.mockResolvedValue({});
    mockCodeCount.mockResolvedValue(0);
    mockCodeFindFirst.mockResolvedValue({
      id: "code-1",
      userId: "user-1",
      referenceCode: "TP-AB12",
      deliveryStatus: "ACCEPTED",
    });
  });

  it("persists a delivered state and emits a PII-free audit event", async () => {
    const { processResendPasswordResetEvent } = await import("@/lib/email/password-reset-delivery");
    const result = await processResendPasswordResetEvent(event("email.delivered"), "evt-1");

    expect(result).toEqual({ matched: true, status: "DELIVERED" });
    expect(mockCodeUpdate).toHaveBeenCalledWith({
      where: { id: "code-1" },
      data: { deliveryStatus: "DELIVERED", deliveryUpdatedAt: expect.any(Date) },
    });
    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.password_reset.delivered",
      metadata: { provider: "resend", referenceCode: "TP-AB12" },
    }));
  });

  it("treats a duplicate provider event id as already received", async () => {
    mockEventCreate.mockRejectedValue({ code: "P2002" });
    const { processResendPasswordResetEvent } = await import("@/lib/email/password-reset-delivery");
    await expect(processResendPasswordResetEvent(event("email.delivered"), "evt-1"))
      .resolves.toEqual({ duplicate: true });
    expect(mockCodeFindFirst).not.toHaveBeenCalled();
  });

  it("alerts when terminal failures exceed the configured threshold", async () => {
    vi.stubEnv("PASSWORD_RESET_DELIVERY_ALERT_MIN_SAMPLE", "10");
    vi.stubEnv("PASSWORD_RESET_DELIVERY_ALERT_FAILURE_PERCENT", "20");
    mockCodeCount.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
    const { processResendPasswordResetEvent } = await import("@/lib/email/password-reset-delivery");
    await processResendPasswordResetEvent(event("email.suppressed"), "evt-2");

    expect(mockLogAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      action: "auth.password_reset.delivery_alert",
      metadata: expect.objectContaining({ acceptedCount: 10, failureCount: 3, failureRatePercent: 30 }),
    }));
    expect(mockCaptureMessage).toHaveBeenCalledTimes(1);
  });

  it("does not regress a delivered message to accepted on an out-of-order event", async () => {
    mockCodeFindFirst.mockResolvedValue({
      id: "code-1",
      userId: "user-1",
      referenceCode: "TP-AB12",
      deliveryStatus: "DELIVERED",
    });
    const { processResendPasswordResetEvent } = await import("@/lib/email/password-reset-delivery");
    await processResendPasswordResetEvent(event("email.sent"), "evt-3");
    expect(mockCodeUpdate).not.toHaveBeenCalled();
  });
});

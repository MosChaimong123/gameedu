import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = { send: mockSend };
  },
}));

describe("sendPasswordResetEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.teachplayedu.com");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "whsec_test");
    vi.stubEnv("EMAIL_FROM", "TeachPlayEdu <notify@teachplayedu.com>");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("returns the provider message id after Resend accepts the email", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).resolves.toEqual({ sent: true, messageId: "email-123" });
  });

  it("rejects provider responses that omit the message id", async () => {
    mockSend.mockResolvedValue({ data: null, error: null });
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("RESEND_MESSAGE_ID_MISSING");
  });

  it("maps a Resend rejection to a sender failure", async () => {
    mockSend.mockResolvedValue({ data: null, error: { message: "provider rejected" } });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("provider rejected");
  });

  it("rejects a missing production sender before calling Resend", async () => {
    vi.stubEnv("EMAIL_FROM", "");
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("EMAIL_DELIVERY_NOT_READY:missing_from");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects a missing production API key before calling Resend", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("EMAIL_DELIVERY_NOT_READY:missing_api_key");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects a missing production webhook secret before calling Resend", async () => {
    vi.stubEnv("RESEND_WEBHOOK_SECRET", "");
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("EMAIL_DELIVERY_NOT_READY:missing_webhook_secret");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects the Resend test sender domain in production", async () => {
    vi.stubEnv("EMAIL_FROM", "TeachPlayEdu <onboarding@resend.dev>");
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("EMAIL_DELIVERY_NOT_READY:test_sender_domain");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects a missing production public URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("AUTH_URL", "");
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("EMAIL_DELIVERY_NOT_READY:missing_public_url");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("rejects an invalid production public URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "not-a-url");
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await expect(
      sendPasswordResetEmail("alice@example.com", "123456", 15, "TP-AB12")
    ).rejects.toThrow("EMAIL_DELIVERY_NOT_READY:invalid_public_url");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does not write the OTP to production logs", async () => {
    mockSend.mockResolvedValue({ data: { id: "email-123" }, error: null });
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { sendPasswordResetEmail } = await import("@/lib/email/send-password-reset-email");

    await sendPasswordResetEmail("alice@example.com", "654321", 15, "TP-AB12");
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain("654321");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("654321");
  });
});

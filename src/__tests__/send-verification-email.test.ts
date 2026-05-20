import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendVerificationCodeEmail } from "@/lib/email/send-verification-email";

describe("sendVerificationCodeEmail", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("falls back to localhost and returns an unsent dev result without email provider config", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("NEXTAUTH_URL", "");
    vi.stubEnv("AUTH_URL", "");
    vi.stubEnv("RESEND_API_KEY", "");

    await expect(
      sendVerificationCodeEmail("alice@example.com", "123456", 15, "TP-NBA6")
    ).resolves.toEqual({ sent: false });
  });
});

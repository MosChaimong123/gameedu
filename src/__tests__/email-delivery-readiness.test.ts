import { describe, expect, it } from "vitest";
import { resolveEmailDeliveryReadiness } from "@/lib/email/email-delivery-readiness";
import { validateServerEnv } from "@/lib/env";

function productionEnv(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "production",
    DATABASE_URL: "mongodb://localhost:27017/gamedu",
    AUTH_SECRET: "test-secret",
    NEXT_PUBLIC_APP_URL: "https://www.teachplayedu.com",
    RESEND_API_KEY: "re_test_key",
    EMAIL_FROM: "TeachPlayEdu <notify@teachplayedu.com>",
    EMAIL_VERIFICATION_PEPPER: "test-email-verification-pepper-32-chars",
    ...overrides,
  };
}

describe("email delivery readiness", () => {
  it("accepts a verified-domain-shaped production sender configuration", () => {
    expect(resolveEmailDeliveryReadiness(productionEnv())).toEqual({ status: "configured" });
    expect(() => validateServerEnv(productionEnv())).not.toThrow();
  });

  it("reports missing API key without exposing configuration values", () => {
    expect(resolveEmailDeliveryReadiness(productionEnv({ RESEND_API_KEY: "" }))).toEqual({
      status: "not_configured",
      reason: "missing_api_key",
    });
  });

  it("requires a dedicated sufficiently long OTP pepper in production", () => {
    expect(() => validateServerEnv(productionEnv({ EMAIL_VERIFICATION_PEPPER: "" }))).toThrow(
      "productionEmailVerificationPepperRequired"
    );
    expect(() => validateServerEnv(productionEnv({ EMAIL_VERIFICATION_PEPPER: "too-short" }))).toThrow(
      "productionEmailVerificationPepperRequired"
    );
  });

  it("rejects a missing production sender", () => {
    expect(resolveEmailDeliveryReadiness(productionEnv({ EMAIL_FROM: "" }))).toEqual({
      status: "not_configured",
      reason: "missing_from",
    });
  });

  it("rejects the Resend testing sender domain in production readiness", () => {
    const env = productionEnv({ EMAIL_FROM: "TeachPlayEdu <onboarding@resend.dev>" });

    expect(resolveEmailDeliveryReadiness(env)).toEqual({
      status: "invalid",
      reason: "test_sender_domain",
    });
    expect(() => validateServerEnv(env)).toThrow("productionEmailDelivery:test_sender_domain");
  });

  it("requires a public HTTPS non-local origin in production", () => {
    expect(
      resolveEmailDeliveryReadiness(productionEnv({ NEXT_PUBLIC_APP_URL: "http://localhost:3000" }))
    ).toEqual({ status: "invalid", reason: "public_url_must_use_https" });

    expect(
      resolveEmailDeliveryReadiness(productionEnv({ NEXT_PUBLIC_APP_URL: "https://localhost:3000" }))
    ).toEqual({ status: "invalid", reason: "public_url_must_not_be_local" });
  });

  it("keeps missing email configuration non-fatal outside production", () => {
    const env = {
      NODE_ENV: "development",
      DATABASE_URL: "mongodb://localhost:27017/gamedu",
      AUTH_SECRET: "test-secret",
      NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    } as NodeJS.ProcessEnv;

    expect(resolveEmailDeliveryReadiness(env)).toEqual({
      status: "not_configured",
      reason: "missing_api_key",
    });
    expect(() => validateServerEnv(env)).not.toThrow();
  });
});

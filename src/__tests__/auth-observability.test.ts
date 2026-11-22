import { describe, expect, it } from "vitest";
import { evaluateAuthSecurityAlerts, type AuthSecurityMetrics } from "@/lib/security/auth-observability";

function metrics(overrides: Partial<AuthSecurityMetrics> = {}): AuthSecurityMetrics {
  return {
    signInSuccess: 0,
    signInFailure: 0,
    signInRateLimited: 0,
    verificationCompleted: 0,
    verificationFailure: 0,
    passwordResetCompleted: 0,
    providerFailure: 0,
    mfaChallengeSuccess: 0,
    mfaChallengeFailure: 0,
    sessionRevoke: 0,
    deliverySuppression: 0,
    adminMfaBypassAttempt: 0,
    ...overrides,
  };
}

describe("auth security observability", () => {
  it("raises each documented alert at its configured threshold", () => {
    const alerts = evaluateAuthSecurityAlerts(metrics({
      signInFailure: 2,
      signInRateLimited: 1,
      verificationFailure: 2,
      providerFailure: 2,
      deliverySuppression: 1,
      adminMfaBypassAttempt: 1,
    }), {
      AUTH_ALERT_BRUTE_FORCE_THRESHOLD: "3",
      AUTH_ALERT_VERIFICATION_FAILURE_THRESHOLD: "2",
      AUTH_ALERT_OAUTH_FAILURE_THRESHOLD: "2",
      AUTH_ALERT_DELIVERY_SUPPRESSION_THRESHOLD: "1",
      AUTH_ALERT_ADMIN_MFA_BYPASS_THRESHOLD: "1",
    } as NodeJS.ProcessEnv);

    expect(alerts.map((alert) => alert.code)).toEqual([
      "BRUTE_FORCE_SPIKE",
      "VERIFICATION_FAILURE_SPIKE",
      "OAUTH_FAILURE_SPIKE",
      "DELIVERY_SUPPRESSION",
      "ADMIN_MFA_BYPASS_ATTEMPT",
    ]);
  });

  it("does not alert below thresholds", () => {
    expect(evaluateAuthSecurityAlerts(metrics({ signInFailure: 24 }), {} as NodeJS.ProcessEnv)).toEqual([]);
  });
});

import { getAuditLogCollection } from "@/lib/ops/mongo-admin";

export type AuthSecurityMetrics = {
  signInSuccess: number;
  signInFailure: number;
  signInRateLimited: number;
  verificationCompleted: number;
  verificationFailure: number;
  passwordResetCompleted: number;
  providerFailure: number;
  mfaChallengeSuccess: number;
  mfaChallengeFailure: number;
  sessionRevoke: number;
  deliverySuppression: number;
  adminMfaBypassAttempt: number;
};

export type AuthSecurityAlert = {
  code: "BRUTE_FORCE_SPIKE" | "VERIFICATION_FAILURE_SPIKE" | "OAUTH_FAILURE_SPIKE" | "DELIVERY_SUPPRESSION" | "ADMIN_MFA_BYPASS_ATTEMPT";
  count: number;
  threshold: number;
};

const actionGroups: Record<keyof AuthSecurityMetrics, string[]> = {
  signInSuccess: ["auth.login.succeeded", "auth.login.new_device"],
  signInFailure: ["auth.login.failed"],
  signInRateLimited: ["auth.login.rate_limited"],
  verificationCompleted: ["auth.verification.completed"],
  verificationFailure: ["auth.resend_verification.failed"],
  passwordResetCompleted: ["auth.password_reset.completed"],
  providerFailure: ["auth.oauth.failed", "auth.provider.failed"],
  mfaChallengeSuccess: ["auth.mfa.challenge_succeeded"],
  mfaChallengeFailure: ["auth.mfa.challenge_failed", "auth.mfa.challenge_rate_limited"],
  sessionRevoke: ["auth.session.revoked", "auth.session.others_revoked", "auth.password_reset.sessions_revoked"],
  deliverySuppression: ["auth.password_reset.delivery_failed", "auth.resend_verification.failed"],
  adminMfaBypassAttempt: ["auth.admin_mfa_reset.denied"],
};

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function collectAuthSecurityMetrics(windowMinutes = 15, now = new Date()): Promise<AuthSecurityMetrics> {
  const normalizedWindow = Math.max(1, Math.min(windowMinutes, 24 * 60));
  const since = new Date(now.getTime() - normalizedWindow * 60_000);
  const collection = await getAuditLogCollection();
  const entries = await Promise.all(Object.entries(actionGroups).map(async ([key, actions]) => [
    key,
    await collection.countDocuments({ timestamp: { $gte: since }, action: { $in: actions } }),
  ]));
  return Object.fromEntries(entries) as AuthSecurityMetrics;
}

export function evaluateAuthSecurityAlerts(metrics: AuthSecurityMetrics, env: NodeJS.ProcessEnv = process.env): AuthSecurityAlert[] {
  const rules: Array<[AuthSecurityAlert["code"], number, number]> = [
    ["BRUTE_FORCE_SPIKE", metrics.signInFailure + metrics.signInRateLimited, positiveInteger(env.AUTH_ALERT_BRUTE_FORCE_THRESHOLD, 25)],
    ["VERIFICATION_FAILURE_SPIKE", metrics.verificationFailure, positiveInteger(env.AUTH_ALERT_VERIFICATION_FAILURE_THRESHOLD, 10)],
    ["OAUTH_FAILURE_SPIKE", metrics.providerFailure, positiveInteger(env.AUTH_ALERT_OAUTH_FAILURE_THRESHOLD, 5)],
    ["DELIVERY_SUPPRESSION", metrics.deliverySuppression, positiveInteger(env.AUTH_ALERT_DELIVERY_SUPPRESSION_THRESHOLD, 1)],
    ["ADMIN_MFA_BYPASS_ATTEMPT", metrics.adminMfaBypassAttempt, positiveInteger(env.AUTH_ALERT_ADMIN_MFA_BYPASS_THRESHOLD, 1)],
  ];
  return rules.filter(([, count, threshold]) => count >= threshold).map(([code, count, threshold]) => ({ code, count, threshold }));
}

export async function getAuthSecurityObservability(windowMinutes = 15) {
  const metrics = await collectAuthSecurityMetrics(windowMinutes);
  const alerts = evaluateAuthSecurityAlerts(metrics);
  return { generatedAt: new Date().toISOString(), windowMinutes, status: alerts.length > 0 ? "attention" : "ok", metrics, alerts };
}

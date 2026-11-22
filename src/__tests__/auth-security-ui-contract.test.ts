import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { translations } from "@/lib/translations";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("auth security UI contract", () => {
  it("exposes password-manager autocomplete and an accessible password visibility control", () => {
    const login = source("src/app/login/login-form.tsx");
    expect(login).toContain('autoComplete="username webauthn"');
    expect(login).toContain('autoComplete="current-password"');
    expect(login).toContain('aria-label={t(showPassword ? "loginHidePassword" : "loginShowPassword")}');
    expect(login).toContain('<form method="post" onSubmit={form.handleSubmit(onSubmit)}');
    expect(login).not.toContain('<form method="get"');
  });

  it("supports OTP paste/autofill and localized live error announcements", () => {
    for (const file of ["src/components/auth/mfa-challenge.tsx", "src/components/auth/mfa-setup.tsx"]) {
      const content = source(file);
      expect(content).toContain('autoComplete="one-time-code"');
      expect(content).toContain('role="alert"');
      expect(content).toContain('aria-live="assertive"');
    }
  });

  it("labels local email verification as development mode instead of claiming delivery", () => {
    const verification = source("src/components/auth/verify-email-code-form.tsx");
    expect(verification).toContain("verifyEmailCodeDevNotice");
    expect(verification).toContain("verifyEmailCodeDevReady");
    expect(verification).toContain("setCode(localCode)");
  });

  it("only offers MFA passkey verification for an enrolled account and localizes WebAuthn failures", () => {
    const challenge = source("src/components/auth/mfa-challenge.tsx");
    const login = source("src/app/login/login-form.tsx");
    expect(challenge).toContain("hasPasskey ?");
    expect(challenge).toContain("getPasskeyErrorTranslationKey");
    expect(login).toContain("getPasskeyErrorTranslationKey");
    expect(login).toContain('t("loginPasskeyHelp")');
  });

  it("renders MFA enrollment as a responsive, keyboard-friendly three-step flow", () => {
    const setup = source("src/components/auth/mfa-setup.tsx");
    const page = source("src/app/auth/mfa/setup/page.tsx");

    expect(page).toContain('className="min-h-[100dvh] bg-slate-50"');
    expect(page).not.toContain("max-w-lg");
    expect(setup).toContain('data-testid="mfa-setup-shell"');
    expect(setup).toContain("lg:grid-cols-");
    expect(setup).toContain("<form onSubmit={begin}");
    expect(setup).toContain("<form onSubmit={activate}");
    expect(setup).toContain('aria-current={active ? "step" : undefined}');
    expect(setup).toContain('type={showPassword ? "text" : "password"}');
    expect(setup).toContain('autoComplete="current-password"');
    expect(setup).toContain("required={requiresPassword}");
    expect(setup).toContain("getLocalizedErrorMessageFromResponse");
    expect(page).toContain("hasRecentStrongAuthentication(session)");
    expect(setup).toContain('autoComplete="one-time-code"');
    expect(setup).toContain("navigator.clipboard.writeText");
    expect(setup).toContain("disabled={!recoveryConfirmed}");
  });

  it.each(["en", "th"] as const)("provides complete %s MFA setup copy", (language) => {
    const copy = translations[language];
    const keys = [
      "mfaSecurityWorkspace",
      "mfaProtectedBadge",
      "mfaSetupSecuritySummary",
      "mfaSetupProgressLabel",
      "mfaStepVerifyTitle",
      "mfaStepScanTitle",
      "mfaStepRecoveryTitle",
      "mfaVerifyIdentityTitle",
      "mfaScanAuthenticatorTitle",
      "mfaManualKeyLabel",
      "mfaActivationHelp",
      "mfaRecoveryConfirm",
      "mfaSignOutAction",
    ] as const;

    for (const key of keys) expect(copy[key]).toBeTruthy();
  });
});

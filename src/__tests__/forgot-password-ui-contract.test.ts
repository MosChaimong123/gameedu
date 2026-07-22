import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { translations } from "@/lib/translations";

const resetFormSource = readFileSync(
  new URL("../app/forgot-password/reset/reset-password-form.tsx", import.meta.url),
  "utf8"
);

describe("forgot password neutral UI copy", () => {
  it.each(["en", "th"] as const)("keeps %s confirmation conditional and exposes recovery actions", (language) => {
    const copy = translations[language];

    expect(copy.forgotPasswordAcceptedBody).toContain(language === "th" ? "หาก" : "If");
    expect(copy.forgotPasswordOpenOtp).toBeTruthy();
    expect(copy.forgotPasswordResend).toBeTruthy();
    expect(copy.forgotPasswordUseAnother).toBeTruthy();
    expect(copy.forgotPasswordBackToLogin).toBeTruthy();
    expect(copy.forgotPasswordGoogleAction).toBeTruthy();
  });

  it.each(["en", "th"] as const)("provides complete %s reset-password copy", (language) => {
    const copy = translations[language];
    const keys = [
      "resetPasswordTitle",
      "resetPasswordSubtitle",
      "resetPasswordOtpLabel",
      "resetPasswordReferenceLabel",
      "resetPasswordNewPasswordLabel",
      "resetPasswordConfirmPasswordLabel",
      "resetPasswordShowPassword",
      "resetPasswordHidePassword",
      "resetPasswordResend",
      "resetPasswordRequestFailed",
      "resetPasswordSubmit",
    ] as const;

    for (const key of keys) expect(copy[key]).toBeTruthy();
  });

  it("keeps OTP and new-password fields compatible with paste and password managers", () => {
    expect(resetFormSource).toContain('autoComplete="one-time-code"');
    expect(resetFormSource.match(/autoComplete="new-password"/g)).toHaveLength(2);
    expect(resetFormSource).toContain('inputMode="numeric"');
    expect(resetFormSource).toContain('aria-label={showPassword ? t("resetPasswordHidePassword")');
  });
});

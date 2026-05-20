function envEnabled(...names: string[]): boolean {
  for (const name of names) {
    const value = process.env[name]?.trim().toLowerCase();
    if (value === "1" || value === "true" || value === "yes" || value === "on") {
      return true;
    }
  }
  return false;
}

/** Public self-service signup (POST /api/register, signup wizard). */
export function isPublicSignupEnabled(): boolean {
  if (envEnabled("ENABLE_PUBLIC_SIGNUP")) return true;
  if (envEnabled("DISABLE_PUBLIC_SIGNUP")) return false;
  return true;
}

/** Require verified email before credentials login. */
export function isEmailVerificationRequired(): boolean {
  if (envEnabled("SKIP_EMAIL_VERIFICATION", "DISABLE_EMAIL_VERIFICATION")) return false;
  if (envEnabled("REQUIRE_EMAIL_VERIFICATION")) return true;
  return true;
}

export function isEmailVerificationApiEnabled(): boolean {
  return isEmailVerificationRequired();
}

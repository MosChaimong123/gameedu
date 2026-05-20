function clientFlagEnabled(...names: string[]): boolean {
  for (const name of names) {
    const value = process.env[name]?.trim().toLowerCase();
    if (value === "1" || value === "true" || value === "yes" || value === "on") {
      return true;
    }
  }
  return false;
}

export function isPublicSignupEnabledClient(): boolean {
  if (clientFlagEnabled("NEXT_PUBLIC_ENABLE_PUBLIC_SIGNUP")) return true;
  if (clientFlagEnabled("NEXT_PUBLIC_DISABLE_PUBLIC_SIGNUP")) return false;
  return true;
}

export function isEmailVerificationUiEnabledClient(): boolean {
  if (clientFlagEnabled("NEXT_PUBLIC_SKIP_EMAIL_VERIFICATION")) return false;
  if (clientFlagEnabled("NEXT_PUBLIC_DISABLE_EMAIL_VERIFICATION")) return false;
  return true;
}

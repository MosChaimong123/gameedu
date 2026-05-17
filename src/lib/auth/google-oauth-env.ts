/**
 * Runtime Google OAuth env checks (read at request time, not build time).
 * Shared by NextAuth setup and /api/auth/providers-status.
 */
export function isGoogleOAuthConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  const googleClientId =
    env.GOOGLE_CLIENT_ID?.trim() || env.AUTH_GOOGLE_ID?.trim();
  const googleClientSecret =
    env.GOOGLE_CLIENT_SECRET?.trim() || env.AUTH_GOOGLE_SECRET?.trim();
  return Boolean(googleClientId && googleClientSecret);
}

/** Non-secret flags for ops smoke checks (Render env verification). */
export function getAuthEnvDiagnostics(env: NodeJS.ProcessEnv = process.env) {
  const nextAuthUrl = env.NEXTAUTH_URL?.trim() ?? "";
  let nextAuthUrlValid = false;
  if (nextAuthUrl) {
    try {
      const u = new URL(nextAuthUrl);
      nextAuthUrlValid = u.protocol === "https:" || u.protocol === "http:";
    } catch {
      nextAuthUrlValid = false;
    }
  }

  return {
    hasAuthSecret: Boolean(env.AUTH_SECRET?.trim() || env.NEXTAUTH_SECRET?.trim()),
    hasNextAuthUrl: Boolean(nextAuthUrl),
    nextAuthUrlValid,
    hasPublicAppUrl: Boolean(env.NEXT_PUBLIC_APP_URL?.trim()),
    googleOAuthConfigured: isGoogleOAuthConfigured(env),
  };
}

import { getAppEnv } from "@/lib/env";

/** Origin from the incoming request (matches user’s browser host: `127.0.0.1` vs `localhost`). */
export function resolveRequestOriginFromUrl(requestUrl: string): string {
  return new URL(requestUrl).origin;
}

/**
 * Base URL for redirects (checkout success/cancel). No trailing slash.
 */
export function resolvePublicAppOrigin(): string {
  const env = getAppEnv();
  const raw = env.NEXT_PUBLIC_APP_URL ?? env.NEXTAUTH_URL;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_APP_URL or NEXTAUTH_URL is required for billing redirects");
  }
  return raw.replace(/\/$/, "");
}

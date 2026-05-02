import { getAppEnv } from "@/lib/env";
import { BILLING_PUBLIC_URL_REQUIRED } from "@/lib/billing/billing-error-keys";

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
    throw new Error(BILLING_PUBLIC_URL_REQUIRED);
  }
  return raw.replace(/\/$/, "");
}

import { createHmac, timingSafeEqual } from "node:crypto";

export const PROVIDER_LINK_INTENT_COOKIE = "gamedu_provider_link_intent";
export const PROVIDER_LINK_INTENT_MAX_AGE_SECONDS = 300;

type ProviderLinkIntent = { userId: string; provider: "google"; exp: number };

export function encodeProviderLinkIntent(userId: string, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    userId,
    provider: "google",
    exp: Math.floor(Date.now() / 1000) + PROVIDER_LINK_INTENT_MAX_AGE_SECONDS,
  } satisfies ProviderLinkIntent)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function decodeProviderLinkIntent(value: string, secret: string): ProviderLinkIntent | null {
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ProviderLinkIntent;
    if (!decoded.userId || decoded.provider !== "google" || decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

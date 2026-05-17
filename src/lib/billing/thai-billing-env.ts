import { getAppEnv } from "@/lib/env";

/** Active Thai billing adapter id (undefined = disabled). */
export function getThaiBillingProviderId(): string | undefined {
  const raw = getAppEnv().BILLING_THAI_PROVIDER?.toLowerCase().trim();
  if (!raw || raw === "none") return undefined;
  return raw;
}

/** Dev-only: mock Thai billing UI (never shown on production — use Stripe). */
export function isThaiBillingUiEnabled(): boolean {
  return getThaiBillingProviderId() === "mock";
}

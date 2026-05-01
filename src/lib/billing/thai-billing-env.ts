import { getAppEnv } from "@/lib/env";

/** Active Thai billing adapter id (undefined = disabled). */
export function getThaiBillingProviderId(): string | undefined {
  const raw = getAppEnv().BILLING_THAI_PROVIDER?.toLowerCase().trim();
  if (!raw || raw === "none") return undefined;
  return raw;
}

/** Show Thai/local bank payment option on upgrade page (mock or future PSP). */
export function isThaiBillingUiEnabled(): boolean {
  return Boolean(getThaiBillingProviderId());
}

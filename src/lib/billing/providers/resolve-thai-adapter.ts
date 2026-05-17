import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";
import { thaiMockBillingAdapter } from "@/lib/billing/providers/thai-mock-adapter";
import type { ThaiBillingAdapter } from "@/lib/billing/providers/types";

/** Returns adapter for POST /api/billing/thai/start or null if disabled (dev mock only). */
export function resolveThaiBillingAdapter(): ThaiBillingAdapter | null {
  const id = getThaiBillingProviderId();
  if (id === "mock") {
    return thaiMockBillingAdapter;
  }
  return null;
}

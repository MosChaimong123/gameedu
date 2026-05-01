import { getAppEnv } from "@/lib/env";
import { getThaiBillingProviderId } from "@/lib/billing/thai-billing-env";
import { createOmiseBillingAdapter } from "@/lib/billing/providers/omise-billing-adapter";
import { thaiMockBillingAdapter } from "@/lib/billing/providers/thai-mock-adapter";
import type { ThaiBillingAdapter } from "@/lib/billing/providers/types";

/** Returns adapter for POST /api/billing/thai/start or null if disabled. */
export function resolveThaiBillingAdapter(): ThaiBillingAdapter | null {
  const id = getThaiBillingProviderId();
  if (!id) return null;

  switch (id) {
    case "mock":
      return thaiMockBillingAdapter;
    case "omise": {
      const secret = getAppEnv().OMISE_SECRET_KEY;
      if (!secret) return null;
      return createOmiseBillingAdapter(secret);
    }
    case "two_c_two_p":
    case "2c2p":
      return null;
    default:
      return null;
  }
}

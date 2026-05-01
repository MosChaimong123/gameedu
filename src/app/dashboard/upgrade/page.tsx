import { Suspense } from "react";
import { getStripeCheckoutConfigured } from "@/lib/billing/stripe";
import { getPlusPricesFromStripe } from "@/lib/billing/plus-price-display";
import { isThaiBillingUiEnabled } from "@/lib/billing/thai-billing-env";
import { UpgradePageClient } from "./upgrade-client";

function UpgradeFallback() {
    return (
        <div className="flex min-h-[40vh] w-full items-center justify-center text-slate-500 font-medium">
            Loading…
        </div>
    );
}

export default async function UpgradePage() {
    const checkoutEnabled = getStripeCheckoutConfigured();
    const plusPrices = await getPlusPricesFromStripe();
    const thaiBillingEnabled = isThaiBillingUiEnabled();

    return (
        <Suspense fallback={<UpgradeFallback />}>
            <UpgradePageClient
                checkoutEnabled={checkoutEnabled}
                plusPrices={plusPrices}
                thaiBillingEnabled={thaiBillingEnabled}
            />
        </Suspense>
    );
}

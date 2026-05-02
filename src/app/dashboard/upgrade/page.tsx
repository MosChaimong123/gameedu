import { Suspense } from "react";
import { cookies } from "next/headers";
import { getStripeCheckoutConfigured } from "@/lib/billing/stripe";
import { getPlusPricesFromStripe } from "@/lib/billing/plus-price-display";
import { isThaiBillingUiEnabled } from "@/lib/billing/thai-billing-env";
import { UpgradePageClient } from "./upgrade-client";
import { LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie";
import { getTranslationText } from "@/lib/translation-lookup";
import type { Language } from "@/lib/translations";

function UpgradeFallback({ language }: { language: Language }) {
    return (
        <div className="flex min-h-[40vh] w-full items-center justify-center text-slate-500 font-medium">
            {getTranslationText(language, "upgradeLoading")}
        </div>
    );
}

export default async function UpgradePage() {
    const cookieStore = await cookies();
    const language: Language = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value === "th" ? "th" : "en";
    const checkoutEnabled = getStripeCheckoutConfigured();
    const plusPrices = await getPlusPricesFromStripe();
    const thaiBillingEnabled = isThaiBillingUiEnabled();

    return (
        <Suspense fallback={<UpgradeFallback language={language} />}>
            <UpgradePageClient
                checkoutEnabled={checkoutEnabled}
                plusPrices={plusPrices}
                thaiBillingEnabled={thaiBillingEnabled}
            />
        </Suspense>
    );
}

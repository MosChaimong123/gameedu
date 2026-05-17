"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PLUS_PLANS } from "@/constants/pricing";
import type { PlusPricesFromStripe } from "@/lib/billing/plus-price-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Sparkles, Rocket, Zap, ShieldCheck, Mail, Info } from "lucide-react";
import { motion } from "framer-motion";
import { PageBackLink } from "@/components/ui/page-back-link";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import {
    getLocalizedErrorMessageFromResponse,
    tryLocalizeFetchNetworkFailureMessage,
} from "@/lib/ui-error-messages";

function formatPlusDisplayAmount(n: number): string {
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001) {
        return String(Math.round(n));
    }
    return n.toFixed(2).replace(/\.?0+$/, "");
}

export function UpgradePageClient({
    checkoutEnabled,
    plusPrices,
}: {
    checkoutEnabled: boolean;
    plusPrices: PlusPricesFromStripe | null;
}) {
    const { data: session, status, update } = useSession();
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();
    const currentPlan = session?.user?.plan ?? "FREE";
    const contactHref = `mailto:support@teachplayedu.com?subject=${encodeURIComponent(t("upgradeContactSubject"))}`;

    const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [promptPayLoading, setPromptPayLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [promotionCode, setPromotionCode] = useState("");

    useEffect(() => {
        if (status !== "authenticated") return;
        if (searchParams.get("checkout") === "success") {
            void update();
        }
    }, [searchParams, status, update]);

    const checkoutFlag = searchParams.get("checkout");

    const statusBanner =
        checkoutFlag === "success"
            ? { tone: "emerald" as const, message: t("upgradeCheckoutSuccessHint") }
            : checkoutFlag === "cancelled"
              ? { tone: "amber" as const, message: t("upgradeCheckoutCancelledHint") }
              : null;

    const billingBannerMessage = checkoutEnabled
        ? t("upgradeBillingBannerReady")
        : t("upgradeBillingBannerUnavailable");

    async function startCheckout(channel: "card" | "promptpay") {
        setCheckoutError(null);
        const setLoading = channel === "card" ? setCheckoutLoading : setPromptPayLoading;
        setLoading(true);
        try {
            const trimmedPromo = promotionCode.trim();
            const res = await fetch("/api/billing/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({
                    interval: billingInterval,
                    channel,
                    ...(trimmedPromo ? { promotionCode: trimmedPromo } : {}),
                }),
            });
            if (!res.ok) {
                setCheckoutError(
                    await getLocalizedErrorMessageFromResponse(
                        res,
                        "upgradeCheckoutFailed",
                        t,
                        language,
                        {
                            overrideTranslationKeys: {
                                BILLING_PROMO_INVALID: "apiError_BILLING_PROMO_INVALID",
                            },
                        }
                    )
                );
                return;
            }
            const data = (await res.json().catch(() => ({}))) as { url?: string };
            if (typeof data.url === "string") {
                window.location.href = data.url;
                return;
            }
            setCheckoutError(t("upgradeCheckoutFailed"));
        } catch (error: unknown) {
            const raw = error instanceof Error ? error.message : null;
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
            setCheckoutError(net ?? (raw || t("upgradeCheckoutFailed")));
        } finally {
            setLoading(false);
        }
    }

    return (
        <motion.div className="min-h-[calc(100dvh-6rem)] w-full py-8 sm:py-12">
            <div className="mx-auto w-full max-w-6xl space-y-16">
                <PageBackLink href="/dashboard" labelKey="navBackDashboard" />

                <div className="mx-auto max-w-2xl space-y-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 rounded-full border border-brand-pink/25 bg-brand-pink/10 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-brand-pink"
                    >
                        <Sparkles className="h-4 w-4" /> {t("upgradeBadge")}
                    </motion.div>
                    <h1 className="text-4xl font-black leading-none tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                        {t("upgradeHeroLine1")} <br />
                        <span className="text-brand-pink">{t("upgradeHeroPro")}</span>
                    </h1>
                    <p className="text-lg font-medium text-slate-500">{t("upgradeHeroBody")}</p>
                    <div className="inline-flex max-w-xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-900 shadow-sm">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="text-sm font-semibold">{billingBannerMessage}</div>
                    </div>
                    {statusBanner ? (
                        <motion.div
                            className={cn(
                                "mx-auto max-w-xl rounded-2xl border px-4 py-3 text-left text-sm font-semibold",
                                statusBanner.tone === "emerald"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                    : "border-amber-200 bg-amber-50 text-amber-950"
                            )}
                        >
                            {statusBanner.message}
                        </motion.div>
                    ) : null}
                    {checkoutError ? (
                        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-950">
                            {checkoutError}
                        </div>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {PLUS_PLANS.map((plan, index) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                className={`relative flex h-full flex-col overflow-hidden rounded-[3rem] border-0 shadow-2xl ${plan.highlight ? "z-10 bg-white ring-2 ring-brand-pink ring-offset-2 max-md:scale-100 md:scale-105 md:ring-4 md:ring-offset-8" : "bg-white"}`}
                            >
                                {plan.highlight ? (
                                    <div className="absolute left-0 right-0 top-0 bg-brand-pink py-2 text-center text-xs font-black uppercase tracking-widest text-white">
                                        {t("upgradeBestValue")}
                                    </div>
                                ) : null}

                                <CardHeader className={`p-5 sm:p-8 md:p-10 ${plan.highlight ? "pt-10 sm:pt-12" : ""}`}>
                                    <motion.div
                                        className={`mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${
                                            plan.color === "indigo"
                                                ? "bg-brand-pink text-white"
                                                : plan.color === "emerald"
                                                  ? "bg-emerald-500 text-white"
                                                  : "bg-slate-100 text-slate-500"
                                        }`}
                                    >
                                        {plan.id === "FREE" ? (
                                            <Zap className="h-8 w-8" />
                                        ) : plan.id === "PLUS" ? (
                                            <Rocket className="h-8 w-8" />
                                        ) : (
                                            <ShieldCheck className="h-8 w-8" />
                                        )}
                                    </motion.div>
                                    <CardTitle className="text-3xl font-black text-slate-900">{plan.name}</CardTitle>
                                    <CardDescription className="text-lg font-bold text-slate-400">
                                        {t(plan.descriptionKey)}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="flex flex-1 flex-col p-5 pt-0 sm:p-8 md:p-10 md:pt-0">
                                    <div className="mb-8 flex items-baseline gap-1">
                                        {plan.priceLabelKey ? (
                                            <span className="text-5xl font-black text-slate-900">
                                                {t(plan.priceLabelKey)}
                                            </span>
                                        ) : plan.id === "PLUS" && plusPrices ? (
                                            <span className="text-5xl font-black text-slate-900">
                                                ฿
                                                {formatPlusDisplayAmount(
                                                    billingInterval === "month"
                                                        ? plusPrices.monthlyAmount
                                                        : plusPrices.yearlyAmount
                                                )}
                                            </span>
                                        ) : (
                                            <span className="text-5xl font-black text-slate-900">
                                                ฿{plan.price}
                                            </span>
                                        )}
                                        {plan.unitKey || (plan.id === "PLUS" && plusPrices) ? (
                                            <span className="font-bold text-slate-400">
                                                /
                                                {plan.id === "PLUS" && plusPrices
                                                    ? billingInterval === "month"
                                                        ? t("planPlusUnit")
                                                        : t("planPlusUnitYear")
                                                    : plan.unitKey
                                                      ? t(plan.unitKey)
                                                      : ""}
                                            </span>
                                        ) : null}
                                    </div>

                                    {plan.id === "PLUS" && checkoutEnabled && currentPlan !== "PLUS" ? (
                                        <div className="mb-6 flex flex-col gap-2 sm:flex-row">
                                            <Button
                                                type="button"
                                                variant={billingInterval === "month" ? "default" : "outline"}
                                                className="flex-1 rounded-xl font-black"
                                                onClick={() => setBillingInterval("month")}
                                            >
                                                {t("upgradeBillingMonthly")}
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={billingInterval === "year" ? "default" : "outline"}
                                                className="flex-1 rounded-xl font-black"
                                                onClick={() => setBillingInterval("year")}
                                            >
                                                {t("upgradeBillingYearly")}
                                            </Button>
                                        </div>
                                    ) : null}

                                    <div className="mb-10 flex-1 space-y-4">
                                        {plan.featureKeys.map((featureKey) => (
                                            <div key={featureKey} className="flex items-start gap-3">
                                                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-100 bg-emerald-50">
                                                    <Check className="h-3 w-3 text-emerald-600" />
                                                </div>
                                                <span className="font-bold text-slate-600">{t(featureKey)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {plan.id === "FREE" || currentPlan === plan.id ? (
                                        <Button
                                            disabled={currentPlan === plan.id}
                                            className={`h-16 w-full rounded-2xl text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                currentPlan === plan.id
                                                    ? "cursor-default bg-slate-100 text-slate-400"
                                                    : plan.highlight
                                                      ? "bg-brand-pink text-white shadow-xl shadow-brand-pink/25 hover:opacity-95"
                                                      : "bg-slate-900 text-white hover:bg-black"
                                            }`}
                                        >
                                            {t(plan.buttonTextKey)}
                                        </Button>
                                    ) : plan.id === "PLUS" && checkoutEnabled ? (
                                        <motion.div className="flex w-full flex-col gap-3">
                                            <div className="space-y-2">
                                                <label
                                                    htmlFor="plus-promotion-code"
                                                    className="block text-xs font-bold uppercase tracking-wide text-slate-500"
                                                >
                                                    {t("upgradePromoCodeLabel")}
                                                </label>
                                                <Input
                                                    id="plus-promotion-code"
                                                    type="text"
                                                    autoComplete="off"
                                                    spellCheck={false}
                                                    placeholder={t("upgradePromoCodePlaceholder")}
                                                    value={promotionCode}
                                                    onChange={(e) => setPromotionCode(e.target.value)}
                                                    className="h-11 rounded-xl border-slate-200 font-semibold uppercase"
                                                />
                                                <p className="text-xs font-medium leading-relaxed text-slate-500">
                                                    {t("upgradePromoCodeHint")}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                size="wrap"
                                                disabled={checkoutLoading || promptPayLoading}
                                                onClick={() => void startCheckout("card")}
                                                className={`min-h-12 w-full rounded-2xl px-3 text-sm font-black transition-all hover:scale-[1.02] active:scale-[0.98] sm:min-h-14 sm:text-lg ${
                                                    plan.highlight
                                                        ? "bg-brand-pink text-white shadow-xl shadow-brand-pink/25 hover:opacity-95"
                                                        : "bg-slate-900 text-white hover:bg-black"
                                                }`}
                                            >
                                                {checkoutLoading
                                                    ? t("upgradeCheckoutWorking")
                                                    : t("upgradeCheckoutSubscribe")}
                                            </Button>
                                            <Button
                                                type="button"
                                                size="wrap"
                                                variant="outline"
                                                disabled={checkoutLoading || promptPayLoading}
                                                onClick={() => void startCheckout("promptpay")}
                                                className="min-h-12 w-full rounded-2xl border-2 border-brand-pink/25 bg-white px-3 text-sm font-black text-brand-navy hover:bg-brand-pink/5 sm:min-h-14 sm:text-base"
                                            >
                                                {promptPayLoading
                                                    ? t("upgradeCheckoutWorking")
                                                    : t("upgradeCheckoutPromptPay")}
                                            </Button>
                                            <p className="text-center text-xs font-medium leading-relaxed text-slate-500">
                                                {billingInterval === "month"
                                                    ? t("upgradePromptPayHintMonthly")
                                                    : t("upgradePromptPayHintYearly")}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <Button
                                            asChild
                                            className={`h-16 w-full rounded-2xl text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                plan.highlight
                                                    ? "bg-brand-pink text-white shadow-xl shadow-brand-pink/25 hover:opacity-95"
                                                    : "bg-slate-900 text-white hover:bg-black"
                                            }`}
                                        >
                                            <Link
                                                href={contactHref}
                                                className="flex h-full w-full items-center justify-center gap-2"
                                            >
                                                <Mail className="h-5 w-5" />
                                                {plan.id === "PRO" ? t("upgradeCtaPro") : t("upgradeCtaPlus")}
                                            </Link>
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                <div className="text-center">
                    <p className="font-medium text-slate-400">
                        {t("upgradeSchoolLine")}
                        <Link href={contactHref} className="ml-1 font-black text-brand-pink hover:underline">
                            {t("upgradeSchoolLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}

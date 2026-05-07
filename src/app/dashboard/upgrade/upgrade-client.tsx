"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PLUS_PLANS } from "@/constants/pricing";
import type { PlusPricesFromStripe } from "@/lib/billing/plus-price-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Rocket, Zap, ShieldCheck, Mail, Info } from "lucide-react";
import { motion } from "framer-motion";
import { PageBackLink } from "@/components/ui/page-back-link";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";
import {
    getLocalizedErrorMessageFromResponse,
    tryLocalizeFetchNetworkFailureMessage,
} from "@/lib/ui-error-messages";
import { OmiseStatusPanel } from "./omise-status-panel";

function formatPlusDisplayAmount(n: number): string {
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.001) {
        return String(Math.round(n));
    }
    return n.toFixed(2).replace(/\.?0+$/, "");
}

export function UpgradePageClient({
    checkoutEnabled,
    plusPrices,
    thaiBillingEnabled,
}: {
    checkoutEnabled: boolean;
    plusPrices: PlusPricesFromStripe | null;
    thaiBillingEnabled: boolean;
}) {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { t, language } = useLanguage();
    const currentPlan = session?.user?.plan ?? "FREE";
    const userRole = session?.user?.role;
    const isStaff = userRole === "TEACHER" || userRole === "ADMIN";
    const contactHref = `mailto:support@gamedu.local?subject=${encodeURIComponent(t("upgradeContactSubject"))}`;

    const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [thaiLoading, setThaiLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);

    useEffect(() => {
        const checkout = searchParams.get("checkout");
        if (status !== "authenticated") return;

        if (checkout === "success") {
            void update();
            return;
        }

        if (checkout === "omise_return") {
            void (async () => {
                await fetch("/api/billing/omise/reconcile", {
                    method: "POST",
                    credentials: "same-origin",
                });
                await update();
            })();
        }
    }, [searchParams, status, update]);

    const checkoutFlag = searchParams.get("checkout");
    const statusBanner =
        checkoutFlag === "success"
            ? { tone: "emerald" as const, message: t("upgradeCheckoutSuccessHint") }
            : checkoutFlag === "cancelled"
              ? { tone: "amber" as const, message: t("upgradeCheckoutCancelledHint") }
              : checkoutFlag === "thai_mock"
                ? { tone: "sky" as const, message: t("upgradeThaiMockRedirectNotice") }
                : checkoutFlag === "omise_return"
                  ? { tone: "emerald" as const, message: t("upgradeOmiseReturnHint") }
                  : null;

    async function startPlusCheckout() {
        setCheckoutError(null);
        setCheckoutLoading(true);
        try {
            const res = await fetch("/api/billing/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ interval: billingInterval }),
            });
            if (!res.ok) {
                setCheckoutError(
                    await getLocalizedErrorMessageFromResponse(
                        res,
                        "upgradeCheckoutFailed",
                        t,
                        language
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
            setCheckoutLoading(false);
        }
    }

    async function startThaiChannelCheckout() {
        setCheckoutError(null);
        setThaiLoading(true);
        try {
            const res = await fetch("/api/billing/thai/start", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "same-origin",
                body: JSON.stringify({ interval: billingInterval }),
            });
            if (!res.ok) {
                setCheckoutError(
                    await getLocalizedErrorMessageFromResponse(
                        res,
                        "upgradeCheckoutFailed",
                        t,
                        language
                    )
                );
                return;
            }
            const data = (await res.json().catch(() => ({}))) as { url?: string };
            if (typeof data.url === "string") {
                try {
                    const target = new URL(data.url, window.location.origin);
                    if (
                        target.origin === window.location.origin &&
                        target.pathname === pathname
                    ) {
                        router.replace(`${target.pathname}${target.search}${target.hash}`, {
                            scroll: false,
                        });
                        return;
                    }
                } catch {
                    /* fall through to full navigation */
                }
                window.location.assign(data.url);
                return;
            }
            setCheckoutError(t("upgradeCheckoutFailed"));
        } catch (error: unknown) {
            const raw = error instanceof Error ? error.message : null;
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
            setCheckoutError(net ?? (raw || t("upgradeCheckoutFailed")));
        } finally {
            setThaiLoading(false);
        }
    }

    const plusPaymentEnabled = checkoutEnabled || thaiBillingEnabled;

    const billingBannerMessage =
        checkoutEnabled && thaiBillingEnabled
            ? t("upgradeBillingBannerStripeAndThai")
            : checkoutEnabled
              ? t("upgradeBillingBannerReady")
              : thaiBillingEnabled
                ? t("upgradeBillingBannerThaiOnly")
                : t("upgradeBillingBannerUnavailable");

    return (
        <div className="min-h-[calc(100vh-6rem)] w-full py-8 sm:py-12">
            <div className="mx-auto w-full max-w-6xl space-y-16">
                <PageBackLink href="/dashboard" labelKey="navBackDashboard" />

                <div className="text-center space-y-4 max-w-2xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-black uppercase tracking-widest"
                    >
                        <Sparkles className="w-4 h-4" /> {t("upgradeBadge")}
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-none">
                        {t("upgradeHeroLine1")} <br />{" "}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                            {t("upgradeHeroPro")}
                        </span>
                    </h1>
                    <p className="text-slate-500 text-lg font-medium">{t("upgradeHeroBody")}</p>
                    <div className="inline-flex max-w-xl items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-amber-900 shadow-sm">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <div className="text-sm font-semibold">{billingBannerMessage}</div>
                    </div>
                    {statusBanner ? (
                        <div
                            className={cn(
                                "mx-auto max-w-xl rounded-2xl border px-4 py-3 text-left text-sm font-semibold",
                                statusBanner.tone === "emerald"
                                    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
                                    : statusBanner.tone === "sky"
                                      ? "border-sky-200 bg-sky-50 text-sky-950"
                                      : "border-amber-200 bg-amber-50 text-amber-950"
                            )}
                        >
                            {statusBanner.message}
                        </div>
                    ) : null}
                    {checkoutError ? (
                        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-950">
                            {checkoutError}
                        </div>
                    ) : null}
                    {isStaff && thaiBillingEnabled ? <OmiseStatusPanel /> : null}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {PLUS_PLANS.map((plan, index) => (
                        <motion.div
                            key={plan.id}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                className={`relative h-full border-0 shadow-2xl rounded-[3rem] overflow-hidden flex flex-col ${plan.highlight ? "ring-4 ring-indigo-600 ring-offset-8 scale-105 z-10" : "bg-white"}`}
                            >
                                {plan.highlight && (
                                    <div className="absolute top-0 right-0 left-0 bg-indigo-600 text-white text-center py-2 text-xs font-black uppercase tracking-widest">
                                        {t("upgradeBestValue")}
                                    </div>
                                )}

                                <CardHeader className={`p-10 ${plan.highlight ? "pt-12" : ""}`}>
                                    <div
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                                            plan.color === "indigo"
                                                ? "bg-indigo-600 text-white"
                                                : plan.color === "emerald"
                                                  ? "bg-emerald-500 text-white"
                                                  : "bg-slate-100 text-slate-500"
                                        }`}
                                    >
                                        {plan.id === "FREE" ? (
                                            <Zap className="w-8 h-8" />
                                        ) : plan.id === "PLUS" ? (
                                            <Rocket className="w-8 h-8" />
                                        ) : (
                                            <ShieldCheck className="w-8 h-8" />
                                        )}
                                    </div>
                                    <CardTitle className="text-3xl font-black text-slate-900">{plan.name}</CardTitle>
                                    <CardDescription className="text-slate-400 font-bold text-lg">
                                        {t(plan.descriptionKey)}
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-10 pt-0 flex-1 flex flex-col">
                                    <div className="flex items-baseline gap-1 mb-8">
                                        {plan.priceLabelKey ? (
                                            <span className="text-5xl font-black text-slate-900">{t(plan.priceLabelKey)}</span>
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
                                            <span className="text-5xl font-black text-slate-900">฿{plan.price}</span>
                                        )}
                                        {plan.unitKey || (plan.id === "PLUS" && plusPrices) ? (
                                            <span className="text-slate-400 font-bold">
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

                                    {plan.id === "PLUS" && plusPaymentEnabled && currentPlan !== "PLUS" ? (
                                        <div className="mb-6 flex gap-2">
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

                                    <div className="space-y-4 mb-10 flex-1">
                                        {plan.featureKeys.map((featureKey) => (
                                            <div key={featureKey} className="flex items-start gap-3">
                                                <div className="mt-1 w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <Check className="w-3 h-3 text-emerald-600" />
                                                </div>
                                                <span className="text-slate-600 font-bold">{t(featureKey)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {plan.id === "FREE" || currentPlan === plan.id ? (
                                        <Button
                                            disabled={currentPlan === plan.id}
                                            className={`w-full h-16 rounded-2xl text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                currentPlan === plan.id
                                                    ? "bg-slate-100 text-slate-400 cursor-default"
                                                    : plan.highlight
                                                      ? "bg-indigo-600 hover:bg-slate-900 text-white shadow-xl shadow-indigo-200"
                                                      : "bg-slate-900 hover:bg-black text-white"
                                            }`}
                                        >
                                            {t(plan.buttonTextKey)}
                                        </Button>
                                    ) : plan.id === "PLUS" && plusPaymentEnabled ? (
                                        <div className="flex w-full flex-col gap-3">
                                            {checkoutEnabled ? (
                                                <Button
                                                    type="button"
                                                    disabled={checkoutLoading}
                                                    onClick={() => void startPlusCheckout()}
                                                    className={`h-16 w-full rounded-2xl text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                        plan.highlight
                                                            ? "bg-indigo-600 hover:bg-slate-900 text-white shadow-xl shadow-indigo-200"
                                                            : "bg-slate-900 hover:bg-black text-white"
                                                    }`}
                                                >
                                                    {checkoutLoading ? t("upgradeCheckoutWorking") : t("upgradeCheckoutSubscribe")}
                                                </Button>
                                            ) : null}
                                            {thaiBillingEnabled ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={thaiLoading}
                                                    onClick={() => void startThaiChannelCheckout()}
                                                    className="h-14 w-full rounded-2xl border-2 border-indigo-200 bg-white text-base font-black text-indigo-900 hover:bg-indigo-50"
                                                >
                                                    {thaiLoading ? t("upgradeCheckoutWorking") : t("upgradePayThaiChannel")}
                                                </Button>
                                            ) : null}
                                            {thaiBillingEnabled ? (
                                                <p className="text-center text-xs font-medium text-slate-400">{t("upgradeThaiChannelHint")}</p>
                                            ) : null}
                                        </div>
                                    ) : (
                                        <Button
                                            asChild
                                            className={`w-full h-16 rounded-2xl text-lg font-black transition-all hover:scale-[1.02] active:scale-[0.98] ${
                                                plan.highlight
                                                    ? "bg-indigo-600 hover:bg-slate-900 text-white shadow-xl shadow-indigo-200"
                                                    : "bg-slate-900 hover:bg-black text-white"
                                            }`}
                                        >
                                            <Link href={contactHref} className="flex h-full w-full items-center justify-center gap-2">
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
                    <p className="text-slate-400 font-medium">
                        {t("upgradeSchoolLine")}
                        <Link href={contactHref} className="text-indigo-600 font-black hover:underline ml-1">
                            {t("upgradeSchoolLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

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
import { ThaiPaymentMethodPicker } from "./thai-payment-method-picker";

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
    const [thaiFailureCount, setThaiFailureCount] = useState(0);
    const [thaiPaymentMethod, setThaiPaymentMethod] = useState<
        | "promptpay"
        | "mobile_banking_scb"
        | "mobile_banking_kbank"
        | "mobile_banking_bay"
        | "mobile_banking_bbl"
        | "mobile_banking_ktb"
    >("promptpay");
    const [reconcileOutcome, setReconcileOutcome] = useState<string | null>(null);
    const [reconcilePolling, setReconcilePolling] = useState(false);
    const [reconcileTick, setReconcileTick] = useState(0);
    const [markPaidLoading, setMarkPaidLoading] = useState(false);
    const [markPaidError, setMarkPaidError] = useState<string | null>(null);

    type ReconcileResponse = {
        ok: boolean;
        outcome?: string;
        chargeId?: string | null;
        chargeStatus?: string | null;
        chargePaid?: boolean | null;
        testMode?: boolean;
        omiseDashboardUrl?: string | null;
    };

    const [reconcileDetails, setReconcileDetails] = useState<{
        chargeId: string | null;
        chargeStatus: string | null;
        testMode: boolean;
        omiseDashboardUrl: string | null;
    } | null>(null);

    async function runReconcileOnce(): Promise<ReconcileResponse | null> {
        try {
            const res = await fetch("/api/billing/omise/reconcile", {
                method: "POST",
                credentials: "same-origin",
            });
            const json = (await res.json().catch(() => ({}))) as ReconcileResponse;
            return json;
        } catch {
            return null;
        }
    }

    /** Test-mode helper: ask Omise to mark the pending charge paid, then poll. */
    async function markChargeAsPaidTestMode() {
        setMarkPaidError(null);
        setMarkPaidLoading(true);
        try {
            const res = await fetch("/api/billing/omise/mark-as-paid", {
                method: "POST",
                credentials: "same-origin",
            });
            if (!res.ok) {
                setMarkPaidError(
                    await getLocalizedErrorMessageFromResponse(
                        res,
                        "billingMarkAsPaidFailed",
                        t,
                        language
                    ),
                );
                setReconcileTick((n) => n + 1);
                return;
            }
            const json = (await res.json().catch(() => ({}))) as {
                ok?: boolean;
                outcome?: string;
            };
            if (json.ok === false) {
                setMarkPaidError(t("billingMarkAsPaidFailed"));
                setReconcileTick((n) => n + 1);
                return;
            }
            if (json.outcome === "applied" || json.outcome === "duplicate") {
                await update();
            }
            setReconcileTick((n) => n + 1);
        } catch (e) {
            setMarkPaidError(
                e instanceof Error ? e.message : t("billingMarkAsPaidNetworkError"),
            );
        } finally {
            setMarkPaidLoading(false);
        }
    }

    /**
     * After returning from Omise PromptPay the charge can stay `pending` for a
     * few seconds until the user finishes scanning. Poll reconcile up to
     * ~30 seconds; stop early on any final outcome.
     */
    useEffect(() => {
        const checkout = searchParams.get("checkout");
        if (status !== "authenticated") return;

        if (checkout === "success") {
            void update();
            return;
        }

        if (checkout !== "omise_return") return;

        let cancelled = false;
        setReconcilePolling(true);
        setReconcileOutcome(null);
        setReconcileDetails(null);
        const POLLS = 10;
        const DELAY_MS = 3000;

        void (async () => {
            for (let i = 0; i < POLLS; i++) {
                if (cancelled) return;
                const json = await runReconcileOnce();
                if (cancelled) return;
                const outcome = json?.outcome ?? (json?.ok === false ? "error" : null);
                if (outcome) setReconcileOutcome(outcome);
                if (json) {
                    setReconcileDetails({
                        chargeId: json.chargeId ?? null,
                        chargeStatus: json.chargeStatus ?? null,
                        testMode: Boolean(json.testMode),
                        omiseDashboardUrl: json.omiseDashboardUrl ?? null,
                    });
                }
                if (outcome && outcome !== "skipped_not_paid") {
                    if (outcome === "applied" || outcome === "duplicate") {
                        await update();
                    }
                    setReconcilePolling(false);
                    return;
                }
                await new Promise((r) => setTimeout(r, DELAY_MS));
            }
            if (!cancelled) setReconcilePolling(false);
        })();

        return () => {
            cancelled = true;
        };
    }, [searchParams, status, update, reconcileTick]);

    const checkoutFlag = searchParams.get("checkout");

    function buildOmiseReturnBanner() {
        const base = t("upgradeOmiseReturnHint");
        if (reconcileOutcome === "applied") {
            return {
                tone: "emerald" as const,
                message: `${base} (status: applied — PLUS activated)`,
            };
        }
        if (reconcileOutcome === "duplicate") {
            return {
                tone: "emerald" as const,
                message: `${base} (status: already applied)`,
            };
        }
        if (reconcileOutcome === "skipped_not_paid" || reconcilePolling) {
            return {
                tone: "amber" as const,
                message: reconcilePolling
                    ? `${base} (waiting for PromptPay confirmation…)`
                    : `${base} (charge is still pending — tap Recheck below)`,
            };
        }
        if (reconcileOutcome === "no_pending_charge") {
            return {
                tone: "amber" as const,
                message: `${base} (no pending charge found)`,
            };
        }
        if (reconcileOutcome === "error") {
            return {
                tone: "amber" as const,
                message: `${base} (could not retrieve charge — Recheck)`,
            };
        }
        return { tone: "emerald" as const, message: base };
    }

    const statusBanner =
        checkoutFlag === "success"
            ? { tone: "emerald" as const, message: t("upgradeCheckoutSuccessHint") }
            : checkoutFlag === "cancelled"
              ? { tone: "amber" as const, message: t("upgradeCheckoutCancelledHint") }
              : checkoutFlag === "thai_mock"
                ? { tone: "sky" as const, message: t("upgradeThaiMockRedirectNotice") }
                : checkoutFlag === "omise_return"
                  ? buildOmiseReturnBanner()
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
                body: JSON.stringify({
                    interval: billingInterval,
                    paymentMethod: thaiPaymentMethod,
                }),
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
                setThaiFailureCount((n) => n + 1);
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
            setThaiFailureCount((n) => n + 1);
        } catch (error: unknown) {
            const raw = error instanceof Error ? error.message : null;
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
            setCheckoutError(net ?? (raw || t("upgradeCheckoutFailed")));
            setThaiFailureCount((n) => n + 1);
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
                        className="inline-flex items-center gap-2 rounded-full border border-brand-pink/25 bg-brand-pink/10 px-4 py-1.5 text-sm font-black uppercase tracking-widest text-brand-pink"
                    >
                        <Sparkles className="w-4 h-4" /> {t("upgradeBadge")}
                    </motion.div>
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-none">
                        {t("upgradeHeroLine1")} <br />{" "}
                        <span className="text-brand-pink">
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
                            <div>{statusBanner.message}</div>
                            {checkoutFlag === "omise_return" &&
                            (reconcileOutcome === "skipped_not_paid" ||
                                reconcileOutcome === "error" ||
                                reconcileOutcome === "no_pending_charge") &&
                            !reconcilePolling ? (
                                <button
                                    type="button"
                                    onClick={() => setReconcileTick((n) => n + 1)}
                                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-900 shadow-sm hover:bg-amber-100"
                                >
                                    {t("billingRecheckOmiseCharge")}
                                </button>
                            ) : null}
                            {checkoutFlag === "omise_return" &&
                            reconcileOutcome === "skipped_not_paid" &&
                            reconcileDetails?.testMode ? (
                                <div className="mt-3 rounded-xl border border-amber-300 bg-amber-100/60 p-3 text-xs leading-relaxed text-amber-950">
                                    <div className="font-bold">{t("billingOmiseTestModeTitle")}</div>
                                    <div className="mt-1 font-medium">{t("billingOmiseTestModeDesc")}</div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={markPaidLoading}
                                            onClick={() => void markChargeAsPaidTestMode()}
                                            className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-amber-700 disabled:opacity-60"
                                        >
                                            {markPaidLoading ? t("billingMarkAsPaidLoading") : t("billingMarkAsPaidButton")}
                                        </button>
                                        {reconcileDetails.omiseDashboardUrl ? (
                                            <a
                                                href={reconcileDetails.omiseDashboardUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="font-bold text-amber-900 underline"
                                            >
                                                {t("billingOpenOmiseDashboard")}
                                            </a>
                                        ) : null}
                                    </div>
                                    {reconcileDetails.chargeId ? (
                                        <div className="mt-2 break-all font-mono text-[11px] text-amber-900/80">
                                            {reconcileDetails.chargeId}
                                            {reconcileDetails.chargeStatus
                                                ? ` • status: ${reconcileDetails.chargeStatus}`
                                                : ""}
                                        </div>
                                    ) : null}
                                    {markPaidError ? (
                                        <div className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-bold text-red-900">
                                            {markPaidError}
                                        </div>
                                    ) : null}
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    {checkoutError ? (
                        <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-semibold text-red-950">
                            {checkoutError}
                        </div>
                    ) : null}
                    {isStaff && thaiBillingEnabled ? (
                        <OmiseStatusPanel
                            autoOpen={thaiFailureCount > 0}
                            refreshKey={thaiFailureCount}
                        />
                    ) : null}
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
                                className={`relative h-full border-0 shadow-2xl rounded-[3rem] overflow-hidden flex flex-col ${plan.highlight ? "z-10 scale-105 ring-4 ring-brand-pink ring-offset-8" : "bg-white"}`}
                            >
                                {plan.highlight && (
                                    <div className="absolute left-0 right-0 top-0 bg-brand-pink py-2 text-center text-xs font-black uppercase tracking-widest text-white">
                                        {t("upgradeBestValue")}
                                    </div>
                                )}

                                <CardHeader className={`p-10 ${plan.highlight ? "pt-12" : ""}`}>
                                    <div
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${
                                            plan.color === "indigo"
                                                ? "bg-brand-pink text-white"
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
                                                      ? "bg-brand-pink text-white shadow-xl shadow-brand-pink/25 hover:opacity-95"
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
                                                            ? "bg-brand-pink text-white shadow-xl shadow-brand-pink/25 hover:opacity-95"
                                                            : "bg-slate-900 hover:bg-black text-white"
                                                    }`}
                                                >
                                                    {checkoutLoading ? t("upgradeCheckoutWorking") : t("upgradeCheckoutSubscribe")}
                                                </Button>
                                            ) : null}
                                            {thaiBillingEnabled ? (
                                                <ThaiPaymentMethodPicker
                                                    value={thaiPaymentMethod}
                                                    onChange={setThaiPaymentMethod}
                                                    disabled={thaiLoading}
                                                />
                                            ) : null}
                                            {thaiBillingEnabled ? (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    disabled={thaiLoading}
                                                    onClick={() => void startThaiChannelCheckout()}
                                                    className="h-14 w-full rounded-2xl border-2 border-brand-pink/25 bg-white text-base font-black text-brand-navy hover:bg-brand-pink/5"
                                                >
                                                    {thaiLoading
                                                        ? t("upgradeCheckoutWorking")
                                                        : thaiPaymentMethod === "promptpay"
                                                          ? t("upgradePayThaiChannel")
                                                          : t("upgradePayMobileBanking")}
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
                                                            ? "bg-brand-pink text-white shadow-xl shadow-brand-pink/25 hover:opacity-95"
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
                        <Link href={contactHref} className="ml-1 font-black text-brand-pink hover:underline">
                            {t("upgradeSchoolLink")}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

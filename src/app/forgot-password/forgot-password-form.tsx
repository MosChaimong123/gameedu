"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2, Mail, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/providers/language-provider";
import { useAuthProvidersStatus } from "@/lib/auth/use-auth-providers-status";
import {
    getLocalizedErrorMessageFromResponse,
    tryLocalizeFetchNetworkFailureMessage,
} from "@/lib/ui-error-messages";

type ForgotPasswordResponse = {
    cooldownSeconds?: number;
    referenceCode?: string;
    devCode?: string;
};

export function ForgotPasswordForm() {
    const { language, t } = useLanguage();
    const { googleEnabled } = useAuthProvidersStatus();
    const [email, setEmail] = React.useState("");
    const [acceptedEmail, setAcceptedEmail] = React.useState<string | null>(null);
    const [cooldownLeft, setCooldownLeft] = React.useState(0);
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (cooldownLeft <= 0) return;
        const timer = window.setInterval(() => {
            setCooldownLeft((current) => Math.max(0, current - 1));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [cooldownLeft]);

    async function requestRecovery(targetEmail: string) {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: targetEmail }),
            });
            if (!response.ok) {
                setErrorMsg(
                    await getLocalizedErrorMessageFromResponse(
                        response,
                        "forgotPasswordRequestFailed",
                        t,
                        language
                    )
                );
                return false;
            }

            const data = (await response.json()) as ForgotPasswordResponse;
            try {
                if (data.referenceCode) sessionStorage.setItem("pwreset_ref", data.referenceCode);
                else sessionStorage.removeItem("pwreset_ref");
                if (data.devCode) sessionStorage.setItem("pwreset_devcode", data.devCode);
                else sessionStorage.removeItem("pwreset_devcode");
            } catch {
                // The reset form still works when storage is unavailable.
            }

            setAcceptedEmail(targetEmail);
            setCooldownLeft(Math.max(0, data.cooldownSeconds ?? 30));
            return true;
        } catch (error) {
            const raw = error instanceof Error ? error.message : null;
            setErrorMsg(tryLocalizeFetchNetworkFailureMessage(raw, t) ?? t("forgotPasswordNetworkFailed"));
            return false;
        } finally {
            setIsLoading(false);
        }
    }

    async function onSubmit(event: React.FormEvent) {
        event.preventDefault();
        const trimmed = email.trim().toLowerCase();
        if (!trimmed || !trimmed.includes("@")) {
            setErrorMsg(t("authValidationEmail"));
            return;
        }
        await requestRecovery(trimmed);
    }

    function useAnotherEmail() {
        setAcceptedEmail(null);
        setCooldownLeft(0);
        setErrorMsg(null);
    }

    if (acceptedEmail) {
        return (
            <div className="grid gap-5" aria-live="polite">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="grid gap-2">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                        {t("forgotPasswordAcceptedTitle")}
                    </h1>
                    <p className="text-sm leading-6 text-slate-600">{t("forgotPasswordAcceptedBody")}</p>
                    <p className="break-all text-sm font-semibold text-slate-800">{acceptedEmail}</p>
                </div>

                {errorMsg ? (
                    <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                ) : null}

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                    <p>{t("forgotPasswordCheckSpam")}</p>
                    {googleEnabled ? <p className="mt-2">{t("forgotPasswordGoogleHint")}</p> : null}
                </div>

                <div className="grid gap-3">
                    <Button asChild className="h-11 rounded-xl bg-brand-pink font-bold text-white shadow-md hover:opacity-95">
                        <Link href={`/forgot-password/reset?email=${encodeURIComponent(acceptedEmail)}`}>
                            {t("forgotPasswordOpenOtp")}
                        </Link>
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-xl"
                        disabled={isLoading || cooldownLeft > 0}
                        onClick={() => void requestRecovery(acceptedEmail)}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                        {cooldownLeft > 0
                            ? t("forgotPasswordResendIn", { seconds: cooldownLeft })
                            : t("forgotPasswordResend")}
                    </Button>
                </div>

                <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm">
                    <button
                        type="button"
                        className="font-semibold text-slate-600 underline hover:text-slate-900"
                        onClick={useAnotherEmail}
                    >
                        {t("forgotPasswordUseAnother")}
                    </button>
                    <Link href="/login" className="font-semibold text-slate-600 underline hover:text-slate-900">
                        {googleEnabled ? t("forgotPasswordGoogleAction") : t("forgotPasswordBackToLogin")}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <div className="grid gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">{t("forgotPasswordTitle")}</h1>
                <p className="text-sm text-slate-500">{t("forgotPasswordSubtitle")}</p>
            </div>

            {errorMsg ? (
                <div className="flex animate-in slide-in-from-top-2 items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            ) : null}

            <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="fp-email">
                        {t("forgotPasswordEmailLabel")}
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="fp-email"
                            type="email"
                            autoComplete="email"
                            placeholder={t("forgotPasswordEmailPlaceholder")}
                            className="h-11 rounded-xl border-slate-200 pl-9 focus:border-brand-pink focus:ring-brand-pink"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            disabled={isLoading}
                            required
                        />
                    </div>
                </div>
                <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-brand-pink font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {isLoading ? t("forgotPasswordSubmitting") : t("forgotPasswordSubmit")}
                </Button>
            </form>

            <p className="text-center text-sm text-slate-500">
                {t("forgotPasswordRemembered")} {" "}
                <Link href="/login" className="font-semibold text-slate-700 underline hover:text-slate-900">
                    {t("forgotPasswordBackToLogin")}
                </Link>
            </p>
        </div>
    );
}

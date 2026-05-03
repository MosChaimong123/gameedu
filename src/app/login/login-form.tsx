"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { resolvePostAuthDestination } from "@/lib/auth/post-auth-destination";
import { getNextAuthResultCode } from "@/lib/auth/next-auth-result";
import { getLocalizedAuthErrorMessage, tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages";
import { useLanguage } from "@/components/providers/language-provider";
import { signInWithGoogleRole } from "@/lib/auth/google-sign-in-client";

export type LoginAudience = "teacher" | "student";

type LoginFormProps = {
    audience: LoginAudience;
};

export default function LoginForm({ audience }: LoginFormProps) {
    const { language, t } = useLanguage();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [resendState, setResendState] = React.useState<"idle" | "sending" | "sent" | "error">("idle");
    const [needsVerify, setNeedsVerify] = React.useState(false);

    const verified = searchParams.get("verified") === "1";
    const pendingVerify = searchParams.get("pendingVerify") === "1";
    const verifyError = searchParams.get("verifyError");
    const callbackUrl = searchParams.get("callbackUrl");

    const formSchema = React.useMemo(
        () =>
            z.object({
                email: z.string().email(t("authValidationEmail")),
                password: z.string().min(6, t("authValidationPasswordMin")),
            }),
        [t]
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { email: "", password: "" },
    });

    React.useEffect(() => {
        if (pendingVerify) {
            setNeedsVerify(true);
        }
    }, [pendingVerify]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        setErrorMsg(null);
        setNeedsVerify(false);
        setResendState("idle");
        try {
            const result = await signIn("credentials", {
                email: values.email,
                password: values.password,
                redirect: false,
            });

            if (result?.error || !result?.ok) {
                const err = result?.error ?? "";
                const resultCode =
                    result?.code ??
                    getNextAuthResultCode(
                        typeof window !== "undefined" ? result?.url : null,
                        typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"
                    );
                if (resultCode === "email_not_verified" || err === "EMAIL_NOT_VERIFIED" || err.includes("EMAIL_NOT_VERIFIED")) {
                    setNeedsVerify(true);
                }
                const mapped =
                    resultCode === "email_not_verified"
                        ? "EMAIL_NOT_VERIFIED"
                        : resultCode === "rate_limited"
                          ? "RATE_LIMITED"
                          : err;
                setErrorMsg(getLocalizedAuthErrorMessage(mapped, language, t));
            } else {
                const { getSession } = await import("next-auth/react");
                const session = await getSession();
                const destination = resolvePostAuthDestination(
                    session?.user?.role,
                    callbackUrl,
                    window.location.origin
                );
                window.location.href = destination;
            }
        } catch (error) {
            const raw = error instanceof Error ? error.message : null;
            const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
            setErrorMsg(net ?? getLocalizedAuthErrorMessage(raw, language, t));
        } finally {
            setIsLoading(false);
        }
    }

    async function onResendVerification() {
        const email = form.getValues("email").trim();
        if (!email) {
            setErrorMsg(t("loginResendNeedEmail"));
            return;
        }
        setResendState("sending");
        try {
            const res = await fetch("/api/auth/resend-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            if (!res.ok) {
                setResendState("error");
                return;
            }
            setResendState("sent");
        } catch {
            setResendState("error");
        }
    }

    async function onGoogleClick() {
        setIsLoading(true);
        setErrorMsg(null);
        try {
            await signInWithGoogleRole(audience === "teacher" ? "TEACHER" : "STUDENT", callbackUrl);
        } catch {
            setErrorMsg(getLocalizedAuthErrorMessage("oauth_intent_failed", language, t));
            setIsLoading(false);
        }
    }

    const verifyErrMessage =
        verifyError === "missing_token" || verifyError === "invalid_or_expired"
            ? verifyError === "missing_token"
                ? t("loginVerifyErrorMissing")
                : t("loginVerifyErrorExpired")
            : verifyError
              ? t("loginVerifyErrorGeneric")
              : null;

    return (
        <div key={language} className="grid gap-5">
            {verified ? (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t("loginVerifyBannerSuccess")}</span>
                </div>
            ) : null}
            {pendingVerify ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {t("loginVerifyBannerPending")}
                </div>
            ) : null}
            {verifyErrMessage ? (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{verifyErrMessage}</span>
                </div>
            ) : null}

            {errorMsg && (
                <div className="flex animate-in slide-in-from-top-2 items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {needsVerify ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="mb-2">{t("loginAuthErrorEmailNotVerified")}</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={resendState === "sending"}
                        onClick={() => void onResendVerification()}
                    >
                        {resendState === "sending" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("loginResendVerification")}
                    </Button>
                    {resendState === "sent" ? (
                        <p className="mt-2 text-emerald-700">{t("loginResendVerificationSent")}</p>
                    ) : null}
                    {resendState === "error" ? (
                        <p className="mt-2 text-red-600">{t("loginResendVerificationFailed")}</p>
                    ) : null}
                </div>
            ) : null}

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-slate-700">{t("loginLabelEmail")}</FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder={t("loginPlaceholderEmail")}
                                        className="h-11 rounded-xl border-slate-200 focus:border-indigo-400 focus:ring-indigo-400"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="font-semibold text-slate-700">{t("loginLabelPassword")}</FormLabel>
                                <FormControl>
                                    <div className="relative">
                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            placeholder={t("loginPlaceholderPassword")}
                                            className="h-11 rounded-xl border-slate-200 pr-10 focus:border-indigo-400 focus:ring-indigo-400"
                                            {...field}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((current) => !current)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                                        >
                                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        type="submit"
                        className="h-11 w-full rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 font-bold text-white shadow-md transition-all hover:from-indigo-700 hover:to-purple-700 hover:shadow-lg"
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t("loginSubmit")}
                    </Button>
                </form>
            </Form>

            <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-slate-500">{t("signupOrContinueWith")}</span>
                </div>
            </div>

            <Button
                variant="outline"
                type="button"
                disabled={isLoading}
                className="h-11 w-full gap-3 rounded-xl border-2 border-slate-200 font-semibold hover:border-indigo-300 hover:bg-indigo-50"
                onClick={() => void onGoogleClick()}
            >
                <svg className="h-5 w-5" viewBox="0 0 488 512" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path
                        fill="#4285F4"
                        d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
                    />
                </svg>
                {t("signupWithGoogle")}
            </Button>
        </div>
    );
}

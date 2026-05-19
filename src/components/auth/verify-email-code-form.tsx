"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appendCallbackUrl } from "@/lib/auth/callback-url";
import {
  getLocalizedErrorMessageFromResponse,
  tryLocalizeFetchNetworkFailureMessage,
} from "@/lib/ui-error-messages";

type VerifyEmailCodeFormProps = {
  initialEmail?: string | null;
  audience?: "teacher" | "student" | null;
  callbackUrl?: string | null;
};

export function VerifyEmailCodeForm({
  initialEmail = "",
  audience = null,
  callbackUrl = null,
}: VerifyEmailCodeFormProps) {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [email, setEmail] = React.useState(initialEmail ?? "");
  const [code, setCode] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isResending, setIsResending] = React.useState(false);
  const [cooldownSeconds, setCooldownSeconds] = React.useState(0);

  React.useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timeout = window.setTimeout(() => setCooldownSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [cooldownSeconds]);

  const loginHref = React.useMemo(() => {
    const params = new URLSearchParams();
    if (audience) params.set("audience", audience);
    const basePath = params.toString() ? `/login?${params.toString()}` : "/login";
    return appendCallbackUrl(basePath, callbackUrl);
  }, [audience, callbackUrl]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
        }),
      });

      if (!res.ok) {
        const message = await getLocalizedErrorMessageFromResponse(
          res,
          "loginVerifyErrorGeneric",
          t,
          language
        );
        setError(message);
        return;
      }

      setSuccess(t("verifyEmailCodeSuccess"));
      const params = new URLSearchParams({ verified: "1" });
      if (audience) params.set("audience", audience);
      router.push(appendCallbackUrl(`/login?${params.toString()}`, callbackUrl));
    } catch (err) {
      const raw = err instanceof Error ? err.message : null;
      const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
      setError(net ?? t("loginVerifyErrorGeneric"));
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldownSeconds > 0 || isResending) return;
    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const retryAfter = Number(res.headers.get("Retry-After") ?? "0");
        if (retryAfter > 0) {
          setCooldownSeconds(retryAfter);
        }
        const message = await getLocalizedErrorMessageFromResponse(
          res,
          "loginResendVerificationFailed",
          t,
          language
        );
        setError(message);
        return;
      }

      const body = (await res.json()) as { cooldownSeconds?: number };
      setCooldownSeconds(Math.max(0, body.cooldownSeconds ?? 60));
      setSuccess(t("verifyEmailCodeResent"));
    } catch (err) {
      const raw = err instanceof Error ? err.message : null;
      const net = tryLocalizeFetchNetworkFailureMessage(raw, t);
      setError(net ?? t("loginResendVerificationFailed"));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">{t("verifyEmailCodePendingTitle")}</p>
        <p className="mt-1">{t("verifyEmailCodePendingBody")}</p>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      {success ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      ) : null}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="verify-email">{t("registerLabelEmail")}</Label>
          <Input
            id="verify-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("loginPlaceholderEmail")}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="verify-code">{t("verifyEmailCodeLabel")}</Label>
          <Input
            id="verify-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder={t("verifyEmailCodePlaceholder")}
            required
          />
          <p className="text-xs text-slate-500">{t("verifyEmailCodeHint")}</p>
        </div>

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-brand-pink font-bold text-white shadow-md hover:opacity-95"
          disabled={isVerifying}
        >
          {isVerifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {t("verifyEmailCodeSubmit")}
        </Button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <p>{t("verifyEmailCodeResendHint")}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isResending || cooldownSeconds > 0}
            onClick={() => void handleResend()}
          >
            {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {cooldownSeconds > 0
              ? t("verifyEmailCodeResendCooldown", { seconds: cooldownSeconds })
              : t("loginResendVerification")}
          </Button>
          <Button asChild type="button" variant="ghost" size="sm">
            <Link href={loginHref}>{t("verifyEmailCodeBackToLogin")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

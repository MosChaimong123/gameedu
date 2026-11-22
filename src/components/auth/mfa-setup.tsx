"use client";

import { type FormEvent, useRef, useState } from "react";
import Image from "next/image";
import { signOut } from "next-auth/react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clipboard,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  LogOut,
  QrCode,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages";

type Enrollment = { authenticatorId: string; manualKey: string; qrDataUrl: string };
type SetupStep = 1 | 2 | 3;

export function MfaSetup({ requiresPassword }: { requiresPassword: boolean }) {
  const { t, language } = useLanguage();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [copied, setCopied] = useState<"key" | "recovery" | null>(null);
  const beginningRef = useRef(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const currentStep: SetupStep = recoveryCodes.length > 0 ? 3 : enrollment ? 2 : 1;
  const steps = [
    { title: t("mfaStepVerifyTitle"), description: t("mfaStepVerifyDescription"), icon: LockKeyhole },
    { title: t("mfaStepScanTitle"), description: t("mfaStepScanDescription"), icon: QrCode },
    { title: t("mfaStepRecoveryTitle"), description: t("mfaStepRecoveryDescription"), icon: KeyRound },
  ];

  async function begin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || beginningRef.current) return;
    beginningRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mfa/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password || undefined }),
      });
      if (!response.ok) {
        setError(await getLocalizedErrorMessageFromResponse(
          response,
          "mfaSetupFailed",
          t,
          language,
          { overrideTranslationKeys: { REAUTHENTICATION_REQUIRED: "mfaPasswordRequired" } }
        ));
        return;
      }
      setEnrollment(await response.json());
      setPassword("");
    } catch {
      setError(t("mfaSetupFailed"));
    } finally {
      beginningRef.current = false;
      setBusy(false);
    }
  }

  async function activate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || busy || code.length !== 6) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/mfa/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authenticatorId: enrollment.authenticatorId, code }),
      });
      if (!response.ok) {
        setError(await getLocalizedErrorMessageFromResponse(response, "mfaCodeInvalid", t, language));
        return;
      }
      setRecoveryCodes((await response.json()).recoveryCodes);
      setCode("");
    } catch {
      setError(t("mfaCodeInvalid"));
    } finally {
      setBusy(false);
    }
  }

  async function copyValue(value: string, target: "key" | "recovery") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(target);
      window.setTimeout(() => setCopied((current) => current === target ? null : current), 2000);
    } catch {
      setError(t("mfaCopyFailed"));
    }
  }

  return (
    <div
      className="grid min-h-[100dvh] w-full bg-slate-50 lg:grid-cols-[minmax(20rem,0.82fr)_minmax(34rem,1.18fr)]"
      data-testid="mfa-setup-shell"
    >
      <aside className="relative overflow-hidden bg-slate-950 px-6 py-8 text-white sm:px-10 lg:flex lg:min-h-[100dvh] lg:flex-col lg:justify-between lg:px-12 lg:py-12">
        <div aria-hidden="true" className="absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
        <div aria-hidden="true" className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative">
          <div className="mb-8 flex items-center gap-3 lg:mb-14">
            <span className="grid size-11 place-items-center rounded-2xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/30">
              <ShieldCheck className="size-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold tracking-wide">TeachPlayEdu</p>
              <p className="text-xs text-slate-400">{t("mfaSecurityWorkspace")}</p>
            </div>
          </div>

          <div className="max-w-md">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-cyan-300">{t("mfaProtectedBadge")}</p>
            <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">{t("mfaSetupTitle")}</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-300 sm:text-base">{t("mfaSetupSecuritySummary")}</p>
          </div>
        </div>

        <ol className="relative mt-8 grid gap-3 sm:grid-cols-3 lg:mt-12 lg:grid-cols-1" aria-label={t("mfaSetupProgressLabel")}>
          {steps.map((step, index) => {
            const number = (index + 1) as SetupStep;
            const complete = number < currentStep;
            const active = number === currentStep;
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className={cn(
                  "flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors duration-300",
                  active && "bg-white/10",
                  !active && "text-slate-400"
                )}
                aria-current={active ? "step" : undefined}
                data-state={complete ? "complete" : active ? "active" : "pending"}
              >
                <span className={cn(
                  "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl border text-xs font-black transition-all duration-300",
                  complete && "border-cyan-400 bg-cyan-400 text-slate-950",
                  active && "border-cyan-300 bg-cyan-300/10 text-cyan-200",
                  !active && !complete && "border-slate-700 bg-slate-900 text-slate-500"
                )}>
                  {complete ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
                </span>
                <div className="min-w-0">
                  <p className={cn("text-sm font-bold", active && "text-white", complete && "text-cyan-200")}>{step.title}</p>
                  <p className="mt-0.5 hidden text-xs leading-5 text-slate-400 lg:block">{step.description}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </aside>

      <section className="flex min-h-[34rem] items-center px-5 py-10 sm:px-10 lg:px-16 lg:py-14" aria-labelledby="mfa-action-title">
        <div className="mx-auto w-full max-w-2xl animate-in fade-in slide-in-from-bottom-3 duration-500">
          {currentStep === 1 && (
            <div className="max-w-xl">
              <div className="mb-8 grid size-14 place-items-center rounded-2xl bg-cyan-100 text-cyan-800">
                <LockKeyhole className="size-7" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-cyan-700">{t("mfaStepOneEyebrow")}</p>
              <h2 id="mfa-action-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t("mfaVerifyIdentityTitle")}</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">{t("mfaVerifyIdentityDescription")}</p>

              <form onSubmit={begin} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-800" htmlFor="mfa-current-password">{t("securityCurrentPassword")}</label>
                  <div className="relative">
                    <Input
                      id="mfa-current-password"
                      name="current-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      required={requiresPassword}
                      aria-required={requiresPassword}
                      className="h-12 rounded-xl border-slate-300 bg-white pr-12 text-base"
                      placeholder={t("securityCurrentPassword")}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
                      aria-label={t(showPassword ? "loginHidePassword" : "loginShowPassword")}
                      onClick={() => setShowPassword((value) => !value)}
                    >
                      {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                    </button>
                  </div>
                  <p className="text-xs leading-5 text-slate-500">
                    {t(requiresPassword ? "mfaPasswordRequired" : "mfaPasswordHelp")}
                  </p>
                </div>

                <Button type="submit" size="lg" className="h-12 w-full rounded-xl bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20 hover:bg-cyan-400" disabled={busy}>
                  {busy ? t("mfaBeginSetupBusy") : t("mfaBeginSetup")}
                  {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
                </Button>
              </form>
            </div>
          )}

          {currentStep === 2 && enrollment && (
            <div className="max-w-2xl">
              <p className="text-sm font-bold text-cyan-700">{t("mfaStepTwoEyebrow")}</p>
              <h2 id="mfa-action-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t("mfaScanAuthenticatorTitle")}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">{t("mfaScanAuthenticatorDescription")}</p>

              <div className="mt-8 grid gap-7 md:grid-cols-[15rem_1fr] md:items-start">
                <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Image src={enrollment.qrDataUrl} width={240} height={240} unoptimized alt={t("mfaQrAlt")} className="mx-auto aspect-square w-full rounded-2xl" />
                </div>
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-800">
                      <Smartphone className="size-4 text-cyan-700" aria-hidden="true" />
                      {t("mfaManualKeyLabel")}
                    </div>
                    <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 pl-4 shadow-sm">
                      <code className="min-w-0 flex-1 break-all text-sm font-bold tracking-wider text-slate-700">{enrollment.manualKey}</code>
                      <Button type="button" variant="ghost" size="icon" className="rounded-xl" aria-label={t("mfaCopyManualKey")} onClick={() => void copyValue(enrollment.manualKey, "key")}>
                        {copied === "key" ? <Check className="text-emerald-600" aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                      </Button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-500">{t("mfaManualKeyHelp")}</p>
                  </div>

                  <form onSubmit={activate} className="space-y-3">
                    <label className="text-sm font-bold text-slate-800" htmlFor="mfa-activation-code">{t("mfaSixDigitCode")}</label>
                    <Input
                      id="mfa-activation-code"
                      name="one-time-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      autoFocus
                      className="h-12 rounded-xl border-slate-300 bg-white text-center text-xl font-black tracking-[0.35em]"
                      placeholder="000000"
                      value={code}
                      onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    />
                    <p className="text-xs leading-5 text-slate-500">{t("mfaActivationHelp")}</p>
                    <Button type="submit" size="lg" className="h-12 w-full rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={busy || code.length !== 6}>
                      {busy ? t("mfaActivateBusy") : t("mfaActivate")}
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="max-w-2xl">
              <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </div>
              <p className="text-sm font-bold text-emerald-700">{t("mfaStepThreeEyebrow")}</p>
              <h2 id="mfa-action-title" className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t("mfaSaveRecoveryTitle")}</h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">{t("mfaSaveRecoveryDescription")}</p>

              <div className="mt-7 rounded-3xl bg-slate-950 p-5 text-white sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <p className="text-sm font-bold">{t("mfaRecoveryCodesLabel")}</p>
                  <Button type="button" size="sm" variant="secondary" className="rounded-lg" onClick={() => void copyValue(recoveryCodes.join("\n"), "recovery")}>
                    {copied === "recovery" ? <Check className="text-emerald-600" aria-hidden="true" /> : <Clipboard aria-hidden="true" />}
                    {copied === "recovery" ? t("mfaCopied") : t("mfaCopyRecoveryCodes")}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-x-5 gap-y-2 font-mono text-sm sm:grid-cols-3">
                  {recoveryCodes.map((item) => <code key={item} className="rounded-lg bg-white/5 px-2 py-2 text-center text-slate-100">{item}</code>)}
                </div>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                <input type="checkbox" className="mt-0.5 size-4 rounded border-amber-400 accent-cyan-600" checked={recoveryConfirmed} onChange={(event) => setRecoveryConfirmed(event.target.checked)} />
                <span className="leading-6">{t("mfaRecoveryConfirm")}</span>
              </label>

              <Button className="mt-5 h-12 w-full rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400" disabled={!recoveryConfirmed} onClick={() => void signOut({ callbackUrl: "/login" })}>
                {t("mfaRecoverySaved")}
                <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          )}

          {error && <p role="alert" aria-live="assertive" className="mt-5 animate-in slide-in-from-top-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

          {currentStep < 3 && (
            <button type="button" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500" onClick={() => void signOut({ callbackUrl: "/login" })}>
              <LogOut className="size-4" aria-hidden="true" />
              {t("mfaSignOutAction")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

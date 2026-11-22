"use client";

import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPasskeyErrorTranslationKey } from "@/lib/auth/passkey-client-errors";

export function MfaChallenge({ destination, hasPasskey }: { destination: string; hasPasskey: boolean }) {
  const { t } = useLanguage();
  const [method, setMethod] = useState<"totp" | "recovery">("totp");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function verify(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    const response = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      window.location.replace(destination);
      return;
    }
    setError(t("mfaChallengeFailed"));
    setBusy(false);
  }

  async function verifyWithPasskey() {
    setBusy(true);
    setError("");
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/authentication-options", { method: "POST" });
      if (!optionsResponse.ok) throw new Error("PASSKEY_OPTIONS_FAILED");
      const response = await startAuthentication(await optionsResponse.json());
      await verify({ method: "passkey", response });
    } catch (passkeyError) {
      setError(t(getPasskeyErrorTranslationKey(passkeyError, "mfaPasskeyChallengeFailed")));
      setBusy(false);
    }
  }

  return (
    <section className="w-full space-y-5 rounded-3xl border bg-white p-7 shadow-sm" aria-labelledby="mfa-challenge-title">
      <div>
        <h1 id="mfa-challenge-title" className="text-2xl font-black">{t("mfaChallengeTitle")}</h1>
        <p className="mt-1 text-sm text-slate-600">{t("mfaChallengeDescription")}</p>
      </div>
      <div className="flex gap-2" role="group" aria-label={t("mfaChallengeTitle")}>
        <Button type="button" variant={method === "totp" ? "default" : "outline"} aria-pressed={method === "totp"} onClick={() => setMethod("totp")}>{t("mfaAuthenticatorMethod")}</Button>
        <Button type="button" variant={method === "recovery" ? "default" : "outline"} aria-pressed={method === "recovery"} onClick={() => setMethod("recovery")}>{t("mfaRecoveryMethod")}</Button>
      </div>
      <label className="sr-only" htmlFor="mfa-code">{method === "totp" ? t("mfaSixDigitCode") : t("mfaRecoveryMethod")}</label>
      <Input id="mfa-code" name="one-time-code" autoFocus autoCapitalize="characters" autoComplete="one-time-code" inputMode={method === "totp" ? "numeric" : "text"} placeholder={method === "totp" ? t("mfaSixDigitCode") : "XXXX-XXXX"} value={code} onChange={(event) => setCode(event.target.value)} />
      <Button type="button" className="w-full" disabled={busy || code.length < 6} onClick={() => void verify({ method, code })}>{t("mfaVerifyAction")}</Button>
      {hasPasskey ? (
        <Button type="button" className="w-full" variant="outline" disabled={busy} onClick={() => void verifyWithPasskey()}>{t("mfaUsePasskey")}</Button>
      ) : null}
      {error && <p role="alert" aria-live="assertive" className="text-sm text-red-600">{error}</p>}
    </section>
  );
}

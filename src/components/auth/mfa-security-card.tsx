"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { startRegistration } from "@simplewebauthn/browser";
import { ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getPasskeyErrorTranslationKey } from "@/lib/auth/passkey-client-errors";

type Status = {
  totpEnabled: boolean;
  recoveryCodesRemaining: number;
  passkeys: Array<{ id: string; name: string; createdAt: string }>;
};

export function MfaSecurityCard() {
  const { t } = useLanguage();
  const [status, setStatus] = useState<Status | null>(null);
  const [password, setPassword] = useState("");
  const [passkeyName, setPasskeyName] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/auth/mfa/status", { cache: "no-store" });
    if (response.ok) setStatus(await response.json());
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function addPasskey() {
    setError("");
    try {
      const optionsResponse = await fetch("/api/auth/passkeys/registration-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: password || undefined }),
      });
      if (!optionsResponse.ok) throw new Error("PASSKEY_OPTIONS_FAILED");
      const response = await startRegistration(await optionsResponse.json());
      const verification = await fetch("/api/auth/passkeys/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: passkeyName, response }),
      });
      if (!verification.ok) throw new Error("PASSKEY_VERIFICATION_FAILED");
      setPassword("");
      setPasskeyName("");
      await load();
    } catch (passkeyError) {
      setError(t(getPasskeyErrorTranslationKey(passkeyError, "mfaAddPasskeyFailed")));
    }
  }

  async function revokePasskey(id: string) {
    setError("");
    const response = await fetch(`/api/auth/passkeys/${id}`, { method: "DELETE" });
    if (response.ok) await load();
    else setError(t("mfaRevokePasskeyFailed"));
  }

  async function regenerate() {
    setError("");
    const response = await fetch("/api/auth/mfa/recovery-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: password || undefined }),
    });
    if (response.ok) setRecoveryCodes((await response.json()).recoveryCodes);
    else setError(t("mfaRecoveryRegenerateFailed"));
  }

  return (
    <Card className="rounded-3xl border-slate-200 shadow-sm lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-cyan-600" />{t("mfaTitle")}</CardTitle>
        <CardDescription>{t("mfaDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {status && (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm">
            <p><span>{t("mfaAuthenticatorMethod")}: </span><strong>{t(status.totpEnabled ? "mfaTotpEnabled" : "mfaTotpDisabled")}</strong></p>
            <p>{t("mfaRecoveryRemaining")}: <strong>{status.recoveryCodesRemaining}</strong></p>
          </div>
        )}
        {!status?.totpEnabled && <Button asChild><Link href="/auth/mfa/setup">{t("mfaSetupAuthenticator")}</Link></Button>}
        {status?.totpEnabled && <Button type="button" variant="outline" onClick={() => void regenerate()}>{t("mfaRegenerateRecovery")}</Button>}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="sr-only" htmlFor="mfa-security-password">{t("securityCurrentPassword")}</label>
          <Input id="mfa-security-password" name="current-password" type="password" autoComplete="current-password" placeholder={t("securityCurrentPassword")} value={password} onChange={(event) => setPassword(event.target.value)} />
          <label className="sr-only" htmlFor="passkey-name">{t("mfaPasskeyNamePlaceholder")}</label>
          <Input id="passkey-name" name="passkey-name" autoComplete="off" placeholder={t("mfaPasskeyNamePlaceholder")} value={passkeyName} onChange={(event) => setPasskeyName(event.target.value)} />
        </div>
        <Button type="button" variant="outline" onClick={() => void addPasskey()}>{t("mfaAddPasskey")}</Button>
        <div className="space-y-2">
          {status?.passkeys.map((passkey) => (
            <div key={passkey.id} className="flex items-center justify-between rounded-xl border p-3">
              <span className="font-medium">{passkey.name}</span>
              <Button type="button" size="sm" variant="destructive" onClick={() => void revokePasskey(passkey.id)}>{t("mfaRevokePasskey")}</Button>
            </div>
          ))}
        </div>
        {recoveryCodes.length > 0 && <pre className="grid grid-cols-2 gap-2 overflow-x-auto rounded-xl bg-slate-950 p-4 text-center text-white">{recoveryCodes.map((code) => <span key={code}>{code}</span>)}</pre>}
        {error && <p role="alert" aria-live="assertive" className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  );
}

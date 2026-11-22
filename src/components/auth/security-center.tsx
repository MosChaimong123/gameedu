"use client";

import { useCallback, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { Activity, KeyRound, Laptop, Link2, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageBackLink } from "@/components/ui/page-back-link";
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages";
import { MfaSecurityCard } from "@/components/auth/mfa-security-card";

type SecuritySession = { id: string; deviceLabel: string; authMethod: string; createdAt: string; lastSeenAt: string; expiresAt: string; current: boolean };
type SecurityActivity = { action: string; status: string; reason: string | null; timestamp: string };
type Providers = { password: boolean; google: boolean; passkey: boolean };

export function SecurityCenter() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [activity, setActivity] = useState<SecurityActivity[]>([]);
  const [providers, setProviders] = useState<Providers>({ password: false, google: false, passkey: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [providerPassword, setProviderPassword] = useState("");
  const [sessionsPassword, setSessionsPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsResponse, activityResponse, providersResponse] = await Promise.all([
        fetch("/api/auth/security/sessions", { cache: "no-store" }),
        fetch("/api/auth/security/activity", { cache: "no-store" }),
        fetch("/api/auth/account-providers", { cache: "no-store" }),
      ]);
      if (!sessionsResponse.ok || !activityResponse.ok || !providersResponse.ok) throw new Error("SECURITY_LOAD_FAILED");
      setSessions((await sessionsResponse.json()).sessions);
      setActivity((await activityResponse.json()).activity);
      setProviders((await providersResponse.json()).methods);
    } catch {
      toast({ title: t("securityActionFailed"), variant: "destructive" });
    } finally { setLoading(false); }
  }, [t, toast]);

  useEffect(() => { void load(); }, [load]);

  async function mutate(key: string, url: string, init: RequestInit, onSuccess?: (body: Record<string, unknown>) => Promise<void> | void) {
    setBusy(key);
    try {
      const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init.headers ?? {}) } });
      if (!response.ok) {
        const description = await getLocalizedErrorMessageFromResponse(response, "securityActionFailed", t, language);
        toast({ title: t("securityActionFailed"), description, variant: "destructive" });
        return;
      }
      const body = await response.json();
      toast({ title: t("securityActionSuccess") });
      await onSuccess?.(body);
      await load();
    } catch {
      toast({ title: t("securityActionFailed"), variant: "destructive" });
    } finally { setBusy(null); }
  }

  const activityLabel = (action: string) => action.includes("session") ? t("securitySessionRevoked") : action.includes("login") ? t("securitySessionCreated") : t("securityCredentialChanged");
  const date = (value: string) => new Intl.DateTimeFormat(language === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-12">
      <PageBackLink href="/dashboard/settings" labelKey="settings" />
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
        <div className="flex items-center gap-4"><span className="rounded-2xl bg-cyan-400/15 p-3 text-cyan-300"><ShieldCheck className="h-7 w-7" /></span><div><h1 className="text-3xl font-black">{t("securityCenterTitle")}</h1><p className="mt-1 text-sm text-slate-300 sm:text-base">{t("securityCenterSubtitle")}</p></div></div>
      </header>

      {loading ? <div className="flex items-center justify-center gap-3 rounded-3xl border bg-white p-12 text-slate-500"><RefreshCw className="h-5 w-5 animate-spin" />{t("securityLoading")}</div> : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5 text-violet-600" />{t("securityPasswordTitle")}</CardTitle></CardHeader><CardContent className="space-y-3">
            <Input type="password" autoComplete="current-password" placeholder={t("securityCurrentPassword")} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
            <Input type="password" autoComplete="new-password" minLength={12} placeholder={t("securityNewPassword")} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <Button className="w-full" disabled={busy !== null || newPassword.length < 12} onClick={() => void mutate("password", "/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) }, async () => { toast({ title: t("securityPasswordChanged") }); await signOut({ callbackUrl: "/login" }); })}>{t("securityChangePassword")}</Button>
          </CardContent></Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm"><CardHeader><CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5 text-blue-600" />{t("securityProvidersTitle")}</CardTitle></CardHeader><CardContent className="space-y-3">
            {(["password", "google", "passkey"] as const).map((method) => <div key={method} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><span className="font-semibold">{t(method === "password" ? "securityPasswordMethod" : method === "google" ? "securityGoogleMethod" : "securityPasskeyMethod")}</span><Badge variant={providers[method] ? "default" : "outline"}>{t(providers[method] ? "securityConnected" : "securityNotConnected")}</Badge></div>)}
            <Input type="password" autoComplete="current-password" placeholder={t("securityCurrentPassword")} value={providerPassword} onChange={(event) => setProviderPassword(event.target.value)} />
            <Button variant={providers.google ? "destructive" : "outline"} className="w-full" disabled={busy !== null || !providerPassword} onClick={() => providers.google
              ? void mutate("provider", "/api/auth/account-providers/google", { method: "DELETE", body: JSON.stringify({ currentPassword: providerPassword }) }, async () => { await signOut({ callbackUrl: "/login" }); })
              : void mutate("provider", "/api/auth/account-providers/google/link-intent", { method: "POST", body: JSON.stringify({ currentPassword: providerPassword }) }, async () => { await signIn("google", { callbackUrl: "/dashboard/settings/security" }); })}>{t(providers.google ? "securityUnlinkGoogle" : "securityLinkGoogle")}</Button>
          </CardContent></Card>

          <Card className="rounded-3xl border-slate-200 shadow-sm lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Laptop className="h-5 w-5 text-emerald-600" />{t("securitySessionsTitle")}</CardTitle><CardDescription>{t("securitySessionsSubtitle")}</CardDescription></CardHeader><CardContent className="space-y-3">
            {sessions.length === 0 ? <p className="text-sm text-slate-500">{t("securityNoSessions")}</p> : sessions.map((item) => <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold">{item.deviceLabel}{item.current && <Badge variant="secondary">{t("securityCurrentSession")}</Badge>}</div><p className="mt-1 text-xs text-slate-500">{item.authMethod} · {date(item.lastSeenAt)}</p></div><Button size="sm" variant="outline" disabled={busy !== null} onClick={() => void mutate(item.id, `/api/auth/security/sessions/${item.id}`, { method: "DELETE" }, async (body) => { if (body.current) await signOut({ callbackUrl: "/login" }); })}>{t("securityRevoke")}</Button></div>)}
            {providers.password && <Input type="password" autoComplete="current-password" placeholder={t("securityCurrentPassword")} value={sessionsPassword} onChange={(event) => setSessionsPassword(event.target.value)} />}
            <Button variant="destructive" disabled={busy !== null || sessions.filter((item) => !item.current).length === 0} onClick={() => void mutate("others", "/api/auth/security/sessions/logout-others", { method: "POST", body: JSON.stringify({ currentPassword: sessionsPassword || undefined }) })}><LogOut className="mr-2 h-4 w-4" />{t("securityLogoutOthers")}</Button>
          </CardContent></Card>

          <MfaSecurityCard />

          <Card className="rounded-3xl border-slate-200 shadow-sm lg:col-span-2"><CardHeader><CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-amber-600" />{t("securityActivityTitle")}</CardTitle></CardHeader><CardContent className="space-y-2">{activity.length === 0 ? <p className="text-sm text-slate-500">{t("securityNoActivity")}</p> : activity.map((item, index) => <div key={`${item.timestamp}-${index}`} className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0"><div><p className="font-medium">{activityLabel(item.action)}</p><p className="text-xs text-slate-500">{item.action}</p></div><time className="text-xs text-slate-500">{date(item.timestamp)}</time></div>)}</CardContent></Card>
        </div>
      )}
    </div>
  );
}

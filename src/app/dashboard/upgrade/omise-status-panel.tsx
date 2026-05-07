"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

type OmiseStatus = {
    ready: boolean;
    provider: string | null;
    omise: {
        hasSecretKey: boolean;
        secretKeyMode: "test" | "live" | null;
        hasPublicKey: boolean;
        publicKeyMode: "test" | "live" | null;
        monthlySatang: number;
        yearlySatang: number;
    };
    appOrigin: string | null;
    issues: string[];
};

/**
 * Teacher/admin-only diagnostic panel for the live Thai-billing (Omise) config
 * on the running server. Reads `/api/billing/thai/status` and renders a
 * concise readiness summary so we can debug "PromptPay button does nothing"
 * issues without opening Render shell or env panels.
 *
 * Defaults to closed; collapsible to keep the marketing page clean.
 */
export function OmiseStatusPanel() {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState<OmiseStatus | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/billing/thai/status", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
            });
            if (!res.ok) {
                setError(`HTTP ${res.status}`);
                return;
            }
            const json = (await res.json()) as OmiseStatus;
            setData(json);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Network error");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (open && !data && !loading) {
            void load();
        }
    }, [open, data, loading]);

    return (
        <div
            className={cn(
                "mx-auto max-w-xl rounded-2xl border bg-white text-left text-sm shadow-sm",
                data?.ready === false ? "border-amber-300" : "border-slate-200"
            )}
        >
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-slate-700"
            >
                <span className="flex items-center gap-2 font-bold">
                    <span
                        aria-hidden
                        className={cn(
                            "inline-flex h-2.5 w-2.5 rounded-full",
                            data == null
                                ? "bg-slate-300"
                                : data.ready
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                        )}
                    />
                    Omise / Thai billing diagnostic
                </span>
                {open ? (
                    <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
            </button>
            {open ? (
                <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-slate-700">
                    {loading ? <div className="text-slate-400">Loading…</div> : null}
                    {error ? (
                        <div className="rounded-xl bg-red-50 px-3 py-2 text-red-900">
                            {error}
                        </div>
                    ) : null}
                    {data ? (
                        <div className="space-y-2">
                            <Row k="Ready" v={data.ready ? "✅ yes" : "⚠️ no"} />
                            <Row k="Provider" v={data.provider ?? "—"} />
                            <Row
                                k="Secret key"
                                v={
                                    data.omise.hasSecretKey
                                        ? `present (${data.omise.secretKeyMode ?? "?"})`
                                        : "missing"
                                }
                            />
                            <Row
                                k="Public key"
                                v={
                                    data.omise.hasPublicKey
                                        ? `present (${data.omise.publicKeyMode ?? "?"})`
                                        : "missing"
                                }
                            />
                            <Row k="App origin" v={data.appOrigin ?? "—"} />
                            <Row
                                k="Monthly amount"
                                v={`${(data.omise.monthlySatang / 100).toFixed(2)} THB (${data.omise.monthlySatang} satang)`}
                            />
                            <Row
                                k="Yearly amount"
                                v={`${(data.omise.yearlySatang / 100).toFixed(2)} THB (${data.omise.yearlySatang} satang)`}
                            />
                            {data.issues.length > 0 ? (
                                <div className="mt-2 space-y-1 rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                                    <div className="font-bold">Issues:</div>
                                    <ul className="ml-4 list-disc">
                                        {data.issues.map((it) => (
                                            <li key={it}>{it}</li>
                                        ))}
                                    </ul>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                    <button
                        type="button"
                        onClick={() => void load()}
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                        <RefreshCw className="h-3 w-3" /> Refresh
                    </button>
                </div>
            ) : null}
        </div>
    );
}

function Row({ k, v }: { k: string; v: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-semibold text-slate-500">{k}</span>
            <span className="break-all text-right font-mono text-xs text-slate-800">{v}</span>
        </div>
    );
}

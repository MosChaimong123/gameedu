"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, Mail } from "lucide-react";
import Link from "next/link";

export function ForgotPasswordForm() {
    const router = useRouter();
    const [email, setEmail] = React.useState("");
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const trimmed = email.trim();
        if (!trimmed || !trimmed.includes("@")) {
            setErrorMsg("กรุณากรอกอีเมลที่ถูกต้อง");
            return;
        }
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmed }),
            });
            if (res.status === 429) {
                const retryAfter = res.headers.get("Retry-After");
                const wait = retryAfter ? Number(retryAfter) : 30;
                setErrorMsg(`กรุณารอ ${wait} วินาทีก่อนส่งใหม่`);
                return;
            }
            if (!res.ok) {
                setErrorMsg("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
                return;
            }
            const data = (await res.json()) as { referenceCode?: string; devCode?: string };
            try {
                if (data.referenceCode) sessionStorage.setItem("pwreset_ref", data.referenceCode);
                else sessionStorage.removeItem("pwreset_ref");
                if (data.devCode) sessionStorage.setItem("pwreset_devcode", data.devCode);
                else sessionStorage.removeItem("pwreset_devcode");
            } catch {
                // sessionStorage unavailable — ignore, user can still enter codes manually
            }
            router.push(`/forgot-password/reset?email=${encodeURIComponent(trimmed)}`);
        } catch {
            setErrorMsg("ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="grid gap-5">
            <div className="grid gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">ลืมรหัสผ่าน?</h1>
                <p className="text-sm text-slate-500">
                    กรอกอีเมลของคุณ เราจะส่งรหัส OTP สำหรับตั้งรหัสผ่านใหม่
                </p>
            </div>

            {errorMsg && (
                <div className="flex animate-in slide-in-from-top-2 items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="fp-email">
                        อีเมล
                    </label>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                            id="fp-email"
                            type="email"
                            autoComplete="email"
                            placeholder="your@email.com"
                            className="h-11 rounded-xl border-slate-200 pl-9 focus:border-brand-pink focus:ring-brand-pink"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isLoading}
                        />
                    </div>
                </div>
                <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-brand-pink font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    ส่งรหัส OTP
                </Button>
            </form>

            <p className="text-center text-sm text-slate-500">
                จำรหัสผ่านได้แล้ว?{" "}
                <Link href="/login" className="font-semibold text-slate-700 underline hover:text-slate-900">
                    เข้าสู่ระบบ
                </Link>
            </p>
        </div>
    );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";
const RESEND_COOLDOWN_SECONDS = 30;

type ResetPasswordFormProps = {
    initialEmail: string;
};

export function ResetPasswordForm({ initialEmail }: ResetPasswordFormProps) {
    const router = useRouter();
    const [email, setEmail] = React.useState(initialEmail);
    const [code, setCode] = React.useState("");
    const [referenceCode, setReferenceCode] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(false);
    const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
    const [resendState, setResendState] = React.useState<"idle" | "sending" | "sent" | "error" | "cooldown">("idle");
    const [cooldownLeft, setCooldownLeft] = React.useState(0);
    const [devCode, setDevCode] = React.useState<string | null>(null);

    React.useEffect(() => {
        try {
            const ref = sessionStorage.getItem("pwreset_ref");
            if (ref) setReferenceCode(ref);
            const dc = sessionStorage.getItem("pwreset_devcode");
            if (dc) {
                setDevCode(dc);
                setCode(dc);
            }
        } catch {
            // sessionStorage unavailable — ignore
        }
    }, []);

    React.useEffect(() => {
        if (cooldownLeft <= 0) return;
        const timer = setInterval(() => {
            setCooldownLeft((prev) => {
                if (prev <= 1) {
                    setResendState("idle");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldownLeft]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setErrorMsg("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
            return;
        }
        if (newPassword.length < 6) {
            setErrorMsg("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
            return;
        }
        setIsLoading(true);
        setErrorMsg(null);
        try {
            const body: Record<string, string> = { email, code, newPassword };
            if (referenceCode.trim()) body.referenceCode = referenceCode.trim();

            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            const data = (await res.json()) as { ok?: boolean; error?: string };

            if (!res.ok) {
                const errMap: Record<string, string> = {
                    EMAIL_VERIFICATION_CODE_INVALID: "รหัส OTP ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
                    EMAIL_VERIFICATION_CODE_EXPIRED: "รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่",
                    EMAIL_VERIFICATION_CODE_TOO_MANY_ATTEMPTS: "ลองผิดหลายครั้งเกินไป กรุณาขอรหัสใหม่",
                    INVALID_PAYLOAD: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง",
                };
                setErrorMsg(errMap[data.error ?? ""] ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
                return;
            }

            router.push("/login?passwordReset=1");
        } catch {
            setErrorMsg("ไม่สามารถเชื่อมต่อได้ กรุณาตรวจสอบอินเทอร์เน็ต");
        } finally {
            setIsLoading(false);
        }
    }

    async function onResend() {
        const trimmed = email.trim();
        if (!trimmed) {
            setErrorMsg("กรุณากรอกอีเมลก่อน");
            return;
        }
        setResendState("sending");
        try {
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: trimmed }),
            });
            if (res.status === 429) {
                const retryAfter = res.headers.get("Retry-After");
                const wait = retryAfter ? Number(retryAfter) : RESEND_COOLDOWN_SECONDS;
                setResendState("cooldown");
                setCooldownLeft(wait);
                return;
            }
            if (!res.ok) {
                setResendState("error");
                return;
            }
            const data = (await res.json()) as { referenceCode?: string; devCode?: string };
            if (data.referenceCode) setReferenceCode(data.referenceCode);
            if (data.devCode) {
                setDevCode(data.devCode);
                setCode(data.devCode);
            }
            setResendState("cooldown");
            setCooldownLeft(RESEND_COOLDOWN_SECONDS);
        } catch {
            setResendState("error");
        }
    }

    return (
        <div className="grid gap-5">
            <div className="grid gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">ตั้งรหัสผ่านใหม่</h1>
                <p className="text-sm text-slate-500">
                    กรอกรหัส OTP ที่ส่งไปที่อีเมลของคุณ พร้อมรหัสผ่านใหม่
                </p>
            </div>

            {errorMsg && (
                <div className="flex animate-in slide-in-from-top-2 items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}

            {devCode ? (
                <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-center text-sm text-sky-900">
                    <p className="mb-1 text-xs font-semibold text-sky-700">รหัส OTP (โหมดทดสอบ — ไม่ได้ส่งอีเมลจริง)</p>
                    <p className="font-mono text-2xl font-bold tracking-[0.4em]">{devCode}</p>
                </div>
            ) : null}

            <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="rp-email">
                        อีเมล
                    </label>
                    <Input
                        id="rp-email"
                        type="email"
                        autoComplete="email"
                        placeholder="your@email.com"
                        className="h-11 rounded-xl border-slate-200 focus:border-brand-pink focus:ring-brand-pink"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700" htmlFor="rp-code">
                            รหัส OTP (6 หลัก)
                        </label>
                        <button
                            type="button"
                            disabled={resendState === "sending" || resendState === "cooldown"}
                            onClick={() => void onResend()}
                            className="text-xs text-slate-500 underline hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {resendState === "sending" && "กำลังส่ง..."}
                            {resendState === "cooldown" && `ส่งใหม่ได้ใน ${cooldownLeft}s`}
                            {(resendState === "idle" || resendState === "sent" || resendState === "error") && "ส่ง OTP ใหม่"}
                        </button>
                    </div>
                    {resendState === "sent" && (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            ส่ง OTP ใหม่แล้ว
                        </div>
                    )}
                    {resendState === "error" && (
                        <p className="text-xs text-red-600">ส่ง OTP ไม่สำเร็จ กรุณาลองใหม่</p>
                    )}
                    <Input
                        id="rp-code"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="123456"
                        maxLength={6}
                        className="h-11 rounded-xl border-slate-200 text-center text-lg tracking-widest focus:border-brand-pink focus:ring-brand-pink"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="rp-ref">
                        รหัสอ้างอิง <span className="font-normal text-slate-400">(ถ้ามี)</span>
                    </label>
                    <Input
                        id="rp-ref"
                        type="text"
                        placeholder="TP-XXXX"
                        className="h-11 rounded-xl border-slate-200 focus:border-brand-pink focus:ring-brand-pink"
                        value={referenceCode}
                        onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                        disabled={isLoading}
                    />
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="rp-password">
                        รหัสผ่านใหม่
                    </label>
                    <div className="relative">
                        <Input
                            id="rp-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="อย่างน้อย 6 ตัวอักษร"
                            className="h-11 rounded-xl border-slate-200 pr-10 focus:border-brand-pink focus:ring-brand-pink"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            disabled={isLoading}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                        >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700" htmlFor="rp-confirm">
                        ยืนยันรหัสผ่านใหม่
                    </label>
                    <Input
                        id="rp-confirm"
                        type={showPassword ? "text" : "password"}
                        placeholder="กรอกรหัสผ่านอีกครั้ง"
                        className="h-11 rounded-xl border-slate-200 focus:border-brand-pink focus:ring-brand-pink"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <Button
                    type="submit"
                    className="h-11 w-full rounded-xl bg-brand-pink font-bold text-white shadow-md transition-all hover:opacity-95 hover:shadow-lg"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    บันทึกรหัสผ่านใหม่
                </Button>
            </form>

            <p className="text-center text-sm text-slate-500">
                <Link href="/login" className="font-semibold text-slate-700 underline hover:text-slate-900">
                    กลับไปเข้าสู่ระบบ
                </Link>
            </p>
        </div>
    );
}

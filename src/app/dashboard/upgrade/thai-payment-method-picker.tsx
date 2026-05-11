"use client";

import { cn } from "@/lib/utils";
import { QrCode } from "lucide-react";

export type ThaiPaymentMethod =
    | "promptpay"
    | "mobile_banking_scb"
    | "mobile_banking_kbank"
    | "mobile_banking_bay"
    | "mobile_banking_bbl"
    | "mobile_banking_ktb";

type Option = {
    id: ThaiPaymentMethod;
    label: string;
    sub?: string;
    /** Two-letter monogram fallback when no SVG asset is available. */
    monogram: string;
    bgClass: string;
    textClass: string;
};

/**
 * Mobile banking deep links require enabling each channel in the Omise
 * dashboard (Settings → Payment methods). PromptPay is universal across
 * Thai banks via QR scan and is the default.
 */
const OPTIONS: readonly Option[] = [
    {
        id: "promptpay",
        label: "PromptPay (ทุกธนาคาร)",
        sub: "สแกน QR ในแอปธนาคารตัวเอง",
        monogram: "QR",
        bgClass: "bg-blue-50",
        textClass: "text-blue-700",
    },
    {
        id: "mobile_banking_scb",
        label: "SCB EASY",
        sub: "ไทยพาณิชย์",
        monogram: "SCB",
        bgClass: "bg-brand-pink/10",
        textClass: "text-brand-pink",
    },
    {
        id: "mobile_banking_kbank",
        label: "K PLUS",
        sub: "กสิกรไทย",
        monogram: "K+",
        bgClass: "bg-green-50",
        textClass: "text-green-700",
    },
    {
        id: "mobile_banking_bay",
        label: "KMA",
        sub: "กรุงศรีอยุธยา",
        monogram: "BAY",
        bgClass: "bg-yellow-50",
        textClass: "text-yellow-800",
    },
    {
        id: "mobile_banking_bbl",
        label: "Bualuang mBanking",
        sub: "กรุงเทพ",
        monogram: "BBL",
        bgClass: "bg-sky-50",
        textClass: "text-sky-700",
    },
    {
        id: "mobile_banking_ktb",
        label: "Krungthai NEXT",
        sub: "กรุงไทย",
        monogram: "KTB",
        bgClass: "bg-cyan-50",
        textClass: "text-cyan-700",
    },
] as const;

export function ThaiPaymentMethodPicker({
    value,
    onChange,
    disabled,
}: {
    value: ThaiPaymentMethod;
    onChange: (next: ThaiPaymentMethod) => void;
    disabled?: boolean;
}) {
    return (
        <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((opt) => {
                const active = opt.id === value;
                return (
                    <button
                        key={opt.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(opt.id)}
                        className={cn(
                            "group flex items-center gap-2 rounded-xl border-2 p-2 text-left transition-all",
                            active
                                ? "border-brand-pink bg-brand-pink/10 shadow-sm"
                                : "border-slate-200 bg-white hover:border-brand-pink/40",
                            disabled && "opacity-60 cursor-not-allowed"
                        )}
                    >
                        <span
                            className={cn(
                                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[11px] font-black",
                                opt.bgClass,
                                opt.textClass
                            )}
                            aria-hidden
                        >
                            {opt.id === "promptpay" ? (
                                <QrCode className="h-5 w-5" />
                            ) : (
                                opt.monogram
                            )}
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-xs font-black text-slate-900">
                                {opt.label}
                            </span>
                            {opt.sub ? (
                                <span className="truncate text-[10px] font-medium text-slate-500">
                                    {opt.sub}
                                </span>
                            ) : null}
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

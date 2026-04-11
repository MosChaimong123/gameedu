"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatProgressProps {
    label: string;
    value: number;
    max: number;
    color?: string;
    icon?: React.ReactNode;
    className?: string;
    showValue?: boolean;
}

export function StatProgress({ 
    label, value, max, color = "bg-indigo-500", icon, className, showValue = true 
}: StatProgressProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex justify-between items-end px-1">
                <div className="flex items-center gap-1.5 overflow-hidden">
                    {icon && <span className="shrink-0">{icon}</span>}
                    <span className="text-[10px] uppercase font-black tracking-widest text-slate-400 truncate">
                        {label}
                    </span>
                </div>
                {showValue && (
                    <span className="text-[10px] font-bold text-slate-500 shrink-0">
                        {value} / {max}
                    </span>
                )}
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-50 p-[1px]">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)]", color)}
                />
            </div>
        </div>
    );
}

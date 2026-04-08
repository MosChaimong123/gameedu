"use client";

import type { LucideIcon } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

type AdminSectionHeaderProps = {
    titleKey: string;
    descKey: string;
    icon: LucideIcon;
    iconClassName: string;
};

export function AdminSectionHeader({ titleKey, descKey, icon: Icon, iconClassName }: AdminSectionHeaderProps) {
    const { t } = useLanguage();
    return (
        <div>
            <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${iconClassName}`} />
                <h1 className="text-2xl font-black text-slate-800">{t(titleKey)}</h1>
            </div>
            <p className="text-slate-500 text-sm">{t(descKey)}</p>
        </div>
    );
}

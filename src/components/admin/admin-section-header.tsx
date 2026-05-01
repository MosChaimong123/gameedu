"use client";

import { BookOpen, Newspaper, Trophy, Users, type LucideIcon } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

const ADMIN_SECTION_ICONS = {
    users: Users,
    bookOpen: BookOpen,
    newspaper: Newspaper,
    trophy: Trophy,
} as const satisfies Record<string, LucideIcon>;

export type AdminSectionIconName = keyof typeof ADMIN_SECTION_ICONS;

type AdminSectionHeaderProps = {
    titleKey: string;
    descKey: string;
    icon: AdminSectionIconName;
    iconClassName: string;
};

export function AdminSectionHeader({ titleKey, descKey, icon, iconClassName }: AdminSectionHeaderProps) {
    const { t } = useLanguage();
    const Icon = ADMIN_SECTION_ICONS[icon];
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

"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

export function LanguageToggle({ className }: { className?: string }) {
    const { language, toggleLanguage, t } = useLanguage()

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className={cn("h-8 min-w-12 shrink-0 px-2 font-bold border-2", className)}
            aria-label={language === "en" ? t("languageToggleToThai") : t("languageToggleToEnglish")}
        >
            {language === "en" ? "TH" : "EN"}
        </Button>
    )
}

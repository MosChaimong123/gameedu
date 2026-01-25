"use client"

import { Button } from "@/components/ui/button"
import { useLanguage } from "@/components/providers/language-provider"

export function LanguageToggle() {
    const { language, toggleLanguage } = useLanguage()

    return (
        <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="w-12 h-8 font-bold border-2"
        >
            {language === "en" ? "TH" : "EN"}
        </Button>
    )
}

"use client"

import React, { createContext, startTransition, useContext, useEffect, useState } from "react"
import { Language } from "@/lib/translations"
import { LANGUAGE_COOKIE_MAX_AGE_SEC, LANGUAGE_COOKIE_NAME } from "@/lib/language-cookie"
import { getTranslationText } from "@/lib/translation-lookup"

type LanguageContextType = {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string, params?: Record<string, string | number>) => string
    toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

function writeLanguageCookie(lang: Language) {
    if (typeof document === "undefined") return
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${lang};path=/;max-age=${LANGUAGE_COOKIE_MAX_AGE_SEC};SameSite=Lax`
}

type LanguageProviderProps = {
    children: React.ReactNode
    /** From server (cookie) so first paint matches SSR when possible. */
    initialLanguage?: Language
}

export function LanguageProvider({ children, initialLanguage = "en" }: LanguageProviderProps) {
    const [language, setLanguage] = useState<Language>(initialLanguage)

    useEffect(() => {
        const stored = localStorage.getItem("language") as Language | null
        if (stored === "th" || stored === "en") {
            if (stored !== initialLanguage) {
                startTransition(() => {
                    setLanguage(stored)
                })
            }
            writeLanguageCookie(stored)
            return
        }
        localStorage.setItem("language", initialLanguage)
        writeLanguageCookie(initialLanguage)
    }, [initialLanguage])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem("language", lang)
        writeLanguageCookie(lang)
    }

    const toggleLanguage = () => {
        const newLang = language === "en" ? "th" : "en"
        handleSetLanguage(newLang)
    }

    const t = (key: string, params?: Record<string, string | number>) => {
        let text = getTranslationText(language, key)
        if (params) {
            Object.entries(params).forEach(([paramKey, value]) => {
                text = text.replace(`{${paramKey}}`, String(value))
            })
        }
        return text
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t, toggleLanguage }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider")
    }
    return context
}

"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { translations, Language } from "@/lib/translations"

type LanguageContextType = {
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string, params?: Record<string, string | number>) => string
    toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>("en")
    const [isMounted, setIsMounted] = useState(false)

    // Load language preference from local storage on mount
    useEffect(() => {
        setIsMounted(true)
        const savedLang = localStorage.getItem("language") as Language
        if (savedLang) {
            setLanguage(savedLang)
        }
    }, [])

    const handleSetLanguage = (lang: Language) => {
        setLanguage(lang)
        localStorage.setItem("language", lang)
    }

    const toggleLanguage = () => {
        const newLang = language === "en" ? "th" : "en"
        handleSetLanguage(newLang)
    }

    const t = (key: string, params?: Record<string, string | number>) => {
        let text = (translations[language] as any)[key] || key
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

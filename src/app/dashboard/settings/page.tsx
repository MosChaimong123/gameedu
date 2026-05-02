"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { useLanguage } from "@/components/providers/language-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Settings,
    Volume2,
    Languages,
    Shield,
    Save,
    Globe,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { PageBackLink } from "@/components/ui/page-back-link"
import type { UserSettings } from "@/lib/user-settings"
import { parseUserSettings } from "@/lib/user-settings"
import { useToast } from "@/components/ui/use-toast"
import { getLocalizedErrorMessageFromResponse } from "@/lib/ui-error-messages"

type SettingsState = UserSettings & {
    language: "en" | "th"
    notifications: boolean
    highPerformance: boolean
}

const LANGUAGE_DEFS = [
    { id: "th" as const, nameKey: "userSettingsLangTh", subKey: "userSettingsLangThSub", flag: "🇹🇭" },
    { id: "en" as const, nameKey: "userSettingsLangEn", subKey: "userSettingsLangEnSub", flag: "🇬🇧" },
] as const

export default function SettingsPage() {
    const { data: session, update } = useSession()
    const { t, setLanguage, language } = useLanguage()
    const { toast } = useToast()

    const [loading, setLoading] = useState(false)
    const [saved, setSaved] = useState(false)
    const [hasInitialized, setHasInitialized] = useState(false)

    const [settings, setSettings] = useState<SettingsState>({
        sfxEnabled: true,
        bgmEnabled: true,
        language: "th",
        notifications: true,
        highPerformance: false,
    })

    useEffect(() => {
        if (session?.user && !hasInitialized) {
            if (session.user.settings) {
                const userSettings = parseUserSettings(session.user.settings)
                setSettings((prev) => ({
                    ...prev,
                    ...userSettings,
                    language: userSettings.language === "en" ? "en" : "th",
                }))
            }
            setHasInitialized(true)
        }
    }, [session, hasInitialized])

    const handleSave = async () => {
        setLoading(true)
        setSaved(false)

        try {
            const res = await fetch("/api/user/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(settings),
            })

            if (res.ok) {
                setSaved(true)
                await update({ settings })
                setTimeout(() => setSaved(false), 3000)
            } else {
                const description = await getLocalizedErrorMessageFromResponse(
                    res,
                    "toastGenericError",
                    t,
                    language
                )
                toast({
                    title: t("error"),
                    description,
                    variant: "destructive",
                })
            }
        } catch (error) {
            console.error("Save error", error)
            toast({
                title: t("error"),
                description: t("toastGenericError"),
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }))

        if (key === "language") setLanguage(value as SettingsState["language"])
    }

    return (
        <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-12">
            <div className="mx-auto w-full max-w-4xl space-y-10 py-2 animate-in fade-in slide-in-from-bottom-6 duration-700 sm:py-4">
                <PageBackLink href="/dashboard" labelKey="navBackDashboard" />
                <div className="flex flex-col gap-6 border-b border-border pb-10 md:flex-row md:items-end md:justify-between">
                    <div className="space-y-2">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200"
                        >
                            <Settings className="h-8 w-8 animate-pulse" />
                        </motion.div>
                        <h1 className="text-4xl font-black leading-none tracking-tight text-foreground">{t("settings")}</h1>
                        <p className="max-w-md text-lg font-medium leading-relaxed text-muted-foreground">{t("settingsDesc")}</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <AnimatePresence mode="wait">
                            {saved ? (
                                <motion.div
                                    key="saved"
                                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-6 py-3 font-black text-emerald-600 shadow-sm"
                                >
                                    <AnimatePresence>
                                        <motion.div animate={{ rotate: [0, 10, -10, 0] }}>✓</motion.div>
                                    </AnimatePresence>
                                    {t("saved")}
                                </motion.div>
                            ) : (
                                <Button
                                    key="save"
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="group h-14 gap-3 rounded-2xl border-0 bg-slate-900 px-10 font-black text-white shadow-2xl transition-all hover:scale-105 hover:bg-black active:scale-95"
                                >
                                    {loading ? (
                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    ) : (
                                        <>
                                            <Save className="h-5 w-5 transition-transform group-hover:rotate-12" />
                                            {t("saveChanges")}
                                        </>
                                    )}
                                </Button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <Tabs defaultValue="language" className="w-full space-y-10">
                    <div className="flex justify-center">
                        <TabsList className="h-16 gap-2 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-200/50">
                            <TabsTrigger value="language" className="gap-2 rounded-2xl px-8 font-black transition-all data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <Languages className="h-4 w-4" /> {t("userSettingsLanguageTab")}
                            </TabsTrigger>
                            <TabsTrigger value="audio" className="gap-2 rounded-2xl px-8 font-black transition-all data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
                                <Volume2 className="h-4 w-4" /> {t("audio")}
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="language" className="animate-in fade-in zoom-in-95 duration-500 focus-visible:outline-none">
                        <Card className="border-0 bg-card p-2 shadow-2xl shadow-slate-200/50 rounded-[3rem]">
                            <CardHeader className="p-10 pb-4">
                                <CardTitle className="flex items-center gap-4 text-3xl font-black">
                                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-600">
                                        <Globe className="h-8 w-8" />
                                    </div>
                                    {t("userSettingsLanguageTitle")}
                                </CardTitle>
                                <CardDescription className="text-lg font-medium text-muted-foreground">
                                    {t("userSettingsLanguageSubtitle")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-10 pt-6">
                                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                                    {LANGUAGE_DEFS.map((lang) => (
                                        <motion.button
                                            key={lang.id}
                                            whileHover={{ y: -5, scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => updateSetting("language", lang.id)}
                                            className={`group relative overflow-hidden rounded-[2.5rem] border-4 p-8 text-left transition-all ${
                                                settings.language === lang.id
                                                    ? "border-indigo-600 bg-indigo-50/50 shadow-xl shadow-indigo-100"
                                                    : "border-slate-100 bg-slate-50 hover:border-indigo-200"
                                            }`}
                                        >
                                            <div className="relative z-10 flex flex-col gap-4">
                                                <span className="block origin-left text-5xl transition-transform group-hover:scale-110">{lang.flag}</span>
                                                <div>
                                                    <h4 className={`text-2xl font-black leading-none ${settings.language === lang.id ? "text-indigo-600" : "text-foreground"}`}>
                                                        {t(lang.nameKey)}
                                                    </h4>
                                                    <p className="mt-2 text-sm font-black uppercase tracking-widest text-muted-foreground">{t(lang.subKey)}</p>
                                                </div>
                                            </div>
                                            {settings.language === lang.id && (
                                                <motion.div
                                                    layoutId="activeLang"
                                                    className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg"
                                                >
                                                    <AnimatePresence>
                                                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>✓</motion.div>
                                                    </AnimatePresence>
                                                </motion.div>
                                            )}
                                        </motion.button>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="audio" className="animate-in fade-in zoom-in-95 duration-500 focus-visible:outline-none">
                        <Card className="overflow-hidden rounded-[3rem] border-0 bg-card shadow-2xl shadow-slate-200/50">
                            <CardContent className="space-y-8 p-10">
                                <div className="group flex items-center justify-between rounded-[2.5rem] border border-border bg-muted p-8 transition-all hover:bg-muted/50">
                                    <div className="flex items-center gap-6">
                                        <div className="rounded-3xl bg-indigo-600 p-4 text-white shadow-lg shadow-indigo-200 transition-transform group-hover:rotate-6">
                                            <Volume2 className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-2xl font-black italic leading-none text-foreground">{t("userSettingsSfxTitle")}</Label>
                                            <p className="mt-1 text-sm font-black uppercase tracking-widest text-muted-foreground">{t("userSettingsSfxHint")}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.sfxEnabled}
                                        onCheckedChange={(val) => updateSetting("sfxEnabled", val)}
                                        className="scale-125 data-[state=checked]:bg-indigo-600"
                                    />
                                </div>

                                <div className="group flex items-center justify-between rounded-[2.5rem] border border-border bg-muted p-8 transition-all hover:bg-muted/50">
                                    <div className="flex items-center gap-6">
                                        <div className="rounded-3xl bg-emerald-500 p-4 text-white shadow-lg shadow-emerald-200 transition-transform group-hover:-rotate-6">
                                            <Globe className="h-8 w-8" />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-2xl font-black italic leading-none text-foreground">{t("userSettingsBgmTitle")}</Label>
                                            <p className="mt-1 text-sm font-black uppercase tracking-widest text-muted-foreground">{t("userSettingsBgmHint")}</p>
                                        </div>
                                    </div>
                                    <Switch
                                        checked={settings.bgmEnabled}
                                        onCheckedChange={(val) => updateSetting("bgmEnabled", val)}
                                        className="scale-125 data-[state=checked]:bg-emerald-500"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {session?.user?.role === "ADMIN" && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} className="pt-10">
                        <div className="group relative">
                            <div className="absolute -inset-1 rounded-[3.5rem] bg-gradient-to-r from-red-500 to-indigo-600 opacity-30 blur" />
                            <Card className="relative overflow-hidden rounded-[3rem] border-0 bg-indigo-600 p-2 text-white shadow-2xl">
                                <div className="space-y-8 p-10">
                                    <div className="flex items-center gap-6">
                                        <div className="rounded-[2rem] bg-white p-5 text-indigo-600 shadow-2xl">
                                            <Shield className="h-10 w-10" />
                                        </div>
                                        <div className="space-y-1">
                                            <h2 className="text-4xl font-black italic leading-none">{t("userSettingsAdminCardTitle")}</h2>
                                            <p className="text-lg font-bold text-indigo-100">{t("userSettingsAdminCardSubtitle")}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                                        <Button variant="secondary" className="h-16 rounded-2xl text-lg font-black shadow-xl transition-all hover:scale-105">{t("userSettingsAdminBtnMembers")}</Button>
                                        <Button variant="secondary" className="h-16 rounded-2xl text-lg font-black shadow-xl transition-all hover:scale-105">{t("userSettingsAdminBtnStatus")}</Button>
                                        <Button className="h-16 rounded-2xl bg-slate-900 text-lg font-black text-white shadow-xl transition-all hover:scale-105 hover:bg-black">{t("userSettingsAdminBtnMaintenance")}</Button>
                                    </div>
                                </div>
                            </Card>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    )
}

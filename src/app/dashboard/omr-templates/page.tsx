"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { PageBackLink } from "@/components/ui/page-back-link"
import { motion, AnimatePresence } from "framer-motion"
import { OMRPrintableSheet } from "@/components/omr/omr-printable-sheet"
import { useLanguage } from "@/components/providers/language-provider"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import { isOmrDashboardEnabled } from "@/lib/omr-dashboard-enabled"
import { Loader2 } from "lucide-react"

type TemplateSize = "20" | "50" | "80"

type TemplateOption = {
    id: TemplateSize
    label: string
    icon: string
    description: string
}

export default function OMRTemplatesPage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const { t } = useLanguage()
    const [selectedSize, setSelectedSize] = useState<TemplateSize>("20")
    const omrEnabled = isOmrDashboardEnabled()

    const templates: TemplateOption[] = useMemo(
        () => [
            {
                id: "20",
                label: t("omrTemplatesSize20Label"),
                icon: "📄",
                description: t("omrTemplatesSize20Desc"),
            },
            {
                id: "50",
                label: t("omrTemplatesSize50Label"),
                icon: "📑",
                description: t("omrTemplatesSize50Desc"),
            },
            {
                id: "80",
                label: t("omrTemplatesSize80Label"),
                icon: "📚",
                description: t("omrTemplatesSize80Desc"),
            },
        ],
        [t]
    )

    useEffect(() => {
        if (!omrEnabled) {
            router.replace("/dashboard")
        }
    }, [omrEnabled, router])

    useEffect(() => {
        if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) {
            router.replace("/dashboard")
        }
    }, [router, session, status])

    if (status === "loading") {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1, ease: "linear" }}
                    className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-700"
                />
            </div>
        )
    }

    if (status === "authenticated" && !isTeacherOrAdmin(session.user.role)) {
        return null
    }

    if (!omrEnabled) {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
            </div>
        )
    }

    return (
        <div className="min-h-0 w-full font-sans">
            <div className="mx-auto w-full max-w-6xl">
                <div className="mb-8 flex flex-wrap items-center gap-4">
                    <PageBackLink href="/dashboard/omr" labelKey="navBackOmr" />
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-800">{t("omrTemplatesPageTitle")}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {t("omrTemplatesPageSubtitle")}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-12 lg:grid-cols-4">
                    <div className="space-y-4 lg:col-span-1">
                        <h2 className="mb-6 px-1 text-xs font-black uppercase tracking-widest text-slate-400">
                            {t("omrTemplatesSelectSize")}
                        </h2>
                        {templates.map((opt) => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => setSelectedSize(opt.id)}
                                className={`flex w-full flex-col gap-2 rounded-[2rem] border-2 p-6 text-left transition-all ${
                                    selectedSize === opt.id
                                        ? "scale-105 border-slate-900 bg-slate-900 text-white shadow-xl"
                                        : "border-white bg-white text-slate-600 hover:border-slate-200"
                                }`}
                            >
                                <span className="text-3xl">{opt.icon}</span>
                                <span className="text-lg font-black leading-tight">{opt.label}</span>
                                <p
                                    className={`text-[10px] font-bold leading-relaxed ${
                                        selectedSize === opt.id ? "text-slate-400" : "text-slate-400"
                                    }`}
                                >
                                    {opt.description}
                                </p>
                            </button>
                        ))}

                        <div className="relative mt-12 overflow-hidden rounded-[2.5rem] bg-brand-purple p-8 text-white shadow-xl shadow-brand-purple/25">
                            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                            <h3 className="relative z-10 mb-3 text-xl font-black">{t("omrTemplatesProTipTitle")}</h3>
                            <p className="relative z-10 text-xs font-bold leading-relaxed opacity-90">
                                {t("omrTemplatesProTipBody")}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col items-center lg:col-span-3">
                        <div className="flex min-h-[80vh] w-full flex-col items-center rounded-[4rem] border border-slate-100 bg-white p-12 shadow-sm">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={selectedSize}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="flex w-full flex-col items-center"
                                >
                                    <div className="mb-8 text-center">
                                        <h2 className="mb-2 text-2xl font-black text-slate-800">{t("omrTemplatesPreviewTitle")}</h2>
                                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {t("omrTemplatesPreviewSub")}
                                        </p>
                                    </div>

                                    <OMRPrintableSheet type={selectedSize} quizTitle={t("omrTemplatesMasterTitle")} />
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { OMRScanner } from "@/components/omr/omr-scanner"
import { Button } from "@/components/ui/button"
import { Camera, Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { PageBackLink } from "@/components/ui/page-back-link"
import { OpenCVProvider } from "@/components/omr/opencv-provider"
import { processOMR } from "@/lib/omr-logic"
import { motion } from "framer-motion"
import { getLocalizedOmrErrorMessageFromResponse } from "@/lib/omr-ui-messages"
import { tryLocalizeFetchNetworkFailureMessage } from "@/lib/ui-error-messages"
import { useLanguage } from "@/components/providers/language-provider"
import { isTeacherOrAdmin } from "@/lib/role-guards"
import { isOmrDashboardEnabled } from "@/lib/omr-dashboard-enabled"
import { parseOmrScannerQaFlags } from "@/lib/omr-scanner-fallbacks"

type OMRResultItem = {
    question: number
    answer: string | null
    isCorrect?: boolean
    correctAnswer?: string
}

type OMRProcessResult = {
    success: boolean
    message: string
    data?: OMRResultItem[]
}

type OMRQuizSet = {
    id: string
    title: string
    answerKey: Record<string, string>
}

const QA_PROCESS_SUCCESS_DATA: OMRResultItem[] = [{ question: 1, answer: "A" }]

export default function OMRInferencePage() {
    const router = useRouter()
    const { data: session, status } = useSession()
    const { t, language } = useLanguage()
    const [showScanner, setShowScanner] = useState(false)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)
    const [isProcessing, setIsProcessing] = useState(false)
    const [result, setResult] = useState<OMRProcessResult | null>(null)
    const [selectedSet, setSelectedSet] = useState<OMRQuizSet | null>(null)
    const [score, setScore] = useState<{ correct: number, total: number } | null>(null)
    const omrEnabled = isOmrDashboardEnabled()

    const applyProcessResult = async (res: OMRProcessResult) => {
        setResult(res)

        if (!res.success || !selectedSet || !res.data) {
            return
        }

        const answerKey = selectedSet.answerKey as Record<string, string>
        let correctCount = 0
        const total = res.data.length

        res.data.forEach((item: OMRResultItem) => {
            const correctVal = answerKey[item.question.toString()]
            if (correctVal && item.answer === correctVal) {
                correctCount++
                item.isCorrect = true
            } else {
                item.isCorrect = false
                item.correctAnswer = correctVal
            }
        })

        const scoreData = { correct: correctCount, total }
        setScore(scoreData)

        const qaFlags = parseOmrScannerQaFlags(window.location.search)
        if (qaFlags.forceSaveResultError) {
            setResult({ success: false, message: t("omrSaveResultError"), data: res.data })
            return
        }

        const saveRes = await fetch(`/api/omr/quizzes/${selectedSet.id}/results`, {
            method: "POST",
            body: JSON.stringify({
                score: correctCount,
                total,
                answers: res.data,
                studentName: `Student ${new Date().toLocaleTimeString()}`
            })
        })

        if (!saveRes.ok) {
            const message = await getLocalizedOmrErrorMessageFromResponse(
                saveRes,
                "omrSaveResultError",
                t,
                language
            )
            setResult({ success: false, message, data: res.data })
        }
    }

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

    // Fetch OMR Quiz on load if ID provided
    useEffect(() => {
        if (!omrEnabled) return
        if (status !== "authenticated" || !isTeacherOrAdmin(session.user.role)) {
            return
        }
        const searchParams = new URLSearchParams(window.location.search)
        const quizId = searchParams.get("quizId")
        
        if (quizId) {
            fetch(`/api/omr/quizzes/${quizId}`)
                .then(async (res) => {
                    if (!res.ok) {
                        throw new Error(
                            await getLocalizedOmrErrorMessageFromResponse(res, "omrLoadQuizError", t, language)
                        )
                    }
                    return res.json()
                })
                .then(data => {
                    setSelectedSet(data)
                    setShowScanner(true)
                })
                .catch((error: unknown) => {
                    const raw = error instanceof Error ? error.message : null
                    const net = tryLocalizeFetchNetworkFailureMessage(raw, t)
                    const message = net ?? (error instanceof Error ? error.message : t("omrLoadQuizError"))
                    setResult({ success: false, message })
                })
        }
        // `t` is listed so locale changes refresh messages.
    }, [session, status, language, t, omrEnabled])

    if (status === "loading") {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-purple" />
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

    const handleCapture = async (imageData: string) => {
        setCapturedImage(imageData)
        setShowScanner(false)
        setIsProcessing(true)
        setResult(null)
        setScore(null)

        const qaFlags = parseOmrScannerQaFlags(window.location.search)
        if (qaFlags.forceProcessSuccess) {
            try {
                await applyProcessResult({
                    success: true,
                    message: t("omrScanComplete"),
                    data: QA_PROCESS_SUCCESS_DATA.map((item) => ({ ...item })),
                })
            } catch {
                setResult({ success: false, message: t("omrProcessingError") })
            } finally {
                setIsProcessing(false)
            }
            return
        }

        const img = new window.Image()
        img.src = imageData
        img.onload = async () => {
            try {
                const res = await processOMR(
                    // @ts-expect-error window.cv is injected by the OpenCV script at runtime
                    window.cv,
                    img
                )
                await applyProcessResult(res)
            } catch {
                setResult({ success: false, message: t("omrProcessingError") })
            } finally {
                setIsProcessing(false)
            }
        }
        img.onerror = () => {
            setResult({ success: false, message: t("omrProcessingError") })
            setIsProcessing(false)
        }
    }

    return (
        <OpenCVProvider>
            <div className="flex min-h-[calc(100dvh-6rem)] w-full flex-col items-center rounded-2xl bg-slate-900 p-4 md:p-8">
                <div className="w-full max-w-4xl">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <PageBackLink href="/dashboard/omr" labelKey="navBackOmr" variant="inverse" />
                            <div>
                                <h1 className="text-2xl font-black text-white tracking-tight">{t("omrScannerTitle")}</h1>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-brand-sky">
                                    {selectedSet
                                        ? t("omrScannerChecking", { title: selectedSet.title })
                                        : t("omrScannerWait")}
                                </p>
                            </div>
                        </div>

                        {selectedSet && (
                            <Button 
                                onClick={() => setShowScanner(true)}
                                className="h-12 rounded-2xl bg-white px-6 font-black text-slate-900 shadow-xl shadow-white/5 transition-all hover:bg-brand-purple hover:text-white"
                            >
                                <Camera className="mr-2 w-5 h-5" />
                                {t("omrScannerScanNext")}
                            </Button>
                        )}
                    </div>

                    {/* Results Area */}
                    <div className="w-full flex flex-col items-center gap-8">
                        {capturedImage ? (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full">
                                <div className="relative">
                                    <Image src={capturedImage} alt={t("omrCapturedSheetAlt")} width={1200} height={900} unoptimized className="w-full rounded-[2.5rem] shadow-2xl border-4 border-white/5 aspect-[4/3] object-cover" />
                                    {isProcessing && (
                                        <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center text-white">
                                            <Loader2 className="mb-4 h-12 w-12 animate-spin text-brand-sky" />
                                            <p className="font-black text-xl tracking-tight">{t("omrScannerProcessing")}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-6">
                                    {result && (
                                        <motion.div 
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="space-y-6"
                                        >
                                            {score && (
                                                <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-brand-purple to-brand-navy p-10 text-center text-white shadow-2xl">
                                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                                        <CheckCircle2 className="w-24 h-24 rotate-12" />
                                                    </div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 opacity-60">
                                                        {t("omrScannerStudentScoreSummary")}
                                                    </p>
                                                    <h2 className="text-7xl font-black leading-none mb-2 tabular-nums">{score.correct}<span className="text-3xl opacity-40">/{score.total}</span></h2>
                                                    <p className="font-bold text-sm text-white/80 shrink-0 truncate">
                                                        {t("omrScannerDataSaved")}
                                                    </p>
                                                </div>
                                            )}

                                            <div className={`p-6 rounded-[2rem] border-2 flex items-center gap-4 ${result.success ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${result.success ? "bg-emerald-500" : "bg-red-500"}`}>
                                                    {result.success ? <CheckCircle2 className="text-white w-6 h-6" /> : <AlertCircle className="text-white w-6 h-6" />}
                                                </div>
                                                <div>
                                                    <h3 className={`font-black text-lg ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                                                        {result.success ? t("omrScanComplete") : t("omrScanFailed")}
                                                    </h3>
                                                    <p className="text-white/60 text-xs font-bold uppercase tracking-wider">{result.message}</p>
                                                </div>
                                            </div>

                                            {result.success && result.data && (
                                                <div className="bg-white/5 rounded-[2.5rem] p-8 border border-white/5 max-h-[400px] overflow-auto custom-scrollbar">
                                                    <div className="grid grid-cols-4 gap-3">
                                                        {result.data.map((item: OMRResultItem) => (
                                                            <div key={item.question} className={`p-4 rounded-2xl border flex flex-col items-center transition-all ${
                                                                item.answer === null ? "bg-white/5 border-white/10 opacity-30" :
                                                                item.isCorrect ? "bg-emerald-500/20 border-emerald-500/30 ring-1 ring-emerald-500/20" : "bg-red-500/20 border-red-500/30 ring-1 ring-red-500/20"
                                                            }`}>
                                                                <span className="text-[10px] font-black text-white/30 uppercase mb-1">Q{item.question}</span>
                                                                <div className="flex flex-col items-center">
                                                                    <span className={`text-xl font-black ${item.answer ? (item.isCorrect ? "text-emerald-400" : "text-red-400") : "text-white/20"}`}>
                                                                        {item.answer || "-"}
                                                                    </span>
                                                                    {!item.isCorrect && item.answer && (
                                                                        <span className="text-[10px] font-black text-emerald-500 mt-0.5 opacity-80">{item.correctAnswer}</span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                {result ? (
                                    <div className={`mb-8 w-full max-w-2xl p-6 rounded-[2rem] border-2 flex items-center gap-4 ${result.success ? "bg-emerald-500/10 border-emerald-500/20" : "bg-red-500/10 border-red-500/20"}`}>
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${result.success ? "bg-emerald-500" : "bg-red-500"}`}>
                                            {result.success ? <CheckCircle2 className="text-white w-6 h-6" /> : <AlertCircle className="text-white w-6 h-6" />}
                                        </div>
                                        <div className="text-left">
                                            <h3 className={`font-black text-lg ${result.success ? "text-emerald-400" : "text-red-400"}`}>
                                                {result.success ? t("omrScanComplete") : t("omrScanFailed")}
                                            </h3>
                                            <p className="text-white/60 text-xs font-bold uppercase tracking-wider">{result.message}</p>
                                        </div>
                                    </div>
                                ) : null}

                                <div className="opacity-20 group">
                                    <div className="w-32 h-32 rounded-full border-4 border-dashed border-white flex items-center justify-center mb-8 rotate-12 group-hover:rotate-0 transition-transform duration-500">
                                        <Camera className="w-12 h-12 text-white" />
                                    </div>
                                    <h3 className="text-3xl font-black text-white mb-2">{t("omrScannerNoScanYet")}</h3>
                                    <p className="text-white font-bold uppercase tracking-[0.3em] text-[10px]">
                                        {t("omrAwaitingCapture")}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {showScanner && (
                    <OMRScanner 
                        onCapture={handleCapture} 
                        onClose={() => setShowScanner(false)} 
                    />
                )}

                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 8px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: rgba(255,255,255,0.05);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(255,255,255,0.1);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(255,255,255,0.2);
                    }
                `}</style>
            </div>
        </OpenCVProvider>
    )
}

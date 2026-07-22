"use client"

import type React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { motion } from "framer-motion"
import {
    ArrowRight,
    Camera,
    CheckCircle2,
    Hand,
    Monitor,
    Play,
    ScanLine,
    Smartphone,
    Sparkles,
    Timer,
    Trophy,
    Users,
    Wifi,
} from "lucide-react"
import { useLanguage } from "@/components/providers/language-provider"
import { cn } from "@/lib/utils"

type AnswerTarget = {
    key: string
    labelKey: string
    className: string
}

type PlaySurface = "teacher" | "student"
type PreviewStep = "setup" | "play"
type CameraStatus = "idle" | "starting" | "ready" | "denied" | "unsupported" | "error"
type HandGesture = "open" | "hover" | "pinch" | "locked"
type HandPoint = { x: number; y: number }

const ANSWERS: AnswerTarget[] = [
    {
        key: "left",
        labelKey: "arQuestPreviewOptionLeft",
        className: "left-[7%] top-[44%] sm:left-[12%] sm:top-[43%]",
    },
    {
        key: "center",
        labelKey: "arQuestPreviewOptionCenter",
        className: "left-1/2 top-[50%] -translate-x-1/2",
    },
    {
        key: "right",
        labelKey: "arQuestPreviewOptionRight",
        className: "right-[7%] top-[43%] sm:right-[14%] sm:top-[42%]",
    },
]

function StatusPill({
    icon,
    label,
    tone = "slate",
}: {
    icon: React.ReactNode
    label: string
    tone?: "cyan" | "emerald" | "pink" | "slate"
}) {
    return (
        <div
            className={cn(
                "inline-flex h-9 items-center gap-2 rounded-full border px-3 text-xs font-black shadow-sm backdrop-blur-md",
                tone === "cyan" && "border-cyan-200/60 bg-cyan-50/90 text-cyan-900",
                tone === "emerald" && "border-emerald-200/60 bg-emerald-50/90 text-emerald-900",
                tone === "pink" && "border-pink-200/60 bg-pink-50/90 text-pink-900",
                tone === "slate" && "border-white/30 bg-white/85 text-slate-800"
            )}
        >
            {icon}
            <span>{label}</span>
        </div>
    )
}

function TrackingHand({
    point,
    gesture,
    progress,
}: {
    point: HandPoint
    gesture: HandGesture
    progress: number
}) {
    const points = [
        { x: -42, y: -16 },
        { x: -14, y: -34 },
        { x: 14, y: -30 },
        { x: 34, y: 0 },
        { x: 6, y: 34 },
        { x: -28, y: 30 },
    ]

    return (
        <motion.div
            className="pointer-events-none absolute inset-0 z-20"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45 }}
        >
            <motion.div
                className="absolute"
                animate={{ left: `${point.x}%`, top: `${point.y}%` }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
            >
                <div
                    className={cn(
                        "absolute -left-14 -top-14 h-28 w-28 rounded-full border-2 shadow-[0_0_26px_rgb(103_232_249_/_0.38)]",
                        gesture === "locked"
                            ? "border-emerald-300 bg-emerald-300/10"
                            : gesture === "pinch"
                              ? "border-pink-300 bg-pink-300/10"
                              : "border-cyan-200/70 bg-cyan-200/10"
                    )}
                    style={{
                        background:
                            gesture === "pinch"
                                ? `conic-gradient(rgba(244,63,138,0.42) ${progress}%, rgba(255,255,255,0.1) 0)`
                                : undefined,
                    }}
                />
                <div className="absolute -left-10 -top-3 h-[2px] w-20 rounded-full bg-cyan-200/80 shadow-[0_0_14px_rgb(103_232_249_/_0.75)]" />
                <div className="absolute -left-6 -top-5 h-[2px] w-16 rotate-[36deg] rounded-full bg-cyan-200/80 shadow-[0_0_14px_rgb(103_232_249_/_0.75)]" />
                <div className="absolute -left-9 top-3 h-[2px] w-14 -rotate-[24deg] rounded-full bg-cyan-200/80 shadow-[0_0_14px_rgb(103_232_249_/_0.75)]" />
                {points.map((joint, index) => (
                    <motion.span
                        key={`${joint.x}-${joint.y}`}
                        className="absolute h-2.5 w-2.5 rounded-full bg-pink-400 shadow-[0_0_16px_rgb(244_63_138_/_0.9)]"
                        style={{
                            left: joint.x,
                            top: joint.y,
                        }}
                        animate={{ scale: gesture === "pinch" && index === 1 ? [1, 1.65, 1] : [1, 1.18, 1] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: index * 0.08 }}
                    />
                ))}
            </motion.div>
        </motion.div>
    )
}

export function ArQuestPlayPreview() {
    const { t } = useLanguage()
    const [playSurface, setPlaySurface] = useState<PlaySurface>("student")
    const [previewStep, setPreviewStep] = useState<PreviewStep>("setup")
    const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle")
    const [handPoint, setHandPoint] = useState<HandPoint>({ x: 50, y: 62 })
    const [hoverAnswerKey, setHoverAnswerKey] = useState<string | null>(null)
    const [lockedAnswerKey, setLockedAnswerKey] = useState<string | null>("center")
    const [handGesture, setHandGesture] = useState<HandGesture>("open")
    const [holdProgress, setHoldProgress] = useState(0)
    const answerRefs = useRef<Record<string, HTMLButtonElement | null>>({})
    const holdTimerRef = useRef<number | null>(null)
    const videoRef = useRef<HTMLVideoElement | null>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const isTeacherSurface = playSurface === "teacher"

    const clearHold = useCallback(() => {
        if (holdTimerRef.current) {
            window.clearTimeout(holdTimerRef.current)
            holdTimerRef.current = null
        }
        setHoldProgress(0)
    }, [])

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        if (videoRef.current) {
            videoRef.current.srcObject = null
        }
    }, [])

    const findAnswerAtPoint = useCallback((clientX: number, clientY: number) => {
        return (
            ANSWERS.find((answer) => {
                const rect = answerRefs.current[answer.key]?.getBoundingClientRect()
                if (!rect) return false
                return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
            })?.key ?? null
        )
    }, [])

    const updateHandFromPointer = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            const rect = event.currentTarget.getBoundingClientRect()
            const x = ((event.clientX - rect.left) / rect.width) * 100
            const y = ((event.clientY - rect.top) / rect.height) * 100
            const nextHoverKey = findAnswerAtPoint(event.clientX, event.clientY)
            setHandPoint({
                x: Math.max(4, Math.min(96, x)),
                y: Math.max(10, Math.min(92, y)),
            })
            setHoverAnswerKey(nextHoverKey)
            setHandGesture((current) => (current === "pinch" || current === "locked" ? current : nextHoverKey ? "hover" : "open"))
        },
        [findAnswerAtPoint]
    )

    const beginHandLock = useCallback(
        (targetKey: string | null = hoverAnswerKey) => {
        if (!targetKey) return
        clearHold()
        setHandGesture("pinch")
        setHoldProgress(45)
        holdTimerRef.current = window.setTimeout(() => {
            setLockedAnswerKey(targetKey)
            setHandGesture("locked")
            setHoldProgress(100)
        }, 650)
    }, [clearHold, hoverAnswerKey])

    const endHandLock = useCallback(() => {
        clearHold()
        setHandGesture((current) => (current === "locked" ? "locked" : hoverAnswerKey ? "hover" : "open"))
    }, [clearHold, hoverAnswerKey])

    const startCamera = useCallback(async () => {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
            setCameraStatus("unsupported")
            return
        }

        setCameraStatus("starting")
        stopCamera()

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: playSurface === "student" ? "user" : "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: false,
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
            setCameraStatus("ready")
        } catch (error) {
            stopCamera()
            const name = error instanceof DOMException ? error.name : ""
            setCameraStatus(name === "NotAllowedError" || name === "PermissionDeniedError" ? "denied" : "error")
        }
    }, [playSurface, stopCamera])

    useEffect(() => {
        if (previewStep !== "play") {
            stopCamera()
            if (cameraStatus !== "idle") setCameraStatus("idle")
            return
        }

        void startCamera()

        return () => {
            stopCamera()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- start/stop when entering play or switching surface.
    }, [previewStep, playSurface])

    useEffect(() => {
        return () => {
            clearHold()
        }
    }, [clearHold])

    const cameraIssueTextKey =
        cameraStatus === "starting"
            ? "arQuestCameraStarting"
            : cameraStatus === "denied"
              ? "arQuestCameraDenied"
              : cameraStatus === "unsupported"
                ? "arQuestCameraUnsupported"
                : "arQuestCameraError"

    if (previewStep === "setup") {
        return (
            <main className="flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 p-4 font-sans text-white">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.28),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,63,138,0.24),transparent_36%)]" />
                <section className="relative grid w-full max-w-6xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
                    <div className="flex flex-col justify-center rounded-lg border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-md sm:p-8">
                        <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/40 bg-cyan-50/90 px-3 py-1 text-xs font-black uppercase tracking-wide text-cyan-950">
                            <ScanLine className="h-4 w-4" />
                            {t("arQuestPhaseOneBadge")}
                        </div>
                        <h1 className="text-3xl font-black leading-tight text-white sm:text-5xl">
                            {t("arQuestSetupTitle")}
                        </h1>
                        <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed text-white/74 sm:text-base">
                            {t("arQuestSetupSubtitle")}
                        </p>
                        <div className="mt-6 grid gap-3 text-sm font-bold text-white/82">
                            <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3">
                                <Monitor className="mt-0.5 h-5 w-5 shrink-0 text-cyan-200" />
                                <span>{t("arQuestSetupTeacherSummary")}</span>
                            </div>
                            <div className="flex items-start gap-3 rounded-lg bg-white/10 p-3">
                                <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-pink-200" />
                                <span>{t("arQuestSetupStudentSummary")}</span>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-lg border border-white/15 bg-white/92 p-4 text-slate-950 shadow-2xl sm:p-5">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-black sm:text-2xl">{t("arQuestSetupSurfaceTitle")}</h2>
                                <p className="mt-1 text-sm font-semibold text-slate-500">
                                    {t("arQuestSetupSurfaceSubtitle")}
                                </p>
                            </div>
                            <Play className="h-6 w-6 text-brand-pink" />
                        </div>

                        <div className="grid gap-3 md:grid-cols-2">
                            {([
                                {
                                    id: "teacher" as const,
                                    icon: <Monitor className="h-6 w-6" />,
                                    title: t("arQuestPreviewTeacherScreen"),
                                    body: t("arQuestSetupTeacherBody"),
                                },
                                {
                                    id: "student" as const,
                                    icon: <Smartphone className="h-6 w-6" />,
                                    title: t("arQuestPreviewStudentScreen"),
                                    body: t("arQuestSetupStudentBody"),
                                },
                            ]).map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setPlaySurface(option.id)}
                                    className={cn(
                                        "flex min-h-48 flex-col items-start rounded-lg border-2 p-4 text-left transition",
                                        playSurface === option.id
                                            ? "border-brand-pink bg-pink-50 shadow-lg shadow-pink-200/50"
                                            : "border-slate-200 bg-white hover:border-cyan-200 hover:bg-cyan-50/40"
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "mb-4 flex h-12 w-12 items-center justify-center rounded-lg",
                                            playSurface === option.id
                                                ? "bg-brand-pink text-white"
                                                : "bg-slate-100 text-slate-700"
                                        )}
                                    >
                                        {option.icon}
                                    </span>
                                    <span className="text-lg font-black">{option.title}</span>
                                    <span className="mt-2 text-sm font-semibold leading-relaxed text-slate-600">
                                        {option.body}
                                    </span>
                                    {playSurface === option.id && (
                                        <span className="mt-auto inline-flex items-center gap-1.5 rounded-full bg-brand-pink px-3 py-1 text-xs font-black text-white">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            {t("arQuestSetupSelected")}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => setPreviewStep("play")}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-brand-pink px-5 py-4 text-base font-black text-white shadow-lg shadow-pink-200/60 transition hover:opacity-95 active:translate-y-0.5"
                        >
                            {t("arQuestSetupStartPreview")}
                            <ArrowRight className="h-5 w-5" />
                        </button>
                    </div>
                </section>
            </main>
        )
    }

    return (
        <main className="relative h-[100dvh] min-h-[100dvh] overflow-hidden bg-slate-950 font-sans text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(244,63,138,0.22),transparent_34%)]" />

            <section className="relative flex h-full min-h-0 flex-col">
                <div className="safe-top pointer-events-none absolute left-0 right-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-5">
                    <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-2">
                        <StatusPill
                            icon={<ScanLine className="h-4 w-4" />}
                            label={t("arQuestPreviewProgress")}
                            tone="pink"
                        />
                        <StatusPill
                            icon={<Trophy className="h-4 w-4" />}
                            label={t("arQuestPreviewScore")}
                            tone="cyan"
                        />
                        <StatusPill
                            icon={<Timer className="h-4 w-4" />}
                            label={t("arQuestPreviewTimer")}
                            tone="slate"
                        />
                    </div>
                </div>

                <div
                    className="relative min-h-0 flex-1 touch-none overflow-hidden"
                    onPointerMove={updateHandFromPointer}
                    onPointerDown={(event) => {
                        updateHandFromPointer(event)
                        beginHandLock(findAnswerAtPoint(event.clientX, event.clientY))
                    }}
                    onPointerUp={endHandLock}
                    onPointerCancel={endHandLock}
                    onPointerLeave={() => {
                        clearHold()
                        setHoverAnswerKey(null)
                        setHandGesture((current) => (current === "locked" ? "locked" : "open"))
                    }}
                >
                    <video
                        ref={videoRef}
                        className={cn(
                            "absolute inset-0 h-full w-full bg-slate-950 object-cover transition-opacity duration-500",
                            cameraStatus === "ready" ? "opacity-100" : "opacity-0"
                        )}
                        muted
                        playsInline
                        autoPlay
                    />
                    <div
                        className={cn(
                            "absolute inset-0 transition-opacity duration-500",
                            cameraStatus === "ready" ? "opacity-0" : "opacity-100"
                        )}
                        aria-hidden={cameraStatus === "ready"}
                    >
                        <div className="absolute inset-0 bg-[linear-gradient(120deg,#d6f8ef_0%,#c9e8dc_44%,#f0d7c6_100%)]" />
                        <div className="absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(15,23,42,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.18)_1px,transparent_1px)] [background-size:52px_52px]" />
                        <div className="absolute inset-x-[8%] top-[10%] h-1.5 rounded-full bg-rose-500/50 shadow-lg" />
                        <div className="absolute bottom-[16%] right-[2%] h-[32%] w-[16%] rounded-lg bg-amber-100/70 shadow-2xl" />
                        <div className="absolute left-[24%] top-[23%] h-[62%] w-[32%] rounded-[45%] bg-[linear-gradient(180deg,rgba(148,163,184,0.92),rgba(71,85,105,0.82))] opacity-75 blur-[1px]" />
                        <div className="absolute left-[22%] top-[18%] h-[17%] w-[18%] rounded-full bg-slate-700/70 blur-[1px]" />
                        <div className="absolute left-[21%] top-[46%] h-[34%] w-[36%] rounded-t-[42%] bg-stone-300/75 blur-[1px]" />
                    </div>
                    <div className="absolute inset-0 bg-slate-950/10" />
                    {cameraStatus !== "ready" && (
                        <div className="absolute left-1/2 top-[32%] z-20 w-[min(86vw,28rem)] -translate-x-1/2 rounded-lg border border-white/25 bg-slate-950/70 p-4 text-center shadow-2xl backdrop-blur-md">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-900">
                                <Camera className={cn("h-6 w-6", cameraStatus === "starting" && "animate-pulse")} />
                            </div>
                            <p className="text-sm font-black text-white sm:text-base">{t(cameraIssueTextKey)}</p>
                            {cameraStatus !== "starting" && (
                                <button
                                    type="button"
                                    onClick={() => void startCamera()}
                                    className="mt-3 inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-xs font-black text-slate-950 shadow-md transition hover:bg-cyan-50"
                                >
                                    {t("arQuestCameraRetry")}
                                </button>
                            )}
                        </div>
                    )}

                    <motion.div
                        className="absolute left-1/2 top-[15%] z-30 w-[min(88vw,32rem)] -translate-x-1/2 rounded-lg border border-yellow-200/80 bg-white/92 px-4 py-3 text-center text-slate-900 shadow-[0_12px_36px_rgb(250_204_21_/_0.22)] backdrop-blur-md"
                        initial={{ y: -18, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-[0.68rem] font-black uppercase tracking-wide text-emerald-800">
                            <Sparkles className="h-3.5 w-3.5" />
                            {t("arQuestPreviewMissionTag")}
                        </div>
                        <h1 className="text-base font-black leading-tight text-slate-950 sm:text-xl">
                            {t("arQuestPreviewQuestion")}
                        </h1>
                        <p className="mt-1 text-xs font-bold text-pink-600 sm:text-sm">
                            {t(isTeacherSurface ? "arQuestPreviewTeacherHint" : "arQuestPreviewHint")}
                        </p>
                    </motion.div>

                    {ANSWERS.map((answer) => (
                        <motion.button
                            key={answer.key}
                            ref={(node) => {
                                answerRefs.current[answer.key] = node
                            }}
                            type="button"
                            className={cn(
                                "absolute z-30 flex min-h-20 w-28 items-center justify-center rounded-full border-2 px-3 text-center text-sm font-black leading-tight shadow-xl backdrop-blur-md transition sm:min-h-24 sm:w-32 sm:text-base",
                                lockedAnswerKey === answer.key
                                    ? "border-cyan-300 bg-cyan-50/95 text-cyan-950 ring-4 ring-cyan-300/30"
                                    : hoverAnswerKey === answer.key
                                      ? "border-brand-yellow bg-white/95 text-slate-950 ring-4 ring-brand-yellow/30"
                                    : "border-pink-300 bg-white/92 text-slate-900",
                                answer.className
                            )}
                            initial={{ opacity: 0, scale: 0.88 }}
                            animate={{ opacity: 1, scale: lockedAnswerKey === answer.key ? [1, 1.04, 1] : 1 }}
                            transition={{ duration: 1.2, repeat: lockedAnswerKey === answer.key ? Infinity : 0 }}
                        >
                            {lockedAnswerKey === answer.key && (
                                <span className="absolute -top-3 rounded-full bg-cyan-500 px-2 py-0.5 text-[0.65rem] font-black uppercase text-white shadow-md">
                                    {t("arQuestPreviewLocked")}
                                </span>
                            )}
                            {hoverAnswerKey === answer.key && lockedAnswerKey !== answer.key && (
                                <span className="absolute -top-3 rounded-full bg-brand-yellow px-2 py-0.5 text-[0.65rem] font-black uppercase text-slate-950 shadow-md">
                                    {t("arQuestHandHovering")}
                                </span>
                            )}
                            {t(answer.labelKey)}
                        </motion.button>
                    ))}

                    <TrackingHand point={handPoint} gesture={handGesture} progress={holdProgress} />

                    <div className="pointer-events-none absolute inset-x-3 bottom-3 z-40 sm:inset-x-5 sm:bottom-5">
                        <div className="mx-auto grid max-w-6xl gap-3 lg:grid-cols-[1fr_20rem]">
                            <div className="rounded-lg border border-white/25 bg-slate-950/62 p-3 shadow-2xl backdrop-blur-md sm:p-4">
                                <div className="pointer-events-auto mb-3 grid grid-cols-2 gap-2 rounded-lg border border-white/15 bg-white/10 p-1 backdrop-blur-md">
                                    {([
                                        {
                                            id: "teacher" as const,
                                            icon: <Monitor className="h-4 w-4" />,
                                            label: t("arQuestPreviewTeacherScreen"),
                                        },
                                        {
                                            id: "student" as const,
                                            icon: <Smartphone className="h-4 w-4" />,
                                            label: t("arQuestPreviewStudentScreen"),
                                        },
                                    ]).map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            onClick={() => setPlaySurface(option.id)}
                                            className={cn(
                                                "flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-xs font-black transition sm:text-sm",
                                                playSurface === option.id
                                                    ? "bg-white text-slate-950 shadow-md"
                                                    : "text-white/80 hover:bg-white/10 hover:text-white"
                                            )}
                                        >
                                            {option.icon}
                                            <span className="truncate">{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <StatusPill
                                        icon={isTeacherSurface ? <Monitor className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                                        label={t(
                                            cameraStatus === "ready"
                                                ? isTeacherSurface
                                                    ? "arQuestPreviewTeacherCameraReady"
                                                    : "arQuestPreviewCameraReady"
                                                : "arQuestCameraWaiting"
                                        )}
                                        tone={cameraStatus === "ready" ? "emerald" : "slate"}
                                    />
                                    <StatusPill
                                        icon={<Hand className="h-4 w-4" />}
                                        label={t(
                                            handGesture === "locked"
                                                ? "arQuestHandLocked"
                                                : handGesture === "pinch"
                                                  ? "arQuestHandLocking"
                                                  : hoverAnswerKey
                                                    ? "arQuestHandHovering"
                                                    : isTeacherSurface
                                                      ? "arQuestPreviewTeacherHandReady"
                                                      : "arQuestPreviewHandReady"
                                        )}
                                        tone="cyan"
                                    />
                                    <StatusPill
                                        icon={<Wifi className="h-4 w-4" />}
                                        label={t("arQuestPreviewLiveReady")}
                                        tone="slate"
                                    />
                                </div>
                                <p className="mt-3 text-sm font-semibold leading-relaxed text-white/86">
                                    {t(
                                        handGesture === "locked"
                                            ? "arQuestHandInstructionLocked"
                                            : isTeacherSurface
                                              ? "arQuestPreviewTeacherInstruction"
                                              : "arQuestPreviewInstruction"
                                    )}
                                </p>
                            </div>

                            <div className="hidden rounded-lg border border-white/25 bg-white/88 p-4 text-slate-900 shadow-2xl backdrop-blur-md lg:block">
                                <div className="mb-3 flex items-center justify-between">
                                    <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
                                        {t("arQuestPreviewSquadTitle")}
                                    </h2>
                                    <Users className="h-4 w-4 text-pink-500" />
                                </div>
                                {["arQuestPreviewPlayerOne", "arQuestPreviewPlayerTwo", "arQuestPreviewPlayerThree"].map(
                                    (key, index) => (
                                        <div
                                            key={key}
                                            className="mb-2 flex items-center gap-3 rounded-md bg-slate-100 px-3 py-2 text-sm font-bold"
                                        >
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-pink text-xs text-white">
                                                {index + 1}
                                            </span>
                                            <span className="min-w-0 flex-1 truncate">{t(key)}</span>
                                            {index === 0 ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <span className="text-xs text-slate-500">{t("arQuestPreviewSearching")}</span>
                                            )}
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Loader2, RotateCcw, ShieldAlert, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

type LessonAssessmentPayload = {
    assessment: {
        title: string
        passScore: number | null
        allowRetake: boolean
        questionSetId: string
        questionSetTitle: string
        reward?: {
            behaviorPoints?: number
            gold?: number
            achievementId?: string
            achievementTitle?: string
        } | null
        certificate?: {
            enabled: boolean
            title?: string
            description?: string
        } | null
    }
    questions: Array<{
        id: string
        question: string
        options: string[]
    }>
    latestAttempt: {
        id: string
        score: number
        maxScore: number
        passed: boolean
        attemptNumber: number
        completedAt: string
        rewardGrantedAt?: string | null
        certificateIssuedAt?: string | null
    } | null
    attemptCount: number
    hasPassed: boolean
    canAttempt: boolean
    rewardStatus: {
        awarded: boolean
        awardedAt: string | null
        reward: {
            behaviorPoints?: number
            gold?: number
            achievementId?: string | null
            achievementTitle?: string | null
        } | null
    }
    certificateStatus: {
        enabled: boolean
        issued: boolean
        certificate: {
            id: string
            title: string
            description: string | null
            certificateCode: string
            issuedAt: string
        } | null
    }
}

type Props = {
    code: string
    lessonId: string
    topicId: string
    onAttemptSubmitted?: () => void
}

export function StudentLessonAssessmentPanel({ code, lessonId, topicId, onAttemptSubmitted }: Props) {
    const [payload, setPayload] = useState<LessonAssessmentPayload | null>(null)
    const [answers, setAnswers] = useState<number[]>([])
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function loadAssessment() {
        setLoading(true)
        setError(null)
        try {
            const response = await fetch(`/api/student/${code}/lessons/${lessonId}/topics/${topicId}/assessment`)
            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error?.message ?? "โหลดแบบทดสอบไม่สำเร็จ")
            }
            setPayload(data as LessonAssessmentPayload)
            setAnswers(new Array((data as LessonAssessmentPayload).questions.length).fill(-1))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "โหลดแบบทดสอบไม่สำเร็จ")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        void loadAssessment()
    }, [code, lessonId, topicId])

    const unansweredCount = useMemo(() => answers.filter((answer) => answer < 0).length, [answers])

    async function handleSubmit() {
        if (!payload) return
        if (answers.some((answer) => answer < 0)) {
            setError("กรุณาตอบคำถามให้ครบก่อนส่ง")
            return
        }
        setSubmitting(true)
        setError(null)
        try {
            const response = await fetch(`/api/student/${code}/lessons/${lessonId}/topics/${topicId}/assessment/attempt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            })
            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error?.message ?? "ส่งแบบทดสอบไม่สำเร็จ")
            }
            await loadAssessment()
            onAttemptSubmitted?.()
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "ส่งแบบทดสอบไม่สำเร็จ")
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        )
    }

    if (error && !payload) {
        return (
            <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 text-sm font-bold text-rose-600">
                {error}
            </div>
        )
    }

    if (!payload) return null

    return (
        <div className="space-y-4">
            <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h3 className="text-lg font-black text-slate-900">{payload.assessment.title}</h3>
                        <p className="mt-1 text-sm font-bold text-slate-500">
                            ชุดคำถาม {payload.assessment.questionSetTitle}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-black">
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                            ผ่านที่ {payload.assessment.passScore ?? "-"}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                            ทำแล้ว {payload.attemptCount} ครั้ง
                        </span>
                    </div>
                </div>

                {payload.latestAttempt ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-sm font-bold">
                        <span
                            className={
                                payload.latestAttempt.passed
                                    ? "rounded-full bg-emerald-100 px-3 py-1 text-emerald-700"
                                    : "rounded-full bg-rose-100 px-3 py-1 text-rose-700"
                            }
                        >
                            {payload.latestAttempt.passed ? "ผ่านแล้ว" : "ยังไม่ผ่าน"}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-700">
                            คะแนนล่าสุด {payload.latestAttempt.score}/{payload.latestAttempt.maxScore}
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-slate-500">
                            ครั้งที่ {payload.latestAttempt.attemptNumber}
                        </span>
                        {payload.rewardStatus.awarded ? (
                            <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700">
                                รับรางวัลแล้ว
                            </span>
                        ) : null}
                        {payload.certificateStatus.issued ? (
                            <span className="rounded-full bg-sky-100 px-3 py-1 text-sky-700">
                                ออกใบรับรองแล้ว
                            </span>
                        ) : null}
                    </div>
                ) : (
                    <p className="mt-4 text-sm font-bold text-slate-500">
                        ยังไม่ได้เริ่มทำแบบทดสอบบทเรียนนี้
                    </p>
                )}

                {(payload.assessment.reward || payload.certificateStatus.enabled) ? (
                    <div className="mt-4 grid gap-2">
                        {payload.assessment.reward ? (
                            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">
                                รางวัลสอบผ่านครั้งแรก:
                                <span className="ml-2 text-slate-800">
                                    {(payload.assessment.reward.behaviorPoints ?? 0) > 0
                                        ? `+${payload.assessment.reward.behaviorPoints} แต้ม`
                                        : null}
                                    {(payload.assessment.reward.behaviorPoints ?? 0) > 0 &&
                                    (payload.assessment.reward.gold ?? 0) > 0
                                        ? " • "
                                        : null}
                                    {(payload.assessment.reward.gold ?? 0) > 0
                                        ? `+${payload.assessment.reward.gold} ทอง`
                                        : null}
                                    {payload.assessment.reward.achievementTitle
                                        ? ` • Achievement: ${payload.assessment.reward.achievementTitle}`
                                        : null}
                                </span>
                            </div>
                        ) : null}

                        {payload.certificateStatus.enabled ? (
                            <div className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-600">
                                ใบรับรอง:
                                <span className="ml-2 text-slate-800">
                                    {payload.certificateStatus.certificate?.title ??
                                        payload.assessment.certificate?.title ??
                                        "จะได้รับหลังสอบผ่าน"}
                                </span>
                                {payload.certificateStatus.certificate ? (
                                    <span className="ml-2 text-sky-700">
                                        รหัส {payload.certificateStatus.certificate.certificateCode}
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>

            <div className="space-y-3">
                {payload.questions.map((question, index) => (
                    <div key={question.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <p className="font-black text-slate-900">
                            {index + 1}. {question.question}
                        </p>
                        <div className="mt-3 grid gap-2">
                            {question.options.map((option, optionIndex) => {
                                const selected = answers[index] === optionIndex
                                return (
                                    <button
                                        key={`${question.id}-${optionIndex}`}
                                        type="button"
                                        onClick={() =>
                                            setAnswers((current) => {
                                                const next = [...current]
                                                next[index] = optionIndex
                                                return next
                                            })
                                        }
                                        className={
                                            selected
                                                ? "rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-800"
                                                : "rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-white"
                                        }
                                    >
                                        {option}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-bold text-slate-500">ยังไม่ตอบ {unansweredCount} ข้อ</div>
                    <div className="flex flex-wrap gap-2">
                        {payload.latestAttempt && payload.assessment.allowRetake ? (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setAnswers(new Array(payload.questions.length).fill(-1))}
                                className="rounded-2xl font-bold"
                            >
                                <RotateCcw className="mr-2 h-4 w-4" />
                                เริ่มทำใหม่
                            </Button>
                        ) : null}
                        <Button
                            type="button"
                            onClick={() => void handleSubmit()}
                            disabled={submitting || !payload.canAttempt}
                            className="rounded-2xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                        >
                            {submitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : payload.hasPassed ? (
                                <Trophy className="mr-2 h-4 w-4" />
                            ) : (
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                            )}
                            {payload.canAttempt ? "ส่งแบบทดสอบ" : "ไม่เปิดให้ทำซ้ำ"}
                        </Button>
                    </div>
                </div>
                {error ? (
                    <p className="mt-3 flex items-center gap-2 text-sm font-bold text-rose-600">
                        <ShieldAlert className="h-4 w-4" />
                        {error}
                    </p>
                ) : null}
            </div>
        </div>
    )
}

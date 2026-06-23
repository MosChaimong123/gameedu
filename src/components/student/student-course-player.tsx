"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
    Award,
    BookOpen,
    CircleDashed,
    CheckCircle2,
    ChevronLeft,
    Clock,
    FileText,
    Layers3,
    Loader2,
    Lock,
    PlayCircle,
    RotateCcw,
    Target,
} from "lucide-react"
import { TeachingMediaReferenceList } from "@/components/media/teaching-media-reference-list"
import { Button } from "@/components/ui/button"
import type { CourseAssessmentV2, CourseContentV1, CourseLessonRef } from "@/lib/courses/course-content"
import type { LessonContentV2, LessonMediaBlock } from "@/lib/lessons/lesson-content"
import type { TeachingMediaReference } from "@/lib/teaching-media-reference"

type OrderedCourseLesson = {
    ref: CourseLessonRef
    lesson: {
        id: string
        title: string
        subject: string | null
        gradeLevel: string | null
        description: string | null
        content: LessonContentV2
    }
}

type OrderedCourseModule = {
    id: string
    title: string
    description?: string
    order: number
    lessons: OrderedCourseLesson[]
}

type StudentCoursePayload = {
    id: string
    progress: {
        id: string | null
        completedLessonIds: string[]
        currentLessonId: string | null
        percent: number
        courseCompletedByLessons: boolean
        courseCompleted: boolean
        assessmentStatus: {
            requiredAssessmentIds: string[]
            passedAssessmentIds: string[]
            pendingAssessmentIds: string[]
            completed: boolean
        }
        moduleStatus: {
            moduleId: string
            title: string
            requiredLessonIds: string[]
            completedLessonIds: string[]
            checkpointAssessmentIds: string[]
            passedCheckpointAssessmentIds: string[]
            pendingCheckpointAssessmentIds: string[]
            completed: boolean
        }[]
        nextRequiredAction: "LESSON" | "ASSESSMENT" | "COMPLETE"
        startedAt: string | null
        lastOpenedAt: string | null
        completedAt: string | null
    }
    course: {
        id: string
        title: string
        subject: string | null
        gradeLevel: string | null
        description: string | null
        coverImageUrl: string | null
        content: CourseContentV1
    }
    certificate: {
        config: {
            enabled: boolean
            title?: string
            description?: string
            requiredAssessmentIds?: string[]
            reward?: {
                behaviorPoints?: number
                achievementId?: string
                achievementTitle?: string
            }
        } | null
        eligibility: {
            eligible: boolean
            reasons: string[]
            requiredAssessmentIds: string[]
            passedAssessmentIds: string[]
        }
        issued: {
            id: string
            title: string
            description: string | null
            certificateCode: string
            issuedAt: string
        } | null
    }
    assessmentAttempts: {
        assessmentId: string
        passed: boolean
        score: number
        maxScore: number
        attemptNumber: number
        completedAt: string
    }[]
    orderedLessons: OrderedCourseModule[]
}

type StudentAssessmentQuestionView = {
    id: string
    question: string
    options: string[]
    image?: string | null
    questionType: "single_choice" | "true_false"
    explanation?: string
}

type StudentAssessmentAttempt = {
    id: string
    score: number
    maxScore: number
    passed: boolean
    attemptNumber: number
    completedAt: string
}

type StudentAssessmentDetails = {
    assessment: CourseAssessmentV2 & {
        courseId: string
        courseTitle: string
        questionSetTitle: string
        totalQuestions: number
    }
    attempt: StudentAssessmentAttempt | null
    questions: StudentAssessmentQuestionView[]
}

type StudentAssessmentSubmitResult = {
    attempt: StudentAssessmentAttempt
    result: {
        score: number
        maxScore: number
        correct: number
        total: number
        passScore: number | null
        passed: boolean
    }
}

function getYoutubeEmbedUrl(url: string) {
    try {
        const parsed = new URL(url)
        const host = parsed.hostname.replace(/^www\./, "")
        if (host === "youtu.be") return `https://www.youtube.com/embed/${parsed.pathname.slice(1)}`
        if (host === "youtube.com" || host === "m.youtube.com") {
            const id = parsed.searchParams.get("v")
            return id ? `https://www.youtube.com/embed/${id}` : null
        }
        return null
    } catch {
        return null
    }
}

function LessonMediaBlockList({ media }: { media?: LessonMediaBlock[] }) {
    if (!media || media.length === 0) return null

    return (
        <div className="mt-4 grid gap-3">
            {media.map((item) => {
                const youtubeEmbedUrl = item.type === "video" ? getYoutubeEmbedUrl(item.url) : null
                return (
                    <figure key={item.id} className="overflow-hidden rounded-2xl border border-slate-100 bg-slate-50">
                        {item.type === "image" ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.url} alt={item.title ?? "course image"} className="max-h-80 w-full object-cover" />
                        ) : youtubeEmbedUrl ? (
                            <iframe
                                src={youtubeEmbedUrl}
                                title={item.title ?? "course video"}
                                className="aspect-video w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        ) : (
                            <video controls src={item.url} className="aspect-video w-full bg-black" />
                        )}
                        {(item.title || item.caption) && (
                            <figcaption className="flex gap-2 p-3 text-xs text-slate-500">
                                <PlayCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                <span>
                                    {item.title && <span className="font-black text-slate-700">{item.title}</span>}
                                    {item.caption && <span className="block">{item.caption}</span>}
                                </span>
                            </figcaption>
                        )}
                    </figure>
                )
            })}
        </div>
    )
}

function getRenderableTopics(content: LessonContentV2) {
    const generatedTopics = content.topics.filter((topic) => topic.contentStatus !== "empty")
    return generatedTopics.length > 0 ? generatedTopics : content.topics
}

function collectDocuments(topics: ReturnType<typeof getRenderableTopics>): TeachingMediaReference[] {
    return topics.flatMap((topic) => topic.documents ?? [])
}

function formatAssessmentType(type: CourseAssessmentV2["type"]) {
    if (type === "pretest") return "แบบทดสอบก่อนเรียน"
    if (type === "checkpoint") return "แบบทดสอบระหว่างหน่วย"
    return "แบบทดสอบหลังเรียน"
}

function getAssessmentStatus(input: {
    summary: StudentCoursePayload["assessmentAttempts"][number] | undefined
    allowRetake: boolean
}) {
    if (!input.summary) {
        return {
            label: "ยังไม่ได้ทำ",
            tone: "slate" as const,
        }
    }

    if (input.summary.passed) {
        return {
            label: "ผ่านแล้ว",
            tone: "emerald" as const,
        }
    }

    if (!input.allowRetake) {
        return {
            label: "ไม่ผ่าน และทำใหม่ไม่ได้",
            tone: "rose" as const,
        }
    }

    return {
        label: "ยังไม่ผ่าน",
        tone: "amber" as const,
    }
}

function getAssessmentStatusClasses(tone: "slate" | "emerald" | "amber" | "rose") {
    if (tone === "emerald") return "bg-emerald-50 text-emerald-700"
    if (tone === "amber") return "bg-amber-50 text-amber-700"
    if (tone === "rose") return "bg-rose-50 text-rose-700"
    return "bg-slate-100 text-slate-600"
}

export function StudentCoursePlayer() {
    const router = useRouter()
    const { code, courseId } = useParams<{ code: string; courseId: string }>()
    const [payload, setPayload] = useState<StudentCoursePayload | null>(null)
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
    const [activeAssessmentId, setActiveAssessmentId] = useState<string | null>(null)
    const [assessmentDetailsById, setAssessmentDetailsById] = useState<Record<string, StudentAssessmentDetails | undefined>>({})
    const [answersByAssessmentId, setAnswersByAssessmentId] = useState<Record<string, number[]>>({})
    const [loading, setLoading] = useState(true)
    const [savingProgress, setSavingProgress] = useState(false)
    const [completingLesson, setCompletingLesson] = useState(false)
    const [issuingCertificate, setIssuingCertificate] = useState(false)
    const [loadingAssessmentId, setLoadingAssessmentId] = useState<string | null>(null)
    const [submittingAssessmentId, setSubmittingAssessmentId] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetch(`/api/student/${code}/courses/${courseId}`)
            .then((response) => {
                if (!response.ok) throw new Error(response.status === 404 ? "ไม่พบคอร์สนี้" : "โหลดคอร์สไม่สำเร็จ")
                return response.json()
            })
            .then((data: StudentCoursePayload) => {
                setPayload(data)
                const lastLessonId = window.localStorage.getItem(`course-progress:${code}:${courseId}:lesson`)
                const lessons = data.orderedLessons.flatMap((module) => module.lessons)
                const initialLesson =
                    lessons.find((item) => item.lesson.id === data.progress.currentLessonId) ??
                    lessons.find((item) => item.lesson.id === lastLessonId) ??
                    lessons[0] ??
                    null
                setSelectedLessonId(initialLesson?.lesson.id ?? null)
            })
            .catch((caught: Error) => setError(caught.message))
            .finally(() => setLoading(false))
    }, [code, courseId])

    const allLessons = useMemo(() => payload?.orderedLessons.flatMap((module) => module.lessons) ?? [], [payload])
    const selectedLesson = allLessons.find((item) => item.lesson.id === selectedLessonId) ?? allLessons[0] ?? null
    const selectedIndex = selectedLesson ? allLessons.findIndex((item) => item.lesson.id === selectedLesson.lesson.id) : -1
    const selectedTopics = selectedLesson ? getRenderableTopics(selectedLesson.lesson.content) : []
    const documents = collectDocuments(selectedTopics)
    const courseMinutes =
        payload?.course.content.estimatedMinutes ??
        allLessons.reduce((sum, item) => sum + (item.ref.estimatedMinutes ?? item.lesson.content.estimatedMinutes ?? 0), 0)
    const completedLessonIds = payload?.progress.completedLessonIds ?? []
    const selectedLessonCompleted = selectedLesson ? completedLessonIds.includes(selectedLesson.lesson.id) : false
    const progressPercent = payload?.progress.percent ?? 0
    const certificateIssued = payload?.certificate.issued ?? null
    const certificateEligibility = payload?.certificate.eligibility ?? null
    const certificateReward = payload?.certificate.config?.reward ?? null
    const selectedModule =
        selectedLesson
            ? payload?.orderedLessons.find((module) => module.lessons.some((item) => item.lesson.id === selectedLesson.lesson.id)) ?? null
            : null
    const allAssessments = payload?.course.content.assessments ?? []
    const selectedModuleAssessments = selectedModule ? allAssessments.filter((assessment) => assessment.moduleId === selectedModule.id) : []
    const courseAssessments = allAssessments.filter((assessment) => !assessment.moduleId)
    const visibleAssessments = [...selectedModuleAssessments, ...courseAssessments]
    const activeAssessmentDetails = activeAssessmentId ? assessmentDetailsById[activeAssessmentId] ?? null : null
    const activeAssessmentAnswers = activeAssessmentId ? answersByAssessmentId[activeAssessmentId] ?? [] : []

    async function syncCurrentLesson(lessonId: string) {
        setSavingProgress(true)
        try {
            const response = await fetch(`/api/student/${code}/courses/${courseId}/progress`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentLessonId: lessonId }),
            })
            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error?.message ?? "บันทึกความคืบหน้าไม่สำเร็จ")
            }
            setPayload((current) => (current ? { ...current, progress: data.progress } : current))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "บันทึกความคืบหน้าไม่สำเร็จ")
        } finally {
            setSavingProgress(false)
        }
    }

    function selectLesson(lessonId: string, options?: { sync?: boolean }) {
        setSelectedLessonId(lessonId)
        window.localStorage.setItem(`course-progress:${code}:${courseId}:lesson`, lessonId)
        if (options?.sync !== false) {
            void syncCurrentLesson(lessonId)
        }
    }

    async function completeCurrentLesson() {
        if (!selectedLesson) return

        setCompletingLesson(true)
        try {
            const response = await fetch(`/api/student/${code}/courses/${courseId}/complete`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId: selectedLesson.lesson.id }),
            })
            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error?.message ?? "บันทึกการจบบทเรียนไม่สำเร็จ")
            }
            setPayload((current) => (current ? { ...current, progress: data.progress } : current))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "บันทึกการจบบทเรียนไม่สำเร็จ")
        } finally {
            setCompletingLesson(false)
        }
    }

    async function issueCertificate() {
        if (!payload || certificateIssued) return

        setIssuingCertificate(true)
        try {
            const response = await fetch(`/api/student/${code}/courses/${courseId}/certificate/issue`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            })
            const data = await response.json().catch(() => null)
            if (!response.ok) {
                throw new Error(data?.error?.message ?? "ออกใบรับรองไม่สำเร็จ")
            }
            setPayload((current) =>
                current
                    ? {
                          ...current,
                          certificate: {
                              ...current.certificate,
                              issued: data.certificate,
                          },
                      }
                    : current
            )
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "ออกใบรับรองไม่สำเร็จ")
        } finally {
            setIssuingCertificate(false)
        }
    }

    async function openAssessment(assessmentId: string) {
        setError(null)
        setActiveAssessmentId(assessmentId)

        if (assessmentDetailsById[assessmentId]) return

        setLoadingAssessmentId(assessmentId)
        try {
            const response = await fetch(`/api/student/${code}/courses/${courseId}/assessments/${assessmentId}`)
            const data = (await response.json().catch(() => null)) as
                | StudentAssessmentDetails
                | { error?: { message?: string } }
                | null
            if (!response.ok || !data || !("assessment" in data)) {
                throw new Error(data && "error" in data ? data.error?.message ?? "โหลดแบบทดสอบไม่สำเร็จ" : "โหลดแบบทดสอบไม่สำเร็จ")
            }

            setAssessmentDetailsById((current) => ({
                ...current,
                [assessmentId]: data,
            }))
            setAnswersByAssessmentId((current) => ({
                ...current,
                [assessmentId]: data.questions.map(() => -1),
            }))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "โหลดแบบทดสอบไม่สำเร็จ")
        } finally {
            setLoadingAssessmentId((current) => (current === assessmentId ? null : current))
        }
    }

    function resetAssessmentAnswers(assessmentId: string) {
        const details = assessmentDetailsById[assessmentId]
        if (!details) return
        setAnswersByAssessmentId((current) => ({
            ...current,
            [assessmentId]: details.questions.map(() => -1),
        }))
    }

    async function submitAssessment(assessmentId: string) {
        const details = assessmentDetailsById[assessmentId]
        const answers = answersByAssessmentId[assessmentId]
        if (!details || !answers) return

        if (answers.some((answer) => answer < 0)) {
            setError("กรุณาตอบคำถามให้ครบก่อนส่ง")
            return
        }

        setError(null)
        setSubmittingAssessmentId(assessmentId)
        try {
            const response = await fetch(`/api/student/${code}/courses/${courseId}/assessments/${assessmentId}/attempt`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ answers }),
            })
            const data = (await response.json().catch(() => null)) as
                | StudentAssessmentSubmitResult
                | { error?: { message?: string } }
                | null
            if (!response.ok || !data || !("attempt" in data)) {
                throw new Error(data && "error" in data ? data.error?.message ?? "ส่งแบบทดสอบไม่สำเร็จ" : "ส่งแบบทดสอบไม่สำเร็จ")
            }

            setAssessmentDetailsById((current) => {
                const existing = current[assessmentId]
                if (!existing) return current
                return {
                    ...current,
                    [assessmentId]: {
                        ...existing,
                        attempt: data.attempt,
                    },
                }
            })
            setPayload((current) => {
                if (!current) return current
                const nextAttempts = current.assessmentAttempts.filter((attempt) => attempt.assessmentId !== assessmentId)
                nextAttempts.push({
                    assessmentId,
                    passed: data.attempt.passed,
                    score: data.attempt.score,
                    maxScore: data.attempt.maxScore,
                    attemptNumber: data.attempt.attemptNumber,
                    completedAt: data.attempt.completedAt,
                })
                return {
                    ...current,
                    assessmentAttempts: nextAttempts,
                }
            })
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "ส่งแบบทดสอบไม่สำเร็จ")
        } finally {
            setSubmittingAssessmentId((current) => (current === assessmentId ? null : current))
        }
    }

    useEffect(() => {
        if (!payload || !selectedLessonId) return
        if (payload.progress.currentLessonId) return
        void syncCurrentLesson(selectedLessonId)
    }, [payload, selectedLessonId])

    if (loading) {
        return (
            <div className="grid min-h-screen place-items-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!payload || !selectedLesson) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
                <p className="text-center font-bold text-slate-500">{error ?? "ไม่พบคอร์สนี้"}</p>
                <Button variant="outline" onClick={() => router.back()}>
                    กลับ
                </Button>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                    <Link
                        href={`/student/${code}?tab=courses`}
                        className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-800"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        กลับคอร์สของฉัน
                    </Link>
                    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                        {payload.course.coverImageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={payload.course.coverImageUrl} alt={payload.course.title} className="h-36 w-full object-cover" />
                        ) : null}
                        <div className="p-4">
                            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                                <Layers3 className="h-3.5 w-3.5" />
                                Course Player
                            </div>
                            <h1 className="mt-3 text-xl font-black text-slate-950">{payload.course.title}</h1>
                            {payload.course.description && <p className="mt-1 text-sm font-medium text-slate-500">{payload.course.description}</p>}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-slate-500">
                                <div className="rounded-xl bg-slate-50 p-2">{payload.orderedLessons.length} โมดูล</div>
                                <div className="rounded-xl bg-slate-50 p-2">{allLessons.length} บทเรียน</div>
                                <div className="col-span-2 rounded-xl bg-slate-50 p-2">เวลาเรียนรวม {courseMinutes || "-"} นาที</div>
                            </div>
                            <div className="mt-4">
                                <div className="mb-2 flex items-center justify-between text-xs font-black text-slate-500">
                                    <span>Progress</span>
                                    <span>{progressPercent}%</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${progressPercent}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {payload.orderedLessons.map((module) => (
                            <div key={module.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                                <p className="text-xs font-black uppercase tracking-wide text-slate-400">โมดูล {module.order + 1}</p>
                                <h2 className="font-black text-slate-900">{module.title}</h2>
                                <div className="mt-3 space-y-2">
                                    {module.lessons.map((item) => {
                                        const active = item.lesson.id === selectedLesson.lesson.id
                                        const completed = completedLessonIds.includes(item.lesson.id)
                                        return (
                                            <button
                                                key={item.lesson.id}
                                                type="button"
                                                onClick={() => selectLesson(item.lesson.id)}
                                                className={`w-full rounded-xl border p-3 text-left transition ${
                                                    active
                                                        ? "border-blue-300 bg-blue-50 text-blue-800"
                                                        : "border-slate-100 bg-slate-50 text-slate-600 hover:border-blue-200"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p className="line-clamp-1 text-sm font-black">{item.lesson.title}</p>
                                                    {completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : null}
                                                </div>
                                                <div className="mt-1 flex items-center justify-between gap-2 text-[11px] font-bold opacity-70">
                                                    <span>{item.lesson.content.estimatedMinutes ?? item.ref.estimatedMinutes ?? "-"} นาที</span>
                                                    {completed ? <span>เรียนจบแล้ว</span> : null}
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <main className="space-y-5">
                    <header className="rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 p-6 text-white shadow-lg shadow-blue-100">
                        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-bold text-blue-50">
                            {payload.course.subject && <span>{payload.course.subject}</span>}
                            {payload.course.gradeLevel && <span>{payload.course.gradeLevel}</span>}
                            <span className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                บทเรียน {selectedIndex + 1}/{allLessons.length}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black leading-tight">{selectedLesson.lesson.title}</h2>
                        {selectedLesson.lesson.description && (
                            <p className="mt-2 max-w-3xl text-sm font-medium text-blue-50">{selectedLesson.lesson.description}</p>
                        )}
                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold text-blue-50">
                            {payload.progress.courseCompleted ? (
                                <span className="rounded-full bg-white/20 px-3 py-1">จบคอร์สแล้ว</span>
                            ) : selectedLessonCompleted ? (
                                <span className="rounded-full bg-white/20 px-3 py-1">บทนี้เรียนจบแล้ว</span>
                            ) : payload.progress.nextRequiredAction === "ASSESSMENT" ? (
                                <p className="text-sm font-bold text-amber-700">ขั้นต่อไป: ทำแบบทดสอบที่ยังค้างให้ผ่าน</p>
                            ) : null}
                            {savingProgress ? <span className="rounded-full bg-white/20 px-3 py-1">กำลังบันทึกความคืบหน้า</span> : null}
                        </div>
                    </header>

                    {error ? (
                        <section className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 shadow-sm">
                            {error}
                        </section>
                    ) : null}

                    {selectedTopics.map((topic) => (
                        <section key={topic.id} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                    <BookOpen className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h3 className="text-xl font-black text-slate-950">{topic.title}</h3>
                                    {topic.description && <p className="mt-1 text-sm font-medium text-slate-500">{topic.description}</p>}
                                </div>
                            </div>

                            {topic.objectives.length > 0 && (
                                <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                                    <div className="mb-2 flex items-center gap-2 text-sm font-black text-emerald-800">
                                        <Target className="h-4 w-4" />
                                        วัตถุประสงค์การเรียนรู้
                                    </div>
                                    <ul className="space-y-1 text-sm font-medium text-emerald-800">
                                        {topic.objectives.map((objective) => (
                                            <li key={objective}>- {objective}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="mt-4 space-y-4">
                                {topic.sections.map((section) => (
                                    <article key={section.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                        <h4 className="font-black text-slate-900">{section.heading}</h4>
                                        <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{section.content}</p>
                                        <LessonMediaBlockList media={section.media} />
                                    </article>
                                ))}
                            </div>
                        </section>
                    ))}

                    {documents.length > 0 && (
                        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <h3 className="font-black text-slate-900">เอกสารการเรียนรู้</h3>
                            </div>
                            <TeachingMediaReferenceList references={documents} />
                        </section>
                    )}

                    {visibleAssessments.length > 0 ? (
                        <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <h3 className="text-xl font-black text-slate-950">แบบทดสอบของคอร์ส</h3>
                                    <p className="mt-1 text-sm font-medium text-slate-500">ทำแบบทดสอบหลังเรียนเพื่อเช็กความเข้าใจและดูผลผ่านหรือไม่ผ่านทันที</p>
                                </div>
                                {selectedModule ? (
                                    <div className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                                        หน่วยปัจจุบัน: {selectedModule.title}
                                    </div>
                                ) : null}
                            </div>

                            <div className="mt-4 grid gap-3">
                                {visibleAssessments.map((assessment) => {
                                    const summary = payload.assessmentAttempts.find((attempt) => attempt.assessmentId === assessment.id)
                                    const allowRetake = assessment.allowRetake !== false
                                    const status = getAssessmentStatus({ summary, allowRetake })
                                    const isActive = activeAssessmentId === assessment.id
                                    const details = assessmentDetailsById[assessment.id]
                                    const attempt = details?.attempt ?? (summary
                                        ? {
                                              id: assessment.id,
                                              score: summary.score,
                                              maxScore: summary.maxScore,
                                              passed: summary.passed,
                                              attemptNumber: summary.attemptNumber,
                                              completedAt: summary.completedAt,
                                          }
                                        : null)
                                    const answers = answersByAssessmentId[assessment.id] ?? []
                                    const isLocked = Boolean(attempt && !attempt.passed && !allowRetake)
                                    const canSubmit =
                                        Boolean(isActive && details && answers.length === details.questions.length) &&
                                        answers.every((answer) => answer >= 0) &&
                                        !isLocked

                                    return (
                                        <article
                                            key={assessment.id}
                                            className={`rounded-2xl border p-4 transition ${
                                                isActive ? "border-blue-200 bg-blue-50/40" : "border-slate-100 bg-slate-50"
                                            }`}
                                        >
                                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-black text-white">
                                                            {formatAssessmentType(assessment.type)}
                                                        </span>
                                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${getAssessmentStatusClasses(status.tone)}`}>
                                                            {status.label}
                                                        </span>
                                                        {assessment.passScore !== undefined ? (
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
                                                                เกณฑ์ผ่าน {assessment.passScore} คะแนน
                                                            </span>
                                                        ) : null}
                                                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black text-slate-600 ring-1 ring-slate-200">
                                                            {allowRetake ? "ทำซ้ำได้" : "ทำได้ครั้งเดียว"}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-950">{assessment.title}</h4>
                                                        {attempt ? (
                                                            <p className="mt-1 text-sm font-medium text-slate-600">
                                                                ล่าสุด {attempt.score}/{attempt.maxScore} คะแนน · ครั้งที่ {attempt.attemptNumber}
                                                            </p>
                                                        ) : (
                                                            <p className="mt-1 text-sm font-medium text-slate-500">ยังไม่มีผลการทำแบบทดสอบ</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        type="button"
                                                        variant={isActive ? "outline" : "default"}
                                                        onClick={() => void openAssessment(assessment.id)}
                                                        disabled={loadingAssessmentId === assessment.id}
                                                        className={isActive ? "rounded-xl font-bold" : "rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700"}
                                                    >
                                                        {loadingAssessmentId === assessment.id ? (
                                                            <>
                                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                กำลังโหลด
                                                            </>
                                                        ) : attempt && !attempt.passed && allowRetake ? (
                                                            <>
                                                                <RotateCcw className="mr-2 h-4 w-4" />
                                                                ทำใหม่
                                                            </>
                                                        ) : attempt ? (
                                                            "ดูผล"
                                                        ) : (
                                                            "เริ่มทำแบบทดสอบ"
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>

                                            {attempt ? (
                                                <div className="mt-3 grid gap-2 rounded-2xl bg-white p-3 text-sm font-medium text-slate-600 ring-1 ring-slate-100 sm:grid-cols-4">
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Score</p>
                                                        <p className="mt-1 text-base font-black text-slate-900">{attempt.score}/{attempt.maxScore}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Pass</p>
                                                        <p className="mt-1 text-base font-black text-slate-900">{assessment.passScore ?? "-"}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Result</p>
                                                        <p className={`mt-1 text-base font-black ${attempt.passed ? "text-emerald-700" : "text-rose-700"}`}>
                                                            {attempt.passed ? "ผ่าน" : "ไม่ผ่าน"}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Policy</p>
                                                        <p className="mt-1 text-base font-black text-slate-900">{allowRetake ? "Retake ได้" : "ล็อกหลังส่ง"}</p>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {isLocked ? (
                                                <div className="mt-3 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
                                                    <Lock className="h-4 w-4 shrink-0" />
                                                    แบบทดสอบนี้ปิดการทำซ้ำ หลังส่งแล้วจึงไม่สามารถตอบใหม่ได้
                                                </div>
                                            ) : null}

                                            {isActive && details ? (
                                                <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900">{details.assessment.questionSetTitle}</p>
                                                            <p className="text-xs font-medium text-slate-500">{details.questions.length} ข้อ</p>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Button type="button" variant="outline" onClick={() => resetAssessmentAnswers(assessment.id)} className="rounded-xl font-bold">
                                                                ล้างคำตอบ
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                onClick={() => void submitAssessment(assessment.id)}
                                                                disabled={!canSubmit || submittingAssessmentId === assessment.id}
                                                                className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                                                            >
                                                                {submittingAssessmentId === assessment.id ? (
                                                                    <>
                                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                                        กำลังส่ง
                                                                    </>
                                                                ) : (
                                                                    "ส่งคำตอบ"
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3">
                                                        {details.questions.map((question, questionIndex) => (
                                                            <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-black text-white">
                                                                        {questionIndex + 1}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="font-black text-slate-900">{question.question}</p>
                                                                        {question.image ? (
                                                                            // eslint-disable-next-line @next/next/no-img-element
                                                                            <img src={question.image} alt={question.question} className="mt-3 max-h-72 rounded-2xl border border-slate-200 object-contain" />
                                                                        ) : null}
                                                                        <div className="mt-3 space-y-2">
                                                                            {question.options.map((option, optionIndex) => {
                                                                                const checked = answers[questionIndex] === optionIndex
                                                                                return (
                                                                                    <label
                                                                                        key={`${question.id}:${optionIndex}`}
                                                                                        className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                                                                                            checked ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-200 bg-white text-slate-700 hover:border-blue-200"
                                                                                        }`}
                                                                                    >
                                                                                        <input
                                                                                            type="radio"
                                                                                            name={`assessment:${assessment.id}:question:${question.id}`}
                                                                                            checked={checked}
                                                                                            onChange={() =>
                                                                                                setAnswersByAssessmentId((current) => {
                                                                                                    const next = [...(current[assessment.id] ?? details.questions.map(() => -1))]
                                                                                                    next[questionIndex] = optionIndex
                                                                                                    return {
                                                                                                        ...current,
                                                                                                        [assessment.id]: next,
                                                                                                    }
                                                                                                })
                                                                                            }
                                                                                            className="mt-1 h-4 w-4 border-slate-300 text-blue-600"
                                                                                        />
                                                                                        <span className="text-sm font-medium">{option}</span>
                                                                                    </label>
                                                                                )
                                                                            })}
                                                                        </div>
                                                                        {attempt?.passed === false && question.explanation ? (
                                                                            <p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                                                                                เฉลยอธิบาย: {question.explanation}
                                                                            </p>
                                                                        ) : null}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {!canSubmit && !isLocked ? (
                                                        <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
                                                            <CircleDashed className="h-4 w-4 shrink-0" />
                                                            กรุณาตอบคำถามให้ครบทุกข้อก่อนส่ง
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                        </article>
                                    )
                                })}
                            </div>
                        </section>
                    ) : null}

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        {payload.certificate.config?.enabled ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-sm font-black text-amber-900">
                                            <Award className="h-4 w-4" />
                                            ใบรับรองและรางวัลคอร์ส
                                        </div>
                                        <p className="text-sm font-bold text-amber-900">
                                            {payload.certificate.config.title?.trim() || payload.course.title}
                                        </p>
                                        {payload.certificate.config.description ? (
                                            <p className="text-sm text-amber-800">{payload.certificate.config.description}</p>
                                        ) : null}
                                        {certificateIssued ? (
                                            <p className="text-sm font-bold text-emerald-700">
                                                ออกใบรับรองแล้ว รหัส {certificateIssued.certificateCode}
                                            </p>
                                        ) : certificateEligibility?.eligible ? (
                                            <p className="text-sm font-bold text-emerald-700">ผ่านเงื่อนไขแล้ว พร้อมรับใบรับรอง</p>
                                        ) : (
                                            <div className="space-y-1 text-sm text-amber-900">
                                                <p className="font-bold">เงื่อนไขที่ยังไม่ครบ</p>
                                                <ul className="space-y-1">
                                                    {certificateEligibility?.reasons.map((reason) => (
                                                        <li key={reason}>- {reason}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {(certificateReward?.behaviorPoints || certificateReward?.achievementTitle) ? (
                                            <div className="pt-1 text-sm font-bold text-amber-900">
                                                {certificateReward.behaviorPoints ? <span>แต้มพฤติกรรม +{certificateReward.behaviorPoints}</span> : null}
                                                {certificateReward.behaviorPoints && certificateReward.achievementTitle ? <span> • </span> : null}
                                                {certificateReward.achievementTitle ? <span>Achievement: {certificateReward.achievementTitle}</span> : null}
                                            </div>
                                        ) : null}
                                    </div>
                                    <Button
                                        onClick={() => void issueCertificate()}
                                        disabled={Boolean(certificateIssued) || !certificateEligibility?.eligible || issuingCertificate}
                                        className="rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600"
                                    >
                                        {issuingCertificate ? "กำลังออกใบรับรอง..." : certificateIssued ? "รับแล้ว" : "รับใบรับรอง"}
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                        {!payload.progress.courseCompleted && payload.progress.courseCompletedByLessons && !payload.progress.assessmentStatus.completed ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                                คุณเรียนบทบังคับครบแล้ว แต่ยังต้องผ่านแบบทดสอบอีก {payload.progress.assessmentStatus.pendingAssessmentIds.length} รายการก่อนจบคอร์ส
                            </div>
                        ) : null}
                        {payload.progress.courseCompleted ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                                คุณผ่านทั้งบทเรียนและแบบทดสอบที่จำเป็นครบแล้ว พร้อมรับใบรับรองเมื่อเงื่อนไขอื่นครบ
                            </div>
                        ) : null}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                variant={selectedLessonCompleted ? "outline" : "default"}
                                onClick={() => void completeCurrentLesson()}
                                disabled={completingLesson}
                                className={
                                    selectedLessonCompleted
                                        ? "rounded-xl font-bold"
                                        : "rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                                }
                            >
                                {completingLesson ? "กำลังบันทึก..." : selectedLessonCompleted ? "บทนี้เรียนจบแล้ว" : "ทำเครื่องหมายว่าจบบทเรียน"}
                            </Button>
                            {payload.progress.completedAt ? (
                                <p className="text-sm font-bold text-emerald-700">คอร์สนี้เรียนครบตามบทที่บังคับแล้ว</p>
                            ) : null}
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <Button
                                variant="outline"
                                disabled={selectedIndex <= 0}
                                onClick={() => {
                                    const previous = allLessons[selectedIndex - 1]
                                    if (previous) selectLesson(previous.lesson.id)
                                }}
                                className="rounded-xl font-bold"
                            >
                                บทก่อนหน้า
                            </Button>
                            <Button
                                disabled={selectedIndex >= allLessons.length - 1}
                                onClick={() => {
                                    const next = allLessons[selectedIndex + 1]
                                    if (next) selectLesson(next.lesson.id)
                                }}
                                className="rounded-xl bg-blue-600 font-black text-white hover:bg-blue-700"
                            >
                                บทถัดไป
                            </Button>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    )
}

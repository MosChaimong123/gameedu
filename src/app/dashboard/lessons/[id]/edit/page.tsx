"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import {
    AlertTriangle,
    BarChart3,
    BookOpen,
    CheckCircle2,
    Download,
    FileText,
    Loader2,
    Plus,
    Sparkles,
    Target,
    Trash2,
    Users,
    VideoIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { PageBackLink } from "@/components/ui/page-back-link"
import { TeachingMediaPickerPanel } from "@/components/dashboard/teaching-media-picker-panel"
import {
    TeacherAssessmentBuilderDialog,
    type TeacherAssessmentBuilderSourceOption,
} from "@/components/lessons/teacher-assessment-builder-dialog"
import { getLessonPublishReadinessIssues, type LessonContentV2 } from "@/lib/lessons/lesson-content"
import { useToast } from "@/components/ui/use-toast"

type LessonStudent = { id: string; name: string; nickname: string | null; order: number }
type LessonAssessmentAttemptRecord = {
    id: string
    classId: string
    studentId: string
    assessmentSourceType?: string | null
    topicId?: string | null
    topicAssessmentId?: string | null
    score: number
    maxScore: number
    passed: boolean
    attemptNumber: number
    rewardGrantedAt: string | null
    rewardSnapshot: {
        behaviorPoints?: number
        gold?: number
        achievementId?: string | null
        achievementTitle?: string | null
    } | null
    certificateIssuedAt: string | null
    answers?: number[]
    completedAt: string
    questionSet?: {
        id: string
        title: string
        questions?: unknown
        parsedQuestions?: Array<{
            id: string
            question: string
            options: string[]
            correctAnswer: number
        }> | null
    } | null
    student?: LessonStudent
}
type LessonCertificateRecord = {
    id: string
    classId: string
    studentId: string
    certificateScope?: string | null
    topicId?: string | null
    topicAssessmentId?: string | null
    title: string
    description: string | null
    certificateCode: string
    rewardSnapshot: {
        behaviorPoints?: number
        gold?: number
        achievementId?: string | null
        achievementTitle?: string | null
    } | null
    issuedAt: string
    criteriaSnapshot?: unknown
    student?: LessonStudent
}
type Lesson = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    status: "DRAFT" | "PUBLISHED"
    content: unknown
    classroomAssignments: Array<{
        id: string
        classId: string
        classroom: { id: string; name: string; students: LessonStudent[] }
        completions: Array<{
            studentId: string
            quizScore: number | null
            completedAt: string
            student?: LessonStudent
        }>
    }>
    assessmentAttempts: LessonAssessmentAttemptRecord[]
    certificates: LessonCertificateRecord[]
}
type Classroom = { id: string; name: string; grade: string | null; _count: { students: number } }

type TopicAssessmentStatusFilter = "all" | "not_started" | "submitted" | "passed" | "failed"

function isLessonContentV2Client(content: unknown): content is LessonContentV2 {
    return Boolean(content && typeof content === "object" && (content as { schemaVersion?: unknown }).schemaVersion === "lesson_content_v2")
}

function hasPublishableTopic(content: LessonContentV2) {
    return getLessonPublishReadinessIssues(content).length === 0
}

function getTopicStatusAfterEdit(topic: LessonContentV2["topics"][number]): LessonContentV2["topics"][number]["contentStatus"] {
    const ready =
        topic.objectives.some((objective) => objective.trim()) &&
        topic.sections.some((section) => section.heading.trim() && section.content.trim())
    return ready ? "edited" : "empty"
}

function getAttemptTopicKey(attempt: LessonAssessmentAttemptRecord) {
    return attempt.topicAssessmentId ?? attempt.topicId ?? `lesson:${attempt.id}`
}

function getCertificateTopicKey(certificate: LessonCertificateRecord) {
    return certificate.topicAssessmentId ?? certificate.topicId ?? `lesson:${certificate.id}`
}

function getLatestAttemptsByStudentForTopic(
    attempts: LessonAssessmentAttemptRecord[],
    topicId: string,
    topicAssessmentId?: string | null
) {
    const filtered = attempts.filter(
        (attempt) =>
            (topicAssessmentId && attempt.topicAssessmentId === topicAssessmentId) ||
            (!topicAssessmentId && attempt.topicId === topicId) ||
            attempt.topicId === topicId
    )
    return new Map(filtered.map((attempt) => [attempt.studentId, attempt] as const))
}

export default function EditLessonPage() {
    const { id } = useParams<{ id: string }>()
    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [loading, setLoading] = useState(true)
    const [legacyBlocked, setLegacyBlocked] = useState(false)
    const [title, setTitle] = useState("")
    const [subject, setSubject] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [content, setContent] = useState<LessonContentV2 | null>(null)
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [savedOk, setSavedOk] = useState(false)
    const [error, setError] = useState("")
    const [assignOpen, setAssignOpen] = useState(false)
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [assigning, setAssigning] = useState<string | null>(null)
    const [assignError, setAssignError] = useState("")
    const [assessmentBuilderOpen, setAssessmentBuilderOpen] = useState(false)
    const [analyticsTopicFilter, setAnalyticsTopicFilter] = useState<string>("all")
    const [analyticsStatusFilter, setAnalyticsStatusFilter] = useState<TopicAssessmentStatusFilter>("all")
    const { toast } = useToast()

    const refreshLesson = useCallback(async () => {
        const response = await fetch(`/api/lessons/${id}`)
        const data = (await response.json()) as Lesson
        setLesson(data)
        setTitle(data.title)
        setSubject(data.subject ?? "")
        setGradeLevel(data.gradeLevel ?? "")
        if (isLessonContentV2Client(data.content)) {
            setContent(data.content)
            setSelectedTopicId(data.content.topics[0]?.id ?? null)
            setLegacyBlocked(false)
        } else {
            setContent(null)
            setLegacyBlocked(true)
        }
    }, [id])

    useEffect(() => {
        refreshLesson()
            .catch(() => setError("โหลดบทเรียนไม่สำเร็จ"))
            .finally(() => setLoading(false))
    }, [refreshLesson])

    const fetchClassrooms = useCallback(() => {
        fetch("/api/classrooms")
            .then((response) => response.json())
            .then((data) => Array.isArray(data) && setClassrooms(data))
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        if (window.location.hash === "#assign") {
            fetchClassrooms()
            setAssignOpen(true)
        }
    }, [fetchClassrooms])

    const selectedTopic = useMemo(() => {
        if (!content) return null
        return content.topics.find((topic) => topic.id === selectedTopicId) ?? content.topics[0] ?? null
    }, [content, selectedTopicId])

    const topicTitleById = useMemo(() => {
        const entries = content?.topics.map((topic) => [topic.id, topic.title] as const) ?? []
        return new Map(entries)
    }, [content])

    const assignedStudentIds = useMemo(() => {
        return new Set(
            lesson?.classroomAssignments.flatMap((assignment) => assignment.classroom.students.map((student) => student.id)) ?? []
        )
    }, [lesson])

    const topicAssessmentAnalytics = useMemo(() => {
        if (!lesson || !content) return []

        return content.topics
            .filter((topic) => topic.assessment?.questionSetId)
            .map((topic) => {
                const latestAttemptsByStudent = getLatestAttemptsByStudentForTopic(
                    lesson.assessmentAttempts,
                    topic.id,
                    topic.assessment?.id ?? null
                )
                const submitted = latestAttemptsByStudent.size
                const passed = Array.from(latestAttemptsByStudent.values()).filter((attempt) => attempt.passed).length
                const failed = submitted - passed
                const notStarted = Math.max(assignedStudentIds.size - submitted, 0)
                const latestAttempts = Array.from(latestAttemptsByStudent.values())
                const questionTemplate = latestAttempts.find((attempt) => attempt.questionSet?.parsedQuestions?.length)?.questionSet?.parsedQuestions ?? []
                const missBuckets = new Map<
                    string,
                    { questionId: string; question: string; wrongCount: number; submissionCount: number }
                >()

                for (const attempt of latestAttempts) {
                    const parsedQuestions = attempt.questionSet?.parsedQuestions ?? []
                    for (let index = 0; index < parsedQuestions.length; index += 1) {
                        const question = parsedQuestions[index]
                        const answer = attempt.answers?.[index]
                        const key = question.id || `q-${index}`
                        const bucket = missBuckets.get(key) ?? {
                            questionId: key,
                            question: question.question,
                            wrongCount: 0,
                            submissionCount: 0,
                        }
                        bucket.submissionCount += 1
                        if (answer !== question.correctAnswer) {
                            bucket.wrongCount += 1
                        }
                        missBuckets.set(key, bucket)
                    }
                }

                const topMissedQuestions = Array.from(missBuckets.values())
                    .filter((bucket) => bucket.wrongCount > 0)
                    .sort((left, right) => {
                        if (right.wrongCount !== left.wrongCount) return right.wrongCount - left.wrongCount
                        return right.submissionCount - left.submissionCount
                    })
                    .slice(0, 3)
                    .map((bucket, index) => ({
                        ...bucket,
                        label: questionTemplate[index]?.question ?? bucket.question,
                    }))

                return {
                    topicId: topic.id,
                    topicTitle: topic.title,
                    assessmentId: topic.assessment?.id ?? null,
                    submitted,
                    passed,
                    failed,
                    notStarted,
                    latestAttemptsByStudent,
                    topMissedQuestions,
                }
            })
    }, [assignedStudentIds, content, lesson])

    const activeAnalyticsTopic =
        analyticsTopicFilter === "all"
            ? null
            : topicAssessmentAnalytics.find((topic) => topic.topicId === analyticsTopicFilter) ?? null

    const assessmentSourceOptions = useMemo<TeacherAssessmentBuilderSourceOption[]>(() => {
        if (!content || !lesson) return []

        return content.topics.map((topic) => ({
            id: topic.id,
            label: topic.title,
            description: topic.description || "สร้างเฉพาะหัวข้อนี้",
            requestBody: { lessonId: lesson.id, topicId: topic.id },
            suggestedTitle: `${topic.title} แบบทดสอบย่อย`,
            suggestedDescription: `แบบทดสอบจากหัวข้อ ${topic.title}`,
        }))
    }, [content, lesson])

    const publishIssues = useMemo(
        () => (content ? getLessonPublishReadinessIssues(content) : []),
        [content]
    )
    const videoIssues = useMemo(
        () => publishIssues.filter((issue) => issue.code === "MISSING_TOPIC_VIDEO"),
        [publishIssues]
    )
    const topicsWithoutVideo = useMemo(
        () => new Set(videoIssues.map((issue) => issue.topicId).filter(Boolean) as string[]),
        [videoIssues]
    )
    const publishBlockedReason =
        content && lesson?.status !== "PUBLISHED" && !hasPublishableTopic(content)
                ? "ต้องมีบทเรียนอย่างน้อย 1 หัวข้อที่มีวัตถุประสงค์และเนื้อหาก่อนเผยแพร่"
            : videoIssues.length > 0 && lesson?.status !== "PUBLISHED"
                  ? `หัวข้อที่ยังไม่มีวิดีโอ ${videoIssues.length} หัวข้อ — กรุณาเพิ่มวิดีโอทุกหัวข้อก่อนเผยแพร่`
              : ""

    function updateContent(mutator: (current: LessonContentV2) => LessonContentV2) {
        setContent((current) => current ? mutator(current) : current)
    }

    function updateTopic(topicId: string, mutator: (topic: LessonContentV2["topics"][number]) => LessonContentV2["topics"][number]) {
        updateContent((current) => {
            const topics = current.topics.map((topic) => {
                if (topic.id !== topicId) return topic
                const updated = mutator(topic)
                return { ...updated, contentStatus: getTopicStatusAfterEdit(updated) }
            })
            return {
                ...current,
                outline: {
                    ...current.outline,
                    topics: current.outline.topics.map((topic) => {
                        const updated = topics.find((candidate) => candidate.id === topic.id)
                        return updated
                            ? { id: updated.id, title: updated.title, description: updated.description, order: updated.order }
                            : topic
                    }),
                },
                topics,
            }
        })
    }


    function updateTopicAssessment(
        topicId: string,
        mutator: (
            assessment: NonNullable<LessonContentV2["topics"][number]["assessment"]>
        ) => NonNullable<LessonContentV2["topics"][number]["assessment"]>
    ) {
        updateTopic(topicId, (topic) =>
            topic.assessment
                ? {
                      ...topic,
                      assessment: mutator(topic.assessment),
                  }
                : topic
        )
    }
    async function handleSave() {
        if (!content) return
        setSaving(true)
        setSavedOk(false)
        setError("")
        try {
            const response = await fetch(`/api/lessons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, subject: subject || null, gradeLevel: gradeLevel || null, content }),
            })
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}))
                throw new Error(payload?.error?.message ?? "บันทึกบทเรียนไม่สำเร็จ")
            }
            const updated = (await response.json()) as Lesson
            setLesson((prev) => prev ? { ...prev, ...updated } : updated)
            setSavedOk(true)
            setTimeout(() => setSavedOk(false), 1800)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "บันทึกบทเรียนไม่สำเร็จ")
        } finally {
            setSaving(false)
        }
    }

    async function handleTogglePublish() {
        if (!lesson || !content || publishBlockedReason) return
        setSaving(true)
        setError("")
        try {
            const nextStatus = lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
            const response = await fetch(`/api/lessons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: nextStatus }),
            })
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}))
                throw new Error(payload?.error?.message ?? "เปลี่ยนสถานะบทเรียนไม่สำเร็จ")
            }
            setLesson((prev) => prev ? { ...prev, status: nextStatus } : prev)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "เปลี่ยนสถานะบทเรียนไม่สำเร็จ")
        } finally {
            setSaving(false)
        }
    }

    async function handleAssign(classId: string) {
        if (!lesson || lesson.status !== "PUBLISHED") {
            setAssignError("ต้องเผยแพร่บทเรียนก่อน จึงจะ assign ให้ห้องเรียนได้")
            return
        }
        setAssigning(classId)
        setAssignError("")
        try {
            const response = await fetch(`/api/classrooms/${classId}/lessons`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId: id }),
            })
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}))
                throw new Error(payload?.error?.message ?? "assign บทเรียนไม่สำเร็จ")
            }
            await refreshLesson()
        } catch (caught) {
            setAssignError(caught instanceof Error ? caught.message : "assign บทเรียนไม่สำเร็จ")
        } finally {
            setAssigning(null)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-24">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
        )
    }

    if (!lesson) {
        return <div className="py-16 text-center text-slate-500">ไม่พบบทเรียนนี้</div>
    }

    if (legacyBlocked || !content || !selectedTopic) {
        return (
            <div className="mx-auto max-w-3xl space-y-5 py-8">
                <PageBackLink href="/dashboard/lessons" label="บทเรียนก่อนหน้า" />
                <div className="rounded-[2rem] border border-red-100 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-2xl font-black text-slate-900">บทเรียนนี้เป็นข้อมูลเก่า</h1>
                    <p className="mt-2 text-sm font-bold text-slate-500">
                        ระบบ V1 ถูกปิดใช้งานแล้ว กรุณาสร้างบทเรียนใหม่ด้วย AI Lesson Wizard เพื่อใช้ระบบ Lesson V2 เท่านั้น
                    </p>
                </div>
            </div>
        )
    }

    const assignedClassIds = new Set(lesson.classroomAssignments.map((assignment) => assignment.classId))
    const totalAssignedStudents = lesson.classroomAssignments.reduce((sum, assignment) => sum + assignment.classroom.students.length, 0)
    const totalCompletions = lesson.classroomAssignments.reduce((sum, assignment) => sum + assignment.completions.length, 0)
    const selectedTopicAssessment = selectedTopic.assessment ?? null

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <PageBackLink href="/dashboard/lessons" label="บทเรียนก่อนหน้า" />
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setAssessmentBuilderOpen(true)}
                        disabled={saving}
                        className="rounded-xl font-bold"
                    >
                        <Sparkles className="mr-2 h-4 w-4" />
                        สร้างแบบทดสอบหัวข้อที่เลือก
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleTogglePublish}
                        disabled={saving || Boolean(publishBlockedReason)}
                        title={publishBlockedReason || undefined}
                        className="rounded-xl font-bold"
                    >
                        {lesson.status === "PUBLISHED" ? "ยกเลิกเผยแพร่" : "เผยแพร่"}
                    </Button>
                    <Button
                        onClick={() => {
                            fetchClassrooms()
                            setAssignOpen(true)
                        }}
                        className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Assign
                    </Button>
                </div>
            </div>

            {(error || publishBlockedReason) && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
                    {error || publishBlockedReason}
                </div>
            )}

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Badge className={lesson.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}>
                            {lesson.status}
                        </Badge>
                        <h1 className="mt-3 text-3xl font-black text-slate-950">{title}</h1>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center text-xs font-black text-slate-500 sm:grid-cols-3">
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-lg text-slate-900">{lesson.classroomAssignments.length}</p>
                            <p>ห้อง</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-lg text-slate-900">{totalAssignedStudents}</p>
                            <p>นักเรียน</p>
                        </div>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                            <p className="text-lg text-slate-900">{totalCompletions}</p>
                            <p>เรียนจบ</p>
                        </div>
                    </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-3">
                        <Label className="font-bold text-slate-700">ชื่อบทเรียน</Label>
                        <Input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl font-black" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">วิชา</Label>
                        <Input value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">ระดับชั้น</Label>
                        <Input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">เวลาโดยประมาณ</Label>
                        <Input
                            type="number"
                            value={content.estimatedMinutes ?? ""}
                            onChange={(event) => updateContent((current) => ({ ...current, estimatedMinutes: Number(event.target.value) || undefined }))}
                            className="rounded-xl"
                        />
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <div className="mb-2 flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-violet-600" />
                            <h2 className="font-black text-slate-900">แบบทดสอบของหัวข้อที่เลือก</h2>
                        </div>
                        <p className="text-sm font-bold text-slate-400">
                            จัดการ question set, เกณฑ์ผ่าน, รางวัล และใบรับรองแยกตามหัวข้อ เพื่อให้แต่ละบทเรียนย่อยมีแบบทดสอบของตัวเอง
                        </p>
                    </div>
                    <Button variant="outline" onClick={() => setAssessmentBuilderOpen(true)} className="rounded-xl font-bold">
                        <Sparkles className="mr-2 h-4 w-4" />
                        {selectedTopicAssessment ? "สร้างใหม่หรือเปลี่ยนแบบทดสอบ" : "สร้างแบบทดสอบหัวข้อนี้"}
                    </Button>
                </div>

                {selectedTopicAssessment ? (
                    <>
                        <div className="mt-4 grid gap-3 rounded-2xl border border-violet-100 bg-violet-50 p-4 md:grid-cols-4">
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-violet-600">ชื่อแบบทดสอบ</p>
                                <p className="mt-1 font-black text-slate-900">{selectedTopicAssessment.title}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-violet-600">Question Set</p>
                                <p className="mt-1 font-bold text-slate-700">{selectedTopicAssessment.questionSetId}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-violet-600">เกณฑ์ผ่าน</p>
                                <p className="mt-1 font-bold text-slate-700">{selectedTopicAssessment.passScore ?? "ไม่บังคับคะแนนผ่าน"}</p>
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase tracking-wide text-violet-600">Retake</p>
                                <p className="mt-1 font-bold text-slate-700">{selectedTopicAssessment.allowRetake === false ? "ปิด" : "เปิด"}</p>
                            </div>
                        </div>
                        <div className="mt-4 grid gap-5 rounded-2xl border border-slate-200 bg-white p-4 lg:grid-cols-2">
                            <div className="space-y-3">
                                <div>
                                    <h3 className="font-black text-slate-900">รางวัลเมื่อสอบผ่านหัวข้อนี้</h3>
                                    <p className="text-sm font-bold text-slate-500">
                                        จ่ายรางวัลเมื่อผู้เรียนสอบผ่านแบบทดสอบของหัวข้อที่เลือกตามกติกาที่ตั้งไว้
                                    </p>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">แต้มพฤติกรรม</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={selectedTopicAssessment.reward?.behaviorPoints ?? 0}
                                            onChange={(event) =>
                                                updateTopicAssessment(selectedTopic.id, (assessment) => ({
                                                    ...assessment,
                                                    reward: {
                                                        ...(assessment.reward ?? {}),
                                                        behaviorPoints: Math.max(0, Number(event.target.value) || 0),
                                                    },
                                                }))
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">ทอง</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={selectedTopicAssessment.reward?.gold ?? 0}
                                            onChange={(event) =>
                                                updateTopicAssessment(selectedTopic.id, (assessment) => ({
                                                    ...assessment,
                                                    reward: {
                                                        ...(assessment.reward ?? {}),
                                                        gold: Math.max(0, Number(event.target.value) || 0),
                                                    },
                                                }))
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Achievement ID</Label>
                                        <Input
                                            value={selectedTopicAssessment.reward?.achievementId ?? ""}
                                            onChange={(event) =>
                                                updateTopicAssessment(selectedTopic.id, (assessment) => ({
                                                    ...assessment,
                                                    reward: {
                                                        ...(assessment.reward ?? {}),
                                                        achievementId: event.target.value || undefined,
                                                    },
                                                }))
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Achievement Title</Label>
                                        <Input
                                            value={selectedTopicAssessment.reward?.achievementTitle ?? ""}
                                            onChange={(event) =>
                                                updateTopicAssessment(selectedTopic.id, (assessment) => ({
                                                    ...assessment,
                                                    reward: {
                                                        ...(assessment.reward ?? {}),
                                                        achievementTitle: event.target.value || undefined,
                                                    },
                                                }))
                                            }
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <h3 className="font-black text-slate-900">ใบรับรองของหัวข้อนี้</h3>
                                        <p className="text-sm font-bold text-slate-500">เปิดใช้งานเมื่อผู้เรียนสอบผ่านแบบทดสอบของหัวข้อที่เลือก</p>
                                    </div>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={selectedTopicAssessment.certificate?.enabled ?? false}
                                            onChange={(event) =>
                                                updateTopicAssessment(selectedTopic.id, (assessment) => ({
                                                    ...assessment,
                                                    certificate: {
                                                        ...(assessment.certificate ?? {}),
                                                        enabled: event.target.checked,
                                                    },
                                                }))
                                            }
                                        />
                                        เปิดใช้
                                    </label>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">ชื่อใบรับรอง</Label>
                                    <Input
                                        value={selectedTopicAssessment.certificate?.title ?? ""}
                                        onChange={(event) =>
                                            updateTopicAssessment(selectedTopic.id, (assessment) => ({
                                                ...assessment,
                                                certificate: {
                                                    ...(assessment.certificate ?? { enabled: false }),
                                                    title: event.target.value || undefined,
                                                },
                                            }))
                                        }
                                        className="rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-slate-700">คำอธิบายใบรับรอง</Label>
                                    <Textarea
                                        value={selectedTopicAssessment.certificate?.description ?? ""}
                                        onChange={(event) =>
                                            updateTopicAssessment(selectedTopic.id, (assessment) => ({
                                                ...assessment,
                                                certificate: {
                                                    ...(assessment.certificate ?? { enabled: false }),
                                                    description: event.target.value || undefined,
                                                },
                                            }))
                                        }
                                        rows={4}
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500">
                        หัวข้อนี้ยังไม่มีแบบทดสอบ สร้าง question set สำหรับหัวข้อนี้ได้เลย
                    </div>
                )}
            </section>

            <section className="grid gap-5 lg:grid-cols-[280px_1fr]">
                <aside className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                        <h2 className="font-black text-slate-800">บทเรียน</h2>
                    </div>
                    <div className="space-y-2">
                        {content.topics
                            .slice()
                            .sort((a, b) => a.order - b.order)
                            .map((topic) => (
                                <button
                                    key={topic.id}
                                    type="button"
                                    onClick={() => setSelectedTopicId(topic.id)}
                                    className={
                                        topic.id === selectedTopic.id
                                            ? "w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left"
                                            : "w-full rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-left hover:bg-white"
                                    }
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-black text-slate-800">{topic.title}</p>
                                        <div className="flex items-center gap-1">
                                            {topic.assessment ? (
                                                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">
                                                    มีแบบทดสอบ
                                                </span>
                                            ) : null}
                                            {topicsWithoutVideo.has(topic.id) && (
                                                <span title="ยังไม่มีวิดีโอ" className="flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-700">
                                                    <VideoIcon className="h-3 w-3" />
                                                    ขาดคลิป
                                                </span>
                                            )}
                                            <Badge className={topic.contentStatus === "empty" ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}>
                                                {topic.contentStatus}
                                            </Badge>
                                        </div>
                                    </div>
                                    {topic.description && <p className="mt-1 text-xs font-bold text-slate-400">{topic.description}</p>}
                                </button>
                            ))}
                    </div>
                </aside>

                <div className="space-y-5">
                    {/* Video warning banner — แสดงเมื่อ topic ที่เลือกยังไม่มีวิดีโอ */}
                    {topicsWithoutVideo.has(selectedTopic.id) && (
                        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                            <div>
                                <p className="text-sm font-black text-amber-900">หัวข้อนี้ยังไม่มีวิดีโอ</p>
                                <p className="mt-0.5 text-xs font-bold text-amber-700">
                                    ต้องเพิ่มวิดีโอทุกหัวข้อก่อนจึงจะเผยแพร่บทเรียนได้ — เลือกวิดีโอจากคลังสื่อในส่วน “คลิปประกอบหัวข้อย่อย” ด้านล่าง
                                </p>
                            </div>
                        </div>
                    )}
                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="grid gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">ชื่อบทเรียนย่อย</Label>
                                <Input
                                    value={selectedTopic.title}
                                    onChange={(event) => updateTopic(selectedTopic.id, (topic) => ({ ...topic, title: event.target.value }))}
                                    className="rounded-xl font-black"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">คำอธิบาย</Label>
                                <Textarea
                                    value={selectedTopic.description ?? ""}
                                    onChange={(event) => updateTopic(selectedTopic.id, (topic) => ({ ...topic, description: event.target.value }))}
                                    rows={2}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Target className="h-5 w-5 text-emerald-600" />
                                <h3 className="font-black text-slate-800">วัตถุประสงค์การเรียนรู้</h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="rounded-xl text-xs font-bold text-slate-500"
                                onClick={() => updateTopic(selectedTopic.id, (topic) => ({ ...topic, objectives: [...topic.objectives, ""] }))}
                            >
                                <Plus className="mr-1 h-3 w-3" />
                                เพิ่ม
                            </Button>
                        </div>
                        <div className="space-y-2">
                            {selectedTopic.objectives.map((objective, index) => (
                                <div key={index} className="flex items-start gap-2">
                                    <Textarea
                                        value={objective}
                                        onChange={(event) =>
                                            updateTopic(selectedTopic.id, (topic) => {
                                                const objectives = [...topic.objectives]
                                                objectives[index] = event.target.value
                                                return { ...topic, objectives }
                                            })
                                        }
                                        rows={2}
                                        className="rounded-xl text-sm"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="mt-1 shrink-0 rounded-xl text-slate-300 hover:text-red-500"
                                        onClick={() =>
                                            updateTopic(selectedTopic.id, (topic) => ({
                                                ...topic,
                                                objectives: topic.objectives.filter((_, itemIndex) => itemIndex !== index),
                                            }))
                                        }
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {selectedTopic.sections.map((section, sectionIndex) => (
                        <div key={section.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                            <div className="mb-3 flex items-center gap-2">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-600">
                                    {sectionIndex + 1}
                                </div>
                                <Input
                                    value={section.heading}
                                    onChange={(event) =>
                                        updateTopic(selectedTopic.id, (topic) => {
                                            const sections = [...topic.sections]
                                            sections[sectionIndex] = { ...sections[sectionIndex], heading: event.target.value }
                                            return { ...topic, sections }
                                        })
                                    }
                                    className="rounded-xl font-black"
                                    placeholder="ชื่อหัวข้อย่อย"
                                />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 rounded-xl text-slate-300 hover:text-red-500"
                                    onClick={() =>
                                        updateTopic(selectedTopic.id, (topic) => ({
                                            ...topic,
                                            sections: topic.sections.filter((_, itemIndex) => itemIndex !== sectionIndex),
                                        }))
                                    }
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                            <Textarea
                                value={section.content}
                                onChange={(event) =>
                                    updateTopic(selectedTopic.id, (topic) => {
                                        const sections = [...topic.sections]
                                        sections[sectionIndex] = { ...sections[sectionIndex], content: event.target.value }
                                        return { ...topic, sections }
                                    })
                                }
                                rows={6}
                                className="rounded-xl text-sm text-slate-700"
                                placeholder="เนื้อหาสั้น ๆ สำหรับหัวข้อย่อยนี้"
                            />
                            <div className="mt-4">
                                <TeachingMediaPickerPanel
                                    selected={(section.media ?? []).map((m) => ({
                                        mediaId: m.mediaId,
                                        type: m.type,
                                        title: m.title ?? "",
                                        url: m.url,
                                        source: m.source,
                                    }))}
                                    allowedTypes={["video", "youtube"]}
                                    title="คลิปประกอบหัวข้อย่อย"
                                    description="เลือกวิดีโอหรือ YouTube จากคลังสื่อเพื่อใช้เป็นสื่อหลักของหัวข้อย่อย"
                                    onChange={(references) => {
                                        const media = references.flatMap((reference) => {
                                            const url = reference.url ?? reference.linkUrl ?? (reference.youtubeId ? `https://www.youtube.com/watch?v=${reference.youtubeId}` : "")
                                            if (!url) return []
                                            return [{
                                                id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                                                type: "video" as const,
                                                url,
                                                mediaId: reference.mediaId,
                                                title: reference.title,
                                                source: "media_library" as const,
                                            }]
                                        })
                                        updateTopic(selectedTopic.id, (topic) => {
                                            const sections = [...topic.sections]
                                            sections[sectionIndex] = {
                                                ...sections[sectionIndex],
                                                media: media,
                                            }
                                            return { ...topic, sections }
                                        })
                                    }}
                                />
                            </div>
                        </div>
                    ))}

                    <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-2xl border-dashed font-bold text-slate-500"
                        onClick={() =>
                            updateTopic(selectedTopic.id, (topic) => ({
                                ...topic,
                                sections: [
                                    ...topic.sections,
                                    { id: `section-${Date.now()}`, heading: "หัวข้อย่อยใหม่", content: "" },
                                ],
                            }))
                        }
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        เพิ่มส่วนเนื้อหา
                    </Button>

                    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-black text-slate-800">เอกสารการเรียนรู้</h3>
                        </div>
                        <TeachingMediaPickerPanel
                            selected={selectedTopic.documents ?? []}
                            allowedTypes={["file", "link"]}
                            title="แนบเอกสารการเรียนรู้"
                            description="แนบไฟล์ PDF เอกสารประกอบ หรือแหล่งเรียนรู้ที่ใช้ดูกับบทเรียนนี้"
                            onChange={(documents) => updateTopic(selectedTopic.id, (topic) => ({ ...topic, documents }))}
                        />
                    </div>
                </div>
            </section>

            {lesson.classroomAssignments.length > 0 && (
                <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            <h3 className="font-black text-slate-800">รายชื่อนักเรียนและผลการเรียน</h3>
                        </div>
                        <a href={`/api/lessons/${lesson.id}/progress/export`}>
                            <Button variant="outline" size="sm" className="rounded-xl font-bold">
                                <Download className="mr-2 h-4 w-4" />
                                Export CSV
                            </Button>
                        </a>
                    </div>
                    {topicAssessmentAnalytics.length > 0 && (
                        <div className="mb-6 space-y-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-black text-slate-700">ดูผลตามหัวข้อ</span>
                                <select
                                    value={analyticsTopicFilter}
                                    onChange={(event) => setAnalyticsTopicFilter(event.target.value)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                                >
                                    <option value="all">ทุกหัวข้อ</option>
                                    {topicAssessmentAnalytics.map((topic) => (
                                        <option key={topic.topicId} value={topic.topicId}>
                                            {topic.topicTitle}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={analyticsStatusFilter}
                                    onChange={(event) => setAnalyticsStatusFilter(event.target.value as TopicAssessmentStatusFilter)}
                                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
                                >
                                    <option value="all">ทุกสถานะ</option>
                                    <option value="not_started">ยังไม่เริ่ม</option>
                                    <option value="submitted">ส่งแล้วทั้งหมด</option>
                                    <option value="passed">ผ่าน</option>
                                    <option value="failed">ไม่ผ่าน</option>
                                </select>
                            </div>
                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                {(activeAnalyticsTopic ? [activeAnalyticsTopic] : topicAssessmentAnalytics).map((topic) => (
                                    <div key={topic.topicId} className="rounded-2xl border border-slate-200 bg-white p-4">
                                        <p className="text-sm font-black text-slate-800">{topic.topicTitle}</p>
                                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-black">
                                            <span className="rounded-xl bg-blue-50 px-3 py-2 text-blue-700">ส่งแล้ว {topic.submitted}</span>
                                            <span className="rounded-xl bg-emerald-50 px-3 py-2 text-emerald-700">ผ่าน {topic.passed}</span>
                                            <span className="rounded-xl bg-rose-50 px-3 py-2 text-rose-700">ไม่ผ่าน {topic.failed}</span>
                                            <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700">ยังไม่เริ่ม {topic.notStarted}</span>
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <p className="text-xs font-black text-slate-500">ข้อที่พลาดบ่อย</p>
                                            {topic.topMissedQuestions.length === 0 ? (
                                                <p className="text-xs text-slate-400">ยังไม่มีข้อมูลคำตอบผิด</p>
                                            ) : (
                                                topic.topMissedQuestions.map((question) => (
                                                    <div key={question.questionId} className="rounded-xl bg-amber-50 px-3 py-2 text-xs">
                                                        <p className="font-bold text-slate-700 line-clamp-2">{question.question}</p>
                                                        <p className="mt-1 font-black text-amber-700">ผิด {question.wrongCount} / {question.submissionCount}</p>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="space-y-4">
                        {lesson.classroomAssignments.map((assignment) => {
                            const completionByStudent = new Map(assignment.completions.map((completion) => [completion.studentId, completion]))
                            const attemptsForClass = lesson.assessmentAttempts.filter((attempt) => attempt.classId === assignment.classId)
                            const certificatesForClass = lesson.certificates.filter((certificate) => certificate.classId === assignment.classId)
                            const attemptsByStudent = new Map<string, LessonAssessmentAttemptRecord[]>()
                            for (const attempt of attemptsForClass) {
                                const existing = attemptsByStudent.get(attempt.studentId) ?? []
                                existing.push(attempt)
                                attemptsByStudent.set(attempt.studentId, existing)
                            }
                            const certificatesByStudent = new Map<string, LessonCertificateRecord[]>()
                            for (const certificate of certificatesForClass) {
                                const existing = certificatesByStudent.get(certificate.studentId) ?? []
                                existing.push(certificate)
                                certificatesByStudent.set(certificate.studentId, existing)
                            }
                            const filteredStudents = assignment.classroom.students.filter((student) => {
                                if (!activeAnalyticsTopic) return true
                                const topicAttempt = activeAnalyticsTopic.latestAttemptsByStudent.get(student.id)
                                if (analyticsStatusFilter === "passed") return Boolean(topicAttempt?.passed)
                                if (analyticsStatusFilter === "failed") return Boolean(topicAttempt && !topicAttempt.passed)
                                if (analyticsStatusFilter === "submitted") return Boolean(topicAttempt)
                                if (analyticsStatusFilter === "not_started") return !topicAttempt
                                return true
                            })
                            const totalStudents = assignment.classroom.students.length
                            const completedCount = assignment.completions.length
                            const passedCount = new Set(
                                attemptsForClass.filter((attempt) => attempt.passed).map((attempt) => `${attempt.studentId}:${getAttemptTopicKey(attempt)}`)
                            ).size
                            const rewardedCount = new Set(
                                attemptsForClass
                                    .filter((attempt) => Boolean(attempt.rewardGrantedAt))
                                    .map((attempt) => `${attempt.studentId}:${getAttemptTopicKey(attempt)}`)
                            ).size
                            const certificateCount = new Set(
                                certificatesForClass.map((certificate) => `${certificate.studentId}:${getCertificateTopicKey(certificate)}`)
                            ).size
                            const progressPercent = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0
                            return (
                                <div key={assignment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-slate-800">{assignment.classroom.name}</p>
                                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                                                <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-700">สอบผ่าน {passedCount}</span>
                                                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">รับรางวัล {rewardedCount}</span>
                                                <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">ใบรับรอง {certificateCount}</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-400">{completedCount}/{totalStudents} คนเรียนจบ</p>
                                        </div>
                                        <span className="flex items-center gap-1 font-bold text-emerald-600">
                                            <Users className="h-3.5 w-3.5" />
                                            {progressPercent}%
                                        </span>
                                    </div>
                                    <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progressPercent}%` }} />
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                                        {filteredStudents.length === 0 ? (
                                            <p className="p-4 text-sm text-slate-400">ยังไม่มีนักเรียนในห้องนี้</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {filteredStudents.map((student) => {
                                                    const completion = completionByStudent.get(student.id)
                                                    const assessmentAttempts = attemptsByStudent.get(student.id) ?? []
                                                    const certificates = certificatesByStudent.get(student.id) ?? []
                                                    return (
                                                        <div key={student.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto]">
                                                            <div>
                                                                <p className="font-bold text-slate-800">{student.order + 1}. {student.name}</p>
                                                                {student.nickname && <p className="text-xs text-slate-400">{student.nickname}</p>}
                                                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                                                                    {assessmentAttempts.map((attempt) => {
                                                                        const label = attempt.topicId ? (topicTitleById.get(attempt.topicId) ?? attempt.topicId) : "lesson"
                                                                        return (
                                                                            <span
                                                                                key={attempt.id}
                                                                                className={
                                                                                    attempt.passed
                                                                                        ? "rounded-full bg-violet-100 px-2 py-1 text-violet-700"
                                                                                        : "rounded-full bg-rose-100 px-2 py-1 text-rose-700"
                                                                                }
                                                                            >
                                                                                {attempt.passed ? `ผ่าน ${label} ${attempt.score}/${attempt.maxScore}` : `ไม่ผ่าน ${label} ${attempt.score}/${attempt.maxScore}`}
                                                                            </span>
                                                                        )
                                                                    })}
                                                                    {assessmentAttempts
                                                                        .filter((attempt) => Boolean(attempt.rewardGrantedAt))
                                                                        .map((attempt) => (
                                                                            <span key={`reward-${attempt.id}`} className="rounded-full bg-amber-100 px-2 py-1 text-amber-700">
                                                                                Reward {attempt.topicId ? (topicTitleById.get(attempt.topicId) ?? attempt.topicId) : "lesson"}
                                                                            </span>
                                                                        ))}
                                                                    {certificates.map((certificate) => (
                                                                        <span key={certificate.id} className="rounded-full bg-sky-100 px-2 py-1 text-sky-700">
                                                                            Cert {certificate.topicId ? (topicTitleById.get(certificate.topicId) ?? certificate.topicId) : "lesson"} {certificate.certificateCode}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <Badge className={completion ? "w-fit bg-emerald-100 text-emerald-700" : "w-fit bg-slate-100 text-slate-500"}>
                                                                {completion ? "เรียนจบแล้ว" : "ยังไม่จบ"}
                                                            </Badge>
                                                            <div className="text-left text-xs font-bold text-slate-500 sm:text-right">
                                                                {completion ? new Date(completion.completedAt).toLocaleDateString("th-TH") : "-"}
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            )}

            <div className="sticky bottom-4 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-2xl bg-emerald-600 px-8 font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : savedOk ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
                    {savedOk ? "บันทึกแล้ว" : "บันทึกการเปลี่ยนแปลง"}
                </Button>
            </div>

            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-black">Assign บทเรียนให้ห้องเรียน</DialogTitle>
                        <DialogDescription>เลือกห้องเรียนที่ต้องการให้นักเรียนเข้าถึงบทเรียนนี้</DialogDescription>
                    </DialogHeader>
                    {lesson.status !== "PUBLISHED" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-700">
                            ต้องเผยแพร่บทเรียนก่อน จึงจะ assign ให้ห้องเรียนได้
                        </div>
                    )}
                    {assignError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                            {assignError}
                        </div>
                    )}
                    <div className="space-y-2">
                        {classrooms.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีห้องเรียน</p>
                        ) : (
                            classrooms.map((classroom) => {
                                const assigned = assignedClassIds.has(classroom.id)
                                return (
                                    <div key={classroom.id} className="flex items-center justify-between rounded-xl border border-slate-100 p-3">
                                        <div>
                                            <p className="font-bold text-slate-800">{classroom.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {classroom.grade && `${classroom.grade} · `}{classroom._count.students} นักเรียน
                                            </p>
                                        </div>
                                        {assigned ? (
                                            <Badge className="bg-emerald-100 text-emerald-700">
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Assigned
                                            </Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                                                onClick={() => handleAssign(classroom.id)}
                                                disabled={lesson.status !== "PUBLISHED" || assigning === classroom.id}
                                            >
                                                {assigning === classroom.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <TeacherAssessmentBuilderDialog
                open={assessmentBuilderOpen}
                onOpenChange={setAssessmentBuilderOpen}
                title={`สร้างแบบทดสอบของหัวข้อ ${selectedTopic.title}`}
                description="สร้างข้อสอบจากหัวข้อที่เลือก ตรวจพรีวิว แล้วบันทึกเป็น question set ของหัวข้อนี้"
                sourceOptions={assessmentSourceOptions.filter((option) => option.id === selectedTopic.id)}
                onSaved={(result) => {
                    updateTopic(selectedTopic.id, (topic) => ({
                        ...topic,
                        assessment: {
                            id: topic.assessment?.id ?? `topic-assessment-${topic.id}`,
                            title: result.title,
                            questionSetId: result.questionSetId,
                            passScore: result.passScore,
                            allowRetake: result.allowRetake,
                            source: result.sourceMetadata.source,
                            reward: topic.assessment?.reward,
                            certificate: topic.assessment?.certificate,
                        },
                    }))
                    toast({
                        title: "บันทึกแบบทดสอบของหัวข้อแล้ว",
                        description: `${selectedTopic.title}: ${result.title} (${result.questionCount} ข้อ) ถูกเพิ่มเข้า question set แล้ว`,
                    })
                }}
            />
        </div>
    )
}

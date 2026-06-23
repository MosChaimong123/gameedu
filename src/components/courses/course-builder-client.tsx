"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    Award,
    BookOpen,
    CheckCircle2,
    FileText,
    Loader2,
    Plus,
    Save,
    Send,
    Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    TeacherAssessmentBuilderDialog,
    type TeacherAssessmentBuilderSavedSet,
    type TeacherAssessmentBuilderSourceOption,
} from "@/components/lessons/teacher-assessment-builder-dialog"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageBackLink } from "@/components/ui/page-back-link"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import { getCanonicalSubjectById, type CanonicalCoreSubjectId } from "@/lib/curriculum/subject-catalog"
import type {
    CourseAssessmentV2,
    CourseCertificateConfigV1,
    CourseContentV1,
    CourseLessonRef,
    CourseModule,
} from "@/lib/courses/course-content"
import type { LessonContentV2 } from "@/lib/lessons/lesson-content"
import {
    buildLessonCurriculumHref,
    CORE_SUBJECT_OPTIONS,
    parseLessonCurriculumContext,
    resolveCurriculumUnitTitle,
    resolveLessonCurriculumContext,
} from "@/lib/lessons/lesson-curriculum-context"

type CourseRecord = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    coverImageUrl: string | null
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
    content: unknown
}

type LessonRecord = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    status: "DRAFT" | "PUBLISHED"
    content: unknown
}

type LessonOptionItem = LessonRecord & {
    curriculumSubjectId: CanonicalCoreSubjectId | null
    curriculumUnitId: string | null
    curriculumUnitTitle: string | null
}

type ClassroomRecord = {
    id: string
    name: string
    grade: string | null
    _count?: { students: number }
}

type QuestionSetOption = {
    id: string
    title: string
    questions: unknown[]
}

type AssessmentBuilderTarget =
    | { kind: "module"; moduleId: string; title: string }
    | { kind: "course"; title: string }

function isLessonContentV2Client(content: unknown): content is LessonContentV2 {
    return Boolean(content && typeof content === "object" && (content as { schemaVersion?: unknown }).schemaVersion === "lesson_content_v2")
}

function isCourseContentV1Client(content: unknown): content is CourseContentV1 {
    return Boolean(content && typeof content === "object" && (content as { schemaVersion?: unknown }).schemaVersion === "course_content_v1")
}

function createId(prefix: string) {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createEmptyCourseContent(): CourseContentV1 {
    return {
        schemaVersion: "course_content_v1",
        title: "",
        certificate: {
            enabled: false,
            requiredAssessmentIds: [],
        },
        assessments: [],
        modules: [
            {
                id: createId("module"),
                title: "บทที่ 1",
                order: 0,
                lessons: [],
            },
        ],
    }
}

function normalizeModuleOrder(modules: CourseModule[]): CourseModule[] {
    return modules.map((module, moduleIndex) => ({
        ...module,
        order: moduleIndex,
        lessons: module.lessons.map((lesson, lessonIndex) => ({ ...lesson, order: lessonIndex })),
    }))
}

function buildLessonRef(lesson: LessonRecord, order: number): CourseLessonRef {
    const content = isLessonContentV2Client(lesson.content) ? lesson.content : null
    return {
        id: createId("course-lesson"),
        lessonId: lesson.id,
        title: lesson.title,
        order,
        required: true,
        estimatedMinutes: content?.estimatedMinutes,
        unlockRule: order === 0 ? { type: "none" } : { type: "previous_lesson_completed" },
    }
}

function lessonIsPublishReady(lesson: LessonRecord) {
    if (lesson.status !== "PUBLISHED") return false
    if (!isLessonContentV2Client(lesson.content)) return false
    return lesson.content.topics.some((topic) => topic.contentStatus !== "empty" && topic.objectives.length > 0 && topic.sections.length > 0)
}

function getUnlockRuleLabel(rule: CourseLessonRef["unlockRule"]) {
    if (!rule || rule.type === "none") return "เริ่มได้ทันที"
    if (rule.type === "previous_lesson_completed") return "ปลดล็อกหลังจบบทก่อนหน้า"
    return "ปลดล็อกหลังจบบทที่กำหนด"
}

export function CourseBuilderClient({ mode, courseId }: { mode: "create" | "edit"; courseId?: string }) {
    const pathname = usePathname()
    const router = useRouter()
    const searchParams = useSearchParams()
    const { toast } = useToast()
    const initialCurriculumContext = useMemo(() => parseLessonCurriculumContext(searchParams), [searchParams])
    const [loading, setLoading] = useState(mode === "edit")
    const [lessonsLoading, setLessonsLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [publishing, setPublishing] = useState(false)
    const [assignOpen, setAssignOpen] = useState(false)
    const [assigningClassId, setAssigningClassId] = useState<string | null>(null)
    const [error, setError] = useState("")
    const [assignError, setAssignError] = useState("")
    const [ok, setOk] = useState("")
    const [course, setCourse] = useState<CourseRecord | null>(null)
    const [lessons, setLessons] = useState<LessonRecord[]>([])
    const [classrooms, setClassrooms] = useState<ClassroomRecord[]>([])
    const [questionSets, setQuestionSets] = useState<QuestionSetOption[]>([])
    const [assessmentBuilderTarget, setAssessmentBuilderTarget] = useState<AssessmentBuilderTarget | null>(null)
    const [title, setTitle] = useState("")
    const [subject, setSubject] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [description, setDescription] = useState("")
    const [coverImageUrl, setCoverImageUrl] = useState("")
    const [content, setContent] = useState<CourseContentV1>(() => createEmptyCourseContent())
    const [subjectFilter, setSubjectFilter] = useState<CanonicalCoreSubjectId | "ALL">(initialCurriculumContext.subjectId ?? "ALL")
    const [unitFilter, setUnitFilter] = useState<string | "ALL">(initialCurriculumContext.unitId ?? "ALL")
    const [assignStartAt, setAssignStartAt] = useState("")
    const [assignDueAt, setAssignDueAt] = useState("")
    const [assignReleaseMode, setAssignReleaseMode] = useState<"immediate" | "scheduled">("immediate")

    const lessonCatalog = useMemo<LessonOptionItem[]>(
        () =>
            lessons
                .filter((lesson) => isLessonContentV2Client(lesson.content))
                .map((lesson) => {
                    const context = resolveLessonCurriculumContext(lesson.content, lesson.subject)
                    return {
                        ...lesson,
                        curriculumSubjectId: context.subjectId,
                        curriculumUnitId: context.unitId,
                        curriculumUnitTitle: resolveCurriculumUnitTitle(context.subjectId, context.unitId),
                    }
                }),
        [lessons]
    )
    const lessonOptions = useMemo(
        () =>
            lessonCatalog.filter((lesson) => {
                if (subjectFilter !== "ALL" && lesson.curriculumSubjectId !== subjectFilter) return false
                if (unitFilter !== "ALL" && lesson.curriculumUnitId !== unitFilter) return false
                return true
            }),
        [lessonCatalog, subjectFilter, unitFilter]
    )
    const selectedLessonIds = useMemo(
        () => new Set(content.modules.flatMap((module) => module.lessons.map((lesson) => lesson.lessonId))),
        [content.modules]
    )
    const selectedSubjectPack = useMemo(
        () => (subjectFilter === "ALL" ? null : getSubjectCurriculumMapPack(subjectFilter)),
        [subjectFilter]
    )
    const availableUnits = selectedSubjectPack?.unitOutlines ?? []
    const activeCurriculumContext = useMemo(
        () => ({
            subjectId: subjectFilter === "ALL" ? null : subjectFilter,
            unitId: unitFilter === "ALL" ? null : unitFilter,
        }),
        [subjectFilter, unitFilter]
    )
    const assessmentBuilderSourceOptions = useMemo<TeacherAssessmentBuilderSourceOption[]>(() => {
        if (!assessmentBuilderTarget || !courseId || mode !== "edit") return []

        if (assessmentBuilderTarget.kind === "module") {
            return [
                {
                    id: `module-${assessmentBuilderTarget.moduleId}`,
                    label: assessmentBuilderTarget.title,
                    description: "สร้างจากบทเรียนทุกบทในโมดูลนี้",
                    requestBody: { courseId, moduleId: assessmentBuilderTarget.moduleId },
                    suggestedTitle: `${assessmentBuilderTarget.title} checkpoint`,
                    suggestedDescription: `แบบทดสอบสำหรับโมดูล ${assessmentBuilderTarget.title}`,
                },
            ]
        }

        return [
            {
                id: "course",
                label: content.title || title || "คอร์สนี้",
                description: "สร้างจากทุกโมดูลในคอร์สนี้",
                requestBody: { courseId },
                suggestedTitle: `${content.title || title || "คอร์ส"} posttest`,
                suggestedDescription: `แบบทดสอบภาพรวมของคอร์ส ${content.title || title || ""}`.trim(),
            },
        ]
    }, [assessmentBuilderTarget, content.title, title, courseId, mode])

    const publishWarnings = useMemo(() => {
        const warnings: string[] = []
        if (content.modules.length === 0) warnings.push("คอร์สต้องมีอย่างน้อย 1 โมดูล")
        for (const module of content.modules) {
            if (module.lessons.length === 0) warnings.push(`${module.title} ยังไม่มีบทเรียน`)
            for (const ref of module.lessons) {
                const lesson = lessons.find((candidate) => candidate.id === ref.lessonId)
                if (!lesson) warnings.push(`${ref.title ?? ref.lessonId} ไม่พบบทเรียนต้นทาง`)
                else if (!lessonIsPublishReady(lesson)) warnings.push(`${lesson.title} ยังไม่พร้อม publish ในคอร์ส`)
            }
        }
        for (const assessment of content.assessments ?? []) {
            if (!assessment.questionSetId) warnings.push(`${assessment.title} ยังไม่ได้เลือก question set`)
            else if (!questionSets.some((set) => set.id === assessment.questionSetId)) warnings.push(`${assessment.title} อ้างถึง question set ที่ไม่มีอยู่`)
            if (assessment.moduleId && !content.modules.some((module) => module.id === assessment.moduleId)) warnings.push(`${assessment.title} ผูกกับบทที่ไม่มีอยู่`)
        }
        return warnings
    }, [content.assessments, content.modules, lessons, questionSets])

    useEffect(() => {
        setSubjectFilter(initialCurriculumContext.subjectId ?? "ALL")
        setUnitFilter(initialCurriculumContext.unitId ?? "ALL")
    }, [initialCurriculumContext.subjectId, initialCurriculumContext.unitId])

    useEffect(() => {
        if (unitFilter === "ALL") return
        if (!availableUnits.some((unit) => unit.id === unitFilter)) {
            setUnitFilter("ALL")
        }
    }, [availableUnits, unitFilter])

    useEffect(() => {
        const href = buildLessonCurriculumHref(pathname, activeCurriculumContext)
        const currentHref = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
        if (href !== currentHref) {
            router.replace(href)
        }
    }, [activeCurriculumContext, pathname, router, searchParams])

    const refreshCourse = useCallback(async () => {
        if (mode !== "edit" || !courseId) return
        const response = await fetch(`/api/courses/${courseId}`)
        if (!response.ok) throw new Error("โหลดคอร์สไม่สำเร็จ")
        const data = (await response.json()) as CourseRecord
        if (!isCourseContentV1Client(data.content)) throw new Error("คอร์สนี้ใช้ schema ที่ไม่รองรับ")
        setCourse(data)
        setTitle(data.title)
        setSubject(data.subject ?? "")
        setGradeLevel(data.gradeLevel ?? "")
        setDescription(data.description ?? "")
        setCoverImageUrl(data.coverImageUrl ?? "")
        setContent(data.content)
    }, [courseId, mode])

    useEffect(() => {
        fetch("/api/lessons")
            .then((response) => {
                if (!response.ok) throw new Error("โหลดบทเรียนไม่สำเร็จ")
                return response.json()
            })
            .then((data) => {
                if (Array.isArray(data)) setLessons(data)
            })
            .catch((caught) => setError(caught instanceof Error ? caught.message : "โหลดบทเรียนไม่สำเร็จ"))
            .finally(() => setLessonsLoading(false))
    }, [])

    useEffect(() => {
        fetch("/api/sets")
            .then((response) => {
                if (!response.ok) throw new Error("failed to load question sets")
                return response.json()
            })
            .then((data) => {
                if (Array.isArray(data)) setQuestionSets(data)
            })
            .catch(() => setQuestionSets([]))
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        if (window.location.hash === "#assign") {
            setAssignOpen(true)
        }
    }, [])

    const fetchClassrooms = useCallback(async () => {
        const response = await fetch("/api/classrooms")
        if (!response.ok) throw new Error("โหลดห้องเรียนไม่สำเร็จ")
        const data = await response.json()
        if (Array.isArray(data)) setClassrooms(data)
    }, [])

    useEffect(() => {
        if (!assignOpen) return
        fetchClassrooms().catch((caught) => setAssignError(caught instanceof Error ? caught.message : "โหลดห้องเรียนไม่สำเร็จ"))
    }, [assignOpen, fetchClassrooms])

    useEffect(() => {
        if (!assignOpen) return
        setAssignError("")
        setAssignReleaseMode("immediate")
        setAssignStartAt("")
        setAssignDueAt("")
    }, [assignOpen])

    useEffect(() => {
        refreshCourse()
            .catch((caught) => setError(caught instanceof Error ? caught.message : "โหลดคอร์สไม่สำเร็จ"))
            .finally(() => setLoading(false))
    }, [refreshCourse])

    function updateContent(next: CourseContentV1) {
        setContent({
            ...next,
            title,
            description: description || undefined,
            subject: subject || undefined,
            gradeLevel: gradeLevel || undefined,
            coverImageUrl: coverImageUrl || undefined,
            modules: normalizeModuleOrder(next.modules),
        })
    }

    function addModule() {
        updateContent({
            ...content,
            modules: [
                ...content.modules,
                {
                    id: createId("module"),
                    title: `บทที่ ${content.modules.length + 1}`,
                    order: content.modules.length,
                    lessons: [],
                },
            ],
        })
    }

    function updateModule(moduleId: string, patch: Partial<CourseModule>) {
        updateContent({
            ...content,
            modules: content.modules.map((module) => module.id === moduleId ? { ...module, ...patch } : module),
        })
    }

    function removeModule(moduleId: string) {
        updateContent({
            ...content,
            modules: content.modules.filter((module) => module.id !== moduleId),
        })
    }

    function moveModule(moduleId: string, direction: -1 | 1) {
        const index = content.modules.findIndex((module) => module.id === moduleId)
        const nextIndex = index + direction
        if (index < 0 || nextIndex < 0 || nextIndex >= content.modules.length) return
        const modules = [...content.modules]
        const [item] = modules.splice(index, 1)
        modules.splice(nextIndex, 0, item)
        updateContent({ ...content, modules })
    }

    function addLesson(moduleId: string, lessonId: string) {
        const lesson = lessonOptions.find((candidate) => candidate.id === lessonId)
        if (!lesson) return
        updateContent({
            ...content,
            modules: content.modules.map((module) => {
                if (module.id !== moduleId) return module
                if (module.lessons.some((ref) => ref.lessonId === lessonId)) return module
                return {
                    ...module,
                    lessons: [...module.lessons, buildLessonRef(lesson, module.lessons.length)],
                }
            }),
        })
    }

    function removeLesson(moduleId: string, refId: string) {
        updateContent({
            ...content,
            modules: content.modules.map((module) =>
                module.id === moduleId
                    ? { ...module, lessons: module.lessons.filter((lesson) => lesson.id !== refId) }
                    : module
            ),
        })
    }

    function moveLesson(moduleId: string, refId: string, direction: -1 | 1) {
        updateContent({
            ...content,
            modules: content.modules.map((module) => {
                if (module.id !== moduleId) return module
                const index = module.lessons.findIndex((lesson) => lesson.id === refId)
                const nextIndex = index + direction
                if (index < 0 || nextIndex < 0 || nextIndex >= module.lessons.length) return module
                const lessons = [...module.lessons]
                const [item] = lessons.splice(index, 1)
                lessons.splice(nextIndex, 0, item)
                return { ...module, lessons }
            }),
        })
    }

    function updateLessonRef(moduleId: string, refId: string, updates: Partial<CourseLessonRef>) {
        updateContent({
            ...content,
            modules: content.modules.map((module) =>
                module.id === moduleId
                    ? {
                          ...module,
                          lessons: module.lessons.map((lesson) => (lesson.id === refId ? { ...lesson, ...updates } : lesson)),
                      }
                    : module
            ),
        })
    }

    function addAssessment(moduleId?: string) {
        const titleTarget = moduleId
            ? content.modules.find((module) => module.id === moduleId)?.title ?? "Module"
            : "Course"
        updateContent({
            ...content,
            assessments: [
                ...(content.assessments ?? []),
                {
                    id: createId("assessment"),
                    type: moduleId ? "checkpoint" : "posttest",
                    title: moduleId ? `${titleTarget} checkpoint` : `${titleTarget} posttest`,
                    questionSetId: "",
                    moduleId,
                    passScore: undefined,
                    allowRetake: true,
                },
            ],
        })
    }

    function addAssessmentFromGeneratedSet(target: AssessmentBuilderTarget, generatedSet: TeacherAssessmentBuilderSavedSet) {
        setQuestionSets((current) => {
            if (current.some((set) => set.id === generatedSet.questionSetId)) return current
            return [...current, { id: generatedSet.questionSetId, title: generatedSet.title, questions: [] }]
        })

        updateContent({
            ...content,
            assessments: [
                ...(content.assessments ?? []),
                {
                    id: createId("assessment"),
                    type: target.kind === "module" ? "checkpoint" : "posttest",
                    title: generatedSet.title,
                    questionSetId: generatedSet.questionSetId,
                    moduleId: target.kind === "module" ? target.moduleId : undefined,
                    passScore: generatedSet.passScore,
                    allowRetake: generatedSet.allowRetake,
                    source: generatedSet.sourceMetadata.source,
                },
            ],
        })

        toast({
            title: "เพิ่ม assessment แล้ว",
            description: `${generatedSet.title} ถูกผูกเข้ากับคอร์สแล้ว`,
        })
    }

    function updateAssessment(assessmentId: string, patch: Partial<CourseAssessmentV2>) {
        updateContent({
            ...content,
            assessments: (content.assessments ?? []).map((assessment) =>
                assessment.id === assessmentId ? { ...assessment, ...patch } : assessment
            ),
        })
    }

    function removeAssessment(assessmentId: string) {
        updateContent({
            ...content,
            assessments: (content.assessments ?? []).filter((assessment) => assessment.id !== assessmentId),
        })
    }

    function updateCertificate(patch: Partial<CourseCertificateConfigV1>) {
        const current = content.certificate ?? { enabled: false, requiredAssessmentIds: [] }
        updateContent({
            ...content,
            certificate: {
                ...current,
                ...patch,
            },
        })
    }

    async function saveDraft() {
        setSaving(true)
        setError("")
        setOk("")
        try {
            const payloadContent: CourseContentV1 = {
                ...content,
                title,
                description: description || undefined,
                subject: subject || undefined,
                gradeLevel: gradeLevel || undefined,
                coverImageUrl: coverImageUrl || undefined,
                modules: normalizeModuleOrder(content.modules),
                assessments: (content.assessments ?? []).map((assessment) => ({
                    ...assessment,
                    questionSetId: assessment.questionSetId?.trim() || undefined,
                    moduleId: assessment.moduleId || undefined,
                })),
                estimatedMinutes: content.modules.reduce(
                    (sum, module) => sum + module.lessons.reduce((lessonSum, lesson) => lessonSum + (lesson.estimatedMinutes ?? 0), 0),
                    0
                ),
                certificate: content.certificate
                    ? {
                          ...content.certificate,
                          title: content.certificate.title?.trim() || undefined,
                          description: content.certificate.description?.trim() || undefined,
                          requiredAssessmentIds: (content.certificate.requiredAssessmentIds ?? []).filter(Boolean),
                          reward: content.certificate.reward
                              ? {
                                    behaviorPoints: Math.max(0, Number(content.certificate.reward.behaviorPoints ?? 0) || 0) || undefined,
                                    achievementId: content.certificate.reward.achievementId?.trim() || undefined,
                                    achievementTitle: content.certificate.reward.achievementTitle?.trim() || undefined,
                                }
                              : undefined,
                      }
                    : undefined,
            }
            const response = await fetch(mode === "create" ? "/api/courses" : `/api/courses/${courseId}`, {
                method: mode === "create" ? "POST" : "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title,
                    subject,
                    gradeLevel,
                    description,
                    coverImageUrl,
                    content: payloadContent,
                }),
            })
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}))
                throw new Error(payload?.error?.message ?? "บันทึกคอร์สไม่สำเร็จ")
            }
            const saved = (await response.json()) as CourseRecord
            setOk("บันทึก draft แล้ว")
            if (mode === "create") router.push(`/dashboard/courses/${saved.id}/edit`)
            else setCourse(saved)
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "บันทึกคอร์สไม่สำเร็จ")
        } finally {
            setSaving(false)
        }
    }

    async function publishCourse() {
        if (!courseId) return
        setPublishing(true)
        setError("")
        setOk("")
        try {
            const response = await fetch(`/api/courses/${courseId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PUBLISHED" }),
            })
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}))
                const issueText = Array.isArray(payload?.issues)
                    ? payload.issues.map((issue: { message?: string }) => issue.message).filter(Boolean).join(", ")
                    : ""
                throw new Error(issueText || payload?.error?.message || "publish คอร์สไม่สำเร็จ")
            }
            const updated = (await response.json()) as CourseRecord
            setCourse(updated)
            setOk("เผยแพร่คอร์สแล้ว")
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "publish คอร์สไม่สำเร็จ")
        } finally {
            setPublishing(false)
        }
    }

    async function assignCourse(classId: string) {
        if (!courseId || course?.status !== "PUBLISHED") {
            setAssignError("ต้อง publish คอร์สก่อน จึงจะ assign ให้ห้องเรียนได้")
            return
        }
        const normalizedStartAt = assignReleaseMode === "scheduled" && assignStartAt ? new Date(assignStartAt) : null
        const normalizedDueAt = assignDueAt ? new Date(assignDueAt) : null
        if (normalizedStartAt && Number.isNaN(normalizedStartAt.getTime())) {
            setAssignError("วันเริ่มใช้งานไม่ถูกต้อง")
            return
        }
        if (normalizedDueAt && Number.isNaN(normalizedDueAt.getTime())) {
            setAssignError("วันครบกำหนดไม่ถูกต้อง")
            return
        }
        if (normalizedStartAt && normalizedDueAt && normalizedDueAt.getTime() <= normalizedStartAt.getTime()) {
            setAssignError("วันครบกำหนดต้องอยู่หลังวันเริ่มใช้งาน")
            return
        }
        setAssigningClassId(classId)
        setAssignError("")
        try {
            const response = await fetch(`/api/classrooms/${classId}/courses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    courseId,
                    startAt: normalizedStartAt ? normalizedStartAt.toISOString() : null,
                    dueAt: normalizedDueAt ? normalizedDueAt.toISOString() : null,
                }),
            })
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}))
                throw new Error(payload?.error?.message ?? "assign คอร์สไม่สำเร็จ")
            }
            setOk("assign คอร์สให้ห้องเรียนแล้ว")
            setAssignOpen(false)
        } catch (caught) {
            setAssignError(caught instanceof Error ? caught.message : "assign คอร์สไม่สำเร็จ")
        } finally {
            setAssigningClassId(null)
        }
    }

    if (loading) {
        return (
            <div className="grid min-h-[50vh] place-items-center text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
            <PageBackLink href="/dashboard/courses" label="คอร์สเรียนของฉัน" />

            <header className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        <BookOpen className="h-4 w-4" />
                        Course Builder
                    </div>
                    <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                        {mode === "create" ? "สร้างคอร์สเรียนใหม่" : "แก้ไขคอร์สเรียน"}
                    </h1>
                    <p className="mt-1 text-sm font-medium text-slate-500">
                        รวมบทเรียน V2 เป็นคอร์ส แบ่งเป็นโมดูล แล้ว publish เมื่อทุกบทเรียนพร้อมใช้งาน
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={saveDraft} disabled={saving || !title.trim()} className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700">
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        บันทึก Draft
                    </Button>
                    {mode === "edit" && (
                        <Button onClick={publishCourse} disabled={publishing || publishWarnings.length > 0} variant="outline" className="rounded-xl font-black">
                            {publishing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Publish
                        </Button>
                    )}
                    {mode === "edit" && (
                        <Button onClick={() => setAssignOpen(true)} disabled={course?.status !== "PUBLISHED"} variant="outline" className="rounded-xl font-black">
                            Assign
                        </Button>
                    )}
                </div>
            </header>

            {error && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                </div>
            )}
            {ok && (
                <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    {ok}
                </div>
            )}

            <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
                <div className="space-y-2">
                    <Label className="font-bold text-slate-700">ชื่อคอร์ส</Label>
                    <Input value={title} onChange={(event) => setTitle(event.target.value)} className="rounded-xl font-black" />
                </div>
                <div className="space-y-2">
                    <Label className="font-bold text-slate-700">รูปปก URL</Label>
                    <Input value={coverImageUrl} onChange={(event) => setCoverImageUrl(event.target.value)} className="rounded-xl" placeholder="https://..." />
                </div>
                <div className="space-y-2">
                    <Label className="font-bold text-slate-700">วิชา</Label>
                    <Input value={subject} onChange={(event) => setSubject(event.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                    <Label className="font-bold text-slate-700">ระดับชั้น</Label>
                    <Input value={gradeLevel} onChange={(event) => setGradeLevel(event.target.value)} className="rounded-xl" />
                </div>
                <div className="space-y-2 lg:col-span-2">
                    <Label className="font-bold text-slate-700">คำอธิบายคอร์ส</Label>
                    <Textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="rounded-xl" />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">สถานะ</p>
                    <p className="mt-1 text-lg font-black text-slate-900">{course?.status ?? "DRAFT"}</p>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-700">
                        <Award className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-xl font-black text-slate-950">Certificate & Rewards</h2>
                        <p className="text-sm font-medium text-slate-500">ตั้งค่าใบรับรองเมื่อเรียนจบคอร์ส และรางวัลที่จะให้หลังผ่านเงื่อนไขครบ</p>
                    </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <input
                            type="checkbox"
                            checked={content.certificate?.enabled ?? false}
                            onChange={(event) => updateCertificate({ enabled: event.target.checked })}
                            className="h-4 w-4"
                        />
                        <div>
                            <p className="font-black text-slate-900">เปิดใช้งานใบรับรองคอร์ส</p>
                            <p className="text-sm text-slate-500">นักเรียนจะรับได้เมื่อเรียนครบและผ่าน assessment ตามที่กำหนด</p>
                        </div>
                    </label>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-900">Assessment ที่ต้องผ่าน</p>
                        <p className="mt-1 text-sm text-slate-500">ถ้าไม่เลือก ระบบจะใช้แค่การเรียนคอร์สให้ครบ</p>
                        <div className="mt-3 space-y-2">
                            {(content.assessments ?? []).length === 0 ? (
                                <p className="text-sm font-bold text-slate-400">ยังไม่มี assessment ในคอร์สนี้</p>
                            ) : (
                                (content.assessments ?? []).map((assessment) => (
                                    <label key={assessment.id} className="flex items-start gap-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={(content.certificate?.requiredAssessmentIds ?? []).includes(assessment.id)}
                                            onChange={(event) => {
                                                const current = new Set(content.certificate?.requiredAssessmentIds ?? [])
                                                if (event.target.checked) current.add(assessment.id)
                                                else current.delete(assessment.id)
                                                updateCertificate({ requiredAssessmentIds: Array.from(current) })
                                            }}
                                            className="mt-1 h-4 w-4"
                                        />
                                        <span className="font-bold text-slate-700">{assessment.title}</span>
                                    </label>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">ชื่อใบรับรอง</Label>
                        <Input
                            value={content.certificate?.title ?? ""}
                            onChange={(event) => updateCertificate({ title: event.target.value })}
                            className="rounded-xl"
                            placeholder="เช่น Physics Mastery Certificate"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">Achievement ID</Label>
                        <Input
                            value={content.certificate?.reward?.achievementId ?? ""}
                            onChange={(event) =>
                                updateCertificate({
                                    reward: {
                                        ...(content.certificate?.reward ?? {}),
                                        achievementId: event.target.value,
                                    },
                                })
                            }
                            className="rounded-xl"
                            placeholder="เช่น course-physics-mastery"
                        />
                    </div>

                    <div className="space-y-2 lg:col-span-2">
                        <Label className="font-bold text-slate-700">คำอธิบายใบรับรอง</Label>
                        <Textarea
                            value={content.certificate?.description ?? ""}
                            onChange={(event) => updateCertificate({ description: event.target.value })}
                            rows={3}
                            className="rounded-xl"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">ชื่อ Achievement</Label>
                        <Input
                            value={content.certificate?.reward?.achievementTitle ?? ""}
                            onChange={(event) =>
                                updateCertificate({
                                    reward: {
                                        ...(content.certificate?.reward ?? {}),
                                        achievementTitle: event.target.value,
                                    },
                                })
                            }
                            className="rounded-xl"
                            placeholder="เช่น Physics Graduate"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">แต้มพฤติกรรมรางวัล</Label>
                        <Input
                            type="number"
                            min={0}
                            value={content.certificate?.reward?.behaviorPoints ?? 0}
                            onChange={(event) =>
                                updateCertificate({
                                    reward: {
                                        ...(content.certificate?.reward ?? {}),
                                        behaviorPoints: Math.max(0, Number(event.target.value) || 0),
                                    },
                                })
                            }
                            className="rounded-xl"
                        />
                    </div>
                </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-black text-slate-950">โครงคอร์ส</h2>
                            <p className="text-sm font-medium text-slate-500">จัดโมดูลและลำดับบทเรียนในคอร์สนี้</p>
                        </div>
                        <Button type="button" variant="outline" onClick={addModule} className="rounded-xl font-bold">
                            <Plus className="mr-2 h-4 w-4" />
                            เพิ่มโมดูล
                        </Button>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                            <div>
                                <h3 className="font-black text-slate-950">แหล่งบทเรียนตามหลักสูตร</h3>
                                <p className="text-sm font-medium text-slate-500">
                                    คัดบทเรียนจากวิชาและหน่วยเดียวกับที่กำลังจัดคอร์ส เพื่อลดการปนของบทเรียนคนละแผน
                                </p>
                            </div>
                            <Link href={buildLessonCurriculumHref("/dashboard/lessons", activeCurriculumContext)}>
                                <Button type="button" variant="outline" className="rounded-xl font-bold">
                                    <BookOpen className="mr-2 h-4 w-4" />
                                    เปิดรายการบทเรียน
                                </Button>
                            </Link>
                        </div>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-500">วิชา</Label>
                                <select
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                    value={subjectFilter}
                                    onChange={(event) => setSubjectFilter(event.target.value as CanonicalCoreSubjectId | "ALL")}
                                >
                                    <option value="ALL">ทุกวิชา</option>
                                    {CORE_SUBJECT_OPTIONS.map((subjectId) => (
                                        <option key={subjectId} value={subjectId}>
                                            {getCanonicalSubjectById(subjectId)?.displayNameTh ?? subjectId}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-black text-slate-500">หน่วยการเรียน</Label>
                                <select
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                    value={unitFilter}
                                    onChange={(event) => setUnitFilter(event.target.value)}
                                    disabled={subjectFilter === "ALL"}
                                >
                                    <option value="ALL">ทุกหน่วย</option>
                                    {availableUnits.map((unit) => (
                                        <option key={unit.id} value={unit.id}>
                                            {unit.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1">บทเรียนที่ใช้ได้ {lessonOptions.length}</span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">บทเรียน V2 ทั้งหมด {lessonCatalog.length}</span>
                            {subjectFilter !== "ALL" && (
                                <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">
                                    {getCanonicalSubjectById(subjectFilter)?.displayNameTh ?? subjectFilter}
                                </span>
                            )}
                            {unitFilter !== "ALL" && (
                                <span className="rounded-full bg-cyan-50 px-3 py-1 text-cyan-700">
                                    {availableUnits.find((unit) => unit.id === unitFilter)?.title ?? unitFilter}
                                </span>
                            )}
                        </div>
                    </div>

                    {content.modules.map((module, moduleIndex) => (
                        <div key={module.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                                <div className="space-y-2">
                                    <Label className="text-xs font-black text-slate-500">โมดูล {moduleIndex + 1}</Label>
                                    <Input
                                        value={module.title}
                                        onChange={(event) => updateModule(module.id, { title: event.target.value })}
                                        className="rounded-xl font-black"
                                    />
                                    <Textarea
                                        value={module.description ?? ""}
                                        onChange={(event) => updateModule(module.id, { description: event.target.value })}
                                        rows={2}
                                        className="rounded-xl text-sm"
                                        placeholder="คำอธิบายโมดูล"
                                    />
                                </div>
                                <div className="flex gap-1">
                                    <Button type="button" variant="ghost" size="icon" onClick={() => moveModule(module.id, -1)} disabled={moduleIndex === 0}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => moveModule(module.id, 1)} disabled={moduleIndex === content.modules.length - 1}>
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeModule(module.id)} disabled={content.modules.length <= 1} className="text-slate-400 hover:text-red-600">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            <div className="mt-4 space-y-2">
                                {module.lessons.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-400">
                                        ยังไม่มีบทเรียนในโมดูลนี้
                                    </div>
                                ) : (
                                    module.lessons.map((ref, lessonIndex) => {
                                        const lesson = lessons.find((candidate) => candidate.id === ref.lessonId)
                                        const ready = lesson ? lessonIsPublishReady(lesson) : false
                                        const lessonContext = lesson ? resolveLessonCurriculumContext(lesson.content, lesson.subject) : null
                                        const lessonUnitTitle = lessonContext
                                            ? resolveCurriculumUnitTitle(lessonContext.subjectId, lessonContext.unitId)
                                            : null
                                        return (
                                            <div key={ref.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center">
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate font-black text-slate-800">{lesson?.title ?? ref.title ?? ref.lessonId}</p>
                                                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] font-bold">
                                                        <span className={`rounded-full px-2 py-1 ${ref.required ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-700"}`}>
                                                            {ref.required ? "บทบังคับ" : "บทเสริม"}
                                                        </span>
                                                        <span className="rounded-full bg-slate-200 px-2 py-1 text-slate-700">{getUnlockRuleLabel(ref.unlockRule)}</span>
                                                        {lessonContext?.subjectId && (
                                                            <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">
                                                                {getCanonicalSubjectById(lessonContext.subjectId)?.displayNameTh ?? lessonContext.subjectId}
                                                            </span>
                                                        )}
                                                        {lessonUnitTitle && (
                                                            <span className="rounded-full bg-violet-50 px-2 py-1 text-violet-700">{lessonUnitTitle}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-400">
                                                        {ready ? "Lesson V2 พร้อมใช้" : "ยังไม่พร้อม publish ในคอร์ส"}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col gap-2 sm:items-end">
                                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                                                        <input
                                                            type="checkbox"
                                                            checked={ref.required}
                                                            onChange={(event) => updateLessonRef(module.id, ref.id, { required: event.target.checked })}
                                                        />
                                                        ใช้เป็นบทบังคับ
                                                    </label>
                                                    <select
                                                        className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
                                                        value={ref.unlockRule?.type ?? "none"}
                                                        onChange={(event) =>
                                                            updateLessonRef(module.id, ref.id, {
                                                                unlockRule:
                                                                    event.target.value === "previous_lesson_completed"
                                                                        ? { type: "previous_lesson_completed" }
                                                                        : { type: "none" },
                                                            })
                                                        }
                                                    >
                                                        <option value="none">เปิดได้ทันที</option>
                                                        <option value="previous_lesson_completed">หลังจบบทก่อนหน้า</option>
                                                    </select>
                                                    <div className="flex gap-1">
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => moveLesson(module.id, ref.id, -1)} disabled={lessonIndex === 0}>
                                                            <ArrowUp className="h-4 w-4" />
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => moveLesson(module.id, ref.id, 1)} disabled={lessonIndex === module.lessons.length - 1}>
                                                            <ArrowDown className="h-4 w-4" />
                                                        </Button>
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeLesson(module.id, ref.id)} className="text-slate-400 hover:text-red-600">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            <div className="mt-3">
                                <select
                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                    value=""
                                    onChange={(event) => {
                                        addLesson(module.id, event.target.value)
                                        event.currentTarget.value = ""
                                    }}
                                    disabled={lessonsLoading}
                                >
                                    <option value="">เลือกบทเรียน V2 เพื่อเพิ่มในโมดูล</option>
                                    {lessonOptions.map((lesson) => (
                                        <option key={lesson.id} value={lesson.id} disabled={selectedLessonIds.has(lesson.id)}>
                                            {lesson.title}
                                            {lesson.curriculumUnitTitle ? ` • ${lesson.curriculumUnitTitle}` : ""}
                                            {lesson.status !== "PUBLISHED" ? " (Draft)" : ""}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <div>
                                        <p className="text-sm font-black text-slate-800">Assessment ของบทนี้</p>
                                        <p className="text-xs font-bold text-slate-400">เลือก question set เพื่อสร้าง checkpoint / test ของบท</p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button type="button" variant="outline" onClick={() => addAssessment(module.id)} className="rounded-xl font-bold">
                                            <Plus className="mr-2 h-4 w-4" />
                                            เพิ่ม checkpoint
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => setAssessmentBuilderTarget({ kind: "module", moduleId: module.id, title: module.title })}
                                            className="rounded-xl font-bold"
                                            disabled={mode !== "edit" || !courseId}
                                            title={mode !== "edit" || !courseId ? "บันทึกคอร์สก่อน จึงจะสร้างแบบทดสอบจาก AI ได้" : undefined}
                                        >
                                            <FileText className="mr-2 h-4 w-4" />
                                            AI สร้าง checkpoint
                                        </Button>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-3">
                                    {(content.assessments ?? [])
                                        .filter((assessment) => assessment.moduleId === module.id)
                                        .map((assessment) => (
                                            <div key={assessment.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:grid-cols-2">
                                                <Input
                                                    value={assessment.title}
                                                    onChange={(event) => updateAssessment(assessment.id, { title: event.target.value })}
                                                    className="rounded-xl font-bold"
                                                    placeholder="ชื่อแบบทดสอบ"
                                                />
                                                <select
                                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                                    value={assessment.type}
                                                    onChange={(event) => updateAssessment(assessment.id, { type: event.target.value as CourseAssessmentV2["type"] })}
                                                >
                                                    <option value="checkpoint">checkpoint</option>
                                                    <option value="pretest">pretest</option>
                                                    <option value="posttest">posttest</option>
                                                </select>
                                                <select
                                                    className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                                    value={assessment.questionSetId}
                                                    onChange={(event) => updateAssessment(assessment.id, { questionSetId: event.target.value })}
                                                >
                                                    <option value="">เลือก question set</option>
                                                    {questionSets.map((set) => (
                                                        <option key={set.id} value={set.id}>
                                                            {set.title}
                                                        </option>
                                                    ))}
                                                </select>
                                                <Input
                                                    value={assessment.passScore ?? ""}
                                                    onChange={(event) => updateAssessment(assessment.id, { passScore: event.target.value === "" ? undefined : Number(event.target.value) })}
                                                    className="rounded-xl"
                                                    inputMode="numeric"
                                                    placeholder="คะแนนผ่าน (ไม่บังคับ)"
                                                />
                                                <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                                    <input
                                                        type="checkbox"
                                                        checked={assessment.allowRetake !== false}
                                                        onChange={(event) => updateAssessment(assessment.id, { allowRetake: event.target.checked })}
                                                    />
                                                    อนุญาตให้ทำซ้ำ
                                                </label>
                                                <div className="flex justify-end">
                                                    <Button type="button" variant="ghost" onClick={() => removeAssessment(assessment.id)} className="text-slate-400 hover:text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        ลบ
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    ))}

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                            <div>
                                <h3 className="text-lg font-black text-slate-900">Assessment ระดับคอร์ส</h3>
                                <p className="text-sm font-medium text-slate-500">เช่น pretest ก่อนเรียนหรือ posttest หลังเรียนจบทั้งคอร์ส</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" variant="outline" onClick={() => addAssessment()} className="rounded-xl font-bold">
                                    <Plus className="mr-2 h-4 w-4" />
                                    เพิ่ม assessment
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAssessmentBuilderTarget({ kind: "course", title: content.title || title || "คอร์สนี้" })}
                                    className="rounded-xl font-bold"
                                    disabled={mode !== "edit" || !courseId}
                                    title={mode !== "edit" || !courseId ? "บันทึกคอร์สก่อน จึงจะสร้างแบบทดสอบจาก AI ได้" : undefined}
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    AI สร้าง assessment
                                </Button>
                            </div>
                        </div>
                        <div className="mt-4 space-y-3">
                            {(content.assessments ?? [])
                                .filter((assessment) => !assessment.moduleId)
                                .map((assessment) => (
                                    <div key={assessment.id} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 lg:grid-cols-2">
                                        <Input
                                            value={assessment.title}
                                            onChange={(event) => updateAssessment(assessment.id, { title: event.target.value })}
                                            className="rounded-xl font-bold"
                                            placeholder="ชื่อแบบทดสอบ"
                                        />
                                        <select
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                            value={assessment.type}
                                            onChange={(event) => updateAssessment(assessment.id, { type: event.target.value as CourseAssessmentV2["type"] })}
                                        >
                                            <option value="pretest">pretest</option>
                                            <option value="posttest">posttest</option>
                                            <option value="checkpoint">checkpoint</option>
                                        </select>
                                        <select
                                            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700"
                                            value={assessment.questionSetId}
                                            onChange={(event) => updateAssessment(assessment.id, { questionSetId: event.target.value })}
                                        >
                                            <option value="">เลือก question set</option>
                                            {questionSets.map((set) => (
                                                <option key={set.id} value={set.id}>
                                                    {set.title}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="flex items-center justify-between gap-3">
                                            <label className="flex items-center gap-2 text-sm font-bold text-slate-600">
                                                <input
                                                    type="checkbox"
                                                    checked={assessment.allowRetake !== false}
                                                    onChange={(event) => updateAssessment(assessment.id, { allowRetake: event.target.checked })}
                                                />
                                                อนุญาตให้ทำซ้ำ
                                            </label>
                                            <Button type="button" variant="ghost" onClick={() => removeAssessment(assessment.id)} className="text-slate-400 hover:text-red-600">
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                ลบ
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                        </div>
                    </div>
                </div>

                <aside className="space-y-4">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-emerald-600" />
                            <h3 className="font-black text-slate-900">บทเรียนที่เลือกได้</h3>
                        </div>
                        <p className="mt-1 text-sm font-medium text-slate-500">แสดงเฉพาะ Lesson V2 เพื่อกันระบบเก่าปนกลับมา</p>
                        <div className="mt-4 space-y-2">
                            {lessonOptions.length === 0 ? (
                                <p className="rounded-xl bg-slate-50 p-3 text-sm font-bold text-slate-400">ยังไม่มี Lesson V2</p>
                            ) : (
                                lessonOptions.slice(0, 8).map((lesson) => (
                                    <div key={lesson.id} className="rounded-xl border border-slate-200 p-3">
                                        <p className="line-clamp-1 font-black text-slate-800">{lesson.title}</p>
                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                            {lessonIsPublishReady(lesson) ? "พร้อม publish" : "ยังต้องตรวจบทเรียน"}
                                        </p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-center gap-2 text-amber-700">
                            <AlertCircle className="h-5 w-5" />
                            <h3 className="font-black">Publish guard</h3>
                        </div>
                        {publishWarnings.length === 0 ? (
                            <p className="mt-2 text-sm font-bold text-emerald-700">คอร์สพร้อม publish</p>
                        ) : (
                            <ul className="mt-2 space-y-1 text-sm font-bold text-amber-800">
                                {publishWarnings.slice(0, 6).map((warning) => (
                                    <li key={warning}>- {warning}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                </aside>
            </section>

            <Dialog
                open={assignOpen}
                onOpenChange={(nextOpen) => {
                    setAssignOpen(nextOpen)
                    if (!nextOpen) {
                        setAssignError("")
                        setAssigningClassId(null)
                    }
                }}
            >
                <DialogContent className="max-w-2xl rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="font-black">Assign คอร์สให้ห้องเรียน</DialogTitle>
                        <DialogDescription>เลือกห้องเรียนที่ต้องการให้นักเรียนเข้าถึงคอร์สนี้</DialogDescription>
                    </DialogHeader>
                    {course?.status !== "PUBLISHED" && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-bold text-amber-700">
                            ต้อง publish คอร์สก่อน จึงจะ assign ให้ห้องเรียนได้
                        </div>
                    )}
                    {assignError && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                            {assignError}
                        </div>
                    )}
                    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-xs font-black text-slate-500">Release rule</Label>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={assignReleaseMode === "immediate" ? "default" : "outline"}
                                    className={assignReleaseMode === "immediate" ? "rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800" : "rounded-xl font-bold"}
                                    onClick={() => setAssignReleaseMode("immediate")}
                                >
                                    เปิดใช้งานทันที
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={assignReleaseMode === "scheduled" ? "default" : "outline"}
                                    className={assignReleaseMode === "scheduled" ? "rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800" : "rounded-xl font-bold"}
                                    onClick={() => setAssignReleaseMode("scheduled")}
                                >
                                    ตั้งวันเริ่มใช้งาน
                                </Button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-500">วันเริ่มใช้งาน</Label>
                            <Input
                                type="datetime-local"
                                value={assignStartAt}
                                onChange={(event) => setAssignStartAt(event.target.value)}
                                disabled={assignReleaseMode !== "scheduled"}
                                className="rounded-xl"
                            />
                            <p className="text-xs font-bold text-slate-400">
                                ใช้สำหรับ pacing ต่อห้องเรียน ถ้าไม่ตั้งจะเริ่มได้ทันทีหลัง assign
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-black text-slate-500">วันครบกำหนด</Label>
                            <Input
                                type="datetime-local"
                                value={assignDueAt}
                                onChange={(event) => setAssignDueAt(event.target.value)}
                                className="rounded-xl"
                            />
                            <p className="text-xs font-bold text-slate-400">
                                ใช้เป็น deadline ของคอร์สในห้องนี้เพื่อให้ครูติดตามความคืบหน้าได้
                            </p>
                        </div>
                    </div>
                    <div className="max-h-[420px] space-y-2 overflow-y-auto">
                        {classrooms.length === 0 ? (
                            <p className="rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-400">ยังไม่มีห้องเรียนให้เลือก</p>
                        ) : (
                            classrooms.map((classroom) => (
                                <div key={classroom.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <p className="font-black text-slate-900">{classroom.name}</p>
                                        <p className="text-xs font-bold text-slate-400">
                                            {[classroom.grade, classroom._count?.students !== undefined ? `${classroom._count.students} คน` : null].filter(Boolean).join(" · ") || "ห้องเรียน"}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                            {assignReleaseMode === "scheduled" && assignStartAt ? `เริ่ม ${assignStartAt.replace("T", " ")}` : "เริ่มทันที"}
                                            {assignDueAt ? ` | ครบกำหนด ${assignDueAt.replace("T", " ")}` : ""}
                                        </p>
                                    </div>
                                    <Button
                                        onClick={() => assignCourse(classroom.id)}
                                        disabled={course?.status !== "PUBLISHED" || assigningClassId === classroom.id}
                                        className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                                    >
                                        {assigningClassId === classroom.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Assign
                                    </Button>
                                </div>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <TeacherAssessmentBuilderDialog
                open={Boolean(assessmentBuilderTarget)}
                onOpenChange={(nextOpen) => {
                    if (!nextOpen) setAssessmentBuilderTarget(null)
                }}
                title="สร้างแบบทดสอบสำหรับคอร์ส"
                description="สร้างคำถามจากโมดูลหรือทั้งคอร์ส พรีวิว แล้วผูกเข้า assessment ให้อัตโนมัติ"
                sourceOptions={assessmentBuilderSourceOptions}
                onSaved={(result) => {
                    if (!assessmentBuilderTarget) return
                    addAssessmentFromGeneratedSet(assessmentBuilderTarget, result)
                    setAssessmentBuilderTarget(null)
                }}
            />
        </div>
    )
}

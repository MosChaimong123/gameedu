"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
    BookOpen,
    CheckCircle2,
    FileText,
    GraduationCap,
    LayoutList,
    Loader2,
    Pencil,
    Send,
    Sparkles,
    Trash2,
    Users,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSubjectCurriculumMapPack } from "@/lib/curriculum/map-packs"
import { getCanonicalSubjectById, type CanonicalSubjectId } from "@/lib/curriculum/subject-catalog"
import {
    buildLessonCurriculumHref,
    CORE_SUBJECT_OPTIONS,
    parseLessonCurriculumContext,
    resolveCurriculumUnitTitle,
    type LessonCurriculumContext,
    resolveLessonCurriculumContext,
} from "@/lib/lessons/lesson-curriculum-context"
import type { LessonNormalizedCurriculumSummary } from "@/lib/lessons/lesson-curriculum-metadata"
import { cn } from "@/lib/utils"

type ClassroomAssignment = {
    classId: string
    classroom: { id: string; name: string }
}

type Lesson = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    status: "DRAFT" | "PUBLISHED"
    sourceFileName: string | null
    content?: unknown
    normalizedCurriculumSummary?: LessonNormalizedCurriculumSummary | null
    createdAt: string
    updatedAt: string
    classroomAssignments: ClassroomAssignment[]
}

type LessonFilter = "all" | "draft" | "published" | "assigned"
type LessonListItem = Lesson & {
    curriculumSubjectId: CanonicalSubjectId | null
    curriculumUnitId: string | null
    curriculumUnitTitle: string | null
    curriculumCourseTitle: string | null
    estimatedMinutes: number | null
}

const FILTERS: Array<{ value: LessonFilter; label: string }> = [
    { value: "all", label: "ทั้งหมด" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "assigned", label: "Assigned" },
]


function getFilteredLessonsByContext(lessons: LessonListItem[], filter: LessonFilter, subjectId: CanonicalSubjectId | "ALL", unitId: string | "ALL") {
    const byContext = subjectId === "ALL" ? lessons : lessons.filter((lesson) => lesson.curriculumSubjectId === subjectId)
    const byUnit = unitId === "ALL" ? byContext : byContext.filter((lesson) => lesson.curriculumUnitId === unitId)
    if (filter === "draft") return byUnit.filter((lesson) => lesson.status === "DRAFT")
    if (filter === "published") return byUnit.filter((lesson) => lesson.status === "PUBLISHED")
    if (filter === "assigned") return byUnit.filter((lesson) => lesson.classroomAssignments.length > 0)
    return byUnit
}

function getLessonStep(lesson: Lesson) {
    if (lesson.status === "DRAFT") {
        return {
            label: "พร้อมตรวจแก้",
            tone: "bg-amber-50 text-amber-700 border-amber-200",
            next: "Publish",
        }
    }
    if (lesson.classroomAssignments.length === 0) {
        return {
            label: "เผยแพร่แล้ว",
            tone: "bg-emerald-50 text-emerald-700 border-emerald-200",
            next: "Assign",
        }
    }
    return {
        label: "ใช้งานในห้องแล้ว",
        tone: "bg-blue-50 text-blue-700 border-blue-200",
        next: "View Progress",
    }
}

export default function LessonsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialCurriculumContext = useMemo(() => parseLessonCurriculumContext(searchParams), [searchParams])
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [filter, setFilter] = useState<LessonFilter>((searchParams.get("filter") as LessonFilter) || "all")
    const [subjectId, setSubjectId] = useState<CanonicalSubjectId | "ALL">(initialCurriculumContext.subjectId ?? "ALL")
    const [unitId, setUnitId] = useState<string | "ALL">(initialCurriculumContext.unitId ?? "ALL")
    const [loading, setLoading] = useState(true)
    const [deleteId, setDeleteId] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)
    const [publishingId, setPublishingId] = useState<string | null>(null)

    useEffect(() => {
        fetch("/api/lessons")
            .then((response) => response.json())
            .then((data) => {
                if (Array.isArray(data)) setLessons(data)
            })
            .finally(() => setLoading(false))
    }, [])

    useEffect(() => {
        const nextFilter = (searchParams.get("filter") as LessonFilter) || "all"
        setFilter(nextFilter)
        setSubjectId(initialCurriculumContext.subjectId ?? "ALL")
        setUnitId(initialCurriculumContext.unitId ?? "ALL")
    }, [initialCurriculumContext.subjectId, initialCurriculumContext.unitId, searchParams])

    const lessonItems = useMemo<LessonListItem[]>(
        () =>
            lessons.map((lesson) => {
                const context: LessonCurriculumContext = lesson.normalizedCurriculumSummary
                    ? {
                          subjectId: lesson.normalizedCurriculumSummary.subjectId,
                          unitId: lesson.normalizedCurriculumSummary.unitId,
                      }
                    : resolveLessonCurriculumContext(lesson.content, lesson.subject)
                return {
                    ...lesson,
                    curriculumSubjectId: context.subjectId,
                    curriculumUnitId: context.unitId,
                    curriculumUnitTitle:
                        lesson.normalizedCurriculumSummary?.unitTitle ??
                        resolveCurriculumUnitTitle(context.subjectId, context.unitId),
                    curriculumCourseTitle: lesson.normalizedCurriculumSummary?.courseTitle ?? null,
                    estimatedMinutes:
                        typeof (lesson.content as { estimatedMinutes?: unknown } | null)?.estimatedMinutes === "number"
                            ? ((lesson.content as { estimatedMinutes?: number }).estimatedMinutes ?? null)
                            : null,
                }
            }),
        [lessons]
    )
    const selectedSubjectPack = useMemo(
        () => (subjectId === "ALL" ? null : getSubjectCurriculumMapPack(subjectId)),
        [subjectId]
    )
    const availableUnits = useMemo(() => selectedSubjectPack?.unitOutlines ?? [], [selectedSubjectPack])

    useEffect(() => {
        if (unitId === "ALL") return
        if (!availableUnits.some((unit) => unit.id === unitId)) {
            setUnitId("ALL")
        }
    }, [availableUnits, unitId])

    useEffect(() => {
        const href = buildLessonCurriculumHref(
            "/dashboard/lessons",
            {
                subjectId: subjectId === "ALL" ? null : subjectId,
                unitId: unitId === "ALL" ? null : unitId,
            },
            { filter }
        )
        const currentHref = `/dashboard/lessons${searchParams.toString() ? `?${searchParams.toString()}` : ""}`
        if (href !== currentHref) {
            router.replace(href)
        }
    }, [filter, router, searchParams, subjectId, unitId])

    const publishedCount = lessonItems.filter((lesson) => lesson.status === "PUBLISHED").length
    const draftCount = lessonItems.filter((lesson) => lesson.status === "DRAFT").length
    const assignedClassCount = new Set(lessonItems.flatMap((lesson) => lesson.classroomAssignments.map((item) => item.classId))).size
    const filteredLessons = useMemo(
        () => getFilteredLessonsByContext(lessonItems, filter, subjectId, unitId),
        [filter, lessonItems, subjectId, unitId]
    )
    const activeCurriculumContext = useMemo(
        () => ({
            subjectId: subjectId === "ALL" ? null : subjectId,
            unitId: unitId === "ALL" ? null : unitId,
        }),
        [subjectId, unitId]
    )
    const createManualHref = useMemo(
        () => buildLessonCurriculumHref("/dashboard/lessons/create", activeCurriculumContext, { mode: "manual" }),
        [activeCurriculumContext]
    )
    const templateLibraryHref = useMemo(
        () => buildLessonCurriculumHref("/dashboard/lessons/create", activeCurriculumContext),
        [activeCurriculumContext]
    )
    async function handleDelete() {
        if (!deleteId) return
        setDeleting(true)
        try {
            await fetch(`/api/lessons/${deleteId}`, { method: "DELETE" })
            setLessons((prev) => prev.filter((lesson) => lesson.id !== deleteId))
        } finally {
            setDeleting(false)
            setDeleteId(null)
        }
    }

    async function handlePublish(lesson: Lesson) {
        setPublishingId(lesson.id)
        try {
            const response = await fetch(`/api/lessons/${lesson.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "PUBLISHED", confirmPublishReady: true }),
            })
            if (!response.ok) return
            const updated = (await response.json()) as Lesson
            setLessons((prev) => prev.map((item) => (item.id === lesson.id ? { ...item, ...updated } : item)))
        } finally {
            setPublishingId(null)
        }
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6">
            <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-xl shadow-emerald-200">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black backdrop-blur">
                            <GraduationCap className="h-4 w-4" />
                            สร้างบทเรียนจากหลักสูตร
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">บทเรียนของฉัน</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-white/85">
                            สร้างบทเรียนจากหลักสูตรหรือกรอกเอง ตรวจแก้ เผยแพร่ แล้ว assign ให้นักเรียนเรียนออนไลน์ได้เลย
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button asChild className="rounded-2xl bg-white font-black text-emerald-700 shadow-lg hover:bg-white/90">
                            <Link href={createManualHref}>
                                <FileText className="mr-2 h-4 w-4" />
                                สร้างบทเรียนเอง
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-2xl border-white/40 bg-white/10 font-black text-white hover:bg-white/20 hover:text-white"
                        >
                            <Link href={templateLibraryHref}>
                                <GraduationCap className="mr-2 h-4 w-4" />
                                เทมเพลตบทเรียน
                            </Link>
                        </Button>
                    </div>
                </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-4">
                {[
                    { label: "บทเรียนทั้งหมด", value: lessons.length, icon: BookOpen, color: "bg-emerald-50 text-emerald-600" },
                    { label: "Draft", value: draftCount, icon: Pencil, color: "bg-amber-50 text-amber-600" },
                    { label: "Published", value: publishedCount, icon: CheckCircle2, color: "bg-blue-50 text-blue-600" },
                    { label: "ห้องที่ assign", value: assignedClassCount, icon: Users, color: "bg-violet-50 text-violet-600" },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <div className={`mb-3 inline-flex rounded-xl p-2 ${stat.color}`}>
                            <stat.icon className="h-5 w-5" />
                        </div>
                        <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                        <p className="text-xs font-bold text-slate-400">{stat.label}</p>
                    </div>
                ))}
            </section>
            <section className="rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">รายการบทเรียน</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                            เลือกบทเรียนแล้วทำงานต่อได้ทันที: publish, assign หรือดู progress
                        </p>
                    </div>
                    <div className="flex flex-col gap-3 lg:items-end">
                        <div className="grid gap-2 sm:grid-cols-2">
                            <Select value={subjectId} onValueChange={(value) => setSubjectId(value as CanonicalSubjectId | "ALL")}>
                                <SelectTrigger className="min-w-[220px] rounded-xl bg-white">
                                    <SelectValue placeholder="ทุกวิชา" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">ทุกวิชา</SelectItem>
                                    {CORE_SUBJECT_OPTIONS.map((optionId) => (
                                        <SelectItem key={optionId} value={optionId}>
                                            {getCanonicalSubjectById(optionId)?.displayNameTh ?? optionId}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={unitId} onValueChange={setUnitId} disabled={subjectId === "ALL"}>
                                <SelectTrigger className="min-w-[260px] rounded-xl bg-white">
                                    <SelectValue placeholder="ทุกหน่วย" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">ทุกหน่วย</SelectItem>
                                    {availableUnits.map((unit) => (
                                        <SelectItem key={unit.id} value={unit.id}>
                                            {unit.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {FILTERS.map((item) => (
                                <button
                                    key={item.value}
                                    type="button"
                                    onClick={() => setFilter(item.value)}
                                    className={cn(
                                        "rounded-full border px-3 py-1.5 text-xs font-black transition",
                                        filter === item.value
                                            ? "border-emerald-200 bg-emerald-600 text-white shadow-sm"
                                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-700"
                                    )}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                    </div>
                ) : lessons.length === 0 ? (
                    <div className="px-6 py-10">
                        <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 p-6 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                                <Sparkles className="h-7 w-7" />
                            </div>
                            <h3 className="mt-4 text-xl font-black text-slate-900">เริ่มบทเรียนออนไลน์แรกของคุณ</h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
                                แนะนำเริ่มจากไฟล์ PDF หลักสูตร หรือวางข้อความสั้นๆ ให้ AI สร้างโครงบทเรียน แล้วครูตรวจแก้ก่อนเผยแพร่
                            </p>
                            <div className="mt-5 grid gap-3 text-left sm:grid-cols-3">
                                {[
                                    { title: "1. สร้าง", body: "เลือก PDF หรือข้อความ แล้วให้ AI ร่างบทเรียน" },
                                    { title: "2. ตรวจแก้", body: "แก้หัวข้อ วัตถุประสงค์ คำศัพท์ และสรุป" },
                                    { title: "3. Assign", body: "เผยแพร่และส่งเข้าห้องเรียนให้นักเรียนอ่าน" },
                                ].map((step) => (
                                    <div key={step.title} className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                                        <p className="font-black text-emerald-700">{step.title}</p>
                                        <p className="mt-1 text-xs font-medium text-slate-500">{step.body}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                                <Button asChild className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                                    <Link href={createManualHref}>
                                        <FileText className="mr-2 h-4 w-4" />
                                        สร้างบทเรียนเอง
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="rounded-xl font-bold">
                                    <Link href={templateLibraryHref}>
                                        <GraduationCap className="mr-2 h-4 w-4" />
                                        เทมเพลตบทเรียน
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : filteredLessons.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
                        <LayoutList className="h-8 w-8 text-slate-300" />
                        <div>
                            <p className="font-black text-slate-700">ไม่มีบทเรียนใน filter นี้</p>
                            <p className="mt-1 text-sm text-slate-400">ลองเปลี่ยน filter หรือสร้างบทเรียนใหม่</p>
                        </div>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {filteredLessons.map((lesson) => {
                            const step = getLessonStep(lesson)
                            return (
                                <div key={lesson.id} className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50">
                                    <button
                                        type="button"
                                        onClick={() => router.push(`/dashboard/lessons/${lesson.id}/edit`)}
                                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                                    >
                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                                            <BookOpen className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-black text-slate-900">{lesson.title}</p>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-medium text-slate-400">
                                                {(lesson.normalizedCurriculumSummary?.subjectLabel ?? lesson.subject) ? (
                                                    <span className="truncate">{lesson.normalizedCurriculumSummary?.subjectLabel ?? lesson.subject}</span>
                                                ) : null}
                                                {lesson.gradeLevel ? <span>· {lesson.gradeLevel}</span> : null}
                                                <span>· {lesson.classroomAssignments.length} ห้อง</span>
                                            </div>
                                        </div>
                                    </button>

                                    <div className="flex shrink-0 items-center gap-2">
                                        <Badge variant="outline" className={cn("hidden rounded-full border font-bold sm:inline-flex", step.tone)}>
                                            {step.label}
                                        </Badge>
                                        {lesson.status === "DRAFT" ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                                                onClick={() => void handlePublish(lesson)}
                                                disabled={publishingId === lesson.id}
                                            >
                                                {publishingId === lesson.id ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                )}
                                            </Button>
                                        ) : (
                                            <Button asChild size="sm" variant="outline" className="rounded-xl font-bold" aria-label="Assign">
                                                <Link href={`/dashboard/lessons/${lesson.id}/edit#assign`}>
                                                    <Send className="h-3.5 w-3.5" />
                                                </Link>
                                            </Button>
                                        )}
                                        <Button asChild size="sm" variant="outline" className="rounded-xl font-bold" aria-label="มุมมองนักเรียน">
                                            <Link href={`/dashboard/lessons/${lesson.id}/preview`}>
                                                <Users className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        <Button asChild size="sm" variant="outline" className="rounded-xl font-bold" aria-label="แก้ไข">
                                            <Link href={`/dashboard/lessons/${lesson.id}/edit`}>
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl border-red-200 font-bold text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteId(lesson.id)}
                                            aria-label="ลบ"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </section>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ลบบทเรียนนี้?</AlertDialogTitle>
                        <AlertDialogDescription>
                            การลบจะกู้คืนไม่ได้ และจะเอาบทเรียนนี้ออกจากทุกห้องเรียนที่ assign ไว้
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            ลบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

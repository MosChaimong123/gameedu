"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    ArrowRight,
    ClipboardCheck,
    BookOpen,
    CheckCircle2,
    Clock,
    FileText,
    GraduationCap,
    LayoutList,
    Loader2,
    Pencil,
    Send,
    Sparkles,
    Trash2,
    Upload,
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
    content?: { estimatedMinutes?: number }
    createdAt: string
    updatedAt: string
    classroomAssignments: ClassroomAssignment[]
}

type LessonFilter = "all" | "draft" | "published" | "assigned"

const FILTERS: Array<{ value: LessonFilter; label: string }> = [
    { value: "all", label: "ทั้งหมด" },
    { value: "draft", label: "Draft" },
    { value: "published", label: "Published" },
    { value: "assigned", label: "Assigned" },
]

function formatDate(value: string) {
    return new Date(value).toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        year: "numeric",
    })
}

function getFilteredLessons(lessons: Lesson[], filter: LessonFilter) {
    if (filter === "draft") return lessons.filter((lesson) => lesson.status === "DRAFT")
    if (filter === "published") return lessons.filter((lesson) => lesson.status === "PUBLISHED")
    if (filter === "assigned") return lessons.filter((lesson) => lesson.classroomAssignments.length > 0)
    return lessons
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
    const [lessons, setLessons] = useState<Lesson[]>([])
    const [filter, setFilter] = useState<LessonFilter>("all")
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

    const publishedCount = lessons.filter((lesson) => lesson.status === "PUBLISHED").length
    const draftCount = lessons.filter((lesson) => lesson.status === "DRAFT").length
    const unassignedPublishedCount = lessons.filter(
        (lesson) => lesson.status === "PUBLISHED" && lesson.classroomAssignments.length === 0
    ).length
    const assignedLessonCount = lessons.filter((lesson) => lesson.classroomAssignments.length > 0).length
    const assignedClassCount = new Set(lessons.flatMap((lesson) => lesson.classroomAssignments.map((item) => item.classId))).size
    const filteredLessons = useMemo(() => getFilteredLessons(lessons, filter), [lessons, filter])
    const qaChecks = [
        {
            label: "มีบทเรียนพร้อมให้ครูตรวจ",
            detail: lessons.length > 0 ? `${lessons.length} บทเรียนในระบบ` : "ยังไม่มีบทเรียน",
            done: lessons.length > 0,
        },
        {
            label: "ไม่มี Draft ค้างก่อน release",
            detail: draftCount === 0 ? "ไม่มี Draft ค้าง" : `${draftCount} บทยังรอ Publish`,
            done: draftCount === 0 && lessons.length > 0,
            onClick: () => setFilter("draft"),
        },
        {
            label: "บทที่ Published ถูก Assign แล้ว",
            detail: unassignedPublishedCount === 0 ? "ไม่มีบท Published ที่ลอยอยู่" : `${unassignedPublishedCount} บทรอ Assign`,
            done: unassignedPublishedCount === 0 && publishedCount > 0,
            onClick: () => setFilter("published"),
        },
        {
            label: "มีบทเรียนใช้งานจริงในห้องเรียน",
            detail: assignedLessonCount > 0 ? `${assignedLessonCount} บทถูก Assign แล้ว` : "ยังไม่มีบทที่ Assign",
            done: assignedLessonCount > 0,
            onClick: () => setFilter("assigned"),
        },
    ]
    const qaPassedCount = qaChecks.filter((item) => item.done).length
    const releaseGateReady = qaPassedCount === qaChecks.length

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
                body: JSON.stringify({ status: "PUBLISHED" }),
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
                            AI Lesson Generator
                        </div>
                        <h1 className="text-3xl font-black tracking-tight">บทเรียนของฉัน</h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium text-white/85">
                            สร้างบทเรียนจาก PDF หรือข้อความ ตรวจแก้ เผยแพร่ แล้ว assign ให้นักเรียนเรียนออนไลน์ได้เลย
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                        <Button asChild className="rounded-2xl bg-white font-black text-emerald-700 shadow-lg hover:bg-white/90">
                            <Link href="/dashboard/lessons/create?source=pdf">
                                <Upload className="mr-2 h-4 w-4" />
                                สร้างจาก PDF
                            </Link>
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="rounded-2xl border-white/40 bg-white/10 font-black text-white hover:bg-white/20 hover:text-white"
                        >
                            <Link href="/dashboard/lessons/create?source=text">
                                <FileText className="mr-2 h-4 w-4" />
                                สร้างจากข้อความ
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

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                            <Sparkles className="h-3.5 w-3.5" />
                            Teacher Command Center
                        </div>
                        <h2 className="mt-3 text-xl font-black text-slate-900">จัดการคอร์สออนไลน์จากจุดเดียว</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            ดูทันทีว่าบทไหนยังต้องตรวจ, บทไหนพร้อม assign และบทไหนเปิดให้นักเรียนเรียนแล้ว
                        </p>
                    </div>
                    <div className="grid gap-2 text-sm font-bold text-slate-600 sm:grid-cols-3 lg:min-w-[520px]">
                        <button
                            type="button"
                            onClick={() => setFilter("draft")}
                            className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-left text-amber-800 transition hover:border-amber-200"
                        >
                            <div className="text-2xl font-black">{draftCount}</div>
                            <div>รอตรวจและ Publish</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter("published")}
                            className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-left text-blue-800 transition hover:border-blue-200"
                        >
                            <div className="text-2xl font-black">{unassignedPublishedCount}</div>
                            <div>เผยแพร่แล้ว รอ Assign</div>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFilter("assigned")}
                            className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-left text-emerald-800 transition hover:border-emerald-200"
                        >
                            <div className="text-2xl font-black">{assignedLessonCount}</div>
                            <div>ใช้งานในห้องเรียนแล้ว</div>
                        </button>
                    </div>
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-xl">
                        <div
                            className={cn(
                                "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black",
                                releaseGateReady ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                            )}
                        >
                            <ClipboardCheck className="h-3.5 w-3.5" />
                            Manual QA Gate
                        </div>
                        <h2 className="mt-3 text-xl font-black text-slate-900">เช็คก่อนปล่อยบทเรียนให้นักเรียน</h2>
                        <p className="mt-1 text-sm font-medium text-slate-500">
                            ใช้เป็นด่านสุดท้ายของครู: สร้างบทเรียน, ตรวจเนื้อหา, Publish, Assign และเปิดดู progress ได้ครบก่อน deploy หรือใช้งานจริง
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-black text-slate-700">
                        <span className={releaseGateReady ? "text-emerald-600" : "text-amber-600"}>
                            {qaPassedCount}/{qaChecks.length}
                        </span>{" "}
                        checks passed
                    </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {qaChecks.map((item) => (
                        <button
                            key={item.label}
                            type="button"
                            onClick={item.onClick}
                            className={cn(
                                "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                                item.done
                                    ? "border-emerald-100 bg-emerald-50/60"
                                    : "border-amber-100 bg-amber-50/60 hover:border-amber-200"
                            )}
                        >
                            <span
                                className={cn(
                                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                                    item.done ? "bg-emerald-600 text-white" : "bg-amber-500 text-white"
                                )}
                            >
                                {item.done ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </span>
                            <span>
                                <span className="block text-sm font-black text-slate-900">{item.label}</span>
                                <span className="mt-1 block text-xs font-bold text-slate-500">{item.detail}</span>
                            </span>
                        </button>
                    ))}
                </div>
            </section>

            <section className="rounded-[2rem] border border-slate-100 bg-white shadow-sm">
                <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">รายการบทเรียน</h2>
                        <p className="mt-1 text-xs font-medium text-slate-500">
                            เลือกบทเรียนแล้วทำงานต่อได้ทันที: publish, assign หรือดู progress
                        </p>
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
                                    <Link href="/dashboard/lessons/create?source=pdf">
                                        <Upload className="mr-2 h-4 w-4" />
                                        สร้างจาก PDF
                                    </Link>
                                </Button>
                                <Button asChild variant="outline" className="rounded-xl font-bold">
                                    <Link href="/dashboard/lessons/create?source=text">
                                        <FileText className="mr-2 h-4 w-4" />
                                        สร้างจากข้อความ
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
                            const readinessPercent =
                                lesson.status === "DRAFT"
                                    ? 33
                                    : lesson.classroomAssignments.length === 0
                                      ? 66
                                      : 100
                            return (
                                <div key={lesson.id} className="grid gap-4 px-6 py-5 transition-colors hover:bg-slate-50 lg:grid-cols-[1fr_auto]">
                                    <div className="flex min-w-0 gap-4">
                                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                                            <BookOpen className="h-6 w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => router.push(`/dashboard/lessons/${lesson.id}/edit`)}
                                                    className="truncate text-left text-base font-black text-slate-900 hover:text-emerald-700"
                                                >
                                                    {lesson.title}
                                                </button>
                                                <Badge variant="outline" className={cn("rounded-full border font-bold", step.tone)}>
                                                    {step.label}
                                                </Badge>
                                            </div>
                                            <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                                                {lesson.description || "ยังไม่มีคำอธิบายบทเรียน ครูสามารถเพิ่มรายละเอียดในหน้าแก้ไขได้"}
                                            </p>
                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-400">
                                                {lesson.subject ? <span>{lesson.subject}</span> : null}
                                                {lesson.gradeLevel ? <span>{lesson.gradeLevel}</span> : null}
                                                {lesson.sourceFileName ? (
                                                    <span className="flex items-center gap-1">
                                                        <FileText className="h-3 w-3" />
                                                        {lesson.sourceFileName}
                                                    </span>
                                                ) : null}
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {lesson.classroomAssignments.length} ห้อง
                                                </span>
                                                {lesson.content?.estimatedMinutes ? (
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {lesson.content.estimatedMinutes} นาที
                                                    </span>
                                                ) : null}
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {formatDate(lesson.createdAt)}
                                                </span>
                                            </div>
                                            {lesson.classroomAssignments.length > 0 ? (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {lesson.classroomAssignments.slice(0, 4).map((assignment) => (
                                                        <span key={assignment.classId} className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                                            {assignment.classroom.name}
                                                        </span>
                                                    ))}
                                                    {lesson.classroomAssignments.length > 4 ? (
                                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">
                                                            +{lesson.classroomAssignments.length - 4}
                                                        </span>
                                                    ) : null}
                                                </div>
                                            ) : null}
                                            <div className="mt-4 max-w-xl">
                                                <div className="mb-1.5 flex items-center justify-between text-[11px] font-black text-slate-400">
                                                    <span>Course readiness</span>
                                                    <span>{readinessPercent}%</span>
                                                </div>
                                                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                    <div
                                                        className={cn(
                                                            "h-full rounded-full transition-all duration-500",
                                                            readinessPercent === 100
                                                                ? "bg-emerald-500"
                                                                : readinessPercent === 66
                                                                  ? "bg-blue-400"
                                                                  : "bg-amber-400"
                                                        )}
                                                        style={{ width: `${readinessPercent}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                        {lesson.status === "DRAFT" ? (
                                            <Button
                                                type="button"
                                                size="sm"
                                                className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                                                onClick={() => void handlePublish(lesson)}
                                                disabled={publishingId === lesson.id}
                                            >
                                                {publishingId === lesson.id ? (
                                                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                                )}
                                                Publish
                                            </Button>
                                        ) : (
                                            <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                                                <Link href={`/dashboard/lessons/${lesson.id}/edit#assign`}>
                                                    <Send className="mr-1.5 h-3.5 w-3.5" />
                                                    Assign
                                                </Link>
                                            </Button>
                                        )}
                                        <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                                            <Link href={`/dashboard/lessons/${lesson.id}/edit#progress`}>
                                                <Users className="mr-1.5 h-3.5 w-3.5" />
                                                View Progress
                                            </Link>
                                        </Button>
                                        <Button asChild size="sm" variant="outline" className="rounded-xl font-bold">
                                            <Link href={`/dashboard/lessons/${lesson.id}/edit`}>
                                                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                                                แก้ไข
                                            </Link>
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl border-red-200 font-bold text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteId(lesson.id)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                        <div className="hidden items-center gap-1 text-xs font-bold text-slate-400 xl:flex">
                                            ต่อไป: {step.next}
                                            <ArrowRight className="h-3 w-3" />
                                        </div>
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

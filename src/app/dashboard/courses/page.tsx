"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    BookOpen,
    Clock3,
    Edit3,
    Filter,
    GraduationCap,
    Loader2,
    Plus,
    Search,
    Sparkles,
    Trash2,
    Users2,
    Video,
} from "lucide-react"
import { CourseCoverArt } from "@/components/courses/course-cover-art"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageBackLink } from "@/components/ui/page-back-link"
import { getCourseCatalogMeta } from "@/lib/courses/course-catalog"
import type { CourseContentV1 } from "@/lib/courses/course-content"

type CourseRecord = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    coverImageUrl?: string | null
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED"
    content: unknown
    createdAt: string
    updatedAt: string
    _count?: {
        classroomAssignments: number
    }
}

function isCourseContentV1Client(content: unknown): content is CourseContentV1 {
    return (
        Boolean(content) &&
        typeof content === "object" &&
        (content as { schemaVersion?: unknown }).schemaVersion === "course_content_v1"
    )
}

export default function CoursesPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<CourseRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [deletingId, setDeletingId] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"ALL" | "DRAFT" | "PUBLISHED" | "ARCHIVED">("ALL")
    const [subjectFilter, setSubjectFilter] = useState("ALL")
    const [gradeFilter, setGradeFilter] = useState("ALL")
    const [featureFilter, setFeatureFilter] = useState<"ALL" | "VIDEO" | "DOCS" | "ASSIGNED">("ALL")
    const [sortBy, setSortBy] = useState<"LATEST" | "UPDATED" | "ACTIVE" | "POPULAR">("LATEST")

    useEffect(() => {
        fetch("/api/courses")
            .then((response) => {
                if (!response.ok) throw new Error("โหลดคอร์สไม่สำเร็จ")
                return response.json()
            })
            .then((data) => {
                if (Array.isArray(data)) setCourses(data)
            })
            .catch((caught) => setError(caught instanceof Error ? caught.message : "โหลดคอร์สไม่สำเร็จ"))
            .finally(() => setLoading(false))
    }, [])

    const subjects = useMemo(
        () =>
            Array.from(new Set(courses.map((course) => course.subject?.trim()).filter((value): value is string => Boolean(value)))).sort(),
        [courses]
    )
    const gradeLevels = useMemo(
        () =>
            Array.from(
                new Set(courses.map((course) => course.gradeLevel?.trim()).filter((value): value is string => Boolean(value)))
            ).sort(),
        [courses]
    )

    const filteredCourses = useMemo(() => {
        const loweredQuery = query.trim().toLowerCase()

        const next = courses.filter((course) => {
            const content = isCourseContentV1Client(course.content) ? course.content : null
            const meta = content ? getCourseCatalogMeta(content) : null
            const haystack = [course.title, course.description, course.subject, course.gradeLevel, ...(meta?.tagIds ?? [])]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            if (loweredQuery && !haystack.includes(loweredQuery)) return false
            if (statusFilter !== "ALL" && course.status !== statusFilter) return false
            if (subjectFilter !== "ALL" && course.subject !== subjectFilter) return false
            if (gradeFilter !== "ALL" && course.gradeLevel !== gradeFilter) return false
            if (featureFilter === "VIDEO" && !meta?.hasVideo) return false
            if (featureFilter === "DOCS" && !meta?.hasDocuments) return false
            if (featureFilter === "ASSIGNED" && !(course._count?.classroomAssignments && course._count.classroomAssignments > 0)) return false
            return true
        })

        next.sort((left, right) => {
            if (sortBy === "UPDATED") return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
            if (sortBy === "POPULAR") return (right._count?.classroomAssignments ?? 0) - (left._count?.classroomAssignments ?? 0)
            if (sortBy === "ACTIVE") {
                const leftScore = (left.status === "PUBLISHED" ? 10 : 0) + (left._count?.classroomAssignments ?? 0)
                const rightScore = (right.status === "PUBLISHED" ? 10 : 0) + (right._count?.classroomAssignments ?? 0)
                return rightScore - leftScore
            }
            return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        })

        return next
    }, [courses, featureFilter, gradeFilter, query, sortBy, statusFilter, subjectFilter])

    const stats = useMemo(() => {
        return courses.reduce(
            (acc, course) => {
                const content = isCourseContentV1Client(course.content) ? course.content : null
                const meta = content ? getCourseCatalogMeta(content) : null
                acc.published += course.status === "PUBLISHED" ? 1 : 0
                acc.draft += course.status === "DRAFT" ? 1 : 0
                acc.assigned += course._count?.classroomAssignments ?? 0
                acc.lessons += meta?.lessonCount ?? 0
                return acc
            },
            { published: 0, draft: 0, assigned: 0, lessons: 0 }
        )
    }, [courses])

    async function deleteCourse(id: string) {
        if (!confirm("ลบคอร์สนี้?")) return
        setDeletingId(id)
        try {
            const response = await fetch(`/api/courses/${id}`, { method: "DELETE" })
            if (!response.ok) throw new Error("ลบคอร์สไม่สำเร็จ")
            setCourses((current) => current.filter((course) => course.id !== id))
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "ลบคอร์สไม่สำเร็จ")
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
            <PageBackLink href="/dashboard/lessons" label="บทเรียนของฉัน" />
            <header className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 p-6 text-white shadow-lg lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-black">
                        <Sparkles className="h-4 w-4" />
                        Course Catalog
                    </div>
                    <h1 className="mt-4 text-3xl font-black tracking-tight">คอร์สเรียนของฉัน</h1>
                    <p className="mt-1 max-w-3xl text-sm font-medium text-emerald-50">
                        จัดคอร์สแบบค้นหาได้ง่าย ดูว่าคอร์สไหนพร้อมใช้ คอร์สไหน assign ไปแล้ว และคอร์สไหนเหมาะนำไปต่อยอดในห้องเรียน
                    </p>
                </div>
                <Link href="/dashboard/courses/create">
                    <Button className="rounded-xl bg-white font-black text-emerald-700 hover:bg-emerald-50">
                        <Plus className="mr-2 h-4 w-4" />
                        สร้างคอร์ส
                    </Button>
                </Link>
            </header>

            <section className="grid gap-4 md:grid-cols-4">
                {[
                    { label: "คอร์สทั้งหมด", value: courses.length, icon: BookOpen },
                    { label: "Published", value: stats.published, icon: GraduationCap },
                    { label: "ร่างค้างอยู่", value: stats.draft, icon: Edit3 },
                    { label: "ถูก assign แล้ว", value: stats.assigned, icon: Users2 },
                ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-black text-slate-400">{item.label}</p>
                            <item.icon className="h-4 w-4 text-slate-300" />
                        </div>
                        <p className="mt-2 text-3xl font-black text-slate-950">{item.value}</p>
                    </div>
                ))}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(5,minmax(0,1fr))]">
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
                        <Search className="h-4 w-4 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="ค้นหาชื่อคอร์ส คำอธิบาย วิชา หรือ tag"
                            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        />
                    </label>
                    <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="ALL">ทุกสถานะ</option>
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                    </select>
                    <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="ALL">ทุกวิชา</option>
                        {subjects.map((subject) => (
                            <option key={subject} value={subject}>
                                {subject}
                            </option>
                        ))}
                    </select>
                    <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="ALL">ทุกระดับชั้น</option>
                        {gradeLevels.map((grade) => (
                            <option key={grade} value={grade}>
                                {grade}
                            </option>
                        ))}
                    </select>
                    <select value={featureFilter} onChange={(event) => setFeatureFilter(event.target.value as typeof featureFilter)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="ALL">ทุกฟีเจอร์</option>
                        <option value="VIDEO">มีวิดีโอ</option>
                        <option value="DOCS">มีเอกสาร</option>
                        <option value="ASSIGNED">กำลังใช้งาน</option>
                    </select>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="LATEST">ล่าสุด</option>
                        <option value="UPDATED">แก้ไขล่าสุด</option>
                        <option value="ACTIVE">กำลังใช้งาน</option>
                        <option value="POPULAR">นักเรียนเรียนเยอะ</option>
                    </select>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Filter className="h-3.5 w-3.5" />
                    <span>พบ {filteredCourses.length} คอร์ส</span>
                    <span>รวม {stats.lessons} บทเรียน</span>
                </div>
            </section>

            {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

            {loading ? (
                <div className="grid min-h-64 place-items-center text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="grid min-h-64 place-items-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                    <div>
                        <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-4 text-xl font-black text-slate-900">ไม่พบคอร์สที่ตรงเงื่อนไข</h3>
                        <p className="mt-1 text-sm font-medium text-slate-500">ลองเปลี่ยนคำค้นหรือ filter แล้วดูรายการคอร์สอีกครั้ง</p>
                    </div>
                </div>
            ) : (
                <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                    {filteredCourses.map((course) => {
                        const content = isCourseContentV1Client(course.content) ? course.content : null
                        const meta = content ? getCourseCatalogMeta(content) : null
                        const assignmentCount = course._count?.classroomAssignments ?? 0

                        return (
                            <article key={course.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-lg">
                                {course.coverImageUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={course.coverImageUrl} alt={course.title} className="h-36 w-full object-cover" />
                                ) : (
                                    <CourseCoverArt
                                        title={course.title}
                                        subject={course.subject}
                                        gradeLevel={course.gradeLevel}
                                        estimatedMinutes={meta?.estimatedMinutes}
                                        lessonCount={meta?.lessonCount}
                                    />
                                )}
                                <div className="space-y-4 p-5">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${
                                            course.status === "PUBLISHED"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : course.status === "ARCHIVED"
                                                    ? "bg-slate-200 text-slate-600"
                                                    : "bg-amber-100 text-amber-700"
                                        }`}>
                                            {course.status}
                                        </span>
                                        {meta?.hasVideo ? (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-black text-blue-700">
                                                <Video className="h-3 w-3" />
                                                วิดีโอ
                                            </span>
                                        ) : null}
                                        {assignmentCount > 0 ? (
                                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-black text-violet-700">
                                                ใช้งาน {assignmentCount} ห้อง
                                            </span>
                                        ) : null}
                                    </div>

                                    <div>
                                        <h2 className="line-clamp-2 text-xl font-black text-slate-950">{course.title}</h2>
                                        <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">
                                            {course.description || "ยังไม่มีคำอธิบายคอร์ส"}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                                        {course.subject ? <span>{course.subject}</span> : null}
                                        {course.gradeLevel ? <span>{course.gradeLevel}</span> : null}
                                        {meta ? (
                                            <>
                                                <span>{meta.moduleCount} โมดูล</span>
                                                <span>{meta.lessonCount} บทเรียน</span>
                                                {meta.estimatedMinutes > 0 ? (
                                                    <span className="flex items-center gap-1">
                                                        <Clock3 className="h-3.5 w-3.5" />
                                                        {meta.estimatedMinutes} นาที
                                                    </span>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </div>

                                    {meta && (meta.categoryIds.length > 0 || meta.tagIds.length > 0) ? (
                                        <div className="flex flex-wrap gap-2">
                                            {meta.categoryIds.slice(0, 2).map((category) => (
                                                <span key={category} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                                    {category}
                                                </span>
                                            ))}
                                            {meta.tagIds.slice(0, 3).map((tag) => (
                                                <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    ) : null}

                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => router.push(`/dashboard/courses/${course.id}/edit`)}
                                            className="flex-1 rounded-xl font-bold"
                                        >
                                            <Edit3 className="mr-2 h-4 w-4" />
                                            แก้ไข
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => deleteCourse(course.id)}
                                            disabled={deletingId === course.id}
                                            className="rounded-xl text-slate-400 hover:text-red-600"
                                        >
                                            {deletingId === course.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </article>
                        )
                    })}
                </section>
            )}
        </div>
    )
}

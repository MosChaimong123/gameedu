"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
    BookOpen,
    ChevronRight,
    Clock,
    Filter,
    GraduationCap,
    Layers3,
    Loader2,
    PlayCircle,
    Search,
    Video,
} from "lucide-react"
import { CourseCoverArt } from "@/components/courses/course-cover-art"
import { Input } from "@/components/ui/input"
import { getCourseCatalogMeta } from "@/lib/courses/course-catalog"
import type { CourseContentV1 } from "@/lib/courses/course-content"

type AssignedCourse = {
    id: string
    courseId: string
    assignedAt: string
    startAt: string | null
    dueAt: string | null
    status: string
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
}

type StudentCoursesTabProps = {
    code: string
}

function getCourseStatusLabel(progressPercent: number) {
    if (progressPercent >= 100) return "เรียนจบแล้ว"
    if (progressPercent > 0) return "กำลังเรียนอยู่"
    return "ยังไม่เริ่ม"
}

function getCourseAssessmentLabel(course: AssignedCourse) {
    if (course.progress.courseCompleted) return "ผ่านครบแล้ว"
    if (course.progress.nextRequiredAction === "ASSESSMENT") {
        return `ค้างแบบทดสอบ ${course.progress.assessmentStatus.pendingAssessmentIds.length}`
    }
    return null
}

export function StudentCoursesTab({ code }: StudentCoursesTabProps) {
    const [courses, setCourses] = useState<AssignedCourse[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [query, setQuery] = useState("")
    const [subjectFilter, setSubjectFilter] = useState("ALL")
    const [progressFilter, setProgressFilter] = useState<"ALL" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED">("ALL")
    const [featureFilter, setFeatureFilter] = useState<"ALL" | "VIDEO" | "DOCS">("ALL")
    const [sortBy, setSortBy] = useState<"CONTINUE" | "LATEST" | "SHORTEST">("CONTINUE")

    const loadCourses = useCallback(() => {
        setLoading(true)
        setError(null)
        fetch(`/api/student/${code}/courses`)
            .then((response) => {
                if (!response.ok) throw new Error("โหลดคอร์สไม่สำเร็จ")
                return response.json()
            })
            .then((data) => {
                if (Array.isArray(data)) setCourses(data)
                else throw new Error("ข้อมูลคอร์สไม่ถูกต้อง")
            })
            .catch((nextError: Error) => setError(nextError.message))
            .finally(() => setLoading(false))
    }, [code])

    useEffect(() => {
        loadCourses()
    }, [loadCourses])

    const subjects = useMemo(
        () =>
            Array.from(new Set(courses.map((course) => course.course.subject?.trim()).filter((value): value is string => Boolean(value)))).sort(),
        [courses]
    )

    const filteredCourses = useMemo(() => {
        const loweredQuery = query.trim().toLowerCase()
        const next = courses.filter((item) => {
            const meta = getCourseCatalogMeta(item.course.content)
            const haystack = [
                item.course.title,
                item.course.description,
                item.course.subject,
                item.course.gradeLevel,
                ...meta.tagIds,
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()

            if (loweredQuery && !haystack.includes(loweredQuery)) return false
            if (subjectFilter !== "ALL" && item.course.subject !== subjectFilter) return false
            if (progressFilter === "NOT_STARTED" && item.progress.percent !== 0) return false
            if (progressFilter === "IN_PROGRESS" && !(item.progress.percent > 0 && item.progress.percent < 100)) return false
            if (progressFilter === "COMPLETED" && item.progress.percent < 100) return false
            if (featureFilter === "VIDEO" && !meta.hasVideo) return false
            if (featureFilter === "DOCS" && !meta.hasDocuments) return false
            return true
        })

        next.sort((left, right) => {
            const leftMeta = getCourseCatalogMeta(left.course.content)
            const rightMeta = getCourseCatalogMeta(right.course.content)

            if (sortBy === "LATEST") return new Date(right.assignedAt).getTime() - new Date(left.assignedAt).getTime()
            if (sortBy === "SHORTEST") return leftMeta.estimatedMinutes - rightMeta.estimatedMinutes

            const leftScore = left.progress.percent > 0 && left.progress.percent < 100 ? 2 : left.progress.percent >= 100 ? 0 : 1
            const rightScore = right.progress.percent > 0 && right.progress.percent < 100 ? 2 : right.progress.percent >= 100 ? 0 : 1
            if (leftScore !== rightScore) return rightScore - leftScore
            return new Date(right.assignedAt).getTime() - new Date(left.assignedAt).getTime()
        })

        return next
    }, [courses, featureFilter, progressFilter, query, sortBy, subjectFilter])

    const totals = useMemo(() => {
        return courses.reduce(
            (acc, item) => {
                const meta = getCourseCatalogMeta(item.course.content)
                acc.modules += meta.moduleCount
                acc.lessons += meta.lessonCount
                acc.minutes += meta.estimatedMinutes
                return acc
            },
            { modules: 0, lessons: 0, minutes: 0 }
        )
    }, [courses])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-red-100 bg-red-50 py-12 text-center shadow-sm">
                <p className="font-bold text-red-600">{error}</p>
                <button
                    type="button"
                    onClick={loadCourses}
                    className="rounded-xl bg-red-500 px-4 py-2 text-sm font-black text-white hover:bg-red-600"
                >
                    ลองอีกครั้ง
                </button>
            </div>
        )
    }

    if (courses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 rounded-[2rem] border border-slate-100 bg-white py-16 text-center shadow-sm">
                <div className="rounded-full bg-slate-100 p-4">
                    <GraduationCap className="h-8 w-8 text-slate-400" />
                </div>
                <p className="font-black text-slate-600">ยังไม่มีคอร์สเรียน</p>
                <p className="text-sm text-slate-400">ครูยังไม่ได้มอบหมายคอร์สให้ห้องนี้</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                        <Layers3 className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="font-black text-slate-800">คอร์สเรียนของฉัน</p>
                        <p className="mt-1 text-sm font-medium text-slate-500">ค้นหาคอร์สที่ครูมอบหมาย แล้วเรียนต่อจากจุดล่าสุดได้ทันที</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-slate-600">{courses.length} คอร์ส</p>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-bold text-slate-500 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 px-3 py-2">{totals.modules} โมดูล</div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">{totals.lessons} บทเรียน</div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2">เวลาเรียนรวม {totals.minutes || "-"} นาที</div>
                </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,1fr))]">
                    <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3">
                        <Search className="h-4 w-4 text-slate-400" />
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="ค้นหาคอร์ส วิชา หรือ tag"
                            className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        />
                    </label>
                    <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="ALL">ทุกวิชา</option>
                        {subjects.map((subject) => (
                            <option key={subject} value={subject}>
                                {subject}
                            </option>
                        ))}
                    </select>
                    <select value={progressFilter} onChange={(event) => setProgressFilter(event.target.value as typeof progressFilter)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="ALL">ทุกสถานะ</option>
                        <option value="NOT_STARTED">ยังไม่เริ่ม</option>
                        <option value="IN_PROGRESS">กำลังเรียนอยู่</option>
                        <option value="COMPLETED">เรียนจบแล้ว</option>
                    </select>
                    <select value={featureFilter} onChange={(event) => setFeatureFilter(event.target.value as typeof featureFilter)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="ALL">ทุกฟีเจอร์</option>
                        <option value="VIDEO">มีวิดีโอ</option>
                        <option value="DOCS">มีเอกสาร</option>
                    </select>
                    <select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
                        <option value="CONTINUE">เรียนต่อก่อน</option>
                        <option value="LATEST">มอบหมายล่าสุด</option>
                        <option value="SHORTEST">สั้นที่สุด</option>
                    </select>
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-500">
                    <Filter className="h-3.5 w-3.5" />
                    <span>พบ {filteredCourses.length} คอร์ส</span>
                </div>
            </div>

            <div className="grid gap-3">
                {filteredCourses.map((item) => {
                    const meta = getCourseCatalogMeta(item.course.content)
                    const href = `/student/${code}/courses/${item.course.id}`
                    const statusLabel = getCourseStatusLabel(item.progress.percent)
                    const assessmentLabel = getCourseAssessmentLabel(item)
                    const actionLabelResolved =
                        item.progress.nextRequiredAction === "ASSESSMENT"
                            ? "ทำแบบทดสอบ"
                            : item.progress.percent > 0 && item.progress.percent < 100
                              ? "เน€เธฃเธตเธขเธเธ•เนเธญ"
                              : item.progress.percent >= 100
                                ? "เธ—เธเธ—เธงเธ"
                                : "เน€เธฃเธดเนเธกเน€เธฃเธตเธขเธ"
                    const actionLabel = item.progress.percent > 0 && item.progress.percent < 100 ? "เรียนต่อ" : item.progress.percent >= 100 ? "ทบทวน" : "เริ่มเรียน"

                    return (
                        <Link
                            key={item.id}
                            href={href}
                            className="block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                        >
                            {item.course.coverImageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={item.course.coverImageUrl} alt={item.course.title} className="h-40 w-full object-cover" />
                            ) : (
                                <CourseCoverArt
                                    title={item.course.title}
                                    subject={item.course.subject}
                                    gradeLevel={item.course.gradeLevel}
                                    estimatedMinutes={meta.estimatedMinutes}
                                    lessonCount={meta.lessonCount}
                                />
                            )}
                            <div className="p-4">
                                <div className="flex items-start gap-4">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate font-black text-slate-800">{item.course.title}</p>
                                            <span
                                                className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                                                    item.progress.percent >= 100
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : item.progress.percent > 0
                                                            ? "bg-amber-100 text-amber-700"
                                                            : "border border-blue-200 bg-blue-50 text-blue-700"
                                                }`}
                                            >
                                                {statusLabel}
                                            </span>
                                            {meta.hasVideo ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-black text-indigo-700">
                                                    <Video className="h-3 w-3" />
                                                    วิดีโอ
                                                </span>
                                            ) : null}
                                            {assessmentLabel ? (
                                                <span
                                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black ${
                                                        item.progress.courseCompleted ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                                    }`}
                                                >
                                                    {assessmentLabel}
                                                </span>
                                            ) : null}
                                        </div>
                                        {item.course.description && (
                                            <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-500">{item.course.description}</p>
                                        )}
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                                            {item.course.subject ? <span>{item.course.subject}</span> : null}
                                            {item.course.gradeLevel ? <span>{item.course.gradeLevel}</span> : null}
                                            <span>{meta.moduleCount} โมดูล</span>
                                            <span>{meta.lessonCount} บทเรียน</span>
                                            {meta.estimatedMinutes ? (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {meta.estimatedMinutes} นาที
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-3">
                                            <div className="mb-1 flex items-center justify-between text-[11px] font-black text-slate-500">
                                                <span>ความคืบหน้า</span>
                                                <span>{item.progress.percent}%</span>
                                            </div>
                                            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                                                <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.progress.percent}%` }} />
                                            </div>
                                        </div>
                                        {item.progress.nextRequiredAction === "ASSESSMENT" ? (
                                            <p className="mt-2 text-xs font-bold text-amber-700">เรียนบทบังคับครบแล้ว เหลือแบบทดสอบที่ต้องผ่าน</p>
                                        ) : null}
                                    </div>
                                    <span className="flex shrink-0 items-center gap-1 rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-black text-white">
                                        <PlayCircle className="h-3.5 w-3.5" />
                                        {actionLabelResolved}
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </div>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}

"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Award, Download, Loader2, ShieldAlert, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CourseContentV1 } from "@/lib/courses/course-content"

type ClassroomCourseAssignment = {
    id: string
    assignedAt: string
    startAt: string | null
    dueAt: string | null
    status: string
    course: {
        id: string
        title: string
        subject: string | null
        gradeLevel: string | null
        status: string
        description: string | null
        coverImageUrl: string | null
        content: CourseContentV1
    }
}

type ClassroomCourseProgressPayload = {
    classroom: {
        id: string
        name: string
    }
    course: {
        id: string
        title: string
        subject: string | null
        gradeLevel: string | null
    }
    assignment: {
        id: string
        assignedAt: string
        startAt: string | null
        dueAt: string | null
        status: string
    }
    summary: {
        studentCount: number
        completedCount: number
        inProgressCount: number
        notStartedCount: number
        certificateIssuedCount: number
        attentionCount: number
        averagePercent: number
        blockerLessons: Array<{
            lessonId: string
            lessonTitle: string | null
            count: number
        }>
    }
    curriculumAnalytics: {
        subjectId: string | null
        subjectLabel: string
        lessonCount: number
        requiredLessonCount: number
        optionalLessonCount: number
        unitCount: number
        averageLessonCompletionRate: number
        assessmentCount: number
        assessmentPassRate: number | null
        unitCoverage: Array<{
            unitId: string | null
            unitTitle: string
            lessonCount: number
            requiredLessonCount: number
            averageCompletionRate: number
        }>
        lessonCompletion: Array<{
            lessonId: string
            title: string
            required: boolean
            subjectId: string | null
            subjectLabel: string | null
            unitId: string | null
            unitTitle: string | null
            completionCount: number
            completionRate: number
        }>
    }
    students: Array<{
        studentId: string
        studentName: string
        studentNickname: string | null
        studentLoginCode: string
        percent: number
        currentLessonTitle: string | null
        nextLessonTitle: string | null
        lastOpenedAt: string | null
        completedAt: string | null
        status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
        needsAttention: boolean
        attentionReason: string | null
        passedAssessmentIds: string[]
        issuedCertificate: boolean
    }>
}

type ClassroomCourseAssessmentResultsPayload = {
    course: {
        id: string
        title: string
    }
    summary: {
        assessmentCount: number
        studentCount: number
        submittedCount: number
        passedCount: number
        failedCount: number
        notStartedCount: number
    }
    assessments: Array<{
        id: string
        type: "pretest" | "checkpoint" | "posttest"
        title: string
        moduleId?: string
        moduleTitle: string | null
        passScore?: number
        allowRetake?: boolean
        questionSetTitle: string | null
        totalQuestions: number
        summary: {
            studentCount: number
            submittedCount: number
            passedCount: number
            failedCount: number
            notStartedCount: number
        }
        questionInsights: Array<{
            questionId: string
            question: string
            responseCount: number
            incorrectCount: number
            accuracyPercent: number | null
        }>
        students: Array<{
            studentId: string
            studentName: string
            studentNickname: string | null
            studentLoginCode: string
            attemptCount: number
            hasPassed: boolean
            status: "PASSED" | "FAILED" | "NOT_STARTED"
            latestAttempt: {
                id: string
                score: number
                maxScore: number
                passed: boolean
                attemptNumber: number
                completedAt: string
            } | null
            intervention: "REVIEW_NOW" | "REMIND_TO_START" | "NONE"
        }>
    }>
}

type ClassroomCoursesProgressTabProps = {
    classId: string
    studentCount: number
}

type AssessmentFilter = "all" | "failed" | "not_started" | "passed"

function csvCell(value: string | number | null | undefined) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`
}

function formatDate(value: string | null) {
    if (!value) return "-"
    return new Date(value).toLocaleDateString("th-TH")
}

function getCourseStatusTone(status: ClassroomCourseProgressPayload["students"][number]["status"]) {
    if (status === "COMPLETED") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
    if (status === "IN_PROGRESS") return "bg-blue-100 text-blue-700 hover:bg-blue-100"
    return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

function getAssessmentStatusTone(status: "PASSED" | "FAILED" | "NOT_STARTED") {
    if (status === "PASSED") return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
    if (status === "FAILED") return "bg-rose-100 text-rose-700 hover:bg-rose-100"
    return "bg-slate-100 text-slate-700 hover:bg-slate-100"
}

function getAssessmentStatusLabel(status: "PASSED" | "FAILED" | "NOT_STARTED") {
    if (status === "PASSED") return "ผ่านแล้ว"
    if (status === "FAILED") return "ยังไม่ผ่าน"
    return "ยังไม่เริ่ม"
}

function getInterventionLabel(intervention: "REVIEW_NOW" | "REMIND_TO_START" | "NONE") {
    if (intervention === "REVIEW_NOW") return "ทบทวนด่วน"
    if (intervention === "REMIND_TO_START") return "เตือนให้เริ่ม"
    return "ปกติ"
}

function getAssessmentTypeLabel(type: "pretest" | "checkpoint" | "posttest") {
    if (type === "pretest") return "Pre-test"
    if (type === "posttest") return "Post-test"
    return "Checkpoint"
}

export function ClassroomCoursesProgressTab({ classId, studentCount }: ClassroomCoursesProgressTabProps) {
    const [assignments, setAssignments] = useState<ClassroomCourseAssignment[]>([])
    const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
    const [selectedProgress, setSelectedProgress] = useState<ClassroomCourseProgressPayload | null>(null)
    const [assessmentResults, setAssessmentResults] = useState<ClassroomCourseAssessmentResultsPayload | null>(null)
    const [assessmentFilter, setAssessmentFilter] = useState<AssessmentFilter>("all")
    const [loading, setLoading] = useState(true)
    const [detailLoading, setDetailLoading] = useState(false)
    const [error, setError] = useState("")

    useEffect(() => {
        let active = true

        fetch(`/api/classrooms/${classId}/courses`)
            .then(async (response) => {
                const data = await response.json().catch(() => null)
                if (!response.ok) {
                    throw new Error(data?.error?.message ?? "โหลดคอร์สไม่สำเร็จ")
                }
                if (!active || !Array.isArray(data)) return
                setAssignments(data)
                if (data.length > 0) {
                    setSelectedCourseId((current) => current ?? data[0].course.id)
                }
            })
            .catch((err) => {
                if (active) setError(err instanceof Error ? err.message : "โหลดคอร์สไม่สำเร็จ")
            })
            .finally(() => {
                if (active) setLoading(false)
            })

        return () => {
            active = false
        }
    }, [classId])

    useEffect(() => {
        if (!selectedCourseId) {
            setSelectedProgress(null)
            setAssessmentResults(null)
            return
        }

        let active = true
        setDetailLoading(true)
        setError("")

        const assessmentSearch = new URLSearchParams()
        if (assessmentFilter !== "all") {
            assessmentSearch.set("status", assessmentFilter)
        }
        const assessmentSuffix = assessmentSearch.toString() ? `?${assessmentSearch.toString()}` : ""

        Promise.all([
            fetch(`/api/classrooms/${classId}/courses/${selectedCourseId}/progress`),
            fetch(`/api/classrooms/${classId}/courses/${selectedCourseId}/assessment-results${assessmentSuffix}`),
        ])
            .then(async ([progressResponse, assessmentResponse]) => {
                const progressData = await progressResponse.json().catch(() => null)
                if (!progressResponse.ok) {
                    throw new Error(progressData?.error?.message ?? "โหลดภาพรวมคอร์สไม่สำเร็จ")
                }

                const assessmentData = await assessmentResponse.json().catch(() => null)
                if (!assessmentResponse.ok) {
                    throw new Error(assessmentData?.error?.message ?? "โหลดผลแบบทดสอบไม่สำเร็จ")
                }

                if (!active) return
                setSelectedProgress(progressData as ClassroomCourseProgressPayload)
                setAssessmentResults(assessmentData as ClassroomCourseAssessmentResultsPayload)
            })
            .catch((err) => {
                if (active) {
                    setError(err instanceof Error ? err.message : "โหลดข้อมูลคอร์สไม่สำเร็จ")
                    setSelectedProgress(null)
                    setAssessmentResults(null)
                }
            })
            .finally(() => {
                if (active) setDetailLoading(false)
            })

        return () => {
            active = false
        }
    }, [assessmentFilter, classId, selectedCourseId])

    const assessmentSummaryCards = useMemo(() => {
        if (!assessmentResults) return []
        return [
            { label: "ส่งแล้ว", value: assessmentResults.summary.submittedCount, tone: "bg-blue-50 text-blue-700" },
            { label: "ผ่านแล้ว", value: assessmentResults.summary.passedCount, tone: "bg-emerald-50 text-emerald-700" },
            { label: "ยังไม่ผ่าน", value: assessmentResults.summary.failedCount, tone: "bg-rose-50 text-rose-700" },
            { label: "ยังไม่เริ่ม", value: assessmentResults.summary.notStartedCount, tone: "bg-slate-100 text-slate-700" },
        ]
    }, [assessmentResults])

    function exportCourseCsv() {
        if (!selectedProgress) return
        const rows = [
            ["Student Name", "Login Code", "Status", "Percent", "Current Lesson", "Next Lesson", "Last Opened At", "Attention", "Certificate"],
            ...selectedProgress.students.map((student) => [
                student.studentName,
                student.studentLoginCode,
                student.status,
                student.percent,
                student.currentLessonTitle ?? "",
                student.nextLessonTitle ?? "",
                student.lastOpenedAt ?? "",
                student.attentionReason ?? "",
                student.issuedCertificate ? "YES" : "NO",
            ]),
        ]
        const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
        const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `course-progress-${selectedProgress.course.id}.csv`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    function exportAssessmentCsv() {
        if (!assessmentResults) return
        const rows = [
            ["Assessment", "Module", "Student Name", "Login Code", "Status", "Attempts", "Score", "Max Score", "Pass Score", "Latest Attempt", "Intervention"],
            ...assessmentResults.assessments.flatMap((assessment) =>
                assessment.students.map((student) => [
                    assessment.title,
                    assessment.moduleTitle ?? "",
                    student.studentName,
                    student.studentLoginCode,
                    student.status,
                    student.attemptCount,
                    student.latestAttempt?.score ?? "",
                    student.latestAttempt?.maxScore ?? "",
                    assessment.passScore ?? "",
                    student.latestAttempt?.completedAt ?? "",
                    student.intervention,
                ])
            ),
        ]
        const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
        const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
        const url = URL.createObjectURL(blob)
        const anchor = document.createElement("a")
        anchor.href = url
        anchor.download = `course-assessment-results-${assessmentResults.course.id}.csv`
        anchor.click()
        URL.revokeObjectURL(url)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-600">
                {error}
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">คอร์สในห้องนี้</h2>
                        <p className="text-sm font-bold text-slate-400">
                            ดูภาพรวมคอร์ส ความคืบหน้ารายคน และจุดที่ครูควรเข้าไปช่วยต่อจากผลการเรียนกับผลแบบทดสอบ
                        </p>
                    </div>
                    <Link href="/dashboard/courses">
                        <Button variant="outline" className="rounded-xl font-bold">จัดการคอร์สทั้งหมด</Button>
                    </Link>
                </div>
            </div>

            {assignments.length === 0 ? (
                <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-10 text-center">
                    <Award className="mx-auto mb-3 h-8 w-8 text-slate-300" />
                    <p className="font-black text-slate-700">ยังไม่มีคอร์สที่ assign ให้ห้องนี้</p>
                    <p className="mt-1 text-sm text-slate-400">สร้างหรือ publish คอร์สก่อน แล้วค่อย assign ให้ห้องเรียน</p>
                </div>
            ) : (
                <div className="grid gap-3">
                    {assignments.map((assignment) => {
                        const moduleCount = assignment.course.content.modules.length
                        const lessonCount = assignment.course.content.modules.reduce((sum, module) => sum + module.lessons.length, 0)
                        const active = selectedCourseId === assignment.course.id
                        return (
                            <div key={assignment.id} className={`rounded-2xl border bg-white p-4 shadow-sm ${active ? "border-emerald-300" : "border-slate-100"}`}>
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <div className="mb-1 flex flex-wrap items-center gap-2">
                                            <p className="truncate font-black text-slate-900">{assignment.course.title}</p>
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                {assignment.course.status}
                                            </Badge>
                                        </div>
                                        <p className="text-xs font-bold text-slate-400">
                                            {[assignment.course.subject, assignment.course.gradeLevel].filter(Boolean).join(" | ") || "ไม่ระบุวิชา"}
                                        </p>
                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                            {moduleCount} โมดูล | {lessonCount} บทเรียน | assign แล้ว {formatDate(assignment.assignedAt)}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <span className="flex items-center gap-1 text-sm font-bold text-slate-600">
                                            <Users className="h-4 w-4" />
                                            {studentCount} คน
                                        </span>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={active ? "default" : "outline"}
                                            className={active ? "rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800" : "rounded-xl font-bold"}
                                            onClick={() => setSelectedCourseId(assignment.course.id)}
                                        >
                                            ดูภาพรวมคอร์ส
                                        </Button>
                                        <Link href={`/dashboard/courses/${assignment.course.id}/edit`}>
                                            <Button size="sm" className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700">
                                                เปิดคอร์ส
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {selectedCourseId ? (
                <div className="rounded-[2rem] border border-slate-100 bg-white p-5 shadow-sm">
                    {detailLoading || !selectedProgress || !assessmentResults ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-xl font-black text-slate-900">{selectedProgress.course.title}</h3>
                                    <p className="text-sm font-bold text-slate-400">
                                        {[selectedProgress.course.subject, selectedProgress.course.gradeLevel].filter(Boolean).join(" | ") || "ไม่ระบุวิชา"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Button type="button" variant="outline" onClick={exportCourseCsv} className="rounded-xl font-bold">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Progress
                                    </Button>
                                    <Button type="button" variant="outline" onClick={exportAssessmentCsv} className="rounded-xl font-bold">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Assessment
                                    </Button>
                                    <Link href={`/dashboard/courses/${selectedProgress.course.id}/edit`}>
                                        <Button type="button" variant="outline" className="rounded-xl font-bold">
                                            <Award className="mr-2 h-4 w-4" />
                                            แก้ไขคอร์ส
                                        </Button>
                                    </Link>
                                </div>
                            </div>

                            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                                {[
                                    { label: "เรียนจบแล้ว", value: selectedProgress.summary.completedCount, tone: "bg-emerald-50 text-emerald-700" },
                                    { label: "กำลังเรียน", value: selectedProgress.summary.inProgressCount, tone: "bg-blue-50 text-blue-700" },
                                    { label: "ยังไม่เริ่ม", value: selectedProgress.summary.notStartedCount, tone: "bg-slate-100 text-slate-700" },
                                    { label: "ต้องติดตาม", value: selectedProgress.summary.attentionCount, tone: "bg-amber-50 text-amber-700" },
                                    { label: "ได้ใบรับรอง", value: selectedProgress.summary.certificateIssuedCount, tone: "bg-purple-50 text-purple-700" },
                                    { label: "เฉลี่ยทั้งห้อง", value: `${selectedProgress.summary.averagePercent}%`, tone: "bg-cyan-50 text-cyan-700" },
                                ].map((card) => (
                                    <div key={card.label} className={`rounded-2xl p-4 ${card.tone}`}>
                                        <p className="text-xs font-black uppercase tracking-wide">{card.label}</p>
                                        <p className="mt-2 text-2xl font-black">{card.value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <h4 className="font-black text-slate-900">Curriculum analytics</h4>
                                        <p className="text-sm font-bold text-slate-400">
                                            ดูความครอบคลุมตามหน่วย บทที่เป็นบังคับ/เสริม และความพร้อมของผลสอบในวิชา {selectedProgress.curriculumAnalytics.subjectLabel}
                                        </p>
                                    </div>
                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                        {selectedProgress.curriculumAnalytics.subjectLabel}
                                    </Badge>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    {[
                                        { label: "หน่วยในคอร์ส", value: selectedProgress.curriculumAnalytics.unitCount, tone: "bg-blue-50 text-blue-700" },
                                        { label: "บทบังคับ", value: selectedProgress.curriculumAnalytics.requiredLessonCount, tone: "bg-emerald-50 text-emerald-700" },
                                        { label: "บทเสริม", value: selectedProgress.curriculumAnalytics.optionalLessonCount, tone: "bg-slate-100 text-slate-700" },
                                        {
                                            label: "ผ่านแบบทดสอบ",
                                            value: `${selectedProgress.curriculumAnalytics.assessmentPassRate ?? (assessmentResults.summary.submittedCount > 0 ? Math.round((assessmentResults.summary.passedCount / assessmentResults.summary.submittedCount) * 100) : 0)}%`,
                                            tone: "bg-violet-50 text-violet-700",
                                        },
                                    ].map((card) => (
                                        <div key={card.label} className={`rounded-2xl p-4 ${card.tone}`}>
                                            <p className="text-xs font-black uppercase tracking-wide">{card.label}</p>
                                            <p className="mt-2 text-2xl font-black">{card.value}</p>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                                        <p className="font-black text-slate-900">Unit coverage</p>
                                        <div className="mt-3 space-y-2">
                                            {selectedProgress.curriculumAnalytics.unitCoverage.length === 0 ? (
                                                <p className="text-sm font-bold text-slate-400">ยังไม่มีข้อมูลหน่วยจาก metadata ของบทเรียน</p>
                                            ) : (
                                                selectedProgress.curriculumAnalytics.unitCoverage.slice(0, 6).map((unit) => (
                                                    <div key={`${unit.unitId ?? unit.unitTitle}`} className="rounded-xl bg-slate-50 p-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div>
                                                                <p className="font-bold text-slate-800">{unit.unitTitle}</p>
                                                                <p className="text-xs font-bold text-slate-400">
                                                                    {unit.lessonCount} บท | บังคับ {unit.requiredLessonCount}
                                                                </p>
                                                            </div>
                                                            <Badge className="bg-cyan-100 text-cyan-700 hover:bg-cyan-100">
                                                                {unit.averageCompletionRate}%
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="rounded-2xl border border-slate-100 bg-white p-4">
                                        <p className="font-black text-slate-900">Lesson completion</p>
                                        <div className="mt-3 space-y-2">
                                            {selectedProgress.curriculumAnalytics.lessonCompletion.length === 0 ? (
                                                <p className="text-sm font-bold text-slate-400">ยังไม่มีข้อมูลบทเรียนสำหรับวิเคราะห์</p>
                                            ) : (
                                                selectedProgress.curriculumAnalytics.lessonCompletion
                                                    .slice()
                                                    .sort((left, right) => left.completionRate - right.completionRate)
                                                    .slice(0, 6)
                                                    .map((lesson) => (
                                                        <div key={lesson.lessonId} className="rounded-xl bg-slate-50 p-3">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <p className="font-bold text-slate-800">{lesson.title}</p>
                                                                    <p className="text-xs font-bold text-slate-400">
                                                                        {[lesson.unitTitle, lesson.required ? "บทบังคับ" : "บทเสริม"].filter(Boolean).join(" | ")}
                                                                    </p>
                                                                </div>
                                                                <Badge className={lesson.required ? "bg-amber-100 text-amber-700 hover:bg-amber-100" : "bg-slate-200 text-slate-700 hover:bg-slate-200"}>
                                                                    {lesson.completionRate}%
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-2 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                                        <p className="font-black text-slate-900">บทที่ค้างมากที่สุด</p>
                                    </div>
                                    {selectedProgress.summary.blockerLessons.length === 0 ? (
                                        <p className="text-sm font-bold text-slate-400">ยังไม่มีบทที่ติดค้างในห้องนี้</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {selectedProgress.summary.blockerLessons.map((lesson) => (
                                                <div key={lesson.lessonId} className="rounded-xl bg-white p-3">
                                                    <p className="font-bold text-slate-800">{lesson.lessonTitle ?? lesson.lessonId}</p>
                                                    <p className="text-xs font-bold text-slate-400">{lesson.count} คนยังค้างอยู่ที่บทนี้</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="overflow-hidden rounded-2xl border border-slate-100">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-slate-50 text-slate-500">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-black">นักเรียน</th>
                                                    <th className="px-4 py-3 text-left font-black">สถานะ</th>
                                                    <th className="px-4 py-3 text-left font-black">Progress</th>
                                                    <th className="px-4 py-3 text-left font-black">บทปัจจุบัน / ถัดไป</th>
                                                    <th className="px-4 py-3 text-left font-black">ล่าสุด</th>
                                                    <th className="px-4 py-3 text-left font-black">Intervention</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 bg-white">
                                                {selectedProgress.students.map((student) => (
                                                    <tr key={student.studentId}>
                                                        <td className="px-4 py-3">
                                                            <div>
                                                                <p className="font-black text-slate-900">{student.studentName}</p>
                                                                <p className="text-xs font-bold text-slate-400">{student.studentLoginCode}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap gap-2">
                                                                <Badge className={getCourseStatusTone(student.status)}>
                                                                    {student.status}
                                                                </Badge>
                                                                {student.issuedCertificate ? (
                                                                    <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">CERTIFIED</Badge>
                                                                ) : null}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 font-black text-slate-800">{student.percent}%</td>
                                                        <td className="px-4 py-3">
                                                            <div className="space-y-1">
                                                                <p className="font-bold text-slate-800">{student.currentLessonTitle ?? "-"}</p>
                                                                <p className="text-xs font-bold text-slate-400">ถัดไป: {student.nextLessonTitle ?? "-"}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-xs font-bold text-slate-500">
                                                            {student.completedAt ? `จบ ${formatDate(student.completedAt)}` : formatDate(student.lastOpenedAt)}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                {student.attentionReason ? (
                                                                    <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                                                                        {student.attentionReason}
                                                                    </Badge>
                                                                ) : (
                                                                    <span className="text-xs font-bold text-slate-400">ปกติ</span>
                                                                )}
                                                                <Link href={`/dashboard/classrooms/${classId}?tab=classroom&historyStudentId=${student.studentId}`}>
                                                                    <Button size="sm" variant="outline" className="rounded-xl font-bold">
                                                                        เปิดประวัติ
                                                                    </Button>
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1.75rem] border border-slate-100 bg-slate-50 p-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div>
                                        <div className="mb-2 flex items-center gap-2">
                                            <ShieldAlert className="h-4 w-4 text-rose-500" />
                                            <h4 className="font-black text-slate-900">ผลแบบทดสอบและ intervention</h4>
                                        </div>
                                        <p className="text-sm font-bold text-slate-400">
                                            ใช้ดูว่าใครยังไม่ผ่าน ใครยังไม่เริ่ม และคำถามไหนที่พลาดบ่อย เพื่อช่วยวางแผนสอนเสริม
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {([
                                            { value: "all", label: "ทั้งหมด" },
                                            { value: "failed", label: "ยังไม่ผ่าน" },
                                            { value: "not_started", label: "ยังไม่เริ่ม" },
                                            { value: "passed", label: "ผ่านแล้ว" },
                                        ] as const).map((filter) => (
                                            <Button
                                                key={filter.value}
                                                type="button"
                                                size="sm"
                                                variant={assessmentFilter === filter.value ? "default" : "outline"}
                                                className={assessmentFilter === filter.value ? "rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800" : "rounded-xl font-bold"}
                                                onClick={() => setAssessmentFilter(filter.value)}
                                            >
                                                {filter.label}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                                    {assessmentSummaryCards.map((card) => (
                                        <div key={card.label} className={`rounded-2xl p-4 ${card.tone}`}>
                                            <p className="text-xs font-black uppercase tracking-wide">{card.label}</p>
                                            <p className="mt-2 text-2xl font-black">{card.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {assessmentResults.assessments.length === 0 ? (
                                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                                        <p className="font-black text-slate-700">คอร์สนี้ยังไม่มีแบบทดสอบ</p>
                                        <p className="mt-1 text-sm font-bold text-slate-400">เพิ่ม assessment ในคอร์สเพื่อให้ครูติดตามผลการผ่านไม่ผ่านได้</p>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-4">
                                        {assessmentResults.assessments.map((assessment) => (
                                            <div key={assessment.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                                                <div className="flex flex-wrap items-start justify-between gap-3">
                                                    <div>
                                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                                            <h5 className="font-black text-slate-900">{assessment.title}</h5>
                                                            <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100">
                                                                {getAssessmentTypeLabel(assessment.type)}
                                                            </Badge>
                                                            {assessment.passScore != null ? (
                                                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                                    เกณฑ์ผ่าน {assessment.passScore}
                                                                </Badge>
                                                            ) : null}
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-400">
                                                            {[assessment.moduleTitle, assessment.questionSetTitle].filter(Boolean).join(" | ") || "ยังไม่ระบุโมดูลหรือชุดคำถาม"}
                                                        </p>
                                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                                            {assessment.totalQuestions} ข้อ | retake {assessment.allowRetake ? "ได้" : "ไม่ได้"}
                                                        </p>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 text-xs font-black">
                                                        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">ส่งแล้ว {assessment.summary.submittedCount}</span>
                                                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700">ผ่าน {assessment.summary.passedCount}</span>
                                                        <span className="rounded-full bg-rose-50 px-3 py-1 text-rose-700">ไม่ผ่าน {assessment.summary.failedCount}</span>
                                                        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">ยังไม่เริ่ม {assessment.summary.notStartedCount}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-4 grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                                                    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                                        <p className="mb-2 font-black text-slate-900">คำถามที่พลาดบ่อย</p>
                                                        {assessment.questionInsights.length === 0 ? (
                                                            <p className="text-sm font-bold text-slate-400">ยังไม่มีข้อมูลคำตอบพอสำหรับวิเคราะห์</p>
                                                        ) : (
                                                            <div className="space-y-2">
                                                                {assessment.questionInsights.map((insight) => (
                                                                    <div key={insight.questionId} className="rounded-xl bg-white p-3">
                                                                        <p className="font-bold text-slate-800">{insight.question}</p>
                                                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                                                            ตอบ {insight.responseCount} ครั้ง | ผิด {insight.incorrectCount} ครั้ง | Accuracy {insight.accuracyPercent ?? "-"}%
                                                                        </p>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="overflow-hidden rounded-2xl border border-slate-100">
                                                        <div className="overflow-x-auto">
                                                            <table className="min-w-full text-sm">
                                                                <thead className="bg-slate-50 text-slate-500">
                                                                    <tr>
                                                                        <th className="px-4 py-3 text-left font-black">นักเรียน</th>
                                                                        <th className="px-4 py-3 text-left font-black">สถานะ</th>
                                                                        <th className="px-4 py-3 text-left font-black">คะแนนล่าสุด</th>
                                                                        <th className="px-4 py-3 text-left font-black">จำนวนครั้ง</th>
                                                                        <th className="px-4 py-3 text-left font-black">แนวทางช่วยเหลือ</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100 bg-white">
                                                                    {assessment.students.length === 0 ? (
                                                                        <tr>
                                                                            <td colSpan={5} className="px-4 py-6 text-center text-sm font-bold text-slate-400">
                                                                                ไม่พบนักเรียนตามตัวกรองนี้
                                                                            </td>
                                                                        </tr>
                                                                    ) : (
                                                                        assessment.students.map((student) => (
                                                                            <tr key={`${assessment.id}-${student.studentId}`}>
                                                                                <td className="px-4 py-3">
                                                                                    <div>
                                                                                        <p className="font-black text-slate-900">{student.studentName}</p>
                                                                                        <p className="text-xs font-bold text-slate-400">{student.studentLoginCode}</p>
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <Badge className={getAssessmentStatusTone(student.status)}>
                                                                                        {getAssessmentStatusLabel(student.status)}
                                                                                    </Badge>
                                                                                </td>
                                                                                <td className="px-4 py-3 font-black text-slate-800">
                                                                                    {student.latestAttempt ? `${student.latestAttempt.score}/${student.latestAttempt.maxScore}` : "-"}
                                                                                </td>
                                                                                <td className="px-4 py-3 font-bold text-slate-600">
                                                                                    {student.attemptCount}
                                                                                </td>
                                                                                <td className="px-4 py-3">
                                                                                    <div className="flex flex-wrap items-center gap-2">
                                                                                        <Badge className={student.intervention === "NONE" ? "bg-slate-100 text-slate-700 hover:bg-slate-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                                                                                            {getInterventionLabel(student.intervention)}
                                                                                        </Badge>
                                                                                        <Link href={`/dashboard/classrooms/${classId}?tab=classroom&historyStudentId=${student.studentId}`}>
                                                                                            <Button size="sm" variant="outline" className="rounded-xl font-bold">
                                                                                                เปิดประวัติ
                                                                                            </Button>
                                                                                        </Link>
                                                                                    </div>
                                                                                    {student.latestAttempt ? (
                                                                                        <p className="mt-1 text-xs font-bold text-slate-400">
                                                                                            ล่าสุด {formatDate(student.latestAttempt.completedAt)} ครั้งที่ {student.latestAttempt.attemptNumber}
                                                                                        </p>
                                                                                    ) : null}
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            ) : null}
        </div>
    )
}

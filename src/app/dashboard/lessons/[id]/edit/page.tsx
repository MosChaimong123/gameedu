"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import {
    GraduationCap,
    Loader2,
    BookOpen,
    Target,
    AlignLeft,
    Key,
    Globe,
    EyeOff,
    Users,
    CheckCircle2,
    Plus,
    Trash2,
    BarChart3,
    Star,
    Download,
    Sparkles,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { PageBackLink } from "@/components/ui/page-back-link"

type LessonExample = { title: string; body: string }
type LessonSection = { id: string; heading: string; content: string; examples: LessonExample[] }
type LessonContent = {
    objectives: string[]
    sections: LessonSection[]
    keyTerms: Array<{ term: string; definition: string }>
    summary: string
    estimatedMinutes: number
    quizDraft?: LessonQuizDraft
}
type LessonQuizQuestion = {
    id: string
    question: string
    options: string[]
    correctAnswer: number
    explanation: string
}
type LessonQuizDraft = {
    questions: LessonQuizQuestion[]
    generatedAt?: string
}
type LessonStudent = { id: string; name: string; nickname: string | null; order: number }
type Lesson = {
    id: string
    title: string
    subject: string | null
    gradeLevel: string | null
    description: string | null
    status: "DRAFT" | "PUBLISHED"
    content: LessonContent
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
}
type Classroom = { id: string; name: string; grade: string | null; _count: { students: number } }

export default function EditLessonPage() {
    const { id } = useParams<{ id: string }>()

    const [lesson, setLesson] = useState<Lesson | null>(null)
    const [loading, setLoading] = useState(true)

    // Editable fields
    const [title, setTitle] = useState("")
    const [subject, setSubject] = useState("")
    const [gradeLevel, setGradeLevel] = useState("")
    const [content, setContent] = useState<LessonContent | null>(null)

    // Save state
    const [saving, setSaving] = useState(false)
    const [savedOk, setSavedOk] = useState(false)
    const [quizGenerating, setQuizGenerating] = useState(false)
    const [quizError, setQuizError] = useState("")

    // Assign dialog
    const [assignOpen, setAssignOpen] = useState(false)
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [assigning, setAssigning] = useState<string | null>(null)
    const [assignError, setAssignError] = useState("")

    useEffect(() => {
        fetch(`/api/lessons/${id}`)
            .then((r) => r.json())
            .then((data: Lesson) => {
                setLesson(data)
                setTitle(data.title)
                setSubject(data.subject ?? "")
                setGradeLevel(data.gradeLevel ?? "")
                setContent(data.content)
            })
            .finally(() => setLoading(false))
    }, [id])

    const fetchClassrooms = useCallback(() => {
        fetch("/api/classrooms")
            .then((r) => r.json())
            .then((data) => Array.isArray(data) && setClassrooms(data))
    }, [])

    async function handleSave() {
        if (!content) return
        setSaving(true)
        setSavedOk(false)
        try {
            const res = await fetch(`/api/lessons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, subject: subject || null, gradeLevel: gradeLevel || null, content }),
            })
            if (res.ok) {
                const updated = await res.json() as Lesson
                setLesson((prev) => prev ? { ...prev, ...updated } : prev)
                setSavedOk(true)
                setTimeout(() => setSavedOk(false), 2000)
            }
        } finally {
            setSaving(false)
        }
    }

    async function handleTogglePublish() {
        if (!lesson) return
        setSaving(true)
        try {
            const newStatus = lesson.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED"
            const res = await fetch(`/api/lessons/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            })
            if (res.ok) {
                setLesson((prev) => prev ? { ...prev, status: newStatus } : prev)
            }
        } finally {
            setSaving(false)
        }
    }

    async function handleGenerateQuizDraft() {
        if (!content) return
        setQuizGenerating(true)
        setQuizError("")
        try {
            const res = await fetch(`/api/lessons/${id}/quiz/generate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: 5, difficulty: "MEDIUM", language: "th" }),
            })
            const data = await res.json().catch(() => null) as LessonQuizDraft | { error?: { message?: string } } | null
            if (!res.ok || !data || !("questions" in data)) {
                throw new Error(data && "error" in data ? data.error?.message : "สร้าง quiz ไม่สำเร็จ")
            }
            setContent({ ...content, quizDraft: data })
            setLesson((prev) => prev ? { ...prev, content: { ...prev.content, quizDraft: data } } : prev)
            setSavedOk(true)
            setTimeout(() => setSavedOk(false), 2000)
        } catch (error) {
            setQuizError(error instanceof Error ? error.message : "สร้าง quiz ไม่สำเร็จ")
        } finally {
            setQuizGenerating(false)
        }
    }

    function updateQuizQuestion(index: number, patch: Partial<LessonQuizQuestion>) {
        if (!content?.quizDraft) return
        const questions = [...content.quizDraft.questions]
        questions[index] = { ...questions[index], ...patch }
        setContent({ ...content, quizDraft: { ...content.quizDraft, questions } })
    }

    function updateQuizOption(questionIndex: number, optionIndex: number, value: string) {
        if (!content?.quizDraft) return
        const question = content.quizDraft.questions[questionIndex]
        const options = [...question.options]
        options[optionIndex] = value
        updateQuizQuestion(questionIndex, { options })
    }

    async function handleAssign(classId: string) {
        if (!lesson || lesson.status !== "PUBLISHED") {
            setAssignError("ต้องเผยแพร่บทเรียนก่อน จึงจะ assign ให้ห้องเรียนได้")
            return
        }
        setAssigning(classId)
        setAssignError("")
        try {
            const assignRes = await fetch(`/api/classrooms/${classId}/lessons`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId: id }),
            })
            if (!assignRes.ok) {
                const err = await assignRes.json().catch(() => ({}))
                throw new Error(err?.error?.message ?? "assign บทเรียนไม่สำเร็จ")
            }
            // Refresh lesson to get updated assignments
            const res = await fetch(`/api/lessons/${id}`)
            const updated = await res.json() as Lesson
            setLesson(updated)
        } catch (error) {
            setAssignError(error instanceof Error ? error.message : "assign บทเรียนไม่สำเร็จ")
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

    if (!lesson || !content) {
        return <div className="py-16 text-center text-slate-500">ไม่พบบทเรียนนี้</div>
    }

    const assignedClassIds = new Set(lesson.classroomAssignments.map((a) => a.classId))
    const totalAssignedStudents = lesson.classroomAssignments.reduce(
        (sum, assignment) => sum + assignment.classroom.students.length,
        0
    )
    const totalCompletions = lesson.classroomAssignments.reduce(
        (sum, assignment) => sum + assignment.completions.length,
        0
    )
    const scoredCompletions = lesson.classroomAssignments.flatMap((assignment) =>
        assignment.completions.filter((completion) => completion.quizScore !== null)
    )
    const averageQuizScore =
        scoredCompletions.length > 0
            ? Math.round(
                  scoredCompletions.reduce((sum, completion) => sum + (completion.quizScore ?? 0), 0) /
                      scoredCompletions.length
              )
            : null

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <PageBackLink href="/dashboard/lessons" label="บทเรียนของฉัน" />

            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <GraduationCap className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">{lesson.title}</h1>
                        <div className="mt-1 flex items-center gap-2">
                            <Badge
                                className={
                                    lesson.status === "PUBLISHED"
                                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                        : "bg-slate-100 text-slate-500 hover:bg-slate-100"
                                }
                            >
                                {lesson.status === "PUBLISHED" ? "เผยแพร่แล้ว" : "ฉบับร่าง"}
                            </Badge>
                            {lesson.subject && <span className="text-sm text-slate-400">{lesson.subject}</span>}
                            {lesson.gradeLevel && <span className="text-sm text-slate-400">· {lesson.gradeLevel}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        onClick={() => { setAssignError(""); fetchClassrooms(); setAssignOpen(true) }}
                        className="rounded-xl font-bold"
                    >
                        <Users className="mr-2 h-4 w-4" />
                        Assign ให้ห้องเรียน
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleTogglePublish}
                        disabled={saving}
                        className="rounded-xl font-bold"
                    >
                        {lesson.status === "PUBLISHED" ? (
                            <><EyeOff className="mr-2 h-4 w-4" />ยกเลิกเผยแพร่</>
                        ) : (
                            <><Globe className="mr-2 h-4 w-4" />เผยแพร่</>
                        )}
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-xl bg-emerald-600 font-black text-white hover:bg-emerald-700"
                    >
                        {saving ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : savedOk ? (
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                        ) : null}
                        {savedOk ? "บันทึกแล้ว!" : "บันทึก"}
                    </Button>
                </div>
            </div>

            {/* Assigned classrooms */}
            {lesson.classroomAssignments.length > 0 && (
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                    <p className="mb-2 text-xs font-black text-emerald-700 uppercase tracking-wide">ห้องเรียนที่ assign</p>
                    <div className="flex flex-wrap gap-2">
                        {lesson.classroomAssignments.map((a) => (
                            <div key={a.id} className="flex items-center gap-2 rounded-xl bg-white border border-emerald-200 px-3 py-1.5 text-sm font-bold text-slate-700 shadow-sm">
                                <Users className="h-3.5 w-3.5 text-emerald-600" />
                                {a.classroom.name}
                                <span className="text-xs text-slate-400">{a.completions.length} คน</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Progress summary */}
            <div className="grid gap-3 sm:grid-cols-4">
                {[
                    { label: "ห้องที่ assign", value: lesson.classroomAssignments.length },
                    { label: "นักเรียนทั้งหมด", value: totalAssignedStudents },
                    { label: "เรียนจบแล้ว", value: totalCompletions },
                    { label: "คะแนนเฉลี่ย", value: averageQuizScore === null ? "-" : `${averageQuizScore}%` },
                ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                        <p className="text-2xl font-black text-slate-900">{item.value}</p>
                        <p className="mt-1 text-xs font-bold text-slate-400">{item.label}</p>
                    </div>
                ))}
            </div>

            {/* Meta fields */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 font-black text-slate-800">ข้อมูลบทเรียน</h2>
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2 sm:col-span-3">
                        <Label className="font-bold text-slate-700">ชื่อบทเรียน</Label>
                        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl font-black" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">วิชา</Label>
                        <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="rounded-xl" placeholder="เช่น คณิตศาสตร์" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">ระดับชั้น</Label>
                        <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="rounded-xl" placeholder="เช่น ม.1" />
                    </div>
                    <div className="space-y-2">
                        <Label className="font-bold text-slate-700">เวลาโดยประมาณ</Label>
                        <Input
                            type="number"
                            value={content.estimatedMinutes}
                            onChange={(e) => setContent({ ...content, estimatedMinutes: Number(e.target.value) })}
                            className="rounded-xl"
                            placeholder="นาที"
                        />
                    </div>
                </div>
            </div>

            {/* Objectives */}
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
                        onClick={() => setContent({ ...content, objectives: [...content.objectives, ""] })}
                    >
                        <Plus className="mr-1 h-3 w-3" /> เพิ่ม
                    </Button>
                </div>
                <div className="space-y-2">
                    {content.objectives.map((obj, i) => (
                        <div key={i} className="flex items-start gap-2">
                            <span className="mt-2.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-black text-emerald-700">{i + 1}</span>
                            <Textarea
                                value={obj}
                                onChange={(e) => {
                                    const updated = [...content.objectives]
                                    updated[i] = e.target.value
                                    setContent({ ...content, objectives: updated })
                                }}
                                rows={2}
                                className="flex-1 rounded-xl text-sm"
                            />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mt-1 shrink-0 rounded-xl text-slate-300 hover:text-red-400"
                                onClick={() => setContent({ ...content, objectives: content.objectives.filter((_, j) => j !== i) })}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Sections */}
            {content.sections.map((section, si) => (
                <div key={section.id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-black text-blue-600">
                            {si + 1}
                        </div>
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <Input
                            value={section.heading}
                            onChange={(e) => {
                                const updated = [...content.sections]
                                updated[si] = { ...updated[si], heading: e.target.value }
                                setContent({ ...content, sections: updated })
                            }}
                            className="rounded-xl font-black text-slate-800"
                        />
                    </div>
                    <Textarea
                        value={section.content}
                        onChange={(e) => {
                            const updated = [...content.sections]
                            updated[si] = { ...updated[si], content: e.target.value }
                            setContent({ ...content, sections: updated })
                        }}
                        rows={6}
                        className="rounded-xl text-sm text-slate-700"
                    />
                </div>
            ))}

            {/* Key Terms */}
            {content.keyTerms.length > 0 && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-3 flex items-center gap-2">
                        <Key className="h-5 w-5 text-violet-500" />
                        <h3 className="font-black text-slate-800">คำศัพท์สำคัญ</h3>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {content.keyTerms.map((kt, i) => (
                            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                                <Input
                                    value={kt.term}
                                    onChange={(e) => {
                                        const updated = [...content.keyTerms]
                                        updated[i] = { ...updated[i], term: e.target.value }
                                        setContent({ ...content, keyTerms: updated })
                                    }}
                                    className="mb-1.5 rounded-lg text-sm font-black"
                                />
                                <Textarea
                                    value={kt.definition}
                                    onChange={(e) => {
                                        const updated = [...content.keyTerms]
                                        updated[i] = { ...updated[i], definition: e.target.value }
                                        setContent({ ...content, keyTerms: updated })
                                    }}
                                    rows={2}
                                    className="rounded-lg text-sm"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Lesson quiz draft */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        <div>
                            <h3 className="font-black text-slate-800">Quiz ท้ายบท</h3>
                            <p className="text-xs font-bold text-slate-400">
                                สร้างชุดคำถามเดียวกันให้นักเรียนทุกคน และบันทึกคะแนนลง progress
                            </p>
                        </div>
                    </div>
                    <Button
                        type="button"
                        variant={content.quizDraft ? "outline" : "default"}
                        onClick={handleGenerateQuizDraft}
                        disabled={quizGenerating}
                        className={
                            content.quizDraft
                                ? "rounded-xl font-bold"
                                : "rounded-xl bg-amber-500 font-black text-white hover:bg-amber-600"
                        }
                    >
                        {quizGenerating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {content.quizDraft ? "สร้างใหม่" : "Generate quiz"}
                    </Button>
                </div>

                {quizError && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">
                        {quizError}
                    </div>
                )}

                {!content.quizDraft ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
                        <p className="font-black text-slate-700">ยังไม่มี quiz draft</p>
                        <p className="mt-1 text-sm text-slate-400">กด Generate quiz เพื่อสร้างคำถามจากเนื้อหาบทเรียนนี้</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {content.quizDraft.questions.map((question, questionIndex) => (
                            <div key={question.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-black text-amber-700">
                                        {questionIndex + 1}
                                    </span>
                                    <Input
                                        value={question.question}
                                        onChange={(e) => updateQuizQuestion(questionIndex, { question: e.target.value })}
                                        className="rounded-xl font-black"
                                        placeholder="คำถาม"
                                    />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {question.options.map((option, optionIndex) => (
                                        <div key={optionIndex} className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => updateQuizQuestion(questionIndex, { correctAnswer: optionIndex })}
                                                className={
                                                    question.correctAnswer === optionIndex
                                                        ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-xs font-black text-white"
                                                        : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-400"
                                                }
                                                aria-label={`Set option ${optionIndex + 1} as correct`}
                                            >
                                                {String.fromCharCode(65 + optionIndex)}
                                            </button>
                                            <Input
                                                value={option}
                                                onChange={(e) => updateQuizOption(questionIndex, optionIndex, e.target.value)}
                                                className="rounded-xl"
                                                placeholder={`ตัวเลือก ${optionIndex + 1}`}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Textarea
                                    value={question.explanation}
                                    onChange={(e) => updateQuizQuestion(questionIndex, { explanation: e.target.value })}
                                    rows={2}
                                    className="mt-3 rounded-xl text-sm"
                                    placeholder="คำอธิบายเฉลย"
                                />
                            </div>
                        ))}
                        <p className="text-xs font-bold text-slate-400">
                            หลังแก้คำถามแล้วให้กด “บันทึกการเปลี่ยนแปลง” เพื่อเก็บ quiz draft ล่าสุด
                        </p>
                    </div>
                )}
            </div>

            {/* Student completion list */}
            {lesson.classroomAssignments.length > 0 && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
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
                    <div className="space-y-4">
                        {lesson.classroomAssignments.map((assignment) => {
                            const completionByStudent = new Map(
                                assignment.completions.map((completion) => [completion.studentId, completion])
                            )
                            const totalStudents = assignment.classroom.students.length
                            const completedCount = assignment.completions.length
                            const withScore = assignment.completions.filter((completion) => completion.quizScore !== null)
                            const avgScore =
                                withScore.length > 0
                                    ? Math.round(
                                          withScore.reduce((sum, completion) => sum + (completion.quizScore ?? 0), 0) /
                                              withScore.length
                                      )
                                    : null
                            const progressPercent =
                                totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0

                            return (
                                <div key={assignment.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <p className="font-bold text-slate-800">{assignment.classroom.name}</p>
                                            <p className="text-xs font-bold text-slate-400">
                                                {completedCount}/{totalStudents} คนเรียนจบ
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="flex items-center gap-1 font-bold text-emerald-600">
                                                <Users className="h-3.5 w-3.5" />
                                                {progressPercent}%
                                            </span>
                                            {avgScore !== null && (
                                                <span className="flex items-center gap-1 font-bold text-amber-600">
                                                    <Star className="h-3.5 w-3.5 fill-current" />
                                                    Quiz เฉลี่ย {avgScore}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                        <div
                                            className="h-full rounded-full bg-emerald-500 transition-all"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                                        {assignment.classroom.students.length === 0 ? (
                                            <p className="p-4 text-sm text-slate-400">ยังไม่มีนักเรียนในห้องนี้</p>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {assignment.classroom.students.map((student) => {
                                                    const completion = completionByStudent.get(student.id)
                                                    return (
                                                        <div
                                                            key={student.id}
                                                            className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_auto_auto]"
                                                        >
                                                            <div>
                                                                <p className="font-bold text-slate-800">
                                                                    {student.order + 1}. {student.name}
                                                                </p>
                                                                {student.nickname && (
                                                                    <p className="text-xs text-slate-400">{student.nickname}</p>
                                                                )}
                                                            </div>
                                                            <Badge
                                                                className={
                                                                    completion
                                                                        ? "w-fit bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                                                        : "w-fit bg-slate-100 text-slate-500 hover:bg-slate-100"
                                                                }
                                                            >
                                                                {completion ? "เรียนจบแล้ว" : "ยังไม่จบ"}
                                                            </Badge>
                                                            <div className="text-left text-xs font-bold text-slate-500 sm:text-right">
                                                                {completion ? (
                                                                    <>
                                                                        <p>{new Date(completion.completedAt).toLocaleDateString("th-TH")}</p>
                                                                        <p>
                                                                            คะแนน{" "}
                                                                            {completion.quizScore === null
                                                                                ? "-"
                                                                                : `${completion.quizScore}%`}
                                                                        </p>
                                                                    </>
                                                                ) : (
                                                                    <p>-</p>
                                                                )}
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
                </div>
            )}

            {/* Progress Tracker */}
            {lesson.classroomAssignments.length > 0 && (
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        <h3 className="font-black text-slate-800">ความคืบหน้านักเรียน</h3>
                    </div>
                    <div className="space-y-4">
                        {lesson.classroomAssignments.map((a) => {
                            const total = a.completions.length
                            const withScore = a.completions.filter((c) => c.quizScore !== null)
                            const avgScore =
                                withScore.length > 0
                                    ? Math.round(withScore.reduce((sum, c) => sum + (c.quizScore ?? 0), 0) / withScore.length)
                                    : null
                            return (
                                <div key={a.id} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
                                    <div className="mb-3 flex items-center justify-between">
                                        <p className="font-bold text-slate-800">{a.classroom.name}</p>
                                        <div className="flex items-center gap-3 text-sm">
                                            <span className="flex items-center gap-1 text-slate-500">
                                                <Users className="h-3.5 w-3.5" />
                                                {total} คนอ่านแล้ว
                                            </span>
                                            {avgScore !== null && (
                                                <span className="flex items-center gap-1 font-bold text-amber-600">
                                                    <Star className="h-3.5 w-3.5 fill-current" />
                                                    Quiz เฉลี่ย {avgScore}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {total > 0 ? (
                                        <div className="space-y-1">
                                            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                                                <div
                                                    className="h-full rounded-full bg-emerald-500 transition-all"
                                                    style={{ width: `${Math.min(total * 10, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex flex-wrap gap-2 pt-1">
                                                {a.completions.map((c) => (
                                                    <div
                                                        key={c.studentId}
                                                        className="rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700"
                                                        title={new Date(c.completedAt).toLocaleDateString("th-TH")}
                                                    >
                                                        {c.quizScore !== null ? `${c.quizScore}%` : "✓"}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400">ยังไม่มีนักเรียนเรียน</p>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                    <AlignLeft className="h-5 w-5 text-teal-500" />
                    <h3 className="font-black text-slate-800">สรุปบทเรียน</h3>
                </div>
                <Textarea
                    value={content.summary}
                    onChange={(e) => setContent({ ...content, summary: e.target.value })}
                    rows={4}
                    className="rounded-xl text-sm text-slate-700"
                />
            </div>

            {/* Floating save bar */}
            <div className="sticky bottom-4 flex justify-end">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-2xl bg-emerald-600 px-8 font-black text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700"
                >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : savedOk ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
                    {savedOk ? "บันทึกแล้ว!" : "บันทึกการเปลี่ยนแปลง"}
                </Button>
            </div>

            {/* Assign dialog */}
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
                    <div className="mt-2 space-y-2">
                        {classrooms.length === 0 ? (
                            <p className="py-4 text-center text-sm text-slate-400">ยังไม่มีห้องเรียน</p>
                        ) : (
                            classrooms.map((cls) => {
                                const isAssigned = assignedClassIds.has(cls.id)
                                return (
                                    <div
                                        key={cls.id}
                                        className="flex items-center justify-between rounded-xl border border-slate-100 p-3"
                                    >
                                        <div>
                                            <p className="font-bold text-slate-800">{cls.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {cls.grade && `${cls.grade} · `}{cls._count.students} นักเรียน
                                            </p>
                                        </div>
                                        {isAssigned ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                                                <CheckCircle2 className="mr-1 h-3 w-3" />
                                                Assigned แล้ว
                                            </Badge>
                                        ) : (
                                            <Button
                                                size="sm"
                                                className="rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700"
                                                onClick={() => handleAssign(cls.id)}
                                                disabled={lesson.status !== "PUBLISHED" || assigning === cls.id}
                                            >
                                                {assigning === cls.id ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <><Plus className="mr-1 h-3.5 w-3.5" />Assign</>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
